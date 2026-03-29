<script lang="ts">
	import type { GuessResult } from '$lib/game/word-engine';
	import WordTile from './WordTile.svelte';

	interface Props {
		wordLength: number;
		guess?: GuessResult[];
		currentInput?: string[];
		isCurrentRow?: boolean;
		firstLetterLocked?: string;
	}

	let {
		wordLength,
		guess,
		currentInput = [],
		isCurrentRow = false,
		firstLetterLocked
	}: Props = $props();

	const tiles = $derived.by(() => {
		return Array.from({ length: wordLength }, (_, i) => {
			if (guess) {
				return { letter: guess[i]?.letter ?? '', state: guess[i]?.state ?? 'empty', revealed: true };
			}
			if (isCurrentRow) {
				const letter = firstLetterLocked && i === 0 ? firstLetterLocked : (currentInput[firstLetterLocked ? i - 1 : i] ?? '');
				return { letter, state: 'empty' as const, revealed: false };
			}
			if (firstLetterLocked && i === 0) {
				return { letter: firstLetterLocked, state: 'empty' as const, revealed: false };
			}
			return { letter: '', state: 'empty' as const, revealed: false };
		});
	});
</script>

<div class="flex gap-1">
	{#each tiles as tile}
		<WordTile letter={tile.letter} state={tile.state} revealed={tile.revealed} />
	{/each}
</div>
