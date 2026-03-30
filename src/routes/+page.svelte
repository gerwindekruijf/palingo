<script lang="ts">
	import { langStore } from '$lib/i18n/lang.svelte';
	import LangToggle from '$lib/components/LangToggle.svelte';

	const t = $derived(langStore.t.home);
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-white px-6 py-12">
	<div class="max-w-sm w-full flex flex-col items-center gap-10">
		<!-- Logo / Title -->
		<div class="text-center">
			<div class="flex items-center justify-center gap-3 mb-1">
				<h1 class="text-5xl font-black tracking-widest uppercase text-gray-900">{t.title}</h1>
				<LangToggle />
			</div>
			<p class="text-gray-400 mt-2 text-sm tracking-wide">{t.subtitle}</p>
		</div>

		<!-- Game cards -->
		<div class="flex flex-col gap-4 w-full">
			<!-- Palabra del Día -->
			<a
				href="/palabra-del-dia"
				class="group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200
					hover:border-tile-correct hover:bg-green-50
					transition-all duration-200 cursor-pointer"
			>
				<div class="w-14 h-14 rounded-xl bg-tile-correct flex items-center justify-center text-white text-2xl font-black shrink-0">
					P
				</div>
				<div>
					<div class="font-bold text-lg text-gray-900">{t.palabraTitle}</div>
					<div class="text-sm text-gray-500">{t.palabraDesc}</div>
				</div>
				<div class="ml-auto text-gray-300 group-hover:text-gray-500 text-xl">→</div>
			</a>

			<!-- Lingo -->
			<a
				href="/lingo"
				class="group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200
					hover:border-red-500 hover:bg-red-50
					transition-all duration-200 cursor-pointer"
			>
				<div class="w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center text-white text-2xl font-black shrink-0">
					L
				</div>
				<div>
					<div class="font-bold text-lg text-gray-900">{t.lingoTitle}</div>
					<div class="text-sm text-gray-500">{t.lingoDesc}</div>
				</div>
				<div class="ml-auto text-gray-300 group-hover:text-gray-500 text-xl">→</div>
			</a>

			<!-- SuperLingo -->
			<a
				href="/superlingo"
				class="group flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-200
					hover:border-purple-500 hover:bg-purple-50
					transition-all duration-200 cursor-pointer"
			>
				<div class="w-14 h-14 rounded-xl bg-purple-700 flex items-center justify-center text-white text-2xl font-black shrink-0">
					SL
				</div>
				<div>
					<div class="font-bold text-lg text-gray-900">{t.superLingoTitle}</div>
					<div class="text-sm text-gray-500">{t.superLingoDesc}</div>
				</div>
				<div class="ml-auto text-gray-300 group-hover:text-gray-500 text-xl">→</div>
			</a>
		</div>

		<!-- Auth link -->
		<p class="text-xs text-gray-400">
			<a href="/login" class="underline hover:text-gray-600">{t.loginNudge}</a>
			{t.loginNudgeSuffix}
		</p>
	</div>
</div>
