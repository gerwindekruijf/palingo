<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';

	const flags = { es: '🇪🇸', en: '🇬🇧', nl: '🇳🇱' } as const;
	const nextLang = { es: 'en', en: 'nl', nl: 'es' } as const;
	const titles = { es: 'Switch to English', en: 'Wissel naar Nederlands', nl: 'Cambiar a Español' } as const;
</script>

<button
	onclick={() => langStore.set(nextLang[langStore.current])}
	class="text-lg px-1 cursor-pointer hover:scale-110 transition-transform"
	title={titles[langStore.current]}
>
	{flags[langStore.current]}
</button>
