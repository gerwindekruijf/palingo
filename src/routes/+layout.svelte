<script lang="ts">
	import '../app.css';
	import { langStore } from '$lib/i18n/lang.svelte';

	let { children } = $props();

	let offline = $state(false);

	$effect(() => {
		offline = !navigator.onLine;
		const on = () => (offline = false);
		const off = () => (offline = true);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});
</script>

{#if offline}
	<div class="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-center text-sm font-semibold py-2 px-4">
		{langStore.t.offline.banner}
	</div>
{/if}

{@render children()}
