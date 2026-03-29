<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import WordBoard from '$lib/components/word/WordBoard.svelte';
	import WordKeyboard from '$lib/components/word/WordKeyboard.svelte';
	import CountdownTimer from '$lib/components/lingo/CountdownTimer.svelte';
	import BallPit from '$lib/components/lingo/BallPit.svelte';
	import BingoCard from '$lib/components/lingo/BingoCard.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import type { PageData, ActionData } from './$types';
	import type { GameState } from '$lib/game/word-engine';
	import type { Ball, MarkedNumber, BingoResult } from '$lib/game/lingo-engine';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let currentInput = $state<string[]>([]);
	let message = $state('');
	let gameState = $state<GameState>({
		wordLength: 0,
		maxAttempts: 6,
		guesses: [],
		status: 'playing',
		revealedLetters: {}
	});
	let phase = $state<'guessing' | 'balls' | 'gold' | 'done'>('guessing');
	let roundNumber = $state(1);
	let wordsGuessed = $state(0);
	let markedNumbers = $state<MarkedNumber[]>([]);
	let bingo = $state<BingoResult>(false);
	let timerActive = $state(true);
	let submitting = $state(false);
	let ballPit = $state<Ball[]>([]);

	const t = $derived(langStore.t.lingo);
	const tNav = $derived(langStore.t.nav);
	const tGold = $derived(langStore.t.goldBall);

	// Sync from fresh server data
	$effect(() => {
		gameState = data.gameState as GameState;
		phase = data.phase;
		roundNumber = data.roundNumber;
		wordsGuessed = data.wordsGuessed;
		markedNumbers = data.markedNumbers as MarkedNumber[];
		bingo = data.bingo as BingoResult;
		ballPit = data.ballPit as Ball[];
		currentInput = [];
		timerActive = true;
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

			if (form.phase) phase = form.phase as typeof phase;
			if (form.markedNumbers) markedNumbers = form.markedNumbers as MarkedNumber[];
			if ('bingo' in form) bingo = form.bingo as BingoResult;
			if (typeof form.roundNumber === 'number') roundNumber = form.roundNumber;

			if (form.gameStatus === 'won') {
				message = t.messageWon;
				timerActive = false;
			} else if (form.gameStatus === 'lost') {
				const word = form.word as string | undefined;
				message = word ? `${t.messageLost} ${word.toUpperCase()}` : t.messageNextWord;
				timerActive = false;
				setTimeout(() => {
					message = '';
					timerActive = true;
				}, 2000);
			}
		}

		if ('pickedBall' in form && form.pickedBall) {
			const picked = form.pickedBall as Ball;
			ballPit = ballPit.map((b) => (b.number === picked.number ? { ...b, picked: true } : b));
			if (form.markedNumbers) markedNumbers = form.markedNumbers as MarkedNumber[];
			if ('bingo' in form) bingo = form.bingo as BingoResult;
			if (form.phase) phase = form.phase as typeof phase;

			if (picked.type === 'green') message = t.messageGreenBall;
			else if (picked.type === 'gold') message = t.messageGoldBall;
			else message = '';

			if (form.phase !== 'gold') setTimeout(() => (message = ''), 1500);
		}

		if ('markedNumbers' in form && form.phase && !('pickedBall' in form)) {
			if (form.markedNumbers) markedNumbers = form.markedNumbers as MarkedNumber[];
			if ('bingo' in form) bingo = form.bingo as BingoResult;
			if (form.phase) phase = form.phase as typeof phase;
			message = t.messageNumberMarked;
			setTimeout(() => (message = ''), 1500);
		}

		if ('error' in form && form.error) {
			message = form.error as string;
			setTimeout(() => (message = ''), 2000);
		}
	});

	function handleKey(key: string) {
		if (phase !== 'guessing' || gameState.status !== 'playing') return;
		if (key === 'Backspace') {
			if (currentInput.length > 0) currentInput = currentInput.slice(0, -1);
		} else if (key === 'Enter') {
			submitGuess();
		} else if (/^[a-zA-ZñÑ]$/.test(key) && currentInput.length < gameState.wordLength - 1) {
			currentInput = [...currentInput, key.toLowerCase()];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		handleKey(e.key === 'Enter' ? 'Enter' : e.key === 'Backspace' ? 'Backspace' : e.key);
	}

	function handleTimerExpire() {
		if (phase !== 'guessing' || gameState.status !== 'playing') return;
		message = t.messageTimeout;
		timerActive = false;
		currentInput = [];
		setTimeout(() => {
			message = '';
			timerActive = true;
		}, 1500);
	}

	let guessForm: HTMLFormElement;
	let ballForm: HTMLFormElement;
	let cardPickForm: HTMLFormElement;

	function submitGuess() {
		if (currentInput.length !== gameState.wordLength - 1 || submitting) return;
		submitting = true;
		guessForm.requestSubmit();
	}

	function handlePickBall(ball: Ball) {
		const idx = ballPit.findIndex((b) => b.number === ball.number);
		if (idx === -1) return;
		const input = ballForm.querySelector('input[name="ballIndex"]') as HTMLInputElement;
		if (input) input.value = String(idx);
		ballForm.requestSubmit();
	}

	function handleCardNumberPick(num: number) {
		const input = cardPickForm.querySelector('input[name="number"]') as HTMLInputElement;
		if (input) input.value = String(num);
		cardPickForm.requestSubmit();
	}

	const markedSet = $derived(new Set(markedNumbers.map((m) => m.number)));

	const unmarkedCardNumbers = $derived(
		data.bingoCard.flat().filter((n) => n !== 0 && !markedSet.has(n))
	);

	// Full input shown on board: first letter locked + what user typed
	const fullCurrentInput = $derived(
		phase === 'guessing' ? [data.firstLetter, ...currentInput] : []
	);

	const lengths = [4, 5, 6, 7];
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col items-center bg-white px-4 py-6">
	<!-- Header -->
	<div class="w-full max-w-lg mb-4">
		<div class="flex items-center justify-between mb-2">
			<a href="/" class="text-gray-400 hover:text-gray-600 text-sm">{tNav.back}</a>
			<div class="text-center">
				<h1 class="text-2xl font-black tracking-widest uppercase text-red-600">{t.title}</h1>
				<div class="text-xs text-gray-400 mt-0.5">
					{t.roundCounter(roundNumber, data.totalRounds)} · {t.wordsCorrect(wordsGuessed)}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<LangToggle />
				{#if data.user}
					<a href="/login" class="text-xs text-gray-400 hover:underline">{tNav.account}</a>
				{:else}
					<a href="/login" class="text-xs text-gray-400 hover:underline">{tNav.signIn}</a>
				{/if}
			</div>
		</div>

		<!-- Word length selector -->
		<div class="flex justify-center gap-2 mt-1">
			{#each lengths as len}
				<form
					method="POST"
					action="?/newGame"
					use:enhance={({ formData }) => {
						formData.set('length', String(len));
						return async ({ update }) => {
							await update({ reset: false });
							await invalidateAll();
						};
					}}
				>
					<input type="hidden" name="length" value={len} />
					<button
						type="submit"
						class="w-9 h-9 rounded-lg text-sm font-bold border-2 transition-colors
							{data.wordLength === len
							? 'bg-gray-900 text-white border-gray-900'
							: 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}"
					>
						{len}
					</button>
				</form>
			{/each}
		</div>
	</div>

	<!-- Message -->
	{#if message}
		<div class="mb-3 px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-semibold">
			{message}
		</div>
	{/if}

	{#if phase === 'guessing'}
		<div class="flex flex-col md:flex-row gap-6 items-start justify-center w-full max-w-lg">
			<div class="flex flex-col items-center gap-4">
				<CountdownTimer
					seconds={data.timerSeconds}
					active={timerActive && gameState.status === 'playing'}
					onExpire={handleTimerExpire}
				/>
				<WordBoard
					{gameState}
					currentInput={fullCurrentInput}
					firstLetterLocked={data.firstLetter}
				/>
				<div class="w-full max-w-md">
					<WordKeyboard
						revealedLetters={gameState.revealedLetters}
						onKey={handleKey}
						disabled={gameState.status !== 'playing'}
					/>
				</div>
			</div>
			<div class="shrink-0">
				<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
			</div>
		</div>
	{:else if phase === 'balls'}
		<div class="flex flex-col md:flex-row gap-8 items-start justify-center w-full max-w-lg">
			<BallPit balls={ballPit} onPick={handlePickBall} />
			<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
		</div>
	{:else if phase === 'gold'}
		<div class="flex flex-col md:flex-row gap-8 items-start justify-center w-full max-w-lg">
			<div class="flex flex-col items-center gap-4">
				<div class="text-center">
					<div class="text-4xl">{tGold.emoji}</div>
					<h2 class="text-lg font-black mt-2">{tGold.title}</h2>
					<p class="text-sm text-gray-500 mt-1">{tGold.subtitle}</p>
				</div>
				<div class="grid grid-cols-5 gap-2 max-w-xs">
					{#each unmarkedCardNumbers as num}
						<button
							onclick={() => handleCardNumberPick(num)}
							class="w-11 h-11 rounded-lg bg-ball-gold text-white font-bold text-sm
								hover:brightness-110 active:scale-95 transition-all"
						>
							{num}
						</button>
					{/each}
				</div>
			</div>
			<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
		</div>
	{:else}
		<!-- Game over — all 5 rounds played -->
		<div class="flex flex-col items-center gap-6 mt-2 w-full max-w-lg">
			<div class="text-center">
				<div class="text-5xl mb-2">{bingo ? '🎉' : '📋'}</div>
				<h2 class="text-2xl font-black">
					{bingo ? t.gameOverBingo : t.gameOverTitle}
				</h2>
				<p class="text-gray-500 mt-1">
					{t.gameOverSummary(wordsGuessed, data.totalRounds)}
				</p>
			</div>

			<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />

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
						class="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-lg hover:bg-red-700 transition-colors"
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

	<!-- Scores (logged-in, guessing phase only) -->
	{#if data.scores && phase === 'guessing'}
		<div class="mt-8 grid grid-cols-3 gap-4 text-center max-w-xs w-full">
			<div>
				<div class="text-xl font-black">{data.scores.wins}</div>
				<div class="text-xs text-gray-400">{t.statsBingos}</div>
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
		formData.set('guess', [data.firstLetter, ...currentInput].join(''));
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
	<input type="hidden" name="ballIndex" value="" />
</form>

<form
	bind:this={cardPickForm}
	method="POST"
	action="?/pickCardNumber"
	use:enhance={() =>
		async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success' && result.data?.phase === 'guessing') await invalidateAll();
		}}
	class="hidden"
>
	<input type="hidden" name="number" value="" />
</form>
