<script lang="ts">
	import type { Ball } from '$lib/game/lingo-engine';
	import { langStore } from '$lib/i18n/lang.svelte';

	interface Props {
		balls: Ball[];
		onPick: (ball: Ball) => void;
		disabled?: boolean;
	}

	let { balls, onPick, disabled = false }: Props = $props();

	const t = $derived(langStore.t.ballPit);

	const counts = $derived({
		blue:  balls.filter((b) => b.type === 'blue'  && !b.picked).length,
		green: balls.filter((b) => b.type === 'green' && !b.picked).length,
		gold:  balls.filter((b) => b.type === 'gold'  && !b.picked).length
	});

	const tooltip = $derived({
		blue:  t.tooltipBlue,
		green: t.tooltipGreen,
		gold:  t.tooltipGold
	} as Record<Ball['type'], string>);
</script>

<div class="flex flex-col items-center gap-4">
	<div class="text-center">
		<h2 class="text-lg font-black uppercase tracking-wide">{t.title}</h2>
		<p class="text-sm text-gray-500 mt-1">{t.subtitle}</p>
	</div>

	<!-- Legend -->
	<div class="flex gap-3 text-xs text-gray-500 flex-wrap justify-center">
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-full bg-ball-blue inline-block"></span>
			{t.legendBlue(counts.blue)}
		</span>
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-full bg-ball-green inline-block"></span>
			{t.legendGreen(counts.green)}
		</span>
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-full bg-ball-gold inline-block"></span>
			{t.legendGold(counts.gold)}
		</span>
	</div>

	<!-- Ball grid: 4 columns -->
	<div class="grid grid-cols-4 gap-2">
		{#each balls as ball, i}
			<button
				onclick={() => !disabled && !ball.picked && onPick(ball)}
				disabled={disabled || ball.picked}
				title={tooltip[ball.type]}
				style="animation-delay: {i * 40}ms"
				class="w-14 h-14 rounded-full flex items-center justify-center
					text-white font-bold text-sm cursor-pointer
					transition-all duration-200 active:scale-95 select-none
					disabled:cursor-not-allowed animate-bounce-in
					{ball.picked ? 'opacity-25 scale-90' : ''}
					{!ball.picked && ball.type === 'blue'  ? 'bg-ball-blue hover:brightness-110' : ''}
					{!ball.picked && ball.type === 'green' ? 'bg-ball-green hover:brightness-110' : ''}
					{!ball.picked && ball.type === 'gold'  ? 'bg-ball-gold hover:brightness-110 ring-2 ring-yellow-300' : ''}
					{ball.picked  && ball.type === 'blue'  ? 'bg-ball-blue' : ''}
					{ball.picked  && ball.type === 'green' ? 'bg-ball-green' : ''}
					{ball.picked  && ball.type === 'gold'  ? 'bg-ball-gold' : ''}"
			>
				{ball.number}
			</button>
		{/each}
	</div>
</div>

<style>
	@keyframes bounce-in {
		0%   { transform: scale(0); opacity: 0; }
		60%  { transform: scale(1.1); opacity: 1; }
		100% { transform: scale(1); opacity: 1; }
	}
	.animate-bounce-in {
		animation: bounce-in 0.4s ease-out both;
	}
</style>
