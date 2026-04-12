export type Lang = 'es' | 'en' | 'nl';

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
			palabraDesc: 'Adivina la palabra en 6 intentos · 4-7 letras',
			lingoTitle: 'Lingo',
			lingoDesc: 'Primera letra visible · 30 segundos · Bingo',
			superLingoTitle: 'SuperLingo',
			superLingoDesc: 'Palabras + bolas con letras · Adivina la palabra oculta',
			loginNudge: 'Inicia sesión',
			loginNudgeSuffix: 'para guardar tu progreso'
		},

		// Login page
		login: {
			title: 'PALINGO',
			subtitle: 'Inicia sesión para guardar tu progreso',
			continueGoogle: 'Continuar con Google',
			continueApple: 'Continuar con Apple',
			continueMicrosoft: 'Continuar con Microsoft',
			loading: '...',
			anonymousNote: 'Puedes jugar sin cuenta — el login solo guarda tu progreso.',
			back: '← Inicio'
		},

		// Palabra del Día
		palabra: {
			title: 'Palabra del Día',
			subtitle: (n: number) => `Adivina la palabra de ${n} letras`,
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
			messageBonusRound: '¡Ronda bonus! Una letra extra de pista',
			messageGreenBall: '+1 número marcado en el cartón',
			messageGoldBall: 'Oro — elige un número para marcar',
			messageNumberMarked: '¡Número marcado!',
			messageBingo: '¡BINGO!',
			bonusRound: 'BONUS',
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

		// SuperLingo
		superLingo: {
			title: 'SUPERLINGO',
			roundCounter: (current: number, total: number) => `Palabra ${current}/${total}`,
			wordsCorrect: (n: number) => `${n} acertadas`,
			messageWon: '¡Palabra correcta! Saca una bola',
			messageLost: 'Era:',
			messageNextWord: 'Siguiente palabra...',
			messageTimeout: '¡Tiempo agotado!',
			messageBonusRound: '¡Ronda bonus! Una letra extra de pista',
			bonusRound: 'BONUS',
			puzzleWord: 'Palabra oculta',
			puzzleWordGuess: 'Adivinar palabra oculta',
			puzzleWordCorrect: '¡Palabra oculta correcta! ¡Habéis ganado!',
			puzzleWordWrong: 'Incorrecto — seguid jugando',
			ballEmpty: 'Bola vacía',
			newGame: 'Nueva partida',
			loginNudge: 'Inicia sesión para guardar tu progreso',
			gameOverTitle: 'Juego terminado',
			gameOverWon: '¡Puzzelwoord resuelto!',
			gameOverSummary: (won: number, total: number) => `${won} de ${total} palabras acertadas`,
			statsBest: 'Mejor racha',
			statsStreak: 'Racha',
			statsWins: 'Victorias'
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
			palabraDesc: 'Guess the word in 6 tries · 4-7 letters',
			lingoTitle: 'Lingo',
			lingoDesc: 'First letter shown · 30 seconds · Bingo',
			superLingoTitle: 'SuperLingo',
			superLingoDesc: 'Word rounds + letter balls · Guess the puzzle word',
			loginNudge: 'Sign in',
			loginNudgeSuffix: 'to save your progress'
		},

		login: {
			title: 'PALINGO',
			subtitle: 'Sign in to save your progress',
			continueGoogle: 'Continue with Google',
			continueApple: 'Continue with Apple',
			continueMicrosoft: 'Continue with Microsoft',
			loading: '...',
			anonymousNote: 'You can play without an account — login only saves your progress.',
			back: '← Home'
		},

		palabra: {
			title: 'Word of the Day',
			subtitle: (n: number) => `Guess the ${n}-letter word`,
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
			messageBonusRound: 'Bonus round! Extra letter hint',
			messageGreenBall: '+1 number marked on your card',
			messageGoldBall: 'Gold — choose a number to mark',
			messageNumberMarked: 'Number marked!',
			messageBingo: 'BINGO!',
			bonusRound: 'BONUS',
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

		// SuperLingo
		superLingo: {
			title: 'SUPERLINGO',
			roundCounter: (current: number, total: number) => `Word ${current}/${total}`,
			wordsCorrect: (n: number) => `${n} correct`,
			messageWon: 'Correct! Draw a ball',
			messageLost: 'It was:',
			messageNextWord: 'Next word...',
			messageTimeout: "Time's up!",
			messageBonusRound: 'Bonus round! Extra letter hint',
			bonusRound: 'BONUS',
			puzzleWord: 'Puzzle word',
			puzzleWordGuess: 'Guess the puzzle word',
			puzzleWordCorrect: 'Puzzle word correct! You win!',
			puzzleWordWrong: 'Wrong — keep playing',
			ballEmpty: 'Empty ball',
			newGame: 'New game',
			loginNudge: 'Sign in to save your progress',
			gameOverTitle: 'Game over',
			gameOverWon: 'Puzzle word solved!',
			gameOverSummary: (won: number, total: number) => `${won} of ${total} words correct`,
			statsBest: 'Best streak',
			statsStreak: 'Streak',
			statsWins: 'Wins'
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
	},

	nl: {
		nav: {
			home: 'Home',
			account: 'account',
			signIn: 'inloggen',
			back: '← Home'
		},

		home: {
			title: 'PALINGO',
			subtitle: 'Spaanse woordspellen',
			palabraTitle: 'Woord van de Dag',
			palabraDesc: 'Raad het woord in 6 beurten · 4-7 letters',
			lingoTitle: 'Lingo',
			lingoDesc: 'Eerste letter zichtbaar · 30 seconden · Bingo',
			superLingoTitle: 'SuperLingo',
			superLingoDesc: 'Woordrondes + letterballen · Raad het puzzelwoord',
			loginNudge: 'Log in',
			loginNudgeSuffix: 'om je voortgang op te slaan'
		},

		login: {
			title: 'PALINGO',
			subtitle: 'Log in om je voortgang op te slaan',
			continueGoogle: 'Doorgaan met Google',
			continueApple: 'Doorgaan met Apple',
			continueMicrosoft: 'Doorgaan met Microsoft',
			loading: '...',
			anonymousNote: 'Je kunt spelen zonder account — inloggen bewaart alleen je voortgang.',
			back: '← Home'
		},

		palabra: {
			title: 'Woord van de Dag',
			subtitle: (n: number) => `Raad het woord van ${n} letters`,
			nextWord: 'Volgend woord →',
			loginNudge: 'Log in om je reeks op te slaan',
			statsWins: 'Gewonnen',
			statsLosses: 'Verloren',
			statsStreak: 'Reeks',
			statsBest: 'Beste',
			messageWon: 'Goed geraden!',
			messageLost: 'Het woord was:',
			errorNoWord: 'Geen actief woord',
			errorWrongLength: (n: number) => `Het woord moet ${n} letters hebben`,
			errorGameOver: 'Dit spel is al afgelopen'
		},

		lingo: {
			title: 'LINGO',
			roundCounter: (current: number, total: number) => `Woord ${current}/${total}`,
			wordsCorrect: (n: number) => `${n} goed`,
			points: 'punten',
			messageWon: 'Goed! +1 nummer',
			messageLost: 'Het was:',
			messageNextWord: 'Volgend woord...',
			messageTimeout: 'Tijd is op!',
			messageBonusRound: 'Bonusronde! Extra letterhint',
			messageGreenBall: '+1 nummer op je kaart',
			messageGoldBall: 'Goud — kies een nummer om te markeren',
			messageNumberMarked: 'Nummer gemarkeerd!',
			messageBingo: 'BINGO!',
			bonusRound: 'BONUS',
			nextWord: 'Volgend woord →',
			newGame: 'Nieuw spel',
			loginNudge: 'Log in om je voortgang op te slaan',
			statsBingos: "Bingo's",
			statsStreak: 'Reeks',
			statsBest: 'Beste reeks',
			gameOverTitle: 'Spel afgelopen',
			gameOverBingo: 'Bingo!',
			gameOverSummary: (won: number, total: number) => `${won} van ${total} woorden goed`,
			errorNoWord: 'Geen actief woord',
			errorWrongLength: (n: number) => `Het woord moet ${n} letters hebben`,
			errorWrongPhase: 'Je bent niet in de raadfase',
			errorTimeout: 'Tijd is op!',
			errorNoBalls: 'Je bent niet in de ballenfase',
			errorInvalidBall: 'Ongeldige bal',
			errorInvalidNumber: 'Ongeldig nummer',
			errorNoState: 'Geen status',
			errorGoldPhase: 'Je bent niet in de goudfase'
		},

		superLingo: {
			title: 'SUPERLINGO',
			roundCounter: (current: number, total: number) => `Woord ${current}/${total}`,
			wordsCorrect: (n: number) => `${n} goed`,
			messageWon: 'Goed geraden! Pak een bal',
			messageLost: 'Het was:',
			messageNextWord: 'Volgend woord...',
			messageTimeout: 'Tijd is op!',
			messageBonusRound: 'Bonusronde! Extra letterhint',
			bonusRound: 'BONUS',
			puzzleWord: 'Puzzelwoord',
			puzzleWordGuess: 'Raad het puzzelwoord',
			puzzleWordCorrect: 'Puzzelwoord goed! Gewonnen!',
			puzzleWordWrong: 'Fout — speel verder',
			ballEmpty: 'Lege bal',
			newGame: 'Nieuw spel',
			loginNudge: 'Log in om je voortgang op te slaan',
			gameOverTitle: 'Spel afgelopen',
			gameOverWon: 'Puzzelwoord opgelost!',
			gameOverSummary: (won: number, total: number) => `${won} van ${total} woorden goed`,
			statsBest: 'Beste reeks',
			statsStreak: 'Reeks',
			statsWins: 'Overwinningen'
		},

		ballPit: {
			title: 'Pak een bal!',
			subtitle: 'Kies 1 bal',
			legendBlue: (n: number) => `${n} blauw`,
			legendGreen: (n: number) => `${n} groen`,
			legendGold: (n: number) => `${n} goud`,
			tooltipBlue: 'Blauw — niks extra',
			tooltipGreen: 'Groen — +1 nummer op je kaart',
			tooltipGold: '🥇 Goud — kies zelf welk nummer je markeert'
		},

		goldBall: {
			emoji: '🥇',
			title: 'Gouden bal',
			subtitle: 'Kies een nummer om te markeren op je kaart'
		},

		bingoCard: {
			legendWords: (n: number) => `${n} woord${n !== 1 ? 'en' : ''}`,
			legendBalls: (n: number) => `${n} bal${n !== 1 ? 'len' : ''}`
		},

		timer: {
			label: 'seconden'
		},

		keyboard: {
			enter: 'ENTER',
			backspace: '⌫'
		},

		offline: {
			banner: 'Geen verbinding — je hebt internet nodig om te spelen'
		},

		offlinePage: {
			title: 'PALINGO',
			message: 'Je hebt een internetverbinding nodig om te spelen.',
			hint: 'Maak verbinding en herlaad de pagina.'
		}
	}
} as const;

export type Translations = typeof translations.es;
