<script lang="ts">
	import type { GameState } from '$lib/game/word-engine';
	import WordRow from './WordRow.svelte';

	interface Props {
		gameState: GameState;
		currentInput?: string[];
		firstLetterLocked?: string;
		// Extra locked positions shown on the active (current) row only
		lockedPositions?: Record<number, string>;
		// Total rows to show (including bonus row). Defaults to gameState.maxAttempts
		totalRows?: number;
		shakeRow?: boolean;
		/** Index of the row currently being revealed (flip animation) */
		revealingRow?: number;
		/** Position of the cursor within the current row (-1 = none) */
		activeInputIndex?: number;
		/** Color for locked tiles */
		lockedColor?: 'blue' | 'purple';
	}

	let { gameState, currentInput = [], firstLetterLocked, lockedPositions = {}, totalRows, shakeRow = false, revealingRow = -1, activeInputIndex = -1, lockedColor = 'blue' }: Props = $props();

	const rowCount = $derived(totalRows ?? gameState.maxAttempts);
</script>

<div class="flex flex-col gap-1">
	{#each Array.from({ length: rowCount }, (_, i) => i) as rowIndex}
		{@const guess = gameState.guesses[rowIndex]}
		{@const isCurrentRow = rowIndex === gameState.guesses.length && gameState.status === 'playing'}
		<WordRow
			wordLength={gameState.wordLength}
			{guess}
			{currentInput}
			{isCurrentRow}
			firstLetterLocked={(isCurrentRow || rowIndex === 0) ? firstLetterLocked : undefined}
			lockedPositions={isCurrentRow ? lockedPositions : {}}
			shake={isCurrentRow && shakeRow}
			animateReveal={rowIndex === revealingRow}
			cursorIndex={isCurrentRow ? activeInputIndex : -1}
			{lockedColor}
		/>
	{/each}
</div>
