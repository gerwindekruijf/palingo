<script lang="ts">
	import type { TileState } from '$lib/game/word-engine';

	interface Props {
		letter?: string;
		state?: TileState;
		revealed?: boolean;
		flipping?: boolean;
		size?: 'sm' | 'md' | 'lg';
		error?: boolean;
		cursor?: boolean;
	}

	let {
		letter = '',
		state = 'empty',
		revealed = false,
		flipping = false,
		size = 'md',
		error = false,
		cursor = false
	}: Props = $props();

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
        {sizeClass[size]} {stateClass}
        {flipping ? 'tile-flip' : ''}
        {error ? 'tile-error-blink' : ''}"
>
	{letter}
	{#if cursor}
		<span class="tile-cursor"></span>
	{/if}
</div>
