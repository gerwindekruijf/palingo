<script lang="ts">
	import type { TileState } from '$lib/game/word-engine';
	import { langStore } from '$lib/i18n/lang.svelte';

	interface Props {
		revealedLetters?: Record<string, TileState>;
		onKey: (key: string) => void;
		disabled?: boolean;
	}

	let { revealedLetters = {}, onKey, disabled = false }: Props = $props();

	// Spanish QWERTY layout — words are always Spanish
	const rows = $derived.by(() => [
		['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
		['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
		[langStore.t.keyboard.enter, 'Z', 'X', 'C', 'V', 'B', 'N', 'M', langStore.t.keyboard.backspace]
	]);

	function keyClass(key: string): string {
		if (key === langStore.t.keyboard.enter || key === langStore.t.keyboard.backspace) {
			return 'bg-gray-300 text-black text-xs font-bold px-2';
		}
		const state = revealedLetters[key.toLowerCase()];
		switch (state) {
			case 'correct': return 'bg-tile-correct text-white';
			case 'present': return 'bg-tile-present text-white';
			case 'absent':  return 'bg-tile-absent text-white';
			default:        return 'bg-gray-200 text-black';
		}
	}

	function handleKey(key: string) {
		if (disabled) return;
		if (key === langStore.t.keyboard.backspace) onKey('Backspace');
		else if (key === langStore.t.keyboard.enter) onKey('Enter');
		else onKey(key);
	}
</script>

<div class="flex flex-col items-center gap-1 w-full max-w-md mx-auto select-none">
	{#each rows as row}
		<div class="flex gap-1 justify-center">
			{#each row as key}
				<button
					onclick={() => handleKey(key)}
					class="min-h-11 min-w-8 rounded font-bold uppercase text-sm
						flex items-center justify-center cursor-pointer
						transition-colors duration-150 active:opacity-70
						{keyClass(key)}"
					{disabled}
				>
					{key}
				</button>
			{/each}
		</div>
	{/each}
</div>
