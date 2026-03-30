<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';

	interface Props {
		revealed: (string | null)[];
		won?: boolean;
	}

	let { revealed, won = false }: Props = $props();

	const t = $derived(langStore.t.superLingo);
</script>

<div class="flex flex-col items-center gap-2">
	<div class="text-xs font-bold uppercase tracking-widest text-gray-400">{t.puzzleWord}</div>
	<div class="flex flex-wrap justify-center gap-1">
		{#each revealed as letter, i}
			<div
				class="w-9 h-10 flex items-center justify-center rounded border-2 font-black text-lg uppercase transition-all duration-300
					{letter !== null
						? won
							? 'bg-tile-correct text-white border-tile-correct'
							: 'bg-gray-800 text-white border-gray-800'
						: 'bg-white text-transparent border-gray-300'}"
			>
				{letter ?? '?'}
			</div>
		{/each}
	</div>
</div>
