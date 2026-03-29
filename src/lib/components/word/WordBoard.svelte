<script lang="ts">
	import type { GameState } from '$lib/game/word-engine';
	import WordRow from './WordRow.svelte';

	interface Props {
		gameState: GameState;
		currentInput?: string[];
		firstLetterLocked?: string;
	}

	let { gameState, currentInput = [], firstLetterLocked }: Props = $props();
</script>

<div class="flex flex-col gap-1">
	{#each Array.from({ length: gameState.maxAttempts }, (_, i) => i) as rowIndex}
		{@const guess = gameState.guesses[rowIndex]}
		{@const isCurrentRow = rowIndex === gameState.guesses.length && gameState.status === 'playing'}
		<WordRow
			wordLength={gameState.wordLength}
			{guess}
			{currentInput}
			{isCurrentRow}
			{firstLetterLocked}
		/>
	{/each}
</div>
