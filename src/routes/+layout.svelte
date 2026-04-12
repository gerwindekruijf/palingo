<script lang="ts">
	import '../app.css';
	import { langStore } from '$lib/i18n/lang.svelte';
	import UserMenu from '$lib/components/UserMenu.svelte';

	let { children, data } = $props();

	const footer = $derived(langStore.t.nav.footer);

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

<div class="fixed top-3 right-3 z-40">
	<UserMenu user={data.user} />
</div>

{@render children()}

<footer class="fixed bottom-4 inset-x-0 text-center text-xs text-gray-400 flex items-center justify-center gap-3 flex-wrap pointer-events-none">
	<span>&copy; {new Date().getFullYear()} Palingo. {footer.copyright}</span>
	<span class="text-gray-300">|</span>
	<span>{footer.licence}</span>
	<span class="text-gray-300">|</span>
	<span>{footer.version} {data.version}</span>
</footer>
