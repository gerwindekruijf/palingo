import { readFileSync } from 'fs';
import { resolve } from 'path';

const cache = new Map<number, Set<string>>();

function stripAccents(s: string): string {
	return s.replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u');
}

function loadValidWords(length: number): Set<string> {
	if (cache.has(length)) return cache.get(length)!;

	try {
		const filePath = resolve(`src/lib/data/valid-words-${length}.txt`);
		const content = readFileSync(filePath, 'utf-8');
		const words = content
			.split('\n')
			.map((w) => stripAccents(w.trim().toLowerCase()))
			.filter((w) => w.length > 0);
		const set = new Set(words);
		cache.set(length, set);
		return set;
	} catch {
		const empty = new Set<string>();
		cache.set(length, empty);
		return empty;
	}
}

export function isValidWord(word: string): boolean {
	const set = loadValidWords(word.length);
	if (set.size === 0) return true;
	return set.has(word.toLowerCase());
}
