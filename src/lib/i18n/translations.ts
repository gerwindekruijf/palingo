export type Lang = 'es' | 'en';

export const translations = {
	es: {
		// Navigation
		nav: {
			home: 'Inicio',
			account: 'cuenta',
			signIn: 'entrar',
			back: '← Inicio'
		},

		// Home page
		home: {
			title: 'PALINGO',
			subtitle: 'Juegos de palabras en español',
			palabraTitle: 'Palabra del Día',
			palabraDesc: 'Adivina la palabra en 6 intentos · 4–7 letras',
			lingoTitle: 'Lingo',
			lingoDesc: 'Primera letra visible · 15 segundos · Bingo',
			loginNudge: 'Inicia sesión',
			loginNudgeSuffix: 'para guardar tu progreso'
		},

		// Login page
		login: {
			title: 'PALINGO',
			subtitleSignIn: 'Inicia sesión para guardar tu progreso',
			subtitleSignUp: 'Crea tu cuenta',
			tabSignIn: 'Entrar',
			tabSignUp: 'Registrarse',
			fieldName: 'Nombre',
			fieldNamePlaceholder: 'Tu nombre',
			fieldEmail: 'Email',
			fieldEmailPlaceholder: 'tu@email.com',
			fieldPassword: 'Contraseña',
			fieldPasswordPlaceholder: '••••••••',
			fieldPasswordNewPlaceholder: 'Mínimo 8 caracteres',
			submitSignIn: 'Entrar',
			submitSignUp: 'Crear cuenta',
			loading: '...',
			anonymousNote: 'Puedes jugar sin cuenta — el login solo guarda tu progreso.',
			errorRequired: 'Email y contraseña requeridos',
			errorInvalid: 'Email o contraseña incorrectos',
			errorAllRequired: 'Todos los campos son obligatorios',
			errorPasswordLength: 'La contraseña debe tener al menos 8 caracteres',
			errorEmailTaken: 'Este email ya está registrado',
			errorUnexpected: 'Error inesperado',
			back: '← Inicio'
		},

		// Palabra del Día
		palabra: {
			title: 'Palabra del Día',
			nextWord: 'Siguiente palabra →',
			loginNudge: 'Inicia sesión para guardar tu racha',
			statsWins: 'Ganadas',
			statsLosses: 'Perdidas',
			statsStreak: 'Racha',
			statsBest: 'Mejor',
			messageWon: '¡Correcto!',
			messageLost: 'La palabra era:',
			errorNoWord: 'No hay palabra activa',
			errorWrongLength: (n: number) => `La palabra debe tener ${n} letras`,
			errorGameOver: 'La partida ya ha terminado'
		},

		// Lingo
		lingo: {
			title: 'LINGO',
			roundCounter: (current: number, total: number) => `Palabra ${current}/${total}`,
			wordsCorrect: (n: number) => `${n} acertadas`,
			points: 'puntos',
			messageWon: '¡Palabra correcta! +1 número',
			messageLost: 'Era:',
			messageNextWord: 'Siguiente palabra...',
			messageTimeout: '¡Tiempo agotado!',
			messageGreenBall: '+1 número marcado en el cartón',
			messageGoldBall: 'Oro — elige un número para marcar',
			messageNumberMarked: '¡Número marcado!',
			messageBingo: '¡BINGO!',
			nextWord: 'Siguiente palabra →',
			newGame: 'Nueva partida',
			loginNudge: 'Inicia sesión para guardar tu progreso',
			statsBingos: 'Bingos',
			statsStreak: 'Racha',
			statsBest: 'Mejor racha',
			gameOverTitle: 'Juego terminado',
			gameOverBingo: '¡Bingo!',
			gameOverSummary: (won: number, total: number) => `${won} de ${total} palabras acertadas`,
			errorNoWord: 'No hay palabra activa',
			errorWrongLength: (n: number) => `La palabra debe tener ${n} letras`,
			errorWrongPhase: 'No estás en fase de adivinar',
			errorTimeout: '¡Tiempo agotado!',
			errorNoBalls: 'No estás en fase de bolas',
			errorInvalidBall: 'Bola no válida',
			errorInvalidNumber: 'Número no válido',
			errorNoState: 'Sin estado',
			errorGoldPhase: 'No estás en fase dorada'
		},

		// Ball pit
		ballPit: {
			title: '¡Ballen pakken!',
			subtitle: 'Elige 1 bola',
			legendBlue: (n: number) => `${n} azules`,
			legendGreen: (n: number) => `${n} verdes`,
			legendGold: (n: number) => `${n} oro`,
			tooltipBlue: 'Azul — nada extra',
			tooltipGreen: 'Verde — +1 número en tu cartón',
			tooltipGold: '🥇 Oro — elige tú qué número marcar'
		},

		// Gold ball
		goldBall: {
			emoji: '🥇',
			title: 'Bola de oro',
			subtitle: 'Elige un número para marcar en tu cartón'
		},

		// Bingo card
		bingoCard: {
			legendWords: (n: number) => `${n} palabras`,
			legendBalls: (n: number) => `${n} bolas`
		},

		// Timer
		timer: {
			label: 'segundos'
		},

		// Keyboard
		keyboard: {
			enter: 'ENTER',
			backspace: '⌫'
		},

		// Offline banner
		offline: {
			banner: 'Sin conexión — necesitas internet para jugar'
		},

		// PWA offline page
		offlinePage: {
			title: 'PALINGO',
			message: 'Necesitas conexión a internet para jugar.',
			hint: 'Conéctate y recarga la página.'
		}
	},

	en: {
		nav: {
			home: 'Home',
			account: 'account',
			signIn: 'sign in',
			back: '← Home'
		},

		home: {
			title: 'PALINGO',
			subtitle: 'Spanish word games',
			palabraTitle: 'Word of the Day',
			palabraDesc: 'Guess the word in 6 tries · 4–7 letters',
			lingoTitle: 'Lingo',
			lingoDesc: 'First letter shown · 15 seconds · Bingo',
			loginNudge: 'Sign in',
			loginNudgeSuffix: 'to save your progress'
		},

		login: {
			title: 'PALINGO',
			subtitleSignIn: 'Sign in to save your progress',
			subtitleSignUp: 'Create your account',
			tabSignIn: 'Sign in',
			tabSignUp: 'Register',
			fieldName: 'Name',
			fieldNamePlaceholder: 'Your name',
			fieldEmail: 'Email',
			fieldEmailPlaceholder: 'you@email.com',
			fieldPassword: 'Password',
			fieldPasswordPlaceholder: '••••••••',
			fieldPasswordNewPlaceholder: 'At least 8 characters',
			submitSignIn: 'Sign in',
			submitSignUp: 'Create account',
			loading: '...',
			anonymousNote: 'You can play without an account — login only saves your progress.',
			errorRequired: 'Email and password are required',
			errorInvalid: 'Incorrect email or password',
			errorAllRequired: 'All fields are required',
			errorPasswordLength: 'Password must be at least 8 characters',
			errorEmailTaken: 'This email is already registered',
			errorUnexpected: 'Unexpected error',
			back: '← Home'
		},

		palabra: {
			title: 'Word of the Day',
			nextWord: 'Next word →',
			loginNudge: 'Sign in to save your streak',
			statsWins: 'Won',
			statsLosses: 'Lost',
			statsStreak: 'Streak',
			statsBest: 'Best',
			messageWon: 'Correct!',
			messageLost: 'The word was:',
			errorNoWord: 'No active word',
			errorWrongLength: (n: number) => `The word must be ${n} letters`,
			errorGameOver: 'This game is already over'
		},

		lingo: {
			title: 'LINGO',
			roundCounter: (current: number, total: number) => `Word ${current}/${total}`,
			wordsCorrect: (n: number) => `${n} correct`,
			points: 'points',
			messageWon: 'Correct! +1 number',
			messageLost: 'It was:',
			messageNextWord: 'Next word...',
			messageTimeout: "Time's up!",
			messageGreenBall: '+1 number marked on your card',
			messageGoldBall: 'Gold — choose a number to mark',
			messageNumberMarked: 'Number marked!',
			messageBingo: 'BINGO!',
			nextWord: 'Next word →',
			newGame: 'New game',
			loginNudge: 'Sign in to save your progress',
			statsBingos: 'Bingos',
			statsStreak: 'Streak',
			statsBest: 'Best streak',
			gameOverTitle: 'Game over',
			gameOverBingo: 'Bingo!',
			gameOverSummary: (won: number, total: number) => `${won} of ${total} words correct`,
			errorNoWord: 'No active word',
			errorWrongLength: (n: number) => `The word must be ${n} letters`,
			errorWrongPhase: "You're not in the guessing phase",
			errorTimeout: "Time's up!",
			errorNoBalls: "You're not in the ball phase",
			errorInvalidBall: 'Invalid ball',
			errorInvalidNumber: 'Invalid number',
			errorNoState: 'No state',
			errorGoldPhase: "You're not in the gold phase"
		},

		ballPit: {
			title: 'Pick a ball!',
			subtitle: 'Choose 1 ball',
			legendBlue: (n: number) => `${n} blue`,
			legendGreen: (n: number) => `${n} green`,
			legendGold: (n: number) => `${n} gold`,
			tooltipBlue: 'Blue — nothing extra',
			tooltipGreen: 'Green — +1 number on your card',
			tooltipGold: '🥇 Gold — you choose which number to mark'
		},

		goldBall: {
			emoji: '🥇',
			title: 'Gold ball',
			subtitle: 'Choose a number to mark on your card'
		},

		bingoCard: {
			legendWords: (n: number) => `${n} word${n !== 1 ? 's' : ''}`,
			legendBalls: (n: number) => `${n} ball${n !== 1 ? 's' : ''}`
		},

		timer: {
			label: 'seconds'
		},

		keyboard: {
			enter: 'ENTER',
			backspace: '⌫'
		},

		offline: {
			banner: 'No connection — you need internet to play'
		},

		offlinePage: {
			title: 'PALINGO',
			message: 'You need an internet connection to play.',
			hint: 'Connect and reload the page.'
		}
	}
} as const;

export type Translations = typeof translations.es;
