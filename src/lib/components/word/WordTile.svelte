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
		locked?: boolean;
		lockedColor?: 'blue' | 'purple';
	}

	let {
		letter = '',
		state = 'empty',
		revealed = false,
		flipping = false,
		size = 'md',
		error = false,
		cursor = false,
		locked = false,
		lockedColor = 'blue'
	}: Props = $props();

	const sizeClass = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-16 h-16 text-3xl' };

	const lockedColorClass: Record<string, string> = {
		blue: 'border-2 border-blue-500 bg-blue-500 text-white',
		purple: 'border-2 border-purple-600 bg-purple-600 text-white'
	};

	const stateClass = $derived.by(() => {
		if (error && !revealed) {
			return letter
				? 'border-2 border-red-500 bg-red-500 text-white'
				: 'border-2 border-red-400 bg-red-100';
		}
		if (locked && letter) {
			return lockedColorClass[lockedColor] ?? lockedColorClass.blue;
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
