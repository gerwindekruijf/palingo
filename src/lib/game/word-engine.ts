export type TileState = 'correct' | 'present' | 'absent' | 'empty';

export interface GuessResult {
	letter: string;
	state: TileState;
}

export interface GameState {
	wordLength: number;
	maxAttempts: number;
	guesses: GuessResult[][];
	status: 'playing' | 'won' | 'lost';
	revealedLetters: Record<string, TileState>;
}

/**
 * Two-pass algorithm:
 * 1. Mark exact matches (correct)
 * 2. For remaining letters, mark present if found elsewhere (consuming each target letter once)
 */
export function evaluateGuess(guess: string, target: string): GuessResult[] {
	const result: GuessResult[] = Array.from(guess).map((letter) => ({ letter, state: 'absent' }));
	const targetLetters = Array.from(target);

	// Pass 1: exact matches
	for (let i = 0; i < guess.length; i++) {
		if (guess[i] === target[i]) {
			result[i].state = 'correct';
			targetLetters[i] = '_'; // consume
		}
	}

	// Pass 2: present letters
	for (let i = 0; i < guess.length; i++) {
		if (result[i].state === 'correct') continue;
		const idx = targetLetters.indexOf(guess[i]);
		if (idx !== -1) {
			result[i].state = 'present';
			targetLetters[idx] = '_'; // consume
		}
	}

	return result;
}

export function createGameState(wordLength: number, maxAttempts = 6): GameState {
	return {
		wordLength,
		maxAttempts,
		guesses: [],
		status: 'playing',
		revealedLetters: {}
	};
}

export function applyGuess(state: GameState, guess: string, target: string): GameState {
	const result = evaluateGuess(guess, target);
	const newGuesses = [...state.guesses, result];

	// Update revealed letters (keep best state per letter)
	const priority: Record<TileState, number> = { correct: 3, present: 2, absent: 1, empty: 0 };
	const revealedLetters = { ...state.revealedLetters };
	for (const { letter, state: tileState } of result) {
		const current = revealedLetters[letter];
		if (!current || priority[tileState] > priority[current]) {
			revealedLetters[letter] = tileState;
		}
	}

	const won = result.every((r) => r.state === 'correct');
	const lost = !won && newGuesses.length >= state.maxAttempts;
	const status = won ? 'won' : lost ? 'lost' : 'playing';

	return { ...state, guesses: newGuesses, revealedLetters, status };
}
