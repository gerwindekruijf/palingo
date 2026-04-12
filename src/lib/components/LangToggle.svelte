<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';
	import type { Lang } from '$lib/i18n/translations';

	const options: { lang: Lang; flag: string; label: string }[] = [
		{ lang: 'es', flag: '🇪🇸', label: 'Español' },
		{ lang: 'en', flag: '🇬🇧', label: 'English' },
		{ lang: 'nl', flag: '🇳🇱', label: 'Nederlands' }
	];

	let open = $state(false);

	function select(lang: Lang) {
		langStore.set(lang);
		open = false;
	}
</script>

<svelte:window onclick={() => (open = false)} />

<div class="relative">
	<button
		onclick={(e) => { e.stopPropagation(); open = !open; }}
		class="flex items-center gap-0.5 text-lg px-1 cursor-pointer hover:scale-110 transition-transform"
	>
		{options.find((o) => o.lang === langStore.current)!.flag}
		<span class="text-[10px] text-gray-400">▼</span>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onclick={(e) => e.stopPropagation()}
			class="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-37.5"
		>
			{#each options as { lang, flag, label }}
				<button
					onclick={() => select(lang)}
					class="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-100 transition-colors cursor-pointer
						{langStore.current === lang ? 'font-bold text-gray-900' : 'text-gray-600'}"
				>
					<span class="text-lg">{flag}</span>
					<span>{label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
