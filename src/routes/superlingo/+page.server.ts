import { db } from '$lib/server/db';
import { scores } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ROUNDS_PER_GAME, SUPERLINGO_WORD_LENGTH } from '$lib/config/constants';
import { getWord, getPuzzleWord } from '$lib/server/words/get-word';

export const load: PageServerLoad = async ({ url, locals }) => {
	const gameIndex = Math.max(0, parseInt(url.searchParams.get('gameIndex') ?? '0') || 0);

	// Generate words for all rounds upfront, offset by gameIndex so each new game is fresh
	const words: string[] = [];
	for (let r = 1; r <= ROUNDS_PER_GAME; r++) {
		words.push(getWord(SUPERLINGO_WORD_LENGTH, gameIndex * ROUNDS_PER_GAME + r));
	}

	const puzzleWord = getPuzzleWord(gameIndex);

	let userScores = null;
	if (locals.user) {
		const result = await db
			.select()
			.from(scores)
			.where(
				and(
					eq(scores.userId, locals.user.id),
					eq(scores.game, 'superlingo'),
					eq(scores.wordLength, SUPERLINGO_WORD_LENGTH)
				)
			)
			.limit(1);
		userScores = result[0] ?? null;
	}

	return {
		words,
		puzzleWord,
		wordLength: SUPERLINGO_WORD_LENGTH,
		totalRounds: ROUNDS_PER_GAME,
		scores: userScores,
		user: locals.user ?? null
	};
};

export const actions: Actions = {
	saveScore: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const won = formData.get('won') === 'true';
		const wordsGuessed = parseInt(formData.get('wordsGuessed') as string) || 0;

		const wordLength = SUPERLINGO_WORD_LENGTH;

		const existing = await db
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

		if (existing.length === 0) {
			await db.insert(scores).values({
				userId: locals.user.id,
				game: 'superlingo',
				wordLength,
				wins: won ? 1 : 0,
				losses: won ? 0 : 1,
				totalScore: wordsGuessed * 10 + (won ? 50 : 0),
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
					totalScore: s.totalScore + wordsGuessed * 10 + (won ? 50 : 0),
					currentStreak: newStreak,
					bestStreak: Math.max(s.bestStreak, newStreak),
					updatedAt: new Date()
				})
				.where(eq(scores.id, s.id));
		}

		return { ok: true };
	}
};
