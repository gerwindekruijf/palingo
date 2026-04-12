import { translations, type Lang } from './translations';
import { browser } from '$app/environment';

const STORAGE_KEY = 'palingo_lang';

function createLang() {
	const stored = browser ? localStorage.getItem(STORAGE_KEY) : null;
	const initial: Lang = stored === 'en' || stored === 'nl' ? stored : 'es';

	let lang = $state<Lang>(initial);

	return {
		get current() {
			return lang;
		},
		get t() {
			return translations[lang];
		},
		toggle() {
			lang = lang === 'es' ? 'en' : 'es';
			if (browser) localStorage.setItem(STORAGE_KEY, lang);
		},
		set(l: Lang) {
			lang = l;
			if (browser) localStorage.setItem(STORAGE_KEY, l);
		}
	};
}

export const langStore = createLang();
