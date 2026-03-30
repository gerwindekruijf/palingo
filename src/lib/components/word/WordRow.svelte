<script lang="ts">
	import type { GuessResult } from '$lib/game/word-engine';
	import WordTile from './WordTile.svelte';

	interface Props {
		wordLength: number;
		guess?: GuessResult[];
		currentInput?: string[];
		isCurrentRow?: boolean;
		firstLetterLocked?: string;
		// Map of position → pre-revealed letter (e.g. bonus hint at pos 1)
		lockedPositions?: Record<number, string>;
		shake?: boolean;
		/** When true, tiles flip in sequentially to reveal their colours */
		animateReveal?: boolean;
		/** Position of the blinking cursor in the current row (-1 = none) */
		cursorIndex?: number;
	}

	let {
		wordLength,
		guess,
		currentInput = [],
		isCurrentRow = false,
		firstLetterLocked,
		lockedPositions = {},
		shake = false,
		animateReveal = false,
		cursorIndex = -1
	}: Props = $props();

	// Build a merged locked map: pos 0 from firstLetterLocked + any extras
	const locked = $derived.by(() => {
		const m: Record<number, string> = { ...lockedPositions };
		if (firstLetterLocked) m[0] = firstLetterLocked;
		return m;
	});

	const freePositions = $derived(
		Array.from({ length: wordLength }, (_, j) => j).filter((j) => !(j in locked))
	);

	// The actual tile position that has the blinking cursor
	const cursorTileIndex = $derived(
		cursorIndex >= 0 && cursorIndex < freePositions.length ? freePositions[cursorIndex] : -1
	);

	const tiles = $derived.by(() => {
		return Array.from({ length: wordLength }, (_, i) => {
			if (guess) {
				return { letter: guess[i]?.letter ?? '', state: guess[i]?.state ?? 'empty', revealed: true };
			}
			if (i in locked) {
				return { letter: locked[i], state: 'empty' as const, revealed: false };
			}
			if (isCurrentRow) {
				const freeIdx = freePositions.indexOf(i);
				const letter = freeIdx >= 0 ? (currentInput[freeIdx] ?? '') : '';
				return { letter, state: 'empty' as const, revealed: false };
			}
			return { letter: '', state: 'empty' as const, revealed: false };
		});
	});

	const TILE_DELAY = 300;   // ms between each tile starting its flip
	const FLIP_HALF = 250;    // ms = half of 500ms flip, when we swap to coloured state

	// Per-tile: is it currently animating? is it visually revealed (coloured)?
	let tileFlipping = $state<boolean[]>([]);
	let tileRevealed = $state<boolean[]>([]);

	$effect(() => {
		if (!animateReveal || !guess) {
			tileFlipping = Array(wordLength).fill(false);
			tileRevealed = Array(wordLength).fill(false);
			return;
		}

		tileFlipping = Array(wordLength).fill(false);
		tileRevealed = Array(wordLength).fill(false);

		for (let i = 0; i < wordLength; i++) {
			const startMs = i * TILE_DELAY;
			// Start flip animation
			setTimeout(() => {
				tileFlipping = tileFlipping.map((v, j) => (j === i ? true : v));
			}, startMs);
			// At halfway point: swap to coloured state
			setTimeout(() => {
				tileRevealed = tileRevealed.map((v, j) => (j === i ? true : v));
			}, startMs + FLIP_HALF);
			// End flip animation
			setTimeout(() => {
				tileFlipping = tileFlipping.map((v, j) => (j === i ? false : v));
			}, startMs + FLIP_HALF * 2);
		}
	});
</script>

<div class="flex gap-1 {shake ? 'row-shake' : ''}">
	{#each tiles as tile, i}
		<WordTile
			letter={tile.letter}
			state={tile.state}
			revealed={animateReveal ? (tileRevealed[i] ?? false) : !!guess}
			flipping={tileFlipping[i] ?? false}
			error={shake && isCurrentRow}
			cursor={i === cursorTileIndex}
		/>
	{/each}
</div>

<style>
	.row-shake {
		animation: shake 0.4s ease-in-out;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		15% { transform: translateX(-6px); }
		30% { transform: translateX(6px); }
		45% { transform: translateX(-5px); }
		60% { transform: translateX(5px); }
		75% { transform: translateX(-3px); }
		90% { transform: translateX(3px); }
	}
</style>
