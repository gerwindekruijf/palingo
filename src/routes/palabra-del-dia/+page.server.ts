import { db } from '$lib/server/db';
import { words, scores } from '$lib/server/db/schema';
import { evaluateGuess, createGameState, applyGuess } from '$lib/game/word-engine';
import { eq, and, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const WORD_COOKIE = 'pal_word';
const GUESSES_COOKIE = 'pal_guesses';
const COOKIE_OPTS = {
	httpOnly: true,
	secure: false, // set true in prod behind HTTPS
	sameSite: 'lax' as const,
	path: '/palabra-del-dia',
	maxAge: 60 * 60 * 24
};

async function getRandomWord(length: number): Promise<string> {
	const result = await db
		.select({ word: words.word })
		.from(words)
		.where(and(eq(words.length, length), eq(words.isActive, true)))
		.orderBy(sql`random()`)
		.limit(1);
	return result[0]?.word ?? 'gatos';
}

export const load: PageServerLoad = async ({ cookies, url, locals }) => {
	const lengthParam = Number(url.searchParams.get('length') ?? '5');
	const wordLength = [4, 5, 6, 7].includes(lengthParam) ? lengthParam : 5;

	const wordCookie = cookies.get(WORD_COOKIE);
	const storedLength = wordCookie ? Number(wordCookie.split(':')[0]) : null;

	let target: string;

	// Pick a new word if no cookie, wrong length, or game already finished
	const guessesCookie = cookies.get(GUESSES_COOKIE);
	const previousGuesses: string[] = guessesCookie ? JSON.parse(guessesCookie) : [];

	// Rebuild game state to know if the previous game is done
	let gameState = createGameState(wordLength);
	const cookieWord = wordCookie && storedLength === wordLength ? wordCookie.split(':')[1] : null;

	if (cookieWord && gameState.status === 'playing') {
		target = cookieWord;
		for (const g of previousGuesses) {
			gameState = applyGuess(gameState, g, target);
		}
		// If game was already over from cookies, keep showing it (newGame action resets)
	} else {
		// New word needed
		target = await getRandomWord(wordLength);
		cookies.set(WORD_COOKIE, `${wordLength}:${target}`, COOKIE_OPTS);
		cookies.set(GUESSES_COOKIE, '[]', COOKIE_OPTS);
		gameState = createGameState(wordLength);
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
					eq(scores.game, 'palabra'),
					eq(scores.wordLength, wordLength)
				)
			)
			.limit(1);
		userScores = result[0] ?? null;
	}

	return {
		wordLength,
		gameState: {
			wordLength: gameState.wordLength,
			maxAttempts: gameState.maxAttempts,
			guesses: gameState.guesses,
			status: gameState.status,
			revealedLetters: gameState.revealedLetters
		},
		scores: userScores,
		user: locals.user ?? null
	};
};

export const actions: Actions = {
	checkGuess: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const guess = (formData.get('guess') as string)?.toLowerCase().trim();

		const wordCookie = cookies.get(WORD_COOKIE);
		if (!wordCookie) return fail(400, { error: 'No hay palabra activa' });

		const [lengthStr, target] = wordCookie.split(':');
		const wordLength = parseInt(lengthStr);

		if (!guess || guess.length !== wordLength) {
			return fail(400, { error: `La palabra debe tener ${wordLength} letras` });
		}

		const guessesCookie = cookies.get(GUESSES_COOKIE);
		const previousGuesses: string[] = guessesCookie ? JSON.parse(guessesCookie) : [];

		// Rebuild current game state
		let gameState = createGameState(wordLength);
		for (const g of previousGuesses) {
			gameState = applyGuess(gameState, g, target);
		}

		if (gameState.status !== 'playing') {
			return fail(400, { error: 'La partida ya ha terminado' });
		}

		const feedback = evaluateGuess(guess, target);
		const newGuesses = [...previousGuesses, guess];
		gameState = applyGuess(gameState, guess, target);

		cookies.set(GUESSES_COOKIE, JSON.stringify(newGuesses), COOKIE_OPTS);

		// Save scores for logged-in users when game ends
		if (gameState.status !== 'playing' && locals.user) {
			const won = gameState.status === 'won';
			const existing = await db
				.select()
				.from(scores)
				.where(
					and(
						eq(scores.userId, locals.user.id),
						eq(scores.game, 'palabra'),
						eq(scores.wordLength, wordLength)
					)
				)
				.limit(1);

			if (existing.length === 0) {
				await db.insert(scores).values({
					userId: locals.user.id,
					game: 'palabra',
					wordLength,
					wins: won ? 1 : 0,
					losses: won ? 0 : 1,
					totalScore: won ? 10 : 0,
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
						totalScore: s.totalScore + (won ? 10 : 0),
						currentStreak: newStreak,
						bestStreak: Math.max(s.bestStreak, newStreak),
						updatedAt: new Date()
					})
					.where(eq(scores.id, s.id));
			}
		}

		return {
			feedback,
			gameStatus: gameState.status,
			revealedLetters: gameState.revealedLetters,
			word: gameState.status !== 'playing' ? target : undefined
		};
	},

	newGame: async ({ cookies, request }) => {
		const formData = await request.formData();
		const lengthParam = Number(formData.get('length') ?? '5');
		const wordLength = [4, 5, 6, 7].includes(lengthParam) ? lengthParam : 5;

		// Clear cookies — the load function will pick a new word
		cookies.delete(WORD_COOKIE, { path: '/palabra-del-dia' });
		cookies.delete(GUESSES_COOKIE, { path: '/palabra-del-dia' });

		return { newGame: true, wordLength };
	}
};
