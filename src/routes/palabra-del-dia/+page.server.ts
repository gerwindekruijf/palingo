import { getWord } from '$lib/server/words/get-word';
import { db } from '$lib/server/db';
import { scores } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const lengthParam = Number(url.searchParams.get('length') ?? '5');
	const wordLength = [4, 5, 6, 7].includes(lengthParam) ? lengthParam : 5;
	const gameIndex = Math.max(0, parseInt(url.searchParams.get('gameIndex') ?? '0') || 0);

	// Load scores for all word lengths if logged in
	let userScores: Record<number, { wins: number; losses: number; currentStreak: number; bestStreak: number }> | null = null;
	if (locals.user) {
		const rows = await db
			.select()
			.from(scores)
			.where(
				and(
					eq(scores.userId, locals.user.id),
					eq(scores.game, 'palabra')
				)
			);
		userScores = {};
		for (const row of rows) {
			userScores[row.wordLength] = {
				wins: row.wins,
				losses: row.losses,
				currentStreak: row.currentStreak,
				bestStreak: row.bestStreak
			};
		}
	}

	return {
		wordLength,
		words: {
			4: getWord(4, gameIndex),
			5: getWord(5, gameIndex),
			6: getWord(6, gameIndex),
			7: getWord(7, gameIndex)
		} as Record<number, string>,
		user: locals.user ?? null,
		userScores
	};
};

export const actions: Actions = {
	saveScore: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const wordLength = parseInt(formData.get('wordLength') as string);
		const won = formData.get('won') === 'true';

		if (![4, 5, 6, 7].includes(wordLength)) {
			return fail(400, { error: 'Invalid word length' });
		}

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
				totalScore: 0,
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
					currentStreak: newStreak,
					bestStreak: Math.max(s.bestStreak, newStreak),
					updatedAt: new Date()
				})
				.where(eq(scores.id, s.id));
		}

		// Return updated scores
		const updated = await db
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

		const row = updated[0];
		return {
			scores: {
				wins: row.wins,
				losses: row.losses,
				currentStreak: row.currentStreak,
				bestStreak: row.bestStreak
			}
		};
	}
};
