<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { langStore } from '$lib/i18n/lang.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let mode = $state<'signin' | 'signup'>('signin');
	let loading = $state(false);

	const t = $derived(langStore.t.login);
	const next = $derived($page.url.searchParams.get('next') ?? '/');
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
			<p class="text-sm text-gray-400">
				{mode === 'signin' ? t.subtitleSignIn : t.subtitleSignUp}
			</p>
		</div>

		<!-- Tab switcher -->
		<div class="flex rounded-xl bg-gray-100 p-1 mb-6">
			<button
				onclick={() => (mode = 'signin')}
				class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
					{mode === 'signin' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}"
			>
				{t.tabSignIn}
			</button>
			<button
				onclick={() => (mode = 'signup')}
				class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
					{mode === 'signup' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}"
			>
				{t.tabSignUp}
			</button>
		</div>

		<!-- Form -->
		<form
			method="POST"
			action={mode === 'signin' ? '?/signIn' : '?/signUp'}
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="next" value={next} />

			{#if mode === 'signup'}
				<div class="flex flex-col gap-1">
					<label for="name" class="text-sm font-medium text-gray-700">{t.fieldName}</label>
					<input
						id="name"
						type="text"
						name="name"
						autocomplete="name"
						value={form?.name ?? ''}
						placeholder={t.fieldNamePlaceholder}
						class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 text-sm"
					/>
				</div>
			{/if}

			<div class="flex flex-col gap-1">
				<label for="email" class="text-sm font-medium text-gray-700">{t.fieldEmail}</label>
				<input
					id="email"
					type="email"
					name="email"
					autocomplete="email"
					value={form?.email ?? ''}
					placeholder={t.fieldEmailPlaceholder}
					class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 text-sm"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="password" class="text-sm font-medium text-gray-700">{t.fieldPassword}</label>
				<input
					id="password"
					type="password"
					name="password"
					autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
					placeholder={mode === 'signup' ? t.fieldPasswordNewPlaceholder : t.fieldPasswordPlaceholder}
					class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 text-sm"
				/>
			</div>

			{#if form?.error}
				<p class="text-sm text-red-500 text-center">{form.error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm
					hover:bg-gray-700 transition-colors disabled:opacity-60 mt-2"
			>
				{loading ? t.loading : mode === 'signin' ? t.submitSignIn : t.submitSignUp}
			</button>
		</form>

		<p class="mt-6 text-center text-xs text-gray-400">{t.anonymousNote}</p>
	</div>
</div>
