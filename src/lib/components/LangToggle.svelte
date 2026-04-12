<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';
</script>

<button
	onclick={() => langStore.toggle()}
	class="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-700 transition-colors px-1 cursor-pointer"
	title={langStore.current === 'es' ? 'Switch to English' : 'Cambiar a Español'}
>
	{langStore.current === 'es' ? 'EN' : 'ES'}
</button>
