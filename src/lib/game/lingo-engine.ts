import type { GameState } from './word-engine';
import { createGameState } from './word-engine';

export const ROUNDS_PER_GAME = 5;

export interface LingoRoundState extends GameState {
	firstLetter: string;
	roundStartedAt: number; // unix ms
}

export interface Ball {
	number: number;
	type: 'blue' | 'green' | 'gold';
	picked: boolean;
}

export type BingoResult = false | 'row' | 'col' | 'diag';

// How a number ended up marked on the card
export type MarkSource = 'word' | 'ball' | 'free';

export interface MarkedNumber {
	number: number;
	source: MarkSource;
}

export function createLingoRound(word: string, maxAttempts = 6): LingoRoundState {
	return {
		...createGameState(word.length, maxAttempts),
		firstLetter: word[0],
		roundStartedAt: Date.now()
	};
}

/**
 * Generates a classic 5×5 B-I-N-G-O card.
 * B: 1–15, I: 16–30, N: 31–45 (center free = 0), G: 46–60, O: 61–75
 */
export function generateBingoCard(): number[][] {
	const ranges = [
		[1, 15],
		[16, 30],
		[31, 45],
		[46, 60],
		[61, 75]
	];

	const card: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));

	for (let col = 0; col < 5; col++) {
		const [min, max] = ranges[col];
		const pool = shuffle(range(min, max));
		for (let row = 0; row < 5; row++) {
			if (col === 2 && row === 2) {
				card[row][col] = 0; // FREE center
			} else {
				card[row][col] = pool[row];
			}
		}
	}

	return card;
}

/**
 * Ball pit for "ballen pakken":
 * 11 blue (nothing extra), 4 green (mark 1 extra number), 1 gold (player chooses a number)
 * Numbers are drawn from the B-I-N-G-O range 1–75.
 */
export function generateBallPit(): Ball[] {
	const numbers = shuffle(range(1, 75)).slice(0, 16);
	const types: Ball['type'][] = [
		...Array(11).fill('blue'),
		...Array(4).fill('green'),
		'gold'
	];
	const shuffledTypes = shuffle(types) as Ball['type'][];

	return numbers.map((number, i) => ({
		number,
		type: shuffledTypes[i],
		picked: false
	}));
}

/**
 * Pick a random unmarked number from the bingo card.
 * Returns null if all numbers are already marked.
 */
export function pickRandomCardNumber(card: number[][], marked: MarkedNumber[]): number | null {
	const markedNums = new Set(marked.map((m) => m.number));
	// Flatten all card numbers, exclude 0 (FREE) and already marked
	const available = card
		.flat()
		.filter((n) => n !== 0 && !markedNums.has(n));

	if (available.length === 0) return null;
	return available[Math.floor(Math.random() * available.length)];
}

/**
 * Check if any row, column, or diagonal is fully marked.
 * 0 (FREE center) is always considered marked.
 */
export function checkBingo(card: number[][], marked: MarkedNumber[]): BingoResult {
	const markedSet = new Set([...marked.map((m) => m.number), 0]);

	for (let r = 0; r < 5; r++) {
		if (card[r].every((n) => markedSet.has(n))) return 'row';
	}
	for (let c = 0; c < 5; c++) {
		if (card.every((row) => markedSet.has(row[c]))) return 'col';
	}
	if ([0, 1, 2, 3, 4].every((i) => markedSet.has(card[i][i]))) return 'diag';
	if ([0, 1, 2, 3, 4].every((i) => markedSet.has(card[i][4 - i]))) return 'diag';

	return false;
}

// Helpers
function range(from: number, to: number): number[] {
	return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
