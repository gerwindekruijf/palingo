<script lang="ts">
	import { goto } from '$app/navigation';
	import WordGameBoard from '$lib/components/word/WordGameBoard.svelte';
	import CountdownTimer from '$lib/components/lingo/CountdownTimer.svelte';
	import LetterBallPit from '$lib/components/superlingo/LetterBallPit.svelte';
	import PuzzleWord from '$lib/components/superlingo/PuzzleWord.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { createGameState } from '$lib/game/word-engine';
	import type { GameState } from '$lib/game/word-engine';
	import { generateLetterBalls, buildRevealedPuzzle } from '$lib/game/lingo-engine';
	import type { LetterBall } from '$lib/game/lingo-engine';
	import type { PageData } from './$types';
	import { untrack } from 'svelte';
	import {
		SUPERLINGO_WORD_LENGTH,
		SUPERLINGO_MAX_ATTEMPTS,
		ROUNDS_PER_GAME,
		BONUS_COUNTDOWN_MS,
		TIMER_SECONDS_BASE,
		TIMER_SECONDS_PER_WORD,
		TIMER_SECONDS_MAX,
		TIMER_SECONDS_BONUS
	} from '$lib/config/constants';

	let { data }: { data: PageData } = $props();

	const t = $derived(langStore.t.superLingo);
	const tNav = $derived(langStore.t.nav);

	// ── Game state ──────────────────────────────────────────────────────────
	let gameState = $state<GameState>(
		createGameState(SUPERLINGO_WORD_LENGTH, SUPERLINGO_MAX_ATTEMPTS)
	);
	let phase = $state<'guessing' | 'bonus' | 'balls' | 'done'>('guessing');
	let roundNumber = $state(1);
	let wordsGuessed = $state(0);
	const puzzleWord = $derived(data.puzzleWord);
	let balls = $state<LetterBall[]>(untrack(() => generateLetterBalls(puzzleWord)));
	let puzzleRevealed = $state<(string | null)[]>(
		untrack(() => Array(puzzleWord.length).fill(null))
	);
	let puzzleWon = $state(false);
	let timerActive = $state(true);
	let timerRemaining = $state(TIMER_SECONDS_BASE);
	let timerMax = $state(TIMER_SECONDS_MAX);
	let message = $state('');
	let bonusLetter = $state<string | null>(null);
	let bonusPosition = $state<number | null>(null);
	let bonusCountdown = $state(false);
	let wordGameBoard = $state<WordGameBoard>();

	let showPuzzleGuessInput = $state(false);
	let puzzleGuessInput = $state('');
	let puzzleGuessMessage = $state('');

	let target = $derived(data.words[roundNumber - 1] ?? '');

	const bonusLockedPositions = $derived<Record<number, string>>(
		phase === 'bonus' && bonusLetter && bonusPosition !== null
			? { [bonusPosition]: bonusLetter }
			: {}
	);

	const totalBoardRows = $derived(
		phase === 'bonus' && !bonusCountdown ? SUPERLINGO_MAX_ATTEMPTS + 1 : SUPERLINGO_MAX_ATTEMPTS
	);

	const revealedCount = $derived(puzzleRevealed.filter((l) => l !== null).length);

	// ── Timer helpers ───────────────────────────────────────────────────────
	function startTimer(seconds: number, max: number) {
		timerMax = max;
		timerRemaining = seconds;
		timerActive = true;
	}

	function addTimerSeconds(extra: number, max: number) {
		timerMax = max;
		timerRemaining = Math.min(timerRemaining + extra, max);
	}

	// ── Word validation ─────────────────────────────────────────────────────
	async function handleSubmitGuess(
		guess: string
	): Promise<{ valid: true; target: string } | { valid: false }> {
		try {
			const res = await fetch(`/api/validate-word?word=${encodeURIComponent(guess)}`);
			const { valid } = await res.json();
			if (!valid) return { valid: false };
		} catch {}
		return { valid: true, target };
	}

	// ── After guess animation ───────────────────────────────────────────────
	function handleGuessApplied(newState: GameState) {
		if (newState.status === 'won') {
			wordsGuessed += 1;
			timerActive = false;
		} else if (newState.status === 'lost') {
			if (phase === 'bonus') {
				timerActive = false;
			} else {
				enterBonusPhase(newState);
			}
		} else {
			// Correct row (not full word win) — add 30s, cap at MAX
			addTimerSeconds(TIMER_SECONDS_PER_WORD, TIMER_SECONDS_MAX);
		}
	}

	function enterBonusPhase(state: GameState) {
		timerActive = false;
		bonusCountdown = true;
		message = t.messageBonusRound;

		const bonus = pickBonusPosition(target, state);
		bonusLetter = bonus?.letter ?? null;
		bonusPosition = bonus?.position ?? null;

		gameState = { ...state, status: 'playing', maxAttempts: SUPERLINGO_MAX_ATTEMPTS + 1 };
		phase = 'bonus';

		setTimeout(() => {
			bonusCountdown = false;
			message = '';
			startTimer(TIMER_SECONDS_BONUS, TIMER_SECONDS_BONUS + TIMER_SECONDS_MAX);
		}, BONUS_COUNTDOWN_MS);
	}

	function pickBonusPosition(
		targetWord: string,
		state: GameState
	): { position: number; letter: string } | null {
		const correctPositions = new Set<number>([0]);
		for (const guess of state.guesses) {
			for (let i = 0; i < guess.length; i++) {
				if (guess[i].state === 'correct') correctPositions.add(i);
			}
		}
		const available = Array.from({ length: targetWord.length }, (_, i) => i).filter(
			(i) => !correctPositions.has(i)
		);
		if (available.length === 0) return null;
		const pos = available[Math.floor(Math.random() * available.length)];
		return { position: pos, letter: targetWord[pos] };
	}

	function handleWin() {
		phase = 'balls';
	}

	function handleLoss() {
		advanceToNextRound();
	}

	// ── Timer expired ───────────────────────────────────────────────────────
	function handleTimerExpire() {
		timerActive = false;
		if (phase === 'bonus') {
			advanceToNextRound();
		} else {
			const totalAttempts = gameState.guesses.length + 1;
			if (totalAttempts >= SUPERLINGO_MAX_ATTEMPTS) {
				enterBonusPhase(gameState);
			} else {
				wordGameBoard?.resetInput();
				startTimer(timerRemaining, TIMER_SECONDS_MAX);
			}
		}
	}

	// ── Ball picking ────────────────────────────────────────────────────────
	function handlePickBall(ball: LetterBall) {
		balls = balls.map((b) => (b.id === ball.id ? { ...b, picked: true } : b));
		puzzleRevealed = buildRevealedPuzzle(puzzleWord, balls);

		if (ball.letters.length === 0) message = t.ballEmpty;
		else message = `+${ball.letters.toUpperCase()}`;
		setTimeout(() => (message = ''), 1500);

		advanceToNextRound();
	}

	// ── Puzzle guess ────────────────────────────────────────────────────────
	function submitPuzzleGuess() {
		if (!puzzleGuessInput.trim()) return;
		const guess = puzzleGuessInput.toLowerCase().trim();

		if (guess === puzzleWord) {
			puzzleWon = true;
			phase = 'done';
			puzzleRevealed = Array.from(puzzleWord);
			puzzleGuessMessage = t.puzzleWordCorrect;
			showPuzzleGuessInput = false;
			persistScore();
		} else {
			puzzleGuessMessage = t.puzzleWordWrong;
			puzzleGuessInput = '';
			setTimeout(() => (puzzleGuessMessage = ''), 2000);
		}
	}

	function handlePuzzleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') submitPuzzleGuess();
	}

	// ── Round advancement ───────────────────────────────────────────────────
	function advanceToNextRound() {
		if (roundNumber >= ROUNDS_PER_GAME) {
			phase = 'done';
			persistScore();
			return;
		}

		roundNumber += 1;
		bonusLetter = null;
		bonusPosition = null;
		phase = 'guessing';
		gameState = createGameState(SUPERLINGO_WORD_LENGTH, SUPERLINGO_MAX_ATTEMPTS);
		wordGameBoard?.resetInput();
		// New round: base + words-guessed bonus, capped at MAX
		startTimer(
			Math.min(TIMER_SECONDS_BASE + wordsGuessed * TIMER_SECONDS_PER_WORD, TIMER_SECONDS_MAX),
			TIMER_SECONDS_MAX
		);
	}

	function loadGameIndex(): number {
		try {
			return parseInt(sessionStorage.getItem('superlingo_gameindex') ?? '0') || 0;
		} catch {
			return 0;
		}
	}
	function saveGameIndex(idx: number) {
		try {
			sessionStorage.setItem('superlingo_gameindex', String(idx));
		} catch {}
	}

	function startNewGame() {
		const nextIndex = loadGameIndex() + 1;
		saveGameIndex(nextIndex);
		goto(`/superlingo?gameIndex=${nextIndex}`, { invalidateAll: true });
	}

	async function persistScore() {
		if (!data.user) return;
		try {
			const formData = new FormData();
			formData.set('won', String(puzzleWon));
			formData.set('wordsGuessed', String(wordsGuessed));
			await fetch('?/saveScore', { method: 'POST', body: formData });
		} catch {}
	}
</script>

<div class="min-h-screen flex flex-col items-center bg-bg-superlingo px-4 pt-16">
	<!-- Header -->
	<div class="w-full max-w-lg">
		<div class="relative flex items-center mb-2">
			<a href="/" class="text-gray-400 hover:text-gray-600 text-sm">{tNav.back}</a>
			<div class="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
				<h1 class="text-2xl font-black tracking-widest uppercase text-purple-700 whitespace-nowrap">
					{t.title}
				</h1>
				<div class="text-xs text-gray-400 mt-0.5">
					{t.roundCounter(roundNumber, data.totalRounds)} · {t.wordsCorrect(wordsGuessed)}
				</div>
			</div>
			<div class="ml-auto"><LangToggle /></div>
		</div>
	</div>

	<!-- Message -->
	{#if message}
		<div
			class="mb-3 px-5 py-2 rounded-full text-sm font-semibold
			{phase === 'bonus' && message === t.messageBonusRound
				? 'bg-orange-500 text-white'
				: 'bg-gray-900 text-white'}"
		>
			{message}
		</div>
	{/if}

	<!-- Timer -->
	<div class="flex justify-center gap-2 mt-4 min-h-20 items-center">
		{#if phase === 'guessing' || phase === 'bonus'}
			<div class="flex items-center gap-3">
				<CountdownTimer
					remaining={timerRemaining}
					maxSeconds={timerMax}
					active={timerActive && gameState.status === 'playing'}
					onExpire={handleTimerExpire}
					onTick={(r) => (timerRemaining = r)}
				/>
				{#if phase === 'bonus'}
					<div
						class="px-3 py-1 bg-orange-100 border border-orange-300 rounded-lg text-xs font-bold text-orange-700 uppercase tracking-wide"
					>
						{t.bonusRound}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if phase === 'guessing' || phase === 'bonus'}
		<div class="relative w-full max-w-2xl flex flex-col items-center">
			<WordGameBoard
				bind:this={wordGameBoard}
				bind:gameState
				firstLetterLocked={target[0]}
				lockedPositions={bonusLockedPositions}
				totalRows={totalBoardRows}
				disabled={!timerActive || bonusCountdown}
				onSubmitGuess={handleSubmitGuess}
				onGuessApplied={handleGuessApplied}
				onWin={handleWin}
				onLoss={handleLoss}
				winMessage={t.messageWon}
				lostMessage={t.messageLost}
				lostWord={target}
			/>
			<div class="hidden md:block absolute top-0 right-0 -mr-80">
				<PuzzleWord revealed={puzzleRevealed} won={puzzleWon} />
			</div>
		</div>

		<div class="md:hidden flex justify-center mt-4">
			<PuzzleWord revealed={puzzleRevealed} won={puzzleWon} />
		</div>
	{:else if phase === 'balls'}
		<div class="mt-4 relative w-full max-w-2xl flex flex-col items-center">
			<LetterBallPit {balls} onPick={handlePickBall} />
			<div class="hidden md:block absolute top-0 right-0 -mr-80">
				<PuzzleWord revealed={puzzleRevealed} won={puzzleWon} />
			</div>
		</div>
		<div class="md:hidden flex justify-center mt-4">
			<PuzzleWord revealed={puzzleRevealed} won={puzzleWon} />
		</div>
	{:else}
		<!-- Game over -->
		<div class="flex flex-col items-center gap-6 mt-2 w-full max-w-lg">
			<div class="text-center">
				<div class="text-5xl mb-2">{puzzleWon ? '🏆' : '📋'}</div>
				<h2 class="text-2xl font-black">
					{puzzleWon ? t.gameOverWon : t.gameOverTitle}
				</h2>
				<p class="text-gray-500 mt-1">
					{t.gameOverSummary(wordsGuessed, data.totalRounds)}
				</p>
			</div>

			<PuzzleWord revealed={puzzleRevealed} won={puzzleWon} />

			<div class="flex flex-col items-center gap-3">
				<button
					onclick={startNewGame}
					class="px-8 py-3 bg-purple-600 text-white rounded-xl font-black text-lg hover:bg-purple-700 transition-colors"
				>
					{t.newGame}
				</button>
				{#if !data.user}
					<a href="/login" class="text-sm text-gray-400 hover:underline">{t.loginNudge}</a>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Puzzle guess controls -->
	{#if phase !== 'done'}
		<div class="w-full max-w-2xl mt-6">
			{#if revealedCount > 0}
				<div class="flex justify-center mt-2">
					<button
						onclick={() => {
							showPuzzleGuessInput = !showPuzzleGuessInput;
							puzzleGuessInput = '';
							puzzleGuessMessage = '';
						}}
						class="text-xs px-4 py-1.5 rounded-full border border-purple-300 text-purple-600 hover:bg-purple-50 font-semibold transition-colors"
					>
						{t.puzzleWordGuess}
					</button>
				</div>
			{/if}
			{#if showPuzzleGuessInput}
				<div class="flex justify-center gap-2 mt-2">
					<input
						type="text"
						bind:value={puzzleGuessInput}
						onkeydown={handlePuzzleKeydown}
						maxlength={puzzleWord.length}
						placeholder={`${puzzleWord.length} letras...`}
						class="border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-purple-500 w-40 text-center"
					/>
					<button
						onclick={submitPuzzleGuess}
						class="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors"
					>
						OK
					</button>
				</div>
			{/if}
			{#if puzzleGuessMessage}
				<div
					class="flex justify-center mt-2 text-sm font-semibold
					{puzzleWon ? 'text-green-600' : 'text-red-500'}"
				>
					{puzzleGuessMessage}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Scores -->
	{#if data.scores && (phase === 'guessing' || phase === 'bonus')}
		<div class="mt-8 grid grid-cols-3 gap-4 text-center max-w-xs w-full">
			<div>
				<div class="text-xl font-black">{data.scores.wins}</div>
				<div class="text-xs text-gray-400">{t.statsWins}</div>
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
