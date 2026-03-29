<script lang="ts">
	import type { BingoResult, MarkedNumber } from '$lib/game/lingo-engine';
	import { langStore } from '$lib/i18n/lang.svelte';

	interface Props {
		card: number[][];
		marked: MarkedNumber[];
		bingo?: BingoResult;
	}

	let { card, marked, bingo = false }: Props = $props();

	const t = $derived(langStore.t.bingoCard);

	const markedMap = $derived.by(() => {
		const m = new Map<number, 'word' | 'ball' | 'free'>();
		m.set(0, 'free');
		for (const entry of marked) m.set(entry.number, entry.source);
		return m;
	});

	const wordCount = $derived(marked.filter((m) => m.source === 'word').length);
	const ballCount = $derived(marked.filter((m) => m.source === 'ball').length);

	const columns = ['B', 'I', 'N', 'G', 'O'];
</script>

<div class="flex flex-col items-center gap-2">
	{#if bingo}
		<div class="text-2xl font-black text-yellow-500 uppercase tracking-widest animate-pulse">
			{langStore.t.lingo.messageBingo}
		</div>
	{/if}

	<div class="border-2 border-gray-800 rounded overflow-hidden">
		<!-- Column headers -->
		<div class="grid grid-cols-5">
			{#each columns as col}
				<div class="w-10 h-10 flex items-center justify-center bg-gray-800 text-white font-black text-base">
					{col}
				</div>
			{/each}
		</div>

		<!-- Card rows -->
		{#each card as row, r}
			<div class="grid grid-cols-5">
				{#each row as num, c}
					{@const isFree = r === 2 && c === 2}
					{@const source = markedMap.get(num)}
					{@const isMarked = source !== undefined}
					<div
						class="w-10 h-10 flex items-center justify-center text-xs font-bold border border-gray-100
							transition-colors duration-300 relative
							{isFree                    ? 'bg-tile-correct text-white'  : ''}
							{!isFree && source === 'word' ? 'bg-tile-correct text-white'  : ''}
							{!isFree && source === 'ball' ? 'bg-tile-present text-white'  : ''}
							{!isFree && !isMarked      ? 'bg-white text-gray-700'       : ''}"
					>
						{isFree ? '★' : num}
						{#if source === 'word'}
							<span class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white opacity-60"></span>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>

	<!-- Legend -->
	<div class="flex gap-3 text-xs text-gray-400 mt-1">
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-sm bg-tile-correct inline-block"></span>
			{t.legendWords(wordCount)}
		</span>
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-sm bg-tile-present inline-block"></span>
			{t.legendBalls(ballCount)}
		</span>
	</div>
</div>
