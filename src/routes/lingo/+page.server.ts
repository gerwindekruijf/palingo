import { db } from '$lib/server/db';
import { words, scores } from '$lib/server/db/schema';
import { evaluateGuess, applyGuess } from '$lib/game/word-engine';
import {
	createLingoRound,
	generateBingoCard,
	generateBallPit,
	checkBingo,
	pickRandomCardNumber,
	ROUNDS_PER_GAME
} from '$lib/game/lingo-engine';
import type { MarkedNumber, BingoResult } from '$lib/game/lingo-engine';
import { eq, and, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const WORD_COOKIE = 'lingo_word';
const STATE_COOKIE = 'lingo_state';
const TIMER_SECONDS = 15;

const COOKIE_OPTS = {
	httpOnly: true,
	secure: false,
	sameSite: 'lax' as const,
	path: '/lingo',
	maxAge: 60 * 60 * 4
};

interface LingoState {
	// Current word's guesses
	guesses: string[];
	// 'guessing' = actively guessing a word
	// 'balls'    = word was guessed, pick a ball
	// 'gold'     = gold ball picked, player must choose a card number
	// 'done'     = all 5 rounds played
	phase: 'guessing' | 'balls' | 'gold' | 'done';
	roundNumber: number; // 1–5
	wordsGuessed: number; // how many words correctly guessed
	bingoCard: number[][];
	markedNumbers: MarkedNumber[];
	bingo: BingoResult;
	ballPit: ReturnType<typeof generateBallPit>;
	roundStartedAt: number;
}

async function getRandomWord(length: number): Promise<string> {
	const result = await db
		.select({ word: words.word })
		.from(words)
		.where(and(eq(words.length, length), eq(words.isActive, true)))
		.orderBy(sql`random()`)
		.limit(1);
	return result[0]?.word ?? 'gatos';
}

function freshState(): LingoState {
	return {
		guesses: [],
		phase: 'guessing',
		roundNumber: 1,
		wordsGuessed: 0,
		bingoCard: generateBingoCard(),
		markedNumbers: [],
		bingo: false as BingoResult,
		ballPit: generateBallPit(),
		roundStartedAt: Date.now()
	};
}

export const load: PageServerLoad = async ({ cookies, url, locals }) => {
	const lengthParam = Number(url.searchParams.get('length') ?? '5');
	const wordLength = [4, 5, 6, 7].includes(lengthParam) ? lengthParam : 5;

	const wordCookie = cookies.get(WORD_COOKIE);
	const stateCookie = cookies.get(STATE_COOKIE);

	let target: string;
	let state: LingoState;

	const cookieLengthMatch = wordCookie && Number(wordCookie.split(':')[0]) === wordLength;

	if (cookieLengthMatch && stateCookie) {
		target = wordCookie.split(':')[1];
		state = JSON.parse(stateCookie);
	} else {
		target = await getRandomWord(wordLength);
		state = freshState();
		cookies.set(WORD_COOKIE, `${wordLength}:${target}`, COOKIE_OPTS);
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
	}

	// Rebuild game state from guesses
	let gameState = createLingoRound(target);
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

		const stateCookie = cookies.get(STATE_COOKIE);
		const state: LingoState = stateCookie ? JSON.parse(stateCookie) : freshState();

		if (state.phase !== 'guessing') return fail(400, { error: 'No estás en fase de adivinar' });

		// Server-side timer check (2s grace)
		const elapsed = Date.now() - state.roundStartedAt;
		if (elapsed > (TIMER_SECONDS + 2) * 1000) {
			state.roundStartedAt = Date.now();
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
			return fail(400, { error: '¡Tiempo agotado!' });
		}

		const feedback = evaluateGuess(guess, target);
		const newGuesses = [...state.guesses, guess];

		let gameState = createLingoRound(target);
		for (const g of newGuesses) {
			const updated = applyGuess(gameState, g, target);
			gameState = { ...updated, firstLetter: target[0], roundStartedAt: state.roundStartedAt };
		}

		const won = gameState.status === 'won';
		const lost = gameState.status === 'lost';
		state.guesses = newGuesses;

		if (won) {
			// Pre-mark 1 random card number for guessing the word correctly
			const preNum = pickRandomCardNumber(state.bingoCard, state.markedNumbers);
			if (preNum !== null) {
				state.markedNumbers = [...state.markedNumbers, { number: preNum, source: 'word' }];
			}
			state.wordsGuessed += 1;
			state.phase = 'balls';
			state.ballPit = generateBallPit();
			state.roundStartedAt = Date.now();
		} else if (lost) {
			// No ball phase — advance to next round or done
			if (state.roundNumber >= ROUNDS_PER_GAME) {
				state.phase = 'done';
			} else {
				// Move to next round immediately
				const newWord = await getRandomWord(wordLength);
				state.roundNumber += 1;
				state.guesses = [];
				state.phase = 'guessing';
				state.ballPit = generateBallPit();
				state.roundStartedAt = Date.now();
				cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
				cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
				return {
					feedback,
					gameStatus: 'lost' as const,
					revealedLetters: gameState.revealedLetters,
					phase: state.phase,
					word: target,
					roundNumber: state.roundNumber
				};
			}
		} else {
			state.roundStartedAt = Date.now(); // reset timer for next attempt
		}

		// Check bingo after word-correct pre-mark
		if (!state.bingo) {
			state.bingo = checkBingo(state.bingoCard, state.markedNumbers);
		}

		// Save scores for logged-in users when game ends
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
			bingo: state.bingo
		};
	},

	pickBall: async ({ request, cookies }) => {
		const formData = await request.formData();
		const ballIndex = parseInt(formData.get('ballIndex') as string);

		const wordCookie = cookies.get(WORD_COOKIE);
		const stateCookie = cookies.get(STATE_COOKIE);
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const state: LingoState = JSON.parse(stateCookie);
		if (state.phase !== 'balls') return fail(400, { error: 'No estás en fase de bolas' });

		const ball = state.ballPit[ballIndex];
		if (!ball || ball.picked) return fail(400, { error: 'Bola no válida' });

		ball.picked = true;
		let newMarked = [...state.markedNumbers];

		if (ball.type === 'green') {
			// Auto-mark a random card number
			const num = pickRandomCardNumber(state.bingoCard, newMarked);
			if (num !== null) {
				newMarked = [...newMarked, { number: num, source: 'ball' }];
			}
		}
		// Gold: player will choose — transition to 'gold' phase
		// Blue: nothing extra

		state.markedNumbers = newMarked;
		state.ballPit = state.ballPit.map((b, i) => (i === ballIndex ? { ...b, picked: true } : b));

		// Check bingo
		if (!state.bingo) {
			state.bingo = checkBingo(state.bingoCard, newMarked);
		}

		if (ball.type === 'gold') {
			state.phase = 'gold';
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
		} else {
			await advanceRound(state, cookies, wordCookie!);
		}

		return {
			pickedBall: ball,
			markedNumbers: newMarked,
			bingo: state.bingo,
			phase: state.phase
		};
	},

	pickCardNumber: async ({ request, cookies }) => {
		// Gold ball: player chose a specific card number to mark
		const formData = await request.formData();
		const number = parseInt(formData.get('number') as string);

		const wordCookie = cookies.get(WORD_COOKIE);
		const stateCookie = cookies.get(STATE_COOKIE);
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const state: LingoState = JSON.parse(stateCookie);
		if (state.phase !== 'gold') return fail(400, { error: 'No estás en fase dorada' });

		// Validate the number is actually on the card and not already marked
		const allCardNums = state.bingoCard.flat().filter((n) => n !== 0);
		const alreadyMarked = new Set(state.markedNumbers.map((m) => m.number));
		if (!allCardNums.includes(number) || alreadyMarked.has(number)) {
			return fail(400, { error: 'Número no válido' });
		}

		state.markedNumbers = [...state.markedNumbers, { number, source: 'ball' }];

		if (!state.bingo) {
			state.bingo = checkBingo(state.bingoCard, state.markedNumbers);
		}

		await advanceRound(state, cookies, wordCookie!);

		return {
			markedNumbers: state.markedNumbers,
			bingo: state.bingo,
			phase: state.phase
		};
	},

	nextRound: async ({ cookies }) => {
		const wordCookie = cookies.get(WORD_COOKIE);
		const stateCookie = cookies.get(STATE_COOKIE);
		if (!wordCookie || !stateCookie) return fail(400, { error: 'Sin estado' });

		const [lengthStr] = wordCookie.split(':');
		const wordLength = parseInt(lengthStr);
		const state: LingoState = JSON.parse(stateCookie);

		const newWord = await getRandomWord(wordLength);
		state.guesses = [];
		state.phase = 'guessing';
		state.ballPit = generateBallPit();
		state.roundStartedAt = Date.now();

		cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);

		return { ok: true };
	},

	newGame: async ({ cookies, request }) => {
		const formData = await request.formData();
		const lengthParam = Number(formData.get('length') ?? '5');
		const wordLength = [4, 5, 6, 7].includes(lengthParam) ? lengthParam : 5;

		cookies.delete(WORD_COOKIE, { path: '/lingo' });
		cookies.delete(STATE_COOKIE, { path: '/lingo' });

		return { ok: true, wordLength };
	}
};

/**
 * After ball picking: advance to next round (fetching a new word) or set phase to 'done'.
 * Mutates state in place and sets cookies.
 */
async function advanceRound(
	state: LingoState,
	cookies: import('@sveltejs/kit').Cookies,
	wordCookie: string
) {
	if (state.roundNumber >= ROUNDS_PER_GAME) {
		state.phase = 'done';
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
		return;
	}

	const [lengthStr] = wordCookie.split(':');
	const wordLength = parseInt(lengthStr);
	const newWord = await getRandomWord(wordLength);

	state.roundNumber += 1;
	state.guesses = [];
	state.phase = 'guessing';
	state.ballPit = generateBallPit();
	state.roundStartedAt = Date.now();

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
