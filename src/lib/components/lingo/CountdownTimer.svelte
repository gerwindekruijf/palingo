<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';

	interface Props {
		remaining: number;
		maxSeconds: number;
		active: boolean;
		onExpire?: () => void;
		onTick?: (remaining: number) => void;
	}

	let { remaining, maxSeconds, active, onExpire, onTick }: Props = $props();

	const radius = 28;
	const circumference = 2 * Math.PI * radius;

	const progress = $derived((remaining / maxSeconds) * circumference);
	const isUrgent = $derived(remaining <= 5);

	$effect(() => {
		if (!active) return;

		const interval = setInterval(() => {
			const next = remaining - 1;
			onTick?.(next);
			if (next <= 0) {
				clearInterval(interval);
				onExpire?.();
			}
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

<div class="flex flex-col items-center gap-1">
	<div class="relative w-16 h-16">
		<svg class="w-full h-full -rotate-90" viewBox="0 0 64 64">
			<circle cx="32" cy="32" r={radius} fill="none" stroke="#e5e7eb" stroke-width="4" />
			<circle
				cx="32" cy="32" r={radius}
				fill="none"
				stroke={isUrgent ? '#ef4444' : '#3b82f6'}
				stroke-width="4"
				stroke-dasharray={circumference}
				stroke-dashoffset={circumference - progress}
				stroke-linecap="round"
				class="transition-all duration-1000"
			/>
		</svg>
		<span class="absolute inset-0 flex items-center justify-center text-xl font-bold
			{isUrgent ? 'text-red-500' : 'text-gray-800'}">
			{remaining}
		</span>
	</div>
	<span class="text-xs text-gray-500 uppercase tracking-wide">{langStore.t.timer.label}</span>
</div>
