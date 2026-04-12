<script lang="ts">
	import { page } from '$app/stores';
	import { langStore } from '$lib/i18n/lang.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { authClient } from '$lib/auth/client';

	const t = $derived(langStore.t.login);
	const next = $derived($page.url.searchParams.get('next') ?? '/');

	let loading = $state<'google' | 'apple' | 'microsoft' | null>(null);

	async function signIn(provider: 'google' | 'apple' | 'microsoft') {
		loading = provider;
		await authClient.signIn.social({ provider, callbackURL: next });
		loading = null;
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-white px-4">
	<div class="w-full max-w-sm">
		<!-- Back + Logo -->
		<div class="mb-8 flex flex-col items-center gap-2">
			<div class="w-full flex items-center justify-between">
				<a href="/" class="text-sm text-gray-400 hover:text-gray-600">{t.back}</a>
				<LangToggle />
			</div>
			<h1 class="text-4xl font-black tracking-widest uppercase text-gray-900 mt-2">{t.title}</h1>
			<p class="text-sm text-gray-400">{t.subtitle}</p>
		</div>

		<!-- OAuth buttons -->
		<div class="flex flex-col gap-3">
			<button
				onclick={() => signIn('google')}
				disabled={loading !== null}
				class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200
					hover:border-gray-400 transition-colors disabled:opacity-60 font-semibold text-sm text-gray-700"
			>
				<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				{loading === 'google' ? t.loading : t.continueGoogle}
			</button>

			<!-- <button
				onclick={() => signIn('apple')}
				disabled={loading !== null}
				class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200
					hover:border-gray-400 transition-colors disabled:opacity-60 font-semibold text-sm text-gray-700"
			>
				<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
					<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/>
				</svg>
				{loading === 'apple' ? t.loading : t.continueApple}
			</button>

			<button
				onclick={() => signIn('microsoft')}
				disabled={loading !== null}
				class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200
					hover:border-gray-400 transition-colors disabled:opacity-60 font-semibold text-sm text-gray-700"
			>
				<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
					<path fill="#F25022" d="M1 1h10v10H1z"/>
					<path fill="#00A4EF" d="M13 1h10v10H13z"/>
					<path fill="#7FBA00" d="M1 13h10v10H1z"/>
					<path fill="#FFB900" d="M13 13h10v10H13z"/>
				</svg>
				{loading === 'microsoft' ? t.loading : t.continueMicrosoft}
			</button> -->
		</div>

		<p class="mt-6 text-center text-xs text-gray-400">{t.anonymousNote}</p>
	</div>
</div>
