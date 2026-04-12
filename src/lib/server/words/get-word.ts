import { readFileSync } from 'fs';
import { resolve } from 'path';

const cache = new Map<number, string[]>();

function loadWords(length: number): string[] {
	if (cache.has(length)) return cache.get(length)!;

	try {
		const filePath = resolve(`src/lib/data/valid-words-${length}.txt`);
		const content = readFileSync(filePath, 'utf-8');
		const words = content
			.split('\n')
			.map((w) => w.trim().toLowerCase())
			.filter((w) => w.length > 0);
		cache.set(length, words);
		return words;
	} catch {
		cache.set(length, []);
		return [];
	}
}

/**
 * Simple deterministic hash for seeding word selection.
 * Same date + same gameIndex = same word for all users.
 */
function seededIndex(seed: string, max: number): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash * 31 + seed.charCodeAt(i)) | 0;
	}
	return ((hash % max) + max) % max;
}

/**
 * Get a word of a given length, deterministic per day + game index.
 * - All users get the same word for the same (date, gameIndex, length).
 * - gameIndex lets you get different words for subsequent rounds/games in a session.
 */
export function getWord(length: number, gameIndex: number = 0): string {
	const words = loadWords(length);
	if (words.length === 0) return 'gatos';

	const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const seed = `${today}-${length}-${gameIndex}`;
	return words[seededIndex(seed, words.length)];
}

/**
 * Get a puzzle word (12-14 letters) for SuperLingo, deterministic per day.
 */
export function getPuzzleWord(gameIndex: number = 0): string {
	// Try 12, 13, 14 letter words combined
	const all = [...loadWords(12), ...loadWords(13), ...loadWords(14)];
	if (all.length === 0) return 'conocimiento';

	const today = new Date().toISOString().slice(0, 10);
	const seed = `puzzle-${today}-${gameIndex}`;
	return all[seededIndex(seed, all.length)];
}
