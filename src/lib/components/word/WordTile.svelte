<script lang="ts">
	import type { TileState } from '$lib/game/word-engine';

	interface Props {
		letter?: string;
		state?: TileState;
		revealed?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { letter = '', state = 'empty', revealed = false, size = 'md' }: Props = $props();

	const sizeClass = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-16 h-16 text-3xl' };

	const stateClass = $derived.by(() => {
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
	class="flex items-center justify-center font-bold uppercase select-none transition-all duration-300
		{sizeClass[size]} {stateClass}"
>
	{letter}
</div>
