<script lang="ts">
	import { goto } from '$app/navigation';
	import WordGameBoard from '$lib/components/word/WordGameBoard.svelte';
	import CountdownTimer from '$lib/components/lingo/CountdownTimer.svelte';
	import BallPit from '$lib/components/lingo/BallPit.svelte';
	import BingoCard from '$lib/components/lingo/BingoCard.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';
	import { langStore } from '$lib/i18n/lang.svelte';
	import { createGameState } from '$lib/game/word-engine';
	import type { GameState } from '$lib/game/word-engine';
	import {
		generateBingoCard,
		generateBallPit,
		checkBingo,
		pickRandomCardNumber
	} from '$lib/game/lingo-engine';
	import type { Ball, MarkedNumber, BingoResult } from '$lib/game/lingo-engine';
	import type { PageData } from './$types';
	import {
		LINGO_WORD_LENGTH,
		LINGO_MAX_ATTEMPTS,
		ROUNDS_PER_GAME,
		BONUS_COUNTDOWN_MS,
		TIMER_SECONDS_BASE,
		TIMER_SECONDS_PER_WORD,
		TIMER_SECONDS_MAX,
		TIMER_SECONDS_BONUS
	} from '$lib/config/constants';

	let { data }: { data: PageData } = $props();

	const t = $derived(langStore.t.lingo);
	const tNav = $derived(langStore.t.nav);
	const tGold = $derived(langStore.t.goldBall);

	// ── Game state ──────────────────────────────────────────────────────────
	let gameState = $state<GameState>(createGameState(LINGO_WORD_LENGTH, LINGO_MAX_ATTEMPTS));
	let phase = $state<'guessing' | 'bonus' | 'balls' | 'gold' | 'done'>('guessing');
	let roundNumber = $state(1);
	let wordsGuessed = $state(0);
	let bingoCard = $state<number[][]>(generateBingoCard());
	let markedNumbers = $state<MarkedNumber[]>([]);
	let bingo = $state<BingoResult>(false);
	let ballPit = $state<Ball[]>(generateBallPit());
	let timerActive = $state(true);
	let timerRemaining = $state(TIMER_SECONDS_BASE);
	let timerMax = $state(TIMER_SECONDS_MAX);
	let message = $state('');
	let bonusLetter = $state<string | null>(null);
	let bonusPosition = $state<number | null>(null);
	let bonusCountdown = $state(false);
	let wordGameBoard = $state<WordGameBoard>();

	let target = $derived(data.words[roundNumber - 1] ?? '');

	const bonusLockedPositions = $derived<Record<number, string>>(
		phase === 'bonus' && bonusLetter && bonusPosition !== null
			? { [bonusPosition]: bonusLetter }
			: {}
	);

	const totalBoardRows = $derived(
		phase === 'bonus' && !bonusCountdown ? LINGO_MAX_ATTEMPTS + 1 : LINGO_MAX_ATTEMPTS
	);

	const markedSet = $derived(new Set(markedNumbers.map((m) => m.number)));
	const unmarkedCardNumbers = $derived(
		bingoCard.flat().filter((n) => n !== 0 && !markedSet.has(n))
	);

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

	// ── After guess animation completes ─────────────────────────────────────
	function handleGuessApplied(newState: GameState) {
		if (newState.status === 'won') {
			const preNum = pickRandomCardNumber(bingoCard, markedNumbers);
			if (preNum !== null) {
				markedNumbers = [...markedNumbers, { number: preNum, source: 'word' }];
			}
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
		message = t.bonusRound;

		const bonus = pickBonusPosition(target, state);
		bonusLetter = bonus?.letter ?? null;
		bonusPosition = bonus?.position ?? null;

		gameState = { ...state, status: 'playing', maxAttempts: LINGO_MAX_ATTEMPTS + 1 };
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

	// ── Win / Loss ──────────────────────────────────────────────────────────
	function handleWin() {
		if (!bingo) bingo = checkBingo(bingoCard, markedNumbers);
		phase = 'balls';
		ballPit = generateBallPit();
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
			if (totalAttempts >= LINGO_MAX_ATTEMPTS) {
				enterBonusPhase(gameState);
			} else {
				wordGameBoard?.resetInput();
				// Reset timer for next attempt (no bonus for missed)
				startTimer(timerRemaining, TIMER_SECONDS_MAX);
			}
		}
	}

	// ── Ball picking ────────────────────────────────────────────────────────
	function handlePickBall(ball: Ball) {
		ballPit = ballPit.map((b) => (b.number === ball.number ? { ...b, picked: true } : b));

		if (ball.type === 'green') {
			const num = pickRandomCardNumber(bingoCard, markedNumbers);
			if (num !== null) markedNumbers = [...markedNumbers, { number: num, source: 'ball' }];
			message = t.messageGreenBall;
			setTimeout(() => (message = ''), 1500);
		} else if (ball.type === 'gold') {
			message = t.messageGoldBall;
			phase = 'gold';
			return;
		}

		if (!bingo) bingo = checkBingo(bingoCard, markedNumbers);
		advanceToNextRound();
	}

	function handleCardNumberPick(num: number) {
		markedNumbers = [...markedNumbers, { number: num, source: 'ball' }];
		if (!bingo) bingo = checkBingo(bingoCard, markedNumbers);
		message = t.messageNumberMarked;
		setTimeout(() => (message = ''), 1500);
		advanceToNextRound();
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
		gameState = createGameState(LINGO_WORD_LENGTH, LINGO_MAX_ATTEMPTS);
		ballPit = generateBallPit();
		wordGameBoard?.resetInput();
		// New round: timer = base + words-guessed bonus, capped at MAX
		startTimer(
			Math.min(TIMER_SECONDS_BASE + wordsGuessed * TIMER_SECONDS_PER_WORD, TIMER_SECONDS_MAX),
			TIMER_SECONDS_MAX
		);
	}

	function loadGameIndex(): number {
		try {
			return parseInt(sessionStorage.getItem('lingo_gameindex') ?? '0') || 0;
		} catch {
			return 0;
		}
	}
	function saveGameIndex(idx: number) {
		try {
			sessionStorage.setItem('lingo_gameindex', String(idx));
		} catch {}
	}

	function startNewGame() {
		const nextIndex = loadGameIndex() + 1;
		saveGameIndex(nextIndex);
		goto(`/lingo?gameIndex=${nextIndex}`, { invalidateAll: true });
	}

	async function persistScore() {
		if (!data.user) return;
		try {
			const formData = new FormData();
			formData.set('won', String(!!bingo));
			formData.set('wordsGuessed', String(wordsGuessed));
			await fetch('?/saveScore', { method: 'POST', body: formData });
		} catch {}
	}
</script>

<div class="min-h-screen flex flex-col items-center bg-bg-lingo px-4 pt-16">
	<!-- Header -->
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

	<!-- Message -->
	{#if message}
		<div class="mt-3 mb-1 px-5 py-2 bg-gray-900 text-white rounded-full text-sm font-semibold">
			{message}
		</div>
	{/if}

	<!-- Guessing / Bonus phase -->
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
			<div class="hidden md:block absolute top-0 right-0 -mr-64">
				<BingoCard card={bingoCard} marked={markedNumbers} {bingo} />
			</div>
		</div>

		<div class="md:hidden flex justify-center mt-4">
			<BingoCard card={bingoCard} marked={markedNumbers} {bingo} />
		</div>

		<!-- Ball pit -->
	{:else if phase === 'balls'}
		<div class="mt-4 relative w-full max-w-2xl flex flex-col items-center">
			<BallPit balls={ballPit} onPick={handlePickBall} />
			<div class="hidden md:block absolute top-0 right-0 -mr-64">
				<BingoCard card={bingoCard} marked={markedNumbers} {bingo} />
			</div>
		</div>
		<div class="md:hidden flex justify-center mt-4">
			<BingoCard card={bingoCard} marked={markedNumbers} {bingo} />
		</div>

		<!-- Gold ball -->
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
				<BingoCard card={bingoCard} marked={markedNumbers} {bingo} />
			</div>
		</div>
		<div class="md:hidden flex justify-center mt-4">
			<BingoCard card={bingoCard} marked={markedNumbers} {bingo} />
		</div>

		<!-- Game over -->
	{:else}
		<div class="flex flex-col items-center gap-6 mt-4 w-full max-w-lg">
			<div class="text-center">
				<div class="text-5xl mb-2">{bingo ? '🎉' : '📋'}</div>
				<h2 class="text-2xl font-black">{bingo ? t.gameOverBingo : t.gameOverTitle}</h2>
				<p class="text-gray-500 mt-1">{t.gameOverSummary(wordsGuessed, data.totalRounds)}</p>
			</div>

			<BingoCard card={bingoCard} marked={markedNumbers} {bingo} />

			<div class="flex flex-col items-center gap-3">
				<button
					onclick={startNewGame}
					class="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition-colors"
				>
					{t.newGame}
				</button>
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
