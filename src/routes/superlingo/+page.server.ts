import { db } from '$lib/server/db';
import { words, scores } from '$lib/server/db/schema';
import { evaluateGuess, applyGuess } from '$lib/game/word-engine';
import {
	createLingoRound,
	generateLetterBalls,
	buildRevealedPuzzle,
	ROUNDS_PER_GAME,
	MAX_ATTEMPTS,
	TIMER_SECONDS
} from '$lib/game/lingo-engine';
import type { LetterBall } from '$lib/game/lingo-engine';
import { getRandomPuzzleWord } from '$lib/server/words/puzzle-words';
import { eq, and, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const WORD_COOKIE = 'superlingo_word';
const STATE_COOKIE = 'superlingo_state';
const PUZZLE_COOKIE = 'superlingo_puzzle';

const COOKIE_OPTS = {
	httpOnly: true,
	secure: false,
	sameSite: 'lax' as const,
	path: '/superlingo',
	maxAge: 60 * 60 * 4
};

interface SuperLingoState {
	guesses: string[];
	missedAttempts: number;
	phase: 'guessing' | 'bonus' | 'balls' | 'done';
	roundNumber: number; // 1–ROUNDS_PER_GAME
	wordsGuessed: number;
	balls: LetterBall[];
	roundStartedAt: number;
	bonusLetter: string | null;
	// Puzzle word is stored in PUZZLE_COOKIE (hidden), revealed positions tracked here
	puzzleRevealed: (string | null)[]; // null = hidden, string = revealed letter
	puzzleWon: boolean;
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

function freshState(puzzleWord: string): SuperLingoState {
	const balls = generateLetterBalls(puzzleWord);
	const revealed: (string | null)[] = Array(puzzleWord.length).fill(null);
	return {
		guesses: [],
		missedAttempts: 0,
		phase: 'guessing',
		roundNumber: 1,
		wordsGuessed: 0,
		balls,
		roundStartedAt: Date.now(),
		bonusLetter: null,
		puzzleRevealed: revealed,
		puzzleWon: false
	};
}

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const wordLength = 6;

	const wordCookie = cookies.get(WORD_COOKIE);
	const stateCookie = cookies.get(STATE_COOKIE);
	const puzzleCookie = cookies.get(PUZZLE_COOKIE);

	let target: string;
	let puzzleWord: string;
	let state: SuperLingoState;

	const cookieLengthMatch = wordCookie && Number(wordCookie.split(':')[0]) === wordLength;

	if (cookieLengthMatch && stateCookie && puzzleCookie) {
		target = wordCookie.split(':')[1];
		puzzleWord = puzzleCookie;
		state = JSON.parse(stateCookie);
		if (state.missedAttempts === undefined) state.missedAttempts = 0;
		if (state.bonusLetter === undefined) state.bonusLetter = null;
	} else {
		target = await getRandomWord(wordLength);
		puzzleWord = getRandomPuzzleWord();
		state = freshState(puzzleWord);
		cookies.set(WORD_COOKIE, `${wordLength}:${target}`, COOKIE_OPTS);
		cookies.set(PUZZLE_COOKIE, puzzleWord, COOKIE_OPTS);
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
					eq(scores.game, 'superlingo'),
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
		balls: state.balls,
		puzzleLength: puzzleWord.length,
		puzzleRevealed: state.puzzleRevealed,
		puzzleWon: state.puzzleWon,
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

		const wordLength = 6;
		const target = wordCookie.split(':')[1];

		if (!guess || guess.length !== wordLength) {
			return fail(400, { error: `La palabra debe tener ${wordLength} letras` });
		}

		const stateCookie = cookies.get(STATE_COOKIE);
		const puzzleWord = cookies.get(PUZZLE_COOKIE) ?? '';
		const state: SuperLingoState = stateCookie ? JSON.parse(stateCookie) : freshState(puzzleWord);
		if (state.missedAttempts === undefined) state.missedAttempts = 0;
		if (state.bonusLetter === undefined) state.bonusLetter = null;

		if (state.phase !== 'guessing' && state.phase !== 'bonus') {
			return fail(400, { error: 'No estás en fase de adivinar' });
		}

		// Server-side timer check (2s grace)
		const elapsed = Date.now() - state.roundStartedAt;
		if (elapsed > (TIMER_SECONDS + 2) * 1000) {
			return await handleTimerExpiry(state, cookies, target, wordLength, puzzleWord, locals);
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
			state.wordsGuessed += 1;
			state.phase = 'balls';
			state.roundStartedAt = Date.now();
			state.bonusLetter = null;
			state.missedAttempts = 0;
		} else if (lost) {
			if (state.phase === 'bonus') {
				// Bonus attempt also failed — advance without balls
				if (state.roundNumber >= ROUNDS_PER_GAME) {
					state.phase = 'done';
				} else {
					const newWord = await getRandomWord(wordLength);
					state.roundNumber += 1;
					state.guesses = [];
					state.missedAttempts = 0;
					state.phase = 'guessing';
					state.roundStartedAt = Date.now();
					state.bonusLetter = null;
					cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
					cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
					return {
						feedback,
						gameStatus: 'lost' as const,
						revealedLetters: gameState.revealedLetters,
						phase: state.phase,
						word: target,
						roundNumber: state.roundNumber,
						bonusLetter: null as string | null
					};
				}
			} else {
				// Enter bonus phase
				state.phase = 'bonus';
				state.bonusLetter = target.length > 1 ? target[1] : null;
				state.roundStartedAt = Date.now();
				cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
				return {
					feedback,
					gameStatus: 'playing' as const,
					revealedLetters: gameState.revealedLetters,
					phase: 'bonus' as const,
					bonusLetter: state.bonusLetter
				};
			}
		} else {
			state.roundStartedAt = Date.now();
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
			puzzleRevealed: state.puzzleRevealed,
			bonusLetter: state.bonusLetter as string | null
		};
	},

	timerExpired: async ({ cookies, locals }) => {
		const wordCookie = cookies.get(WORD_COOKIE);
		if (!wordCookie) return fail(400, { error: 'No hay palabra activa' });

		const wordLength = 6;
		const target = wordCookie.split(':')[1];

		const stateCookie = cookies.get(STATE_COOKIE);
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const puzzleWord = cookies.get(PUZZLE_COOKIE) ?? '';
		const state: SuperLingoState = JSON.parse(stateCookie);
		if (state.missedAttempts === undefined) state.missedAttempts = 0;
		if (state.bonusLetter === undefined) state.bonusLetter = null;

		return await handleTimerExpiry(state, cookies, target, wordLength, puzzleWord, locals);
	},

	pickBall: async ({ request, cookies }) => {
		const formData = await request.formData();
		const ballId = parseInt(formData.get('ballId') as string);

		const stateCookie = cookies.get(STATE_COOKIE);
		const puzzleWord = cookies.get(PUZZLE_COOKIE) ?? '';
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const state: SuperLingoState = JSON.parse(stateCookie);
		if (state.phase !== 'balls') return fail(400, { error: 'No estás en fase de bolas' });

		const ball = state.balls.find((b) => b.id === ballId);
		if (!ball || ball.picked) return fail(400, { error: 'Bola no válida' });

		// Reveal letters in puzzle word
		ball.picked = true;
		state.balls = state.balls.map((b) => (b.id === ballId ? { ...b, picked: true } : b));
		state.puzzleRevealed = buildRevealedPuzzle(puzzleWord, state.balls);

		await advanceRound(state, cookies);

		return {
			pickedBall: ball,
			puzzleRevealed: state.puzzleRevealed,
			phase: state.phase
		};
	},

	guessPuzzle: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const puzzleGuess = (formData.get('puzzleGuess') as string)?.toLowerCase().trim();

		const stateCookie = cookies.get(STATE_COOKIE);
		const puzzleWord = cookies.get(PUZZLE_COOKIE) ?? '';
		if (!stateCookie) return fail(400, { error: 'Sin estado' });

		const state: SuperLingoState = JSON.parse(stateCookie);

		if (!puzzleGuess || puzzleGuess.length !== puzzleWord.length) {
			return fail(400, { error: `El puzzelwoord tiene ${puzzleWord.length} letras` });
		}

		const correct = puzzleGuess === puzzleWord;

		if (correct) {
			state.puzzleWon = true;
			state.phase = 'done';
			state.puzzleRevealed = Array.from(puzzleWord);
			if (locals.user) {
				await upsertScores(locals.user.id, 6, state);
			}
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
			return { puzzleCorrect: true, puzzleRevealed: state.puzzleRevealed, phase: 'done' as const };
		}

		// Wrong guess — just report wrong, game continues
		return { puzzleCorrect: false };
	},

	newGame: async ({ cookies }) => {
		cookies.delete(WORD_COOKIE, { path: '/superlingo' });
		cookies.delete(STATE_COOKIE, { path: '/superlingo' });
		cookies.delete(PUZZLE_COOKIE, { path: '/superlingo' });

		return { ok: true };
	}
};

async function handleTimerExpiry(
	state: SuperLingoState,
	cookies: import('@sveltejs/kit').Cookies,
	target: string,
	wordLength: number,
	puzzleWord: string,
	locals: App.Locals
) {
	if (state.phase === 'bonus') {
		if (state.roundNumber >= ROUNDS_PER_GAME) {
			state.phase = 'done';
			if (locals.user) await upsertScores(locals.user.id, wordLength, state);
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
			return { timedOut: true, phase: 'done' as const, word: target, roundNumber: state.roundNumber, bonusLetter: state.bonusLetter };
		} else {
			const newWord = await getRandomWord(wordLength);
			state.roundNumber += 1;
			state.guesses = [];
			state.missedAttempts = 0;
			state.phase = 'guessing';
			state.roundStartedAt = Date.now();
			state.bonusLetter = null;
			cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
			cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
			return { timedOut: true, phase: 'guessing' as const, word: target, roundNumber: state.roundNumber, bonusLetter: null as string | null };
		}
	}

	state.missedAttempts += 1;
	const totalAttempts = state.guesses.length + state.missedAttempts;

	if (totalAttempts >= MAX_ATTEMPTS) {
		state.phase = 'bonus';
		state.bonusLetter = target.length > 1 ? target[1] : null;
		state.roundStartedAt = Date.now();
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
		return { timedOut: true, phase: 'bonus' as const, bonusLetter: state.bonusLetter, roundNumber: state.roundNumber };
	}

	state.roundStartedAt = Date.now();
	cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
	return { timedOut: true, phase: 'guessing' as const, bonusLetter: null as string | null, roundNumber: state.roundNumber };
}

async function advanceRound(
	state: SuperLingoState,
	cookies: import('@sveltejs/kit').Cookies
) {
	if (state.roundNumber >= ROUNDS_PER_GAME) {
		state.phase = 'done';
		cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
		return;
	}

	const wordLength = 6;
	const newWord = await getRandomWord(wordLength);

	state.roundNumber += 1;
	state.guesses = [];
	state.missedAttempts = 0;
	state.phase = 'guessing';
	state.roundStartedAt = Date.now();
	state.bonusLetter = null;

	cookies.set(WORD_COOKIE, `${wordLength}:${newWord}`, COOKIE_OPTS);
	cookies.set(STATE_COOKIE, JSON.stringify(state), COOKIE_OPTS);
}

async function upsertScores(userId: string, wordLength: number, state: SuperLingoState) {
	const existing = await db
		.select()
		.from(scores)
		.where(and(eq(scores.userId, userId), eq(scores.game, 'superlingo'), eq(scores.wordLength, wordLength)))
		.limit(1);

	const won = state.puzzleWon;

	if (existing.length === 0) {
		await db.insert(scores).values({
			userId,
			game: 'superlingo',
			wordLength,
			wins: won ? 1 : 0,
			losses: won ? 0 : 1,
			totalScore: state.wordsGuessed * 10 + (won ? 50 : 0),
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
				totalScore: s.totalScore + state.wordsGuessed * 10 + (won ? 50 : 0),
				currentStreak: newStreak,
				bestStreak: Math.max(s.bestStreak, newStreak),
				updatedAt: new Date()
			})
			.where(eq(scores.id, s.id));
	}
}
