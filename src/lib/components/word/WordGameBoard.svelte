<script lang="ts">
	import WordBoard from './WordBoard.svelte';
	import WordKeyboard from './WordKeyboard.svelte';
	import WordCorrectOverlay from './WordCorrectOverlay.svelte';
	import { applyGuess } from '$lib/game/word-engine';
	import type { GameState } from '$lib/game/word-engine';
	import { FLIP_DURATION, FLIP_BUFFER, WIN_OVERLAY_DELAY } from '$lib/config/constants';

	interface SubmitResult {
		valid: true;
		target: string;
	}

	interface SubmitInvalid {
		valid: false;
	}

	interface Props {
		/** Current game state — bound so caller sees updates */
		gameState: GameState;
		/** First letter to lock on current + first row */
		firstLetterLocked?: string;
		/** Extra locked positions (e.g. bonus hint) — map of position → letter */
		lockedPositions?: Record<number, string>;
		/** Override total visible rows */
		totalRows?: number;
		/** Whether keyboard/input is disabled externally */
		disabled?: boolean;
		/**
		 * Called when user submits a guess with the full word (locked letters inserted).
		 * Return { valid: true, target } to accept, { valid: false } to reject (shake).
		 * The component handles evaluateGuess + applyGuess + animation internally.
		 */
		onSubmitGuess: (guess: string) => Promise<SubmitResult | SubmitInvalid>;
		/** Called after flip animation with the updated GameState */
		onGuessApplied?: (newState: GameState) => void;
		/** Called after win overlay dismiss */
		onWin?: (word: string) => void;
		/** Called after loss overlay dismiss */
		onLoss?: () => void;
		/** Overlay text */
		winMessage?: string;
		lostMessage?: string;
		continueText?: string;
		/** The target word to show on loss (set by caller, who knows the answer) */
		lostWord?: string;
		/** Color for locked tiles */
		lockedColor?: 'blue' | 'purple';
	}

	let {
		gameState = $bindable(),
		firstLetterLocked,
		lockedPositions = {},
		totalRows,
		disabled = false,
		onSubmitGuess,
		onGuessApplied,
		onWin,
		onLoss,
		winMessage = '',
		lostMessage = '',
		continueText,
		lostWord = '',
		lockedColor = 'blue'
	}: Props = $props();

	let currentInput = $state<string[]>([]);
	let submitting = $state(false);
	let shakeRow = $state(false);
	let revealingRow = $state(-1);
	let showWinOverlay = $state(false);
	let showLostOverlay = $state(false);
	let overlayWord = $state('');
	let winOverlayTimer: ReturnType<typeof setTimeout> | null = null;

	// Locked positions as a merged map (pos 0 from firstLetterLocked + extras)
	const allLocked = $derived.by(() => {
		const m: Record<number, string> = { ...lockedPositions };
		if (firstLetterLocked) m[0] = firstLetterLocked;
		return m;
	});

	const lockedCount = $derived(Object.keys(allLocked).length);
	const maxInput = $derived(gameState.wordLength - lockedCount);

	const activeInputIndex = $derived(
		gameState.status !== 'playing' || submitting || disabled ? -1 : currentInput.length
	);

	// Build full word from currentInput + locked positions
	function buildFullWord(): string {
		const result: string[] = Array(gameState.wordLength).fill('');
		for (const [posStr, letter] of Object.entries(allLocked)) {
			result[Number(posStr)] = letter;
		}
		let inputIdx = 0;
		for (let i = 0; i < gameState.wordLength; i++) {
			if (result[i]) continue;
			if (inputIdx < currentInput.length) result[i] = currentInput[inputIdx++];
		}
		return result.join('');
	}

	// ── Input handling ──────────────────────────────────────────────────────
	export function handleKey(key: string) {
		if (gameState.status !== 'playing' || submitting || disabled) return;
		if (key === 'Backspace') {
			if (currentInput.length > 0) currentInput = currentInput.slice(0, -1);
		} else if (key === 'Enter') {
			doSubmit();
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

	async function doSubmit() {
		if (currentInput.length !== maxInput || submitting) return;
		submitting = true;

		const guess = buildFullWord();
		const result = await onSubmitGuess(guess);

		if (!result.valid) {
			shakeRow = true;
			setTimeout(() => (shakeRow = false), 600);
			submitting = false;
			return;
		}

		// Evaluate + apply
		const newState = applyGuess(gameState, guess, result.target);
		const newRowIndex = newState.guesses.length - 1;

		// Show tiles immediately (uncoloured)
		gameState = {
			...newState,
			status: 'playing',
			revealedLetters: gameState.revealedLetters
		};
		currentInput = [];
		revealingRow = newRowIndex;

		const totalFlipMs = (gameState.wordLength - 1) * FLIP_DURATION + 500 + FLIP_BUFFER;

		setTimeout(() => {
			revealingRow = -1;
			submitting = false;

			// Apply final coloured state
			gameState = newState;
			onGuessApplied?.(newState);

			if (newState.status === 'won') {
				overlayWord = guess;
				showWinOverlay = true;
				winOverlayTimer = setTimeout(() => advanceFromWin(), WIN_OVERLAY_DELAY);
			} else if (newState.status === 'lost') {
				overlayWord = lostWord || guess;
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
		onWin?.(overlayWord);
	}

	function handleLostDismiss() {
		showLostOverlay = false;
		onLoss?.();
	}

	// ── Public API ──────────────────────────────────────────────────────────
	export function resetInput() {
		currentInput = [];
		submitting = false;
		revealingRow = -1;
	}

	/** Trigger the lost overlay externally (e.g. when timer expires) */
	export function showLoss(word: string) {
		overlayWord = word;
		showLostOverlay = true;
	}

</script>

<svelte:window onkeydown={handleKeydown} />

<div class="mt-4 mb-4">
	<WordBoard
		{gameState}
		{currentInput}
		{firstLetterLocked}
		{lockedPositions}
		{totalRows}
		{shakeRow}
		{revealingRow}
		{activeInputIndex}
		{lockedColor}
	/>
</div>

<div class="w-full max-w-md">
	<WordKeyboard
		revealedLetters={gameState.revealedLetters}
		onKey={handleKey}
		disabled={gameState.status !== 'playing' || submitting || disabled}
	/>
</div>

<WordCorrectOverlay
	show={showWinOverlay}
	word={overlayWord}
	messageText={winMessage}
	{continueText}
	onDismiss={advanceFromWin}
/>

<WordCorrectOverlay
	show={showLostOverlay}
	word={lostWord || overlayWord}
	messageText={lostMessage}
	variant="lost"
	onDismiss={handleLostDismiss}
/>
