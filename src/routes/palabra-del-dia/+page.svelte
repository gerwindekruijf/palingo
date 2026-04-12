<script lang="ts">
	import { goto } from '$app/navigation';
	import WordBoard from '$lib/components/word/WordBoard.svelte';
	import WordKeyboard from '$lib/components/word/WordKeyboard.svelte';
	import WordCorrectOverlay from '$lib/components/word/WordCorrectOverlay.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { applyGuess, createGameState } from '$lib/game/word-engine';
	import type { GameState } from '$lib/game/word-engine';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const t = $derived(langStore.t.palabra);
	const tNav = $derived(langStore.t.nav);
	import { untrack } from 'svelte';
	import { WORD_LENGTHS, FLIP_DURATION, FLIP_BUFFER, WIN_OVERLAY_DELAY } from '$lib/config/constants';
	const lengths = WORD_LENGTHS;

	// ── Session storage keys ────────────────────────────────────────────────
	function stateKey(len: number) {
		return `palabra_state_${len}`;
	}
	function scoresKey(len: number) {
		return `palabra_scores_${len}`;
	}

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
		} catch {
			return null;
		}
	}

	function saveSessionState(len: number, state: GameState) {
		try {
			sessionStorage.setItem(stateKey(len), JSON.stringify(state));
		} catch {}
	}

	function loadSessionScores(len: number): SessionScores {
		try {
			const raw = sessionStorage.getItem(scoresKey(len));
			return raw ? JSON.parse(raw) : { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0 };
		} catch {
			return { wins: 0, losses: 0, currentStreak: 0, bestStreak: 0 };
		}
	}

	function saveSessionScores(len: number, s: SessionScores) {
		try {
			sessionStorage.setItem(scoresKey(len), JSON.stringify(s));
		} catch {}
	}

	// ── DB scores (logged-in users) ─────────────────────────────────────────
	function getScores(len: number): SessionScores {
		if (data.user && data.userScores && data.userScores[len]) {
			return data.userScores[len];
		}
		return loadSessionScores(len);
	}

	async function persistScore(len: number, won: boolean) {
		// Optimistically update local scores
		const current = scores;
		if (won) {
			const newStreak = current.currentStreak + 1;
			scores = { ...current, wins: current.wins + 1, currentStreak: newStreak, bestStreak: Math.max(current.bestStreak, newStreak) };
		} else {
			scores = { ...current, losses: current.losses + 1, currentStreak: 0 };
		}

		if (data.user) {
			// Save to DB via form action
			try {
				const formData = new FormData();
				formData.set('wordLength', String(len));
				formData.set('won', String(won));
				await fetch('?/saveScore', { method: 'POST', body: formData });
			} catch {
				// DB save failed silently — optimistic update already applied
			}
		}

		// Always save to session storage as well
		saveSessionScores(len, scores);
	}

	// ── Game state ──────────────────────────────────────────────────────────
	const initialWordLength = untrack(() => data.wordLength);
	let wordLength = $state(initialWordLength);
	let gameState = $state<GameState>(createGameState(initialWordLength));
	let scores = $state<SessionScores>(getScores(initialWordLength));

	let currentInput = $state<string[]>([]);
	let submitting = $state(false);
	let shakeRow = $state(false);
	let revealingRow = $state(-1);
	let showWinOverlay = $state(false);
	let showLostOverlay = $state(false);
	let winWord = $state('');
	let winOverlayTimer: ReturnType<typeof setTimeout> | null = null;

	function getOrCreateGame(len: number, words: Record<number, string>): GameState {
		const saved = loadSessionState(len);
		if (saved && saved.wordLength === len) return saved;
		const fresh = createGameState(len);
		(fresh as GameState & { target: string }).target = words[len];
		saveSessionState(len, fresh);
		return fresh;
	}

	$effect(() => {
		const gs = getOrCreateGame(wordLength, data.words as Record<number, string>);
		gameState = gs;
		scores = getScores(wordLength);
		currentInput = [];

	});

	// ── Flip animation constants ─────────────────────────────────────────────

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
		if (showWinOverlay) {
			advanceFromWin();
			return;
		}
		handleKey(e.key === 'Enter' ? 'Enter' : e.key === 'Backspace' ? 'Backspace' : e.key);
	}

	async function submitGuess() {
		if (currentInput.length !== wordLength || submitting) return;

		const guess = currentInput.join('');
		const target = (gameState as GameState & { target?: string }).target ?? '';

		if (!target) return;

		submitting = true;

		try {
			const res = await fetch(`/api/validate-word?word=${encodeURIComponent(guess)}`);
			const { valid } = await res.json();
			if (!valid) {
				shakeRow = true;
				setTimeout(() => (shakeRow = false), 600);
				submitting = false;
				return;
			}
		} catch {
			// If validation fails, allow the guess through
		}

		const newState = applyGuess(gameState, guess, target);
		(newState as GameState & { target: string }).target = target;

		const newRowIndex = newState.guesses.length - 1;

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
				persistScore(wordLength, true);
				winWord = target;
				showWinOverlay = true;
				winOverlayTimer = setTimeout(() => advanceFromWin(), WIN_OVERLAY_DELAY);
			} else if (newState.status === 'lost') {
				persistScore(wordLength, false);
				winWord = target;
				showLostOverlay = true;
			}
		}, totalFlipMs);
	}

	function advanceFromWin() {
		if (winOverlayTimer) {
			clearTimeout(winOverlayTimer);
			winOverlayTimer = null;
		}
		showWinOverlay = false;
		startNewGame();
	}

	function startNewGame() {
		try {
			sessionStorage.removeItem(stateKey(wordLength));
		} catch {}
		goto(`/palabra-del-dia?length=${wordLength}`, { invalidateAll: true });
	}

	function switchLength(len: number) {
		revealingRow = -1;
		submitting = false;

		wordLength = len;
		goto(`/palabra-del-dia?length=${len}`, { replaceState: true, noScroll: true });
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col items-center bg-bg-palabra px-4 pt-16">
	<!-- Header -->
	<div class="w-full max-w-lg">
		<div class="relative flex items-center mb-2">
			<a href="/" class="text-gray-400 hover:text-gray-600 text-sm">{tNav.back}</a>
			<div class="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
				<h1 class="text-2xl font-black tracking-widest uppercase text-green-600 whitespace-nowrap">
					{t.title}
				</h1>
				<div class="text-xs text-gray-400 mt-0.5">
					{t.subtitle(wordLength)}
				</div>
			</div>
			<div class="ml-auto">
				<LangToggle />
			</div>
		</div>
	</div>

	<!-- Word length selector -->
	<div class="flex justify-center gap-2 mt-4">
		{#each lengths as len}
			<button
				onclick={() => switchLength(len)}
				class="w-10 h-10 rounded-lg text-sm font-bold border-2 transition-colors
                    {wordLength === len
					? 'bg-green-800 text-white border-green-800'
					: 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}"
			>
				{len}
			</button>
		{/each}
	</div>


	<!-- Board -->
	<div class="mt-4 mb-4">
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

<WordCorrectOverlay
	show={showWinOverlay}
	word={winWord}
	messageText={t.messageWon}
	continueText={t.nextWord}
	onDismiss={advanceFromWin}
/>

<WordCorrectOverlay
	show={showLostOverlay}
	word={winWord}
	messageText={t.messageLost}
	continueText={t.nextWord}
	variant="lost"
	onDismiss={() => { showLostOverlay = false; startNewGame(); }}
/>
