<script lang="ts">
	import { goto } from '$app/navigation';
	import WordBoard from '$lib/components/word/WordBoard.svelte';
	import WordKeyboard from '$lib/components/word/WordKeyboard.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { applyGuess, createGameState } from '$lib/game/word-engine';
	import type { GameState } from '$lib/game/word-engine';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const t = $derived(langStore.t.palabra);
	const tNav = $derived(langStore.t.nav);
	const lengths = [4, 5, 6, 7];

	// ── Session storage keys ────────────────────────────────────────────────
	function stateKey(len: number) { return `palabra_state_${len}`; }
	function scoresKey(len: number) { return `palabra_scores_${len}`; }

	interface SessionScores {
		wins: number;
		losses: number;
		currentStreak: number;
		bestStreak: number;
	}

	function loadSessionState(len: number): GameState | null {
		try {
			const raw = sessionStorage.getItem(stateKey(len));
			return raw ? JSON.parse(raw) : null;
		} catch { return null; }
	}

	function saveSessionState(len: number, state: GameState) {
		try { sessionStorage.setItem(stateKey(len), JSON.stringify(state)); } catch {}
	}

	function loadSessionScores(len: number): SessionScores {
		try {
			const raw = sessionStorage.getItem(scoresKey(len));
			return raw ? JSON.parse(raw) : { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0 };
		} catch { return { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0 }; }
	}

	function saveSessionScores(len: number, s: SessionScores) {
		try { sessionStorage.setItem(scoresKey(len), JSON.stringify(s)); } catch {}
	}

	// ── Game state ──────────────────────────────────────────────────────────
	let wordLength = $state(data.wordLength);
	let gameState = $state<GameState>(createGameState(wordLength));
	let scores = $state<SessionScores>(loadSessionScores(wordLength));

	let currentInput = $state<string[]>([]);
	let message = $state('');
	let submitting = $state(false);
	let shakeRow = $state(false);
	let revealingRow = $state(-1);
	let showWinOverlay = $state(false);
	let winWord = $state('');
	let winOverlayTimer: ReturnType<typeof setTimeout> | null = null;

	function getOrCreateGame(len: number, words: Record<number, string>): GameState {
		const saved = loadSessionState(len);
		if (saved && saved.wordLength === len) return saved;
		// No saved state — start fresh with the server-provided word
		const fresh = createGameState(len);
		// Store the target word in the state so we can evaluate client-side
		(fresh as GameState & { target: string }).target = words[len];
		saveSessionState(len, fresh);
		return fresh;
	}

	// Initialise / reinitialise when length changes or server data refreshes
	$effect(() => {
		const gs = getOrCreateGame(wordLength, data.words as Record<number, string>);
		gameState = gs;
		scores = loadSessionScores(wordLength);
		currentInput = [];
		message = '';
	});

	// ── Flip animation constants ─────────────────────────────────────────────
	const FLIP_DURATION = 300;
	const FLIP_BUFFER = 200;

	// ── Input handling ───────────────────────────────────────────────────────
	function handleKey(key: string) {
		if (gameState.status !== 'playing' || submitting) return;
		if (key === 'Backspace') {
			currentInput = currentInput.slice(0, -1);
		} else if (key === 'Enter') {
			submitGuess();
		} else if (/^[a-zA-ZñÑ]$/.test(key) && currentInput.length < wordLength) {
			currentInput = [...currentInput, key.toLowerCase()];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (showWinOverlay) { advanceFromWin(); return; }
		handleKey(e.key === 'Enter' ? 'Enter' : e.key === 'Backspace' ? 'Backspace' : e.key);
	}

	function submitGuess() {
		if (currentInput.length !== wordLength || submitting) return;

		const guess = currentInput.join('');
		const target = (gameState as GameState & { target?: string }).target ?? '';

		if (!target) return;

		submitting = true;
		const newState = applyGuess(gameState, guess, target);
		// Carry the target forward
		(newState as GameState & { target: string }).target = target;

		const newRowIndex = newState.guesses.length - 1;

		// Show the row immediately (colours revealed by flip animation)
		gameState = { ...newState, status: 'playing', revealedLetters: gameState.revealedLetters };
		currentInput = [];
		revealingRow = newRowIndex;

		const totalFlipMs = (wordLength - 1) * FLIP_DURATION + 500 + FLIP_BUFFER;

		setTimeout(() => {
			revealingRow = -1;
			submitting = false;
			gameState = newState;
			saveSessionState(wordLength, newState);

			if (newState.status === 'won') {
				const s = loadSessionScores(wordLength);
				const newStreak = s.currentStreak + 1;
				const updated = { ...s, wins: s.wins + 1, currentStreak: newStreak, bestStreak: Math.max(s.bestStreak, newStreak) };
				saveSessionScores(wordLength, updated);
				scores = updated;
				winWord = target;
				showWinOverlay = true;
				winOverlayTimer = setTimeout(() => advanceFromWin(), 2500);
			} else if (newState.status === 'lost') {
				message = `${t.messageLost} ${target.toUpperCase()}`;
				const s = loadSessionScores(wordLength);
				const updated = { ...s, losses: s.losses + 1, currentStreak: 0 };
				saveSessionScores(wordLength, updated);
				scores = updated;
			}
		}, totalFlipMs);
	}

	function advanceFromWin() {
		if (winOverlayTimer) { clearTimeout(winOverlayTimer); winOverlayTimer = null; }
		showWinOverlay = false;
		startNewGame();
	}

	function startNewGame() {
		// Pick a new word — reload the page so server provides a fresh word
		// But first clear the saved state for this length so it won't restore the old game
		try { sessionStorage.removeItem(stateKey(wordLength)); } catch {}
		goto(`/palabra-del-dia?length=${wordLength}`, { invalidateAll: true });
	}

	function switchLength(len: number) {
		revealingRow = -1;
		submitting = false;
		message = '';
		wordLength = len; // triggers $effect which loads/creates the game
		goto(`/palabra-del-dia?length=${len}`, { replaceState: true, noScroll: true });
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col items-center bg-white px-4 py-6">
	<!-- Header -->
	<div class="w-full max-w-md mb-5">
		<div class="flex items-center justify-between mb-3">
			<a href="/" class="text-gray-400 hover:text-gray-700 text-sm">{tNav.back}</a>
			<h1 class="text-xl font-black tracking-widest uppercase">{t.title}</h1>
			<LangToggle />
		</div>

		<!-- Word length selector -->
		<div class="flex justify-center gap-2">
			{#each lengths as len}
				<button
					onclick={() => switchLength(len)}
					class="w-10 h-10 rounded-lg text-sm font-bold border-2 transition-colors
						{wordLength === len
						? 'bg-gray-900 text-white border-gray-900'
						: 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}"
				>
					{len}
				</button>
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
		<WordBoard
			{gameState}
			{currentInput}
			{shakeRow}
			{revealingRow}
			activeInputIndex={gameState.status === 'playing' ? currentInput.length : -1}
		/>
	</div>

	<!-- Keyboard -->
	<div class="w-full max-w-md">
		<WordKeyboard
			revealedLetters={gameState.revealedLetters}
			onKey={handleKey}
			disabled={gameState.status !== 'playing' || submitting}
		/>
	</div>

	<!-- Game over: lost — show next word button -->
	{#if gameState.status === 'lost'}
		<div class="mt-6">
			<button
				onclick={startNewGame}
				class="px-8 py-3 bg-tile-correct text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
			>
				{t.nextWord}
			</button>
		</div>
	{/if}

	<!-- Stats -->
	<div class="mt-8 grid grid-cols-4 gap-3 text-center max-w-xs w-full">
		<div>
			<div class="text-xl font-black">{scores.wins}</div>
			<div class="text-xs text-gray-400">{t.statsWins}</div>
		</div>
		<div>
			<div class="text-xl font-black">{scores.losses}</div>
			<div class="text-xs text-gray-400">{t.statsLosses}</div>
		</div>
		<div>
			<div class="text-xl font-black">{scores.currentStreak}</div>
			<div class="text-xs text-gray-400">{t.statsStreak}</div>
		</div>
		<div>
			<div class="text-xl font-black">{scores.bestStreak}</div>
			<div class="text-xs text-gray-400">{t.statsBest}</div>
		</div>
	</div>
</div>

<!-- Win overlay -->
{#if showWinOverlay}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-tile-correct"
		onclick={advanceFromWin}
	>
		<p class="text-white text-lg font-bold tracking-widest uppercase mb-8 opacity-80">
			{t.messageWon}
		</p>
		<div class="flex gap-2">
			{#each winWord.split('') as letter}
				<div class="w-14 h-14 text-2xl flex items-center justify-center font-black uppercase
					text-tile-correct bg-white rounded-sm shadow-md">
					{letter}
				</div>
			{/each}
		</div>
		<p class="mt-10 text-white text-sm opacity-60">{t.nextWord}</p>
	</div>
{/if}
