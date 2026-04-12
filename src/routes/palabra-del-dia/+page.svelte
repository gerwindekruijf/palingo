<script lang="ts">
	import { goto } from '$app/navigation';
	import WordGameBoard from '$lib/components/word/WordGameBoard.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { createGameState } from '$lib/game/word-engine';
	import type { GameState } from '$lib/game/word-engine';
	import type { PageData } from './$types';
	import { untrack } from 'svelte';
	import { WORD_LENGTHS } from '$lib/config/constants';

	let { data }: { data: PageData } = $props();

	const t = $derived(langStore.t.palabra);
	const tNav = $derived(langStore.t.nav);
	const lengths = WORD_LENGTHS;

	// ── Session storage keys ────────────────────────────────────────────────
	function stateKey(len: number) {
		return `palabra_state_${len}`;
	}
	function scoresKey(len: number) {
		return `palabra_scores_${len}`;
	}
	function gameIndexKey(len: number) {
		return `palabra_gameindex_${len}`;
	}

	function loadGameIndex(len: number): number {
		try {
			return parseInt(sessionStorage.getItem(gameIndexKey(len)) ?? '0') || 0;
		} catch {
			return 0;
		}
	}

	function saveGameIndex(len: number, idx: number) {
		try {
			sessionStorage.setItem(gameIndexKey(len), String(idx));
		} catch {}
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
		const current = scores;
		if (won) {
			const newStreak = current.currentStreak + 1;
			scores = {
				...current,
				wins: current.wins + 1,
				currentStreak: newStreak,
				bestStreak: Math.max(current.bestStreak, newStreak)
			};
		} else {
			scores = { ...current, losses: current.losses + 1, currentStreak: 0 };
		}

		if (data.user) {
			try {
				const formData = new FormData();
				formData.set('wordLength', String(len));
				formData.set('won', String(won));
				await fetch('?/saveScore', { method: 'POST', body: formData });
			} catch {}
		}

		saveSessionScores(len, scores);
	}

	// ── Game state ──────────────────────────────────────────────────────────
	const initialWordLength = untrack(() => data.wordLength);
	let wordLength = $state(initialWordLength);
	let gameState = $state<GameState>(createGameState(initialWordLength));
	let scores = $state<SessionScores>(getScores(initialWordLength));
	let target = $state('');
	let wordGameBoard: WordGameBoard;

	function getOrCreateGame(len: number, words: Record<number, string>): { state: GameState; target: string } {
		const saved = loadSessionState(len);
		if (saved && saved.wordLength === len) {
			const t = (saved as GameState & { target?: string }).target ?? words[len];
			return { state: saved, target: t };
		}
		const fresh = createGameState(len);
		(fresh as GameState & { target: string }).target = words[len];
		saveSessionState(len, fresh);
		return { state: fresh, target: words[len] };
	}

	$effect(() => {
		const result = getOrCreateGame(wordLength, data.words as Record<number, string>);
		gameState = result.state;
		target = result.target;
		scores = getScores(wordLength);
		wordGameBoard?.resetInput();
	});

	// ── Submit handler ──────────────────────────────────────────────────────
	async function handleSubmitGuess(guess: string) {
		if (!target) return { valid: false as const };

		try {
			const res = await fetch(`/api/validate-word?word=${encodeURIComponent(guess)}`);
			const { valid } = await res.json();
			if (!valid) return { valid: false as const };
		} catch {
			// If validation fails, allow the guess through
		}

		return { valid: true as const, target };
	}

	function handleGuessApplied(newState: GameState) {
		(newState as GameState & { target: string }).target = target;
		saveSessionState(wordLength, newState);

		if (newState.status === 'won') {
			persistScore(wordLength, true);
		} else if (newState.status === 'lost') {
			persistScore(wordLength, false);
		}
	}

	function startNewGame() {
		try {
			sessionStorage.removeItem(stateKey(wordLength));
		} catch {}
		const nextIndex = loadGameIndex(wordLength) + 1;
		saveGameIndex(wordLength, nextIndex);
		goto(`/palabra-del-dia?length=${wordLength}&gameIndex=${nextIndex}`, { invalidateAll: true });
	}

	function switchLength(len: number) {
		wordLength = len;
		goto(`/palabra-del-dia?length=${len}`, { replaceState: true, noScroll: true });
	}
</script>

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
	<div class="flex justify-center items-center gap-2 mt-5 min-h-20">
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

	<!-- Game board + keyboard -->
	<WordGameBoard
		bind:this={wordGameBoard}
		bind:gameState
		onSubmitGuess={handleSubmitGuess}
		onGuessApplied={handleGuessApplied}
		onWin={() => startNewGame()}
		onLoss={() => startNewGame()}
		winMessage={t.messageWon}
		lostMessage={t.messageLost}
		lostWord={target}
		continueText={t.nextWord}
	/>

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
