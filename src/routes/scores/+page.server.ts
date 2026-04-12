import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { scores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { scores: [] };
	}

	const userScores = await db
		.select()
		.from(scores)
		.where(eq(scores.userId, locals.user.id));

	return { scores: userScores };
};
