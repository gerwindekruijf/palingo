<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';
	import { authClient } from '$lib/auth/client';
	import { goto, invalidateAll } from '$app/navigation';

	type Props = {
		user: { name: string; email: string; image?: string | null } | null;
	};

	let { user }: Props = $props();
	let open = $state(false);

	const t = $derived(langStore.t.nav);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	async function signOut() {
		close();
		await authClient.signOut();
		await invalidateAll();
		goto('/');
	}
</script>

<svelte:window onclick={() => open && close()} />

<div class="relative">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<button
		onclick={(e) => { e.stopPropagation(); toggle(); }}
		class="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 hover:border-gray-400
			transition-colors flex items-center justify-center bg-gray-100"
	>
		{#if user?.image}
			<img src={user.image} alt={user.name} class="w-full h-full object-cover" referrerpolicy="no-referrer" />
		{:else}
			<svg class="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
			</svg>
		{/if}
	</button>

	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onclick={(e) => e.stopPropagation()}
			class="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50"
		>
			{#if user}
				<div class="px-4 py-2 border-b border-gray-100">
					<p class="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
					<p class="text-xs text-gray-400 truncate">{user.email}</p>
				</div>
				<a
					href="/scores"
					onclick={close}
					class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
				>{t.scores}</a>
				<button
					onclick={signOut}
					class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
				>{t.signOut}</button>
			{:else}
				<a
					href="/login"
					onclick={close}
					class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
				>{t.signIn}</a>
				<a
					href="/scores"
					onclick={close}
					class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
				>{t.scores}</a>
			{/if}
		</div>
	{/if}
</div>
