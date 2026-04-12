<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';
	import { page } from '$app/stores';

	const t = $derived(langStore.t.scores);
	const nav = $derived(langStore.t.nav);

	type Score = {
		id: number;
		game: string;
		wordLength: number;
		wins: number;
		losses: number;
		totalScore: number;
		currentStreak: number;
		bestStreak: number;
	};

	const scores = $derived($page.data.scores as Score[]);
	const user = $derived($page.data.user);

	const games = [
		{ key: 'palabra', label: 'Palabra', color: 'bg-tile-correct', textColor: 'text-white', borderColor: 'border-tile-correct', bgLight: 'bg-green-50' },
		{ key: 'lingo', label: 'Lingo', color: 'bg-blue-600', textColor: 'text-white', borderColor: 'border-blue-500', bgLight: 'bg-blue-50' },
		{ key: 'superlingo', label: 'SuperLingo', color: 'bg-purple-700', textColor: 'text-white', borderColor: 'border-purple-500', bgLight: 'bg-purple-50' }
	] as const;

	function scoresForGame(game: string) {
		return scores
			.filter((s) => s.game === game)
			.sort((a, b) => a.wordLength - b.wordLength);
	}
</script>

<div class="min-h-screen flex flex-col bg-white">
	<div class="flex-1 flex flex-col items-center px-4 py-12">
		<div class="w-full max-w-4xl">
			<!-- Header -->
			<div class="text-center mb-10">
				<a href="/" class="text-sm text-gray-400 hover:text-gray-600">{nav.back}</a>
				<h1 class="text-4xl font-black tracking-widest uppercase text-gray-900 mt-2">{t.title}</h1>
				<p class="text-sm text-gray-400 mt-1">{t.subtitle}</p>
			</div>

			{#if !user}
				<p class="text-center text-gray-400 text-sm">{t.loginPrompt}</p>
			{:else if scores.length === 0}
				<p class="text-center text-gray-400 text-sm">{t.noScores}</p>
			{:else}
				<!-- Game columns -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					{#each games as game}
						{@const gs = scoresForGame(game.key)}
						<div class="rounded-2xl border-2 {game.borderColor} overflow-hidden">
							<!-- Game header -->
							<div class="{game.color} {game.textColor} px-5 py-4 text-center">
								<h2 class="text-xl font-black tracking-wide">{game.label}</h2>
							</div>

							{#if gs.length === 0}
								<div class="px-5 py-8 text-center text-sm text-gray-400">{t.noScores}</div>
							{:else}
								<div class="divide-y divide-gray-100">
									{#each gs as s}
										<div class="px-5 py-3 {game.bgLight}">
											<div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
												{s.wordLength} {t.wordLength}
											</div>
											<div class="grid grid-cols-2 gap-y-1 gap-x-4 text-sm">
												<span class="text-gray-500">{t.wins}</span>
												<span class="text-right font-semibold text-gray-900">{s.wins}</span>
												<span class="text-gray-500">{t.losses}</span>
												<span class="text-right font-semibold text-gray-900">{s.losses}</span>
												<span class="text-gray-500">{t.totalScore}</span>
												<span class="text-right font-semibold text-gray-900">{s.totalScore}</span>
												<span class="text-gray-500">{t.currentStreak}</span>
												<span class="text-right font-semibold text-gray-900">{s.currentStreak}</span>
												<span class="text-gray-500">{t.bestStreak}</span>
												<span class="text-right font-semibold text-gray-900">{s.bestStreak}</span>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
