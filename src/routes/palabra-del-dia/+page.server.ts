import { db } from '$lib/server/db';
import { words } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

async function getRandomWord(length: number): Promise<string> {
	const result = await db
		.select({ word: words.word })
		.from(words)
		.where(and(eq(words.length, length), eq(words.isActive, true)))
		.orderBy(sql`random()`)
		.limit(1);
	return result[0]?.word ?? 'gatos';
}

export const load: PageServerLoad = async ({ url }) => {
	const lengthParam = Number(url.searchParams.get('length') ?? '5');
	const wordLength = [4, 5, 6, 7].includes(lengthParam) ? lengthParam : 5;

	// Return one word per length so the client can cache them all in sessionStorage
	const [w4, w5, w6, w7] = await Promise.all([
		getRandomWord(4),
		getRandomWord(5),
		getRandomWord(6),
		getRandomWord(7)
	]);

	return {
		wordLength,
		words: { 4: w4, 5: w5, 6: w6, 7: w7 } as Record<number, string>
	};
};
