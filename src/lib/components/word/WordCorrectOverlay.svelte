<script lang="ts">
	interface Props {
		show: boolean;
		word: string;
		messageText: string;
		continueText?: string;
		onDismiss: () => void;
		autoDismissMs?: number;
		variant?: 'correct' | 'lost';
	}

	let { show, word, messageText, continueText, onDismiss, autoDismissMs = 2500, variant = 'correct' }: Props = $props();

	const tileColor = $derived(variant === 'lost' ? 'bg-red-500' : 'bg-tile-correct');
	const textColor = $derived(variant === 'lost' ? 'text-red-500' : 'text-tile-correct');

	$effect(() => {
		if (!show) return;
		const timer = setTimeout(() => onDismiss(), autoDismissMs);
		return () => clearTimeout(timer);
	});
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="win-overlay-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		onclick={onDismiss}
	>
		<div class="win-overlay-card bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5">
			<p class="text-lg font-bold tracking-widest uppercase {textColor}">
				{messageText}
			</p>
			<div class="flex gap-2">
				{#each word.split('') as letter}
					<div class="w-12 h-12 text-xl flex items-center justify-center font-black uppercase
						text-white {tileColor} rounded-sm shadow-md">
						{letter}
					</div>
				{/each}
			</div>
			{#if continueText}
				<p class="text-sm text-gray-400">{continueText}</p>
			{/if}
		</div>
	</div>
{/if}
