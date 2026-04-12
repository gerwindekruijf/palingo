import type { GameState } from './word-engine';
import { createGameState } from './word-engine';
export { ROUNDS_PER_GAME } from '$lib/config/constants';

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

export function createLingoRound(word: string, maxAttempts: number): LingoRoundState {
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

// ─── SuperLingo ───────────────────────────────────────────────────────────────

/**
 * A letter ball for SuperLingo.
 * letters: '' (empty/blank), or 1-2 letter string placed in the puzzle word.
 * positions: which indices in the puzzle word this ball reveals.
 */
export interface LetterBall {
	id: number;
	letters: string; // '' | single char | two chars
	positions: number[]; // indices into puzzleWord
	picked: boolean;
}

/**
 * Generate 15 letter balls from a puzzle word (12-13 chars).
 * Distribution: (len-2) single-letter balls + 1 double-letter ball + 2 empty balls = 15 total.
 * Picking all non-empty balls reveals every position in the puzzle word exactly once.
 */
export function generateLetterBalls(puzzleWord: string): LetterBall[] {
	const len = puzzleWord.length; // 12 or 13
	// Shuffle all position indices so assignment is random
	const positions = shuffle(Array.from({ length: len }, (_, i) => i));

	const balls: LetterBall[] = [];
	const singleCount = len - 2; // 10 for 12-char, 11 for 13-char

	// (len-2) single-letter balls
	for (let i = 0; i < singleCount; i++) {
		balls.push({
			id: i,
			letters: puzzleWord[positions[i]],
			positions: [positions[i]],
			picked: false
		});
	}
	// 1 double-letter ball covering the last 2 positions
	balls.push({
		id: singleCount,
		letters: puzzleWord[positions[singleCount]] + puzzleWord[positions[singleCount + 1]],
		positions: [positions[singleCount], positions[singleCount + 1]],
		picked: false
	});
	// 2 empty balls
	balls.push({ id: singleCount + 1, letters: '', positions: [], picked: false });
	balls.push({ id: singleCount + 2, letters: '', positions: [], picked: false });

	// Shuffle order and re-assign sequential ids
	return shuffle(balls).map((b, i) => ({ ...b, id: i }));
}

/**
 * Build the revealed state of a puzzle word given which balls have been picked.
 * Returns an array of { letter | null } — null means not yet revealed.
 */
export function buildRevealedPuzzle(puzzleWord: string, balls: LetterBall[]): (string | null)[] {
	const revealed: (string | null)[] = Array(puzzleWord.length).fill(null);
	for (const ball of balls) {
		if (ball.picked) {
			for (const pos of ball.positions) {
				revealed[pos] = puzzleWord[pos];
			}
		}
	}
	return revealed;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// Helpers
function range(from: number, to: number): number[] {
	return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
