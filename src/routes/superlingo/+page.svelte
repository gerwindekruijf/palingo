<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import WordBoard from '$lib/components/word/WordBoard.svelte';
	import WordKeyboard from '$lib/components/word/WordKeyboard.svelte';
	import CountdownTimer from '$lib/components/lingo/CountdownTimer.svelte';
	import LetterBallPit from '$lib/components/superlingo/LetterBallPit.svelte';
	import PuzzleWord from '$lib/components/superlingo/PuzzleWord.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import type { PageData, ActionData } from './$types';
	import type { GameState } from '$lib/game/word-engine';
	import type { LetterBall } from '$lib/game/lingo-engine';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let currentInput = $state<string[]>([]);
	let message = $state('');
	let gameState = $state<GameState>({
		wordLength: 0,
		maxAttempts: 5,
		guesses: [],
		status: 'playing',
		revealedLetters: {}
	});
	let phase = $state<'guessing' | 'bonus' | 'balls' | 'done'>('guessing');
	let roundNumber = $state(1);
	let wordsGuessed = $state(0);
	let balls = $state<LetterBall[]>([]);
	let puzzleRevealed = $state<(string | null)[]>([]);
	let puzzleWon = $state(false);
	let timerActive = $state(true);
	let submitting = $state(false);
	let bonusLetter = $state<string | null>(null);
	let shakeRow = $state(false);
	let revealingRow = $state(-1);

	const FLIP_DURATION = 300;
	const FLIP_BUFFER = 200;
	let showPuzzleGuessInput = $state(false);
	let puzzleGuessInput = $state('');
	let puzzleGuessMessage = $state('');

	const t = $derived(langStore.t.superLingo);
	const tNav = $derived(langStore.t.nav);

	// Sync from fresh server data
	$effect(() => {
		gameState = data.gameState as GameState;
		phase = data.phase;
		roundNumber = data.roundNumber;
		wordsGuessed = data.wordsGuessed;
		balls = data.balls as LetterBall[];
		puzzleRevealed = data.puzzleRevealed as (string | null)[];
		puzzleWon = data.puzzleWon;
		bonusLetter = data.bonusLetter ?? null;
		currentInput = [];
		timerActive = phase === 'guessing' || phase === 'bonus';
	});

	// Handle action responses
	$effect(() => {
		if (!form) return;

		if ('gameStatus' in form && form.gameStatus) {
			const newGuesses = data.gameState.guesses;
			const newRowIndex = newGuesses.length - 1;
			const wordLen = gameState.wordLength || data.wordLength;
			const totalFlipMs = (wordLen - 1) * FLIP_DURATION + 500 + FLIP_BUFFER;

			gameState = { ...gameState, guesses: newGuesses, status: 'playing', revealedLetters: gameState.revealedLetters };
			currentInput = [];
			revealingRow = newRowIndex;

			setTimeout(() => {
				revealingRow = -1;
				submitting = false;
				gameState = {
					...gameState,
					guesses: newGuesses,
					status: form.gameStatus as GameState['status'],
					revealedLetters: (form.revealedLetters as GameState['revealedLetters']) ?? gameState.revealedLetters
				};

				if (form.phase) phase = form.phase as typeof phase;
				if (typeof form.roundNumber === 'number') roundNumber = form.roundNumber;
				if ('bonusLetter' in form) bonusLetter = (form.bonusLetter as string | null) ?? null;
				if (form.puzzleRevealed) puzzleRevealed = form.puzzleRevealed as (string | null)[];

				if (form.gameStatus === 'won') {
					message = t.messageWon;
					timerActive = false;
				} else if (form.gameStatus === 'lost') {
					const word = form.word as string | undefined;
					message = word ? `${t.messageLost} ${word.toUpperCase()}` : t.messageNextWord;
					timerActive = false;
					if (form.phase === 'guessing') {
						setTimeout(() => {
							message = '';
							timerActive = true;
							invalidateAll();
						}, 2000);
					}
				} else if (form.phase === 'bonus') {
					message = t.messageBonusRound;
					timerActive = true;
					setTimeout(() => { if (phase === 'bonus') message = ''; }, 2500);
				}
			}, totalFlipMs);
		}

		if ('timedOut' in form && form.timedOut) {
			if (form.phase) phase = form.phase as typeof phase;
			if (typeof form.roundNumber === 'number') roundNumber = form.roundNumber;
			if ('bonusLetter' in form) bonusLetter = (form.bonusLetter as string | null) ?? null;

			if (form.phase === 'bonus') {
				message = t.messageBonusRound;
				timerActive = true;
				currentInput = [];
				setTimeout(() => { if (phase === 'bonus') message = ''; }, 2500);
			} else if (form.phase === 'done') {
				timerActive = false;
				const word = form.word as string | undefined;
				if (word) message = `${t.messageLost} ${word.toUpperCase()}`;
				invalidateAll();
			} else {
				message = t.messageTimeout;
				timerActive = false;
				currentInput = [];
				setTimeout(() => {
					message = '';
					timerActive = true;
				}, 1200);
			}

			if (form.phase === 'guessing' && typeof form.word === 'string') {
				const word = form.word as string;
				message = `${t.messageLost} ${word.toUpperCase()}`;
				timerActive = false;
				setTimeout(() => {
					message = '';
					timerActive = true;
					invalidateAll();
				}, 2000);
			}
		}

		if ('pickedBall' in form && form.pickedBall) {
			const picked = form.pickedBall as LetterBall;
			balls = balls.map((b) => (b.id === picked.id ? { ...b, picked: true } : b));
			if (form.puzzleRevealed) puzzleRevealed = form.puzzleRevealed as (string | null)[];
			if (form.phase) phase = form.phase as typeof phase;

			const letters = picked.letters;
			if (letters.length === 0) message = t.ballEmpty;
			else message = `+${letters.toUpperCase()}`;
			setTimeout(() => (message = ''), 1500);
		}

		if ('puzzleCorrect' in form) {
			if (form.puzzleCorrect) {
				puzzleWon = true;
				phase = 'done';
				if (form.puzzleRevealed) puzzleRevealed = form.puzzleRevealed as (string | null)[];
				puzzleGuessMessage = t.puzzleWordCorrect;
				showPuzzleGuessInput = false;
				invalidateAll();
			} else {
				puzzleGuessMessage = t.puzzleWordWrong;
				puzzleGuessInput = '';
				setTimeout(() => (puzzleGuessMessage = ''), 2000);
			}
		}

		if ('error' in form && form.error) {
			submitting = false;
			message = form.error as string;
			shakeRow = true;
			setTimeout(() => { shakeRow = false; message = ''; }, 600);
		}
	});

	function handleKey(key: string) {
		if ((phase !== 'guessing' && phase !== 'bonus') || gameState.status !== 'playing' || submitting) return;
		const lockedCount = phase === 'bonus' ? 2 : 1;
		const maxInput = gameState.wordLength - lockedCount;
		if (key === 'Backspace') {
			if (currentInput.length > 0) currentInput = currentInput.slice(0, -1);
		} else if (key === 'Enter') {
			submitGuess();
		} else if (/^[a-zA-ZñÑ]$/.test(key) && currentInput.length < maxInput) {
			currentInput = [...currentInput, key.toLowerCase()];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (showPuzzleGuessInput) return; // let puzzle input handle keys
		handleKey(e.key === 'Enter' ? 'Enter' : e.key === 'Backspace' ? 'Backspace' : e.key);
	}

	let timerExpireForm: HTMLFormElement;

	function handleTimerExpire() {
		if ((phase !== 'guessing' && phase !== 'bonus') || gameState.status !== 'playing') return;
		timerActive = false;
		currentInput = [];
		timerExpireForm.requestSubmit();
	}

	let guessForm: HTMLFormElement;
	let ballForm: HTMLFormElement;
	let puzzleForm: HTMLFormElement;

	function submitGuess() {
		const lockedCount = phase === 'bonus' ? 2 : 1;
		const needed = gameState.wordLength - lockedCount;
		if (currentInput.length !== needed || submitting) return;
		submitting = true;
		guessForm.requestSubmit();
	}

	function handlePickBall(ball: LetterBall) {
		const input = ballForm.querySelector('input[name="ballId"]') as HTMLInputElement;
		if (input) input.value = String(ball.id);
		ballForm.requestSubmit();
	}

	function submitPuzzleGuess() {
		if (!puzzleGuessInput.trim()) return;
		const input = puzzleForm.querySelector('input[name="puzzleGuess"]') as HTMLInputElement;
		if (input) input.value = puzzleGuessInput.toLowerCase().trim();
		puzzleForm.requestSubmit();
	}

	const fullCurrentInput = $derived.by(() => {
		if (phase === 'guessing') return [data.firstLetter, ...currentInput];
		if (phase === 'bonus' && bonusLetter) return [data.firstLetter, bonusLetter, ...currentInput];
		return [];
	});

	const bonusLockedPositions = $derived<Record<number, string>>(
		phase === 'bonus' && bonusLetter ? { 1: bonusLetter } : {}
	);

	const totalBoardRows = $derived(
		phase === 'bonus' || gameState.guesses.length > gameState.maxAttempts - 1
			? gameState.maxAttempts + 1
			: gameState.maxAttempts
	);

	const revealedCount = $derived(puzzleRevealed.filter((l) => l !== null).length);

	const activeInputIndex = $derived.by(() => {
		if (gameState.status !== 'playing' || submitting) return -1;
		const lockedCount = phase === 'bonus' ? 2 : 1;
		return lockedCount + currentInput.length;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col items-center bg-white px-4 py-6">
	<!-- Header -->
	<div class="w-full max-w-2xl mb-4">
		<div class="flex items-center justify-between mb-2">
			<a href="/" class="text-gray-400 hover:text-gray-600 text-sm">{tNav.back}</a>
			<div class="text-center">
				<h1 class="text-2xl font-black tracking-widest uppercase text-purple-700">{t.title}</h1>
				<div class="text-xs text-gray-400 mt-0.5">
					{t.roundCounter(roundNumber, data.totalRounds)} · {t.wordsCorrect(wordsGuessed)}
				</div>
			</div>
			<LangToggle />
		</div>
	</div>

	<!-- Puzzle word (always visible) -->
	<div class="w-full max-w-2xl mb-4">
		<PuzzleWord revealed={puzzleRevealed} won={puzzleWon} />
		{#if revealedCount > 0 && phase !== 'done'}
			<div class="flex justify-center mt-2">
				<button
					onclick={() => { showPuzzleGuessInput = !showPuzzleGuessInput; puzzleGuessInput = ''; puzzleGuessMessage = ''; }}
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
					onkeydown={(e) => e.key === 'Enter' && submitPuzzleGuess()}
					maxlength={data.puzzleLength}
					placeholder={`${data.puzzleLength} letras...`}
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
			<div class="flex justify-center mt-2 text-sm font-semibold
				{puzzleWon ? 'text-green-600' : 'text-red-500'}">
				{puzzleGuessMessage}
			</div>
		{/if}
	</div>

	<!-- Message -->
	{#if message}
		<div class="mb-3 px-5 py-2 rounded-full text-sm font-semibold
			{phase === 'bonus' && message === t.messageBonusRound
				? 'bg-orange-500 text-white'
				: 'bg-gray-900 text-white'}">
			{message}
		</div>
	{/if}

	{#if phase === 'guessing' || phase === 'bonus'}
		<div class="flex flex-col items-center gap-4 w-full max-w-md">
			<div class="flex items-center gap-3">
				<CountdownTimer
					seconds={data.timerSeconds}
					active={timerActive && gameState.status === 'playing'}
					onExpire={handleTimerExpire}
				/>
				{#if phase === 'bonus'}
					<div class="px-3 py-1 bg-orange-100 border border-orange-300 rounded-lg text-xs font-bold text-orange-700 uppercase tracking-wide">
						{t.bonusRound}
					</div>
				{/if}
			</div>
			<WordBoard
				{gameState}
				currentInput={fullCurrentInput}
				firstLetterLocked={data.firstLetter}
				lockedPositions={bonusLockedPositions}
				totalRows={totalBoardRows}
				{shakeRow}
				{revealingRow}
				{activeInputIndex}
			/>
			<div class="w-full max-w-md">
				<WordKeyboard
					revealedLetters={gameState.revealedLetters}
					onKey={handleKey}
					disabled={gameState.status !== 'playing' || submitting}
				/>
			</div>
		</div>
	{:else if phase === 'balls'}
		<div class="flex flex-col items-center gap-6 w-full max-w-md">
			<LetterBallPit {balls} onPick={handlePickBall} />
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

			<!-- Show full puzzle word on game over -->
			<PuzzleWord revealed={puzzleRevealed} won={puzzleWon} />

			<div class="flex flex-col items-center gap-3">
				<form
					method="POST"
					action="?/newGame"
					use:enhance={({ formData }) => {
						formData.set('length', String(data.wordLength));
						return async ({ update }) => {
							await update({ reset: false });
							await invalidateAll();
						};
					}}
				>
					<input type="hidden" name="length" value={data.wordLength} />
					<button
						type="submit"
						class="px-8 py-3 bg-purple-600 text-white rounded-xl font-black text-lg hover:bg-purple-700 transition-colors"
					>
						{t.newGame}
					</button>
				</form>
				{#if !data.user}
					<a href="/login" class="text-sm text-gray-400 hover:underline">{t.loginNudge}</a>
				{/if}
			</div>
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

<!-- Hidden forms -->
<form
	bind:this={guessForm}
	method="POST"
	action="?/submitGuess"
	use:enhance={({ formData }) => {
		const locked = phase === 'bonus' && bonusLetter
			? [data.firstLetter, bonusLetter, ...currentInput]
			: [data.firstLetter, ...currentInput];
		formData.set('guess', locked.join(''));
		return async ({ result, update }) => {
			await update({ reset: false });
			submitting = false;
			if (
				result.type === 'success' &&
				result.data?.gameStatus === 'lost' &&
				result.data?.phase === 'guessing'
			) {
				await invalidateAll();
			}
		};
	}}
	class="hidden"
></form>

<form
	bind:this={timerExpireForm}
	method="POST"
	action="?/timerExpired"
	use:enhance={() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success' && result.data?.phase === 'guessing' && result.data?.word) {
				await invalidateAll();
			}
		}}
	class="hidden"
></form>

<form
	bind:this={ballForm}
	method="POST"
	action="?/pickBall"
	use:enhance={() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success' && result.data?.phase === 'guessing') await invalidateAll();
		}}
	class="hidden"
>
	<input type="hidden" name="ballId" value="" />
</form>

<form
	bind:this={puzzleForm}
	method="POST"
	action="?/guessPuzzle"
	use:enhance={() =>
		async ({ update }) => {
			await update({ reset: false });
		}}
	class="hidden"
>
	<input type="hidden" name="puzzleGuess" value="" />
</form>
