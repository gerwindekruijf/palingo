<script lang="ts">
	import type { TileState } from '$lib/game/word-engine';

	interface Props {
		letter?: string;
		state?: TileState;
		revealed?: boolean;
		/** When true, trigger the flip animation */
		flipping?: boolean;
		size?: 'sm' | 'md' | 'lg';
		error?: boolean;
		/** Show blinking cursor on this tile */
		cursor?: boolean;
	}

	let { letter = '', state = 'empty', revealed = false, flipping = false, size = 'md', error = false, cursor = false }: Props = $props();

	const sizeClass = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-16 h-16 text-3xl' };

	const stateClass = $derived.by(() => {
		if (error && !revealed) {
			return letter
				? 'border-2 border-red-500 bg-red-500 text-white'
				: 'border-2 border-red-400 bg-red-100';
		}
		if (!revealed || !letter) {
			return letter
				? 'border-2 border-gray-500 bg-white text-black'
				: 'border-2 border-gray-300 bg-white';
		}
		switch (state) {
			case 'correct':
				return 'border-2 border-tile-correct bg-tile-correct text-white';
			case 'present':
				return 'border-2 border-tile-present bg-tile-present text-white';
			case 'absent':
				return 'border-2 border-tile-absent bg-tile-absent text-white';
			default:
				return 'border-2 border-gray-300 bg-white';
		}
	});
</script>

<div
	class="relative flex items-center justify-center font-bold uppercase select-none
		{sizeClass[size]} {stateClass} {flipping ? 'tile-flip' : ''}"
>
	{letter}
	{#if cursor}
		<span class="tile-cursor"></span>
	{/if}
</div>

<style>
	.tile-flip {
		animation: tile-flip 0.5s ease-in-out;
	}

	@keyframes tile-flip {
		0%   { transform: rotateX(0deg);   }
		50%  { transform: rotateX(-90deg); }
		100% { transform: rotateX(0deg);   }
	}

	.tile-cursor {
		position: absolute;
		bottom: 5px;
		left: 50%;
		transform: translateX(-50%);
		width: 2px;
		height: 75%;
		background: currentColor;
		animation: blink 1s step-start infinite;
		border-radius: 1px;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0; }
	}
</style>
