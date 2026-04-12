<script lang="ts">
	import type { LetterBall } from '$lib/game/lingo-engine';
	import { langStore } from '$lib/i18n/lang.svelte';

	interface Props {
		balls: LetterBall[];
		onPick: (ball: LetterBall) => void;
		disabled?: boolean;
	}

	let { balls, onPick, disabled = false }: Props = $props();

	const t = $derived(langStore.t.superLingo);
	const tBallPit = $derived(langStore.t.ballPit);

	const remaining = $derived(balls.filter((b) => !b.picked).length);
</script>

<div class="flex flex-col items-center gap-4">
	<div class="text-center">
		<h2 class="text-lg font-black uppercase tracking-wide">{tBallPit.title}</h2>
		<p class="text-sm text-gray-500 mt-1">{tBallPit.subtitle} · {remaining} {remaining === 1 ? 'restante' : 'restantes'}</p>
	</div>

	<!-- Ball grid: 5 columns -->
	<div class="grid grid-cols-5 gap-2">
		{#each balls as ball, i}
			<button
				onclick={() => !disabled && !ball.picked && onPick(ball)}
				disabled={disabled || ball.picked}
				title={ball.letters ? ball.letters.toUpperCase() : t.ballEmpty}
				style="animation-delay: {i * 30}ms"
				class="w-12 h-12 rounded-full flex items-center justify-center
					font-black text-sm cursor-pointer select-none
					transition-all duration-200 active:scale-95
					disabled:cursor-not-allowed animate-bounce-in
					{ball.picked ? 'opacity-20 scale-90' : ''}
					{!ball.picked && ball.letters.length === 0
						? 'bg-gray-400 text-white hover:brightness-110'
						: !ball.picked && ball.letters.length === 2
						? 'bg-ball-gold text-white hover:brightness-110 ring-2 ring-yellow-300'
						: !ball.picked
						? 'bg-red-600 text-white hover:brightness-110'
						: ball.letters.length === 0
						? 'bg-gray-400 text-white'
						: ball.letters.length === 2
						? 'bg-ball-gold text-white'
						: 'bg-red-600 text-white'}"
			>
				{ball.picked ? (ball.letters || '–') : '?'}
			</button>
		{/each}
	</div>

	<!-- Legend -->
	<div class="flex gap-4 text-xs text-gray-400 flex-wrap justify-center">
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
			1 letra
		</span>
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-full bg-ball-gold inline-block"></span>
			2 letras
		</span>
		<span class="flex items-center gap-1">
			<span class="w-3 h-3 rounded-full bg-gray-400 inline-block"></span>
			vacía
		</span>
	</div>
</div>
