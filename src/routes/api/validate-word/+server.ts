import { json } from '@sveltejs/kit';
import { isValidWord } from '$lib/server/words/validate-word';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const word = url.searchParams.get('word')?.toLowerCase().trim();
	if (!word) return json({ valid: false });
	return json({ valid: isValidWord(word) });
};
