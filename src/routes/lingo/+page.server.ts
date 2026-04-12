import { db } from '$lib/server/db';
import { scores } from '$lib/server/db/schema';
import { evaluateGuess, applyGuess } from '$lib/game/word-engine';
import {
	createLingoRound,
	generateBingoCard,
	generateBallPit,
	checkBingo,
	pickRandomCardNumber
} from '$lib/game/lingo-engine';
import { ROUNDS_PER_GAME, TIMER_SECONDS, TIMER_GRACE_SECONDS, COOKIE_MAX_AGE, LINGO_WORD_LENGTH, LINGO_MAX_ATTEMPTS } from '$lib/config/constants';
import type { MarkedNumber, BingoResult } from '$lib/game/lingo-engine';
import { isValidWord } from '$lib/server/words/validate-word';
import { getWord } from '$lib/server/words/get-word';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const WORD_COOKIE = 'lingo_word';
const STATE_COOKIE = 'lingo_state';

const COOKIE_OPTS = {
	httpOnly: true,
	secure: false,
	sameSite: 'lax' as const,
	path: '/lingo',
	maxAge: COOKIE_MAX_AGE
};

interface LingoState {
	guesses: string[];
	missedAttempts: number; // timed-out turns (not stored as guesses)
	// 'guessing' = actively guessing a word
	// 'bonus'    = 5 attempts used, now playing the bonus attempt (extra letter shown)
	// 'balls'    = word was guessed, pick a ball
	// 'gold'     = gold ball picked, player must choose a card number
	// 'done'     = all 5 rounds played
	phase: 'guessing' | 'bonus' | 'balls' | 'gold' | 'done';
	roundNumber: number; // 1–5
	wordsGuessed: number;
	bingoCard: number[][];
	markedNumbers: MarkedNumber[];
	bingo: BingoResult;
	ballPit: ReturnType<typeof generateBallPit>;
	roundStartedAt: number;
	// Bonus round: extra letter hint revealed at a random unguessed position
	bonusLetter: string | null; // null = not in bonus phase
	bonusPosition: number | null; // position index of the bonus letter
}

function getGameWord(length: number, roundNumber: number): string {
	return getWord(length, roundNumber);
}

/**
 * Pick a random position for the bonus letter hint.
 * Excludes position 0 (first letter, already locked) and any position
 * that was guessed correctly in any previous attempt.
 */
function pickBonusPosition(target: string, guesses: string[]): { position: number; letter: string } | null {
	const correctPositions = new Set<number>([0]); // 0 is always locked
	for (const guess of guesses) {
		for (let i = 0; i < guess.length; i++) {
			if (guess[i] === target[i]) correctPositions.add(i);
		}
	}
	const available = Array.from({ length: target.length }, (_, i) => i)
		.filter((i) => !correctPositions.has(i));
	if (available.length === 0) return null;
	const pos = available[Math.floor(Math.random() * available.length)];
	return { position: pos, letter: target[pos] };
}

function freshState(): LingoState {
	return {
		guesses: [],
		missedAttempts: 0,
		phase: 'guessing',
		roundNumber: 1,
		wordsGuessed: 0,
		bingoCard: generateBingoCard(),
		markedNumbers: [],
		bingo: false as BingoResult,
		ballPit: generateBallPit(),
		roundStartedAt: Date.now(),
		bonusLetter: null,
		bonusPosition: null
	};
}

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const wordLength = LINGO_WORD_LENGTH;

	const wordCookie = cookies.get(WORD_COOKIE);
	const stateCookie = cookies.get(STATE_COOKIE);

	let target: string;
	let state: LingoState;

	const cookieLengthMatch = wordCookie && Number(wordCookie.split(':')[0]) === wordLength;

	if (cookieLengthMatch && stateCookie) {
		target = wordCookie.split(':')[1];
		state = JSON.parse(stateCookie);
		// Backfill new fields for existing cookies
		if (state.bonusLetter === undefined) state.bonusLetter = null;
		if (state.bonusPosition === undefined) state.bonusPosition = null;
		if (state.missedAttempts === undefined) state.missedAttempts = 0;
	} else {
		target = getGameWord(wordLength, 1);
		state = freshState();
		cookies.set(WORD_COOKIE, `${wordLength}:${target}`, COOKIE_OPTS);
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
	}

	// Rebuild game state from guesses
	let gameState = createLingoRound(target, LINGO_MAX_ATTEMPTS);
	for (const g of state.guesses) {
		const updated = applyGuess(gameState, g, target);
		gameState = { ...updated, firstLetter: target[0], roundStartedAt: state.roundStartedAt };
	}

	// Load scores for logged-in user
	let userScores = null;
	if (locals.user) {
		const result = await db
			.select()
			.from(scores)
			.where(
				and(
					eq(scores.userId, locals.user.id),
					eq(scores.game, 'lingo'),
					eq(scores.wordLength, wordLength)
				)
			)
			.limit(1);
		userScores = result[0] ?? null;
	}

	return {
		wordLength,
		firstLetter: target[0],
		bonusLetter: state.bonusLetter,
		bonusPosition: state.bonusPosition,
		missedAttempts: state.missedAttempts,
		gameState: {
			wordLength: gameState.wordLength,
			maxAttempts: gameState.maxAttempts,
			guesses: gameState.guesses,
			status: gameState.status,
			revealedLetters: gameState.revealedLetters
		},
		phase: state.phase,
		roundNumber: state.roundNumber,
		totalRounds: ROUNDS_PER_GAME,
		wordsGuessed: state.wordsGuessed,
		bingoCard: state.bingoCard,
		markedNumbers: state.markedNumbers,
		bingo: state.bingo,
		ballPit: state.ballPit,
		timerSeconds: TIMER_SECONDS,
		scores: userScores,
		user: locals.user ?? null
	};
};

export const actions: Actions = {
	submitGuess: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const guess = (formData.get('guess') as string)?.toLowerCase().trim();

		const wordCookie = cookies.get(WORD_COOKIE);
		if (!wordCookie) return fail(400, { error: 'No hay palabra activa' });

		const [lengthStr, target] = wordCookie.split(':');
		const wordLength = parseInt(lengthStr);

		if (!guess || guess.length !== wordLength) {
			return fail(400, { error: `La palabra debe tener ${wordLength} letras` });
		}

		if (!isValidWord(guess)) {
			return fail(400, { error: 'Palabra no válida' });
		}

		const stateCookie = cookies.get(STATE_COOKIE);
		const state: LingoState = stateCookie ? JSON.parse(stateCookie) : freshState();
		if (state.bonusLetter === undefined) state.bonusLetter = null;
		if (state.bonusPosition === undefined) state.bonusPosition = null;
		if (state.missedAttempts === undefined) state.missedAttempts = 0;

		if (state.phase !== 'guessing' && state.phase !== 'bonus') {
			return fail(400, { error: 'No estás en fase de adivinar' });
		}

		// Server-side timer check (2s grace)
		const elapsed = Date.now() - state.roundStartedAt;
		if (elapsed > (TIMER_SECONDS + TIMER_GRACE_SECONDS) * 1000) {
			// Timer expired — treat as a missed attempt
			return await handleTimerExpiry(state, cookies, target, wordLength, locals);
		}

		const feedback = evaluateGuess(guess, target);
		const newGuesses = [...state.guesses, guess];

		let gameState = createLingoRound(target, LINGO_MAX_ATTEMPTS);
		for (const g of newGuesses) {
			const updated = applyGuess(gameState, g, target);
			gameState = { ...updated, firstLetter: target[0], roundStartedAt: state.roundStartedAt };
		}

		const won = gameState.status === 'won';
		const lost = gameState.status === 'lost';
		state.guesses = newGuesses;

		if (won) {
			const preNum = pickRandomCardNumber(state.bingoCard, state.markedNumbers);
			if (preNum !== null) {
				state.markedNumbers = [...state.markedNumbers, { number: preNum, source: 'word' }];
			}
			state.wordsGuessed += 1;
			state.phase = 'balls';
			state.ballPit = generateBallPit();
			state.roundStartedAt = Date.now();
			state.bonusLetter = null;
			state.bonusPosition = null;
			state.missedAttempts = 0;
		} else if (lost) {
			// All attempts used (incl. bonus if in bonus phase)
			if (state.phase === 'bonus') {
				// Bonus attempt also failed — reveal word, advance without balls
				if (state.roundNumber >= ROUNDS_PER_GAME) {
					state.phase = 'done';
				} else {
					const newWord = getGameWord(wordLength, state.roundNumber + 1);
					state.roundNumber += 1;
					state.guesses = [];
					state.missedAttempts = 0;
					state.phase = 'guessing';
					state.ballPit = generateBallPit();
					state.roundStartedAt = Date.now();
					state.bonusLetter = null;
					state.bonusPosition = null;
					cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
					cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
					return {
						feedback,
						gameStatus: 'lost' as const,
						revealedLetters: gameState.revealedLetters,
						phase: state.phase,
						word: target,
						roundNumber: state.roundNumber,
						bonusLetter: null as string | null,
						bonusPosition: null as number | null
					};
				}
			} else {
				// 6 regular attempts used — enter bonus phase with extra letter hint
				state.phase = 'bonus';
				const bonus = pickBonusPosition(target, newGuesses);
				state.bonusLetter = bonus?.letter ?? null;
				state.bonusPosition = bonus?.position ?? null;
				state.roundStartedAt = Date.now();
				state.guesses = newGuesses;
				cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
				return {
					feedback,
					gameStatus: 'playing' as const,
					revealedLetters: gameState.revealedLetters,
					phase: 'bonus' as const,
					bonusLetter: state.bonusLetter,
					bonusPosition: state.bonusPosition,
					markedNumbers: state.markedNumbers,
					bingo: state.bingo
				};
			}
		} else {
			state.roundStartedAt = Date.now(); // reset timer for next attempt
		}

		// Check bingo after word-correct pre-mark
		if (!state.bingo) {
			state.bingo = checkBingo(state.bingoCard, state.markedNumbers);
		}

		if (state.phase === 'done' && locals.user) {
			await upsertScores(locals.user.id, wordLength, state);
		}

		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);

		return {
			feedback,
			gameStatus: gameState.status,
			revealedLetters: gameState.revealedLetters,
			phase: state.phase,
			word: lost ? target : undefined,
			markedNumbers: state.markedNumbers,
			bingo: state.bingo,
			bonusLetter: state.bonusLetter as string | null,
			bonusPosition: state.bonusPosition as number | null
		};
	},

	// Called by the client when the countdown timer fires (auto-advance)
	timerExpired: async ({ cookies, locals }) => {
		const wordCookie = cookies.get(WORD_COOKIE);
		if (!wordCookie) return fail(400, { error: 'No hay palabra activa' });

		const [lengthStr, target] = wordCookie.split(':');
		const wordLength = parseInt(lengthStr);

		const stateCookie = cookies.get(STATE_COOKIE);
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const state: LingoState = JSON.parse(stateCookie);
		if (state.bonusLetter === undefined) state.bonusLetter = null;
		if (state.bonusPosition === undefined) state.bonusPosition = null;

		return await handleTimerExpiry(state, cookies, target, wordLength, locals);
	},

	pickBall: async ({ request, cookies }) => {
		const formData = await request.formData();
		const ballIndex = parseInt(formData.get('ballIndex') as string);

		const stateCookie = cookies.get(STATE_COOKIE);
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const state: LingoState = JSON.parse(stateCookie);
		if (state.phase !== 'balls') return fail(400, { error: 'No estás en fase de bolas' });

		const ball = state.ballPit[ballIndex];
		if (!ball || ball.picked) return fail(400, { error: 'Bola no válida' });

		ball.picked = true;
		let newMarked = [...state.markedNumbers];

		if (ball.type === 'green') {
			const num = pickRandomCardNumber(state.bingoCard, newMarked);
			if (num !== null) {
				newMarked = [...newMarked, { number: num, source: 'ball' }];
			}
		}

		state.markedNumbers = newMarked;
		state.ballPit = state.ballPit.map((b, i) => (i === ballIndex ? { ...b, picked: true } : b));

		if (!state.bingo) {
			state.bingo = checkBingo(state.bingoCard, newMarked);
		}

		if (ball.type === 'gold') {
			state.phase = 'gold';
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
		} else {
			await advanceRound(state, cookies);
		}

		return {
			pickedBall: ball,
			markedNumbers: newMarked,
			bingo: state.bingo,
			phase: state.phase
		};
	},

	pickCardNumber: async ({ request, cookies }) => {
		const formData = await request.formData();
		const number = parseInt(formData.get('number') as string);

		const stateCookie = cookies.get(STATE_COOKIE);
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const state: LingoState = JSON.parse(stateCookie);
		if (state.phase !== 'gold') return fail(400, { error: 'No estás en fase dorada' });

		const allCardNums = state.bingoCard.flat().filter((n) => n !== 0);
		const alreadyMarked = new Set(state.markedNumbers.map((m) => m.number));
		if (!allCardNums.includes(number) || alreadyMarked.has(number)) {
			return fail(400, { error: 'Número no válido' });
		}

		state.markedNumbers = [...state.markedNumbers, { number, source: 'ball' }];

		if (!state.bingo) {
			state.bingo = checkBingo(state.bingoCard, state.markedNumbers);
		}

		await advanceRound(state, cookies);

		return {
			markedNumbers: state.markedNumbers,
			bingo: state.bingo,
			phase: state.phase
		};
	},

	newGame: async ({ cookies }) => {
		cookies.delete(WORD_COOKIE, { path: '/lingo' });
		cookies.delete(STATE_COOKIE, { path: '/lingo' });

		return { ok: true };
	}
};

/**
 * Handle a timer expiry: count as a missed attempt, enter bonus phase or advance round.
 */
async function handleTimerExpiry(
	state: LingoState,
	cookies: import('@sveltejs/kit').Cookies,
	target: string,
	wordLength: number,
	locals: App.Locals
) {
	if (state.phase === 'bonus') {
		// Bonus timer expired — reveal word, advance without balls
		if (state.roundNumber >= ROUNDS_PER_GAME) {
			state.phase = 'done';
			if (locals.user) await upsertScores(locals.user.id, wordLength, state);
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
			return { timedOut: true, phase: 'done' as const, word: target, roundNumber: state.roundNumber, bonusLetter: state.bonusLetter };
		} else {
			const newWord = getGameWord(wordLength, state.roundNumber + 1);
			state.roundNumber += 1;
			state.guesses = [];
			state.missedAttempts = 0;
			state.phase = 'guessing';
			state.ballPit = generateBallPit();
			state.roundStartedAt = Date.now();
			state.bonusLetter = null;
			state.bonusPosition = null;
			cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
			return { timedOut: true, phase: 'guessing' as const, word: target, roundNumber: state.roundNumber, bonusLetter: null as string | null, bonusPosition: null as number | null };
		}
	}

	// Regular guessing phase: count missed attempt
	state.missedAttempts += 1;
	const totalAttempts = state.guesses.length + state.missedAttempts;

	if (totalAttempts >= LINGO_MAX_ATTEMPTS) {
		// Enter bonus phase
		state.phase = 'bonus';
		const bonus = pickBonusPosition(target, state.guesses);
		state.bonusLetter = bonus?.letter ?? null;
		state.bonusPosition = bonus?.position ?? null;
		state.roundStartedAt = Date.now();
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
		return { timedOut: true, phase: 'bonus' as const, bonusLetter: state.bonusLetter, bonusPosition: state.bonusPosition, roundNumber: state.roundNumber };
	}

	// Still more attempts — reset the timer
	state.roundStartedAt = Date.now();
	cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
	return { timedOut: true, phase: 'guessing' as const, bonusLetter: null as string | null, bonusPosition: null as number | null, roundNumber: state.roundNumber };
}

async function advanceRound(
	state: LingoState,
	cookies: import('@sveltejs/kit').Cookies
) {
	if (state.roundNumber >= ROUNDS_PER_GAME) {
		state.phase = 'done';
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
		return;
	}

	const wordLength = LINGO_WORD_LENGTH;
	const newWord = getGameWord(wordLength, state.roundNumber + 1);

	state.roundNumber += 1;
	state.guesses = [];
	state.missedAttempts = 0;
	state.phase = 'guessing';
	state.ballPit = generateBallPit();
	state.roundStartedAt = Date.now();
	state.bonusLetter = null;
	state.bonusPosition = null;

	cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
	cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
}

async function upsertScores(userId: string, wordLength: number, state: LingoState) {
	const existing = await db
		.select()
		.from(scores)
		.where(and(eq(scores.userId, userId), eq(scores.game, 'lingo'), eq(scores.wordLength, wordLength)))
		.limit(1);

	const won = state.bingo;

	if (existing.length === 0) {
		await db.insert(scores).values({
			userId,
			game: 'lingo',
			wordLength,
			wins: won ? 1 : 0,
			losses: won ? 0 : 1,
			totalScore: state.wordsGuessed * 10 + (won ? 25 : 0),
			currentStreak: won ? 1 : 0,
			bestStreak: won ? 1 : 0
		});
	} else {
		const s = existing[0];
		const newStreak = won ? s.currentStreak + 1 : 0;
		await db
			.update(scores)
			.set({
				wins: won ? s.wins + 1 : s.wins,
				losses: won ? s.losses : s.losses + 1,
				totalScore: s.totalScore + state.wordsGuessed * 10 + (won ? 25 : 0),
				currentStreak: newStreak,
				bestStreak: Math.max(s.bestStreak, newStreak),
				updatedAt: new Date()
			})
			.where(eq(scores.id, s.id));
	}
}
