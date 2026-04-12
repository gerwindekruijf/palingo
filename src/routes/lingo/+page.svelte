<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import WordBoard from '$lib/components/word/WordBoard.svelte';
	import WordKeyboard from '$lib/components/word/WordKeyboard.svelte';
	import WordCorrectOverlay from '$lib/components/word/WordCorrectOverlay.svelte';
	import CountdownTimer from '$lib/components/lingo/CountdownTimer.svelte';
	import BallPit from '$lib/components/lingo/BallPit.svelte';
	import BingoCard from '$lib/components/lingo/BingoCard.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import type { PageData, ActionData } from './$types';
	import type { GameState } from '$lib/game/word-engine';
	import type { Ball, MarkedNumber, BingoResult } from '$lib/game/lingo-engine';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	import { FLIP_DURATION, FLIP_BUFFER, BONUS_EXTRA_SECONDS, BONUS_COUNTDOWN_MS, LINGO_WORD_LENGTH, LINGO_MAX_ATTEMPTS, WIN_OVERLAY_DELAY } from '$lib/config/constants';

	// ── Translations ─────────────────────────────────────────────────────────
	const t = $derived(langStore.t.lingo);
	const tNav = $derived(langStore.t.nav);
	const tGold = $derived(langStore.t.goldBall);

	// ── Game state ────────────────────────────────────────────────────────────
	let currentInput = $state<string[]>([]);
	let message = $state('');
	let gameState = $state<GameState>({
		wordLength: LINGO_WORD_LENGTH,
		maxAttempts: LINGO_MAX_ATTEMPTS,
		guesses: [],
		status: 'playing',
		revealedLetters: {}
	});
	let phase = $state<'guessing' | 'bonus' | 'balls' | 'gold' | 'done'>('guessing');
	let roundNumber = $state(1);
	let wordsGuessed = $state(0);
	let markedNumbers = $state<MarkedNumber[]>([]);
	let bingo = $state<BingoResult>(false);
	let timerActive = $state(true);
	let submitting = $state(false);
	let ballPit = $state<Ball[]>([]);
	let bonusLetter = $state<string | null>(null);
	let bonusPosition = $state<number | null>(null);
	let shakeRow = $state(false);
	let revealingRow = $state(-1);
	let showWinOverlay = $state(false);
	let showLostOverlay = $state(false);
	let winWord = $state('');
	let lostWord = $state('');
	let winOverlayTimer: ReturnType<typeof setTimeout> | null = null;
	let animating = $state(false);
	let bonusCountdown = $state(false);

	// ── Timer seconds (bonus gets +20) ────────────────────────────────────────
	const currentTimerSeconds = $derived(
		phase === 'bonus' ? data.timerSeconds + BONUS_EXTRA_SECONDS : data.timerSeconds
	);

	// ── Sync from server on load / invalidateAll ──────────────────────────────
	$effect(() => {
		if (animating) return;
		gameState = {
			...(data.gameState as GameState),
			wordLength: LINGO_WORD_LENGTH,
			maxAttempts: LINGO_MAX_ATTEMPTS
		};
		phase = data.phase;
		roundNumber = data.roundNumber;
		wordsGuessed = data.wordsGuessed;
		markedNumbers = data.markedNumbers as MarkedNumber[];
		bingo = data.bingo as BingoResult;
		ballPit = data.ballPit as Ball[];
		bonusLetter = data.bonusLetter ?? null;
		bonusPosition = data.bonusPosition ?? null;
		currentInput = [];
		timerActive = phase === 'guessing' || phase === 'bonus';
	});

	// ── Action response handler ───────────────────────────────────────────────
	$effect(() => {
		if (!form) return;

		// ── Guess submitted ──────────────────────────────────────────────────
		if ('gameStatus' in form && form.gameStatus) {
			const newGuesses = data.gameState.guesses;
			const newRowIndex = newGuesses.length - 1;
			const totalFlipMs = (LINGO_WORD_LENGTH - 1) * FLIP_DURATION + 500 + FLIP_BUFFER;

			// Show tiles immediately (not yet coloured)
			animating = true;
			gameState = {
				...gameState,
				guesses: newGuesses,
				status: 'playing',
				revealedLetters: gameState.revealedLetters
			};
			currentInput = [];
			revealingRow = newRowIndex;

			setTimeout(() => {
				revealingRow = -1;
				submitting = false;
				animating = false;

				// Apply final state + colours after flip
				gameState = {
					...gameState,
					guesses: newGuesses,
					status: form.gameStatus as GameState['status'],
					revealedLetters:
						(form.revealedLetters as GameState['revealedLetters']) ?? gameState.revealedLetters
				};

				if (form.phase) phase = form.phase as typeof phase;
				if (form.markedNumbers) markedNumbers = form.markedNumbers as MarkedNumber[];
				if ('bingo' in form) bingo = form.bingo as BingoResult;
				if (typeof form.roundNumber === 'number') roundNumber = form.roundNumber;
				if ('bonusLetter' in form) bonusLetter = (form.bonusLetter as string | null) ?? null;
				if ('bonusPosition' in form) bonusPosition = (form.bonusPosition as number | null) ?? null;

				if (form.gameStatus === 'won') {
					// ✅ Correct word — show overlay then advance (same as palabra)
					timerActive = false;
					winWord = newGuesses[newGuesses.length - 1]?.map((g) => g.letter).join('') ?? '';
					showWinOverlay = true;
					winOverlayTimer = setTimeout(() => advanceFromWin(), WIN_OVERLAY_DELAY);
				} else if (form.gameStatus === 'lost') {
					// ❌ All attempts exhausted (including bonus) — reveal word via overlay
					const word = form.word as string | undefined;
					timerActive = false;
					if (word) {
						lostWord = word;
						showLostOverlay = true;
					} else {
						invalidateAll();
					}
				} else if (form.phase === 'bonus') {
					// 6 normal attempts failed → bonus round unlocked after 20s delay
					timerActive = false;
					bonusCountdown = true;
					message = t.bonusRound;
					setTimeout(() => {
						bonusCountdown = false;
						timerActive = true;
						message = '';
					}, BONUS_COUNTDOWN_MS);
				}
			}, totalFlipMs);
		}

		// ── Timer expired ────────────────────────────────────────────────────
		if ('timedOut' in form && form.timedOut) {
			if (form.phase) phase = form.phase as typeof phase;
			if (typeof form.roundNumber === 'number') roundNumber = form.roundNumber;
			if ('bonusLetter' in form) bonusLetter = (form.bonusLetter as string | null) ?? null;
			if ('bonusPosition' in form) bonusPosition = (form.bonusPosition as number | null) ?? null;

			currentInput = [];

			if (form.phase === 'bonus') {
				// Normal timer expired → move to bonus round after 20s delay
				timerActive = false;
				bonusCountdown = true;
				message = t.bonusRound;
				setTimeout(() => {
					bonusCountdown = false;
					timerActive = true;
					message = '';
				}, BONUS_COUNTDOWN_MS);
			} else if (form.phase === 'done') {
				// Bonus timer expired too → reveal word via overlay
				timerActive = false;
				const word = form.word as string | undefined;
				if (word) {
					lostWord = word;
					showLostOverlay = true;
				} else {
					invalidateAll();
				}
			} else {
				// Mid-round timeout (shouldn't normally happen)
				timerActive = false;
				setTimeout(() => {
					timerActive = true;
				}, 1200);
			}
		}

		// ── Ball picked ──────────────────────────────────────────────────────
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

		// ── Card number marked ───────────────────────────────────────────────
		if ('markedNumbers' in form && form.phase && !('pickedBall' in form)) {
			if (form.markedNumbers) markedNumbers = form.markedNumbers as MarkedNumber[];
			if ('bingo' in form) bingo = form.bingo as BingoResult;
			if (form.phase) phase = form.phase as typeof phase;
			message = t.messageNumberMarked;
			setTimeout(() => (message = ''), 1500);
		}

		// ── Invalid word — red shake only, no message ────────────────────────
		if ('error' in form && form.error) {
			submitting = false;
			shakeRow = true;
			setTimeout(() => {
				shakeRow = false;
			}, 600);
		}
	});

	// ── Win overlay advance (same pattern as palabra) ─────────────────────────
	function advanceFromWin() {
		if (winOverlayTimer) {
			clearTimeout(winOverlayTimer);
			winOverlayTimer = null;
		}
		showWinOverlay = false;
		invalidateAll();
	}

	// ── Input handling ────────────────────────────────────────────────────────
	function handleKey(key: string) {
		if ((phase !== 'guessing' && phase !== 'bonus') || gameState.status !== 'playing' || submitting)
			return;
		// guessing: 1 locked (first letter); bonus: 2 locked (first + bonus hint)
		const lockedCount = phase === 'bonus' ? 2 : 1;
		const maxInput = LINGO_WORD_LENGTH - lockedCount;
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
		if (showWinOverlay) {
			advanceFromWin();
			return;
		}
		handleKey(e.key === 'Enter' ? 'Enter' : e.key === 'Backspace' ? 'Backspace' : e.key);
	}

	// ── Forms ─────────────────────────────────────────────────────────────────
	let guessForm: HTMLFormElement;
	let timerExpireForm: HTMLFormElement;
	let ballForm: HTMLFormElement;
	let cardPickForm: HTMLFormElement;

	function handleTimerExpire() {
		if ((phase !== 'guessing' && phase !== 'bonus') || gameState.status !== 'playing') return;
		timerActive = false;
		currentInput = [];
		timerExpireForm.requestSubmit();
	}

	function submitGuess() {
		const lockedCount = phase === 'bonus' ? 2 : 1;
		const needed = LINGO_WORD_LENGTH - lockedCount;
		if (currentInput.length !== needed || submitting) return;
		submitting = true;
		guessForm.requestSubmit();
	}

	function handlePickBall(ball: Ball) {
		const idx = ballPit.findIndex((b) => b.number === ball.number);
		if (idx === -1) return;
		(ballForm.querySelector('input[name="ballIndex"]') as HTMLInputElement).value = String(idx);
		ballForm.requestSubmit();
	}

	function handleCardNumberPick(num: number) {
		(cardPickForm.querySelector('input[name="number"]') as HTMLInputElement).value = String(num);
		cardPickForm.requestSubmit();
	}

	// ── Derived ───────────────────────────────────────────────────────────────
	const markedSet = $derived(new Set(markedNumbers.map((m) => m.number)));

	const unmarkedCardNumbers = $derived(
		data.bingoCard.flat().filter((n) => n !== 0 && !markedSet.has(n))
	);

	const bonusLockedPositions = $derived<Record<number, string>>(
		phase === 'bonus' && bonusLetter && bonusPosition !== null
			? { [bonusPosition]: bonusLetter }
			: {}
	);

	// 6 rows normally; 7 when bonus row is live (after 20s countdown)
	const totalBoardRows = $derived(phase === 'bonus' && !bonusCountdown ? 7 : 6);

	// Cursor = next free slot index within freePositions
	const activeInputIndex = $derived(
		gameState.status !== 'playing' || submitting ? -1 : currentInput.length
	);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col items-center bg-bg-lingo px-4 pt-16">
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="w-full max-w-lg">
		<div class="relative flex items-center mb-2">
			<a href="/" class="text-gray-400 hover:text-gray-600 text-sm">{tNav.back}</a>
			<div class="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
				<h1 class="text-2xl font-black tracking-widest uppercase text-blue-600 whitespace-nowrap">
					{t.title}
				</h1>
				<div class="text-xs text-gray-400 mt-0.5">
					{t.roundCounter(roundNumber, data.totalRounds)} · {t.wordsCorrect(wordsGuessed)}
				</div>
			</div>
			<div class="ml-auto"><LangToggle /></div>
		</div>
	</div>

	<!-- ── Timer ───────────────────────────────────────────────────────────── -->
	<div class="flex justify-center gap-2 mt-4">
		{#if phase === 'guessing' || phase === 'bonus'}
			<div class="flex items-center gap-3">
				{#key phase}
					<CountdownTimer
						seconds={currentTimerSeconds}
						active={timerActive && gameState.status === 'playing'}
						onExpire={handleTimerExpire}
					/>
				{/key}
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

	<!-- ── Message ─────────────────────────────────────────────────────────── -->
	{#if message}
		<div class="mt-3 mb-1 px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-semibold">
			{message}
		</div>
	{/if}

	<!-- ── Guessing / Bonus ─────────────────────────────────────────────────── -->
	{#if phase === 'guessing' || phase === 'bonus'}
		<div class="mt-4 mb-4 relative w-full max-w-2xl flex flex-col items-center">
			<WordBoard
				{gameState}
				{currentInput}
				firstLetterLocked={data.firstLetter}
				lockedPositions={bonusLockedPositions}
				totalRows={totalBoardRows}
				{shakeRow}
				{revealingRow}
				{activeInputIndex}
			/>
			<div class="hidden md:block absolute top-0 right-0 -mr-64">
				<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
			</div>
		</div>

		<div class="w-full max-w-md">
			<WordKeyboard
				revealedLetters={gameState.revealedLetters}
				onKey={handleKey}
				disabled={gameState.status !== 'playing' || submitting}
			/>
		</div>

		<div class="md:hidden flex justify-center mt-4">
			<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
		</div>

		<!-- ── Ball pit ─────────────────────────────────────────────────────────── -->
	{:else if phase === 'balls'}
		<div class="mt-4 relative w-full max-w-2xl flex flex-col items-center">
			<BallPit balls={ballPit} onPick={handlePickBall} />
			<div class="hidden md:block absolute top-0 right-0 -mr-64">
				<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
			</div>
		</div>
		<div class="md:hidden flex justify-center mt-4">
			<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
		</div>

		<!-- ── Gold ball ────────────────────────────────────────────────────────── -->
	{:else if phase === 'gold'}
		<div class="mt-4 relative w-full max-w-2xl flex flex-col items-center gap-4">
			<div class="text-center">
				<div class="text-4xl">{tGold.emoji}</div>
				<h2 class="text-lg font-black mt-2">{tGold.title}</h2>
				<p class="text-sm text-gray-500 mt-1">{tGold.subtitle}</p>
			</div>
			<div class="grid grid-cols-5 gap-2 max-w-xs">
				{#each unmarkedCardNumbers as num}
					<button
						onclick={() => handleCardNumberPick(num)}
						class="w-11 h-11 rounded-lg bg-ball-gold text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
					>
						{num}
					</button>
				{/each}
			</div>
			<div class="hidden md:block absolute top-0 right-0 -mr-64">
				<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
			</div>
		</div>
		<div class="md:hidden flex justify-center mt-4">
			<BingoCard card={data.bingoCard} marked={markedNumbers} {bingo} />
		</div>

		<!-- ── Game over ────────────────────────────────────────────────────────── -->
	{:else}
		<div class="flex flex-col items-center gap-6 mt-4 w-full max-w-lg">
			<div class="text-center">
				<div class="text-5xl mb-2">{bingo ? '🎉' : '📋'}</div>
				<h2 class="text-2xl font-black">{bingo ? t.gameOverBingo : t.gameOverTitle}</h2>
				<p class="text-gray-500 mt-1">{t.gameOverSummary(wordsGuessed, data.totalRounds)}</p>
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
						class="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition-colors"
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

	<!-- ── Scores ───────────────────────────────────────────────────────────── -->
	{#if data.scores && (phase === 'guessing' || phase === 'bonus')}
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

<!-- ── Win overlay (identical pattern to palabra) ──────────────────────────── -->
<WordCorrectOverlay
	show={showWinOverlay}
	word={winWord}
	messageText={t.messageWon}
	onDismiss={advanceFromWin}
/>

<WordCorrectOverlay
	show={showLostOverlay}
	word={lostWord}
	messageText={t.messageLost}
	variant="lost"
	onDismiss={() => { showLostOverlay = false; invalidateAll(); }}
/>

<!-- ── Hidden forms ─────────────────────────────────────────────────────────── -->
<form
	bind:this={guessForm}
	method="POST"
	action="?/submitGuess"
	use:enhance={({ formData }) => {
		// Build full 6-letter guess, inserting locked positions
		const result: string[] = Array(LINGO_WORD_LENGTH).fill('');
		result[0] = data.firstLetter;
		if (phase === 'bonus' && bonusLetter && bonusPosition !== null) {
			result[bonusPosition] = bonusLetter;
		}
		let inputIdx = 0;
		for (let i = 0; i < LINGO_WORD_LENGTH; i++) {
			if (result[i]) continue;
			if (inputIdx < currentInput.length) result[i] = currentInput[inputIdx++];
		}
		formData.set('guess', result.join(''));
		return async ({ result, update }) => {
			await update({ reset: false });
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
