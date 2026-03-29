<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import WordBoard from '$lib/components/word/WordBoard.svelte';
	import WordKeyboard from '$lib/components/word/WordKeyboard.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import type { PageData, ActionData } from './$types';
	import type { GameState } from '$lib/game/word-engine';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let currentInput = $state<string[]>([]);
	let message = $state('');
	let submitting = $state(false);
	let gameState = $state<GameState>({
		wordLength: 0,
		maxAttempts: 6,
		guesses: [],
		status: 'playing',
		revealedLetters: {}
	});

	const t = $derived(langStore.t.palabra);
	const tNav = $derived(langStore.t.nav);

	// Sync from fresh server data
	$effect(() => {
		gameState = data.gameState as GameState;
		currentInput = [];
	});

	// Handle action responses
	$effect(() => {
		if (!form) return;

		if ('gameStatus' in form && form.gameStatus) {
			gameState = {
				...gameState,
				guesses: data.gameState.guesses,
				status: form.gameStatus as GameState['status'],
				revealedLetters:
					(form.revealedLetters as GameState['revealedLetters']) ?? gameState.revealedLetters
			};
			currentInput = [];

			if (form.gameStatus === 'won') {
				message = t.messageWon;
			} else if (form.gameStatus === 'lost') {
				message = `${t.messageLost} ${(form.word as string)?.toUpperCase()}`;
			}
		}

		if ('newGame' in form && form.newGame) {
			message = '';
			currentInput = [];
		}

		if ('error' in form && form.error) {
			message = form.error as string;
			setTimeout(() => (message = ''), 2000);
		}
	});

	function handleKey(key: string) {
		if (gameState.status !== 'playing') return;
		if (key === 'Backspace') {
			currentInput = currentInput.slice(0, -1);
		} else if (key === 'Enter') {
			submitGuess();
		} else if (/^[a-zA-ZñÑ]$/.test(key) && currentInput.length < gameState.wordLength) {
			currentInput = [...currentInput, key.toLowerCase()];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		handleKey(e.key === 'Enter' ? 'Enter' : e.key === 'Backspace' ? 'Backspace' : e.key);
	}

	let guessForm: HTMLFormElement;

	function submitGuess() {
		if (currentInput.length !== gameState.wordLength || submitting) return;
		submitting = true;
		guessForm.requestSubmit();
	}

	const lengths = [4, 5, 6, 7];
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col items-center bg-white px-4 py-6">
	<!-- Header -->
	<div class="w-full max-w-md mb-5">
		<div class="flex items-center justify-between mb-3">
			<a href="/" class="text-gray-400 hover:text-gray-700 text-sm">{tNav.back}</a>
			<h1 class="text-xl font-black tracking-widest uppercase">{t.title}</h1>
			<div class="flex items-center gap-2">
				<LangToggle />
				{#if data.user}
					<a href="/login" class="text-xs text-gray-400 hover:underline">{tNav.account}</a>
				{:else}
					<a href="/login" class="text-xs text-tile-correct hover:underline font-semibold"
						>{tNav.signIn}</a
					>
				{/if}
			</div>
		</div>

		<!-- Word length selector -->
		<div class="flex justify-center gap-2">
			{#each lengths as len}
				<form
					method="POST"
					action="?/newGame"
					use:enhance={() =>
						async ({ update }) => {
							await update({ reset: false });
							await invalidateAll();
						}}
				>
					<input type="hidden" name="length" value={len} />
					<button
						type="submit"
						class="w-10 h-10 rounded-lg text-sm font-bold border-2 transition-colors
							{data.wordLength === len
							? 'bg-gray-900 text-white border-gray-900'
							: 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}"
					>
						{len}
					</button>
				</form>
			{/each}
		</div>
	</div>

	<!-- Message -->
	{#if message}
		<div class="mb-4 px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-semibold">
			{message}
		</div>
	{/if}

	<!-- Board -->
	<div class="mb-5">
		<WordBoard {gameState} {currentInput} />
	</div>

	<!-- Keyboard -->
	<div class="w-full max-w-md">
		<WordKeyboard
			revealedLetters={gameState.revealedLetters}
			onKey={handleKey}
			disabled={gameState.status !== 'playing'}
		/>
	</div>

	<!-- Game over actions -->
	{#if gameState.status !== 'playing'}
		<div class="mt-6 flex flex-col items-center gap-4">
			<form
				method="POST"
				action="?/newGame"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: false });
						await invalidateAll();
					}}
			>
				<input type="hidden" name="length" value={data.wordLength} />
				<button
					type="submit"
					class="px-8 py-3 bg-tile-correct text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
				>
					{t.nextWord}
				</button>
			</form>

			{#if !data.user}
				<a href="/login" class="text-sm text-gray-400 hover:underline">
					{t.loginNudge}
				</a>
			{/if}
		</div>
	{/if}

	<!-- Stats -->
	{#if data.scores}
		<div class="mt-8 grid grid-cols-4 gap-3 text-center max-w-xs w-full">
			<div>
				<div class="text-xl font-black">{data.scores.wins}</div>
				<div class="text-xs text-gray-400">{t.statsWins}</div>
			</div>
			<div>
				<div class="text-xl font-black">{data.scores.losses}</div>
				<div class="text-xs text-gray-400">{t.statsLosses}</div>
			</div>
			<div>
				<div class="text-xl font-black">{data.scores.currentStreak}</div>
				<div class="text-xs text-gray-400">{t.statsStreak}</div>
			</div>
			<div>
				<div class="text-xl font-black">{data.scores.bestStreak}</div>
				<div class="text-xs text-gray-400">{t.statsBest}</div>
			</div>
		</div>
	{/if}
</div>

<!-- Hidden guess form -->
<form
	bind:this={guessForm}
	method="POST"
	action="?/checkGuess"
	use:enhance={({ formData }) => {
		formData.set('guess', currentInput.join(''));
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
	class="hidden"
></form>
