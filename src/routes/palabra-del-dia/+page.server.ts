import { getWord } from '$lib/server/words/get-word';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const lengthParam = Number(url.searchParams.get('length') ?? '5');
	const wordLength = [4, 5, 6, 7].includes(lengthParam) ? lengthParam : 5;

	return {
		wordLength,
		words: {
			4: getWord(4),
			5: getWord(5),
			6: getWord(6),
			7: getWord(7)
		} as Record<number, string>
	};
};
