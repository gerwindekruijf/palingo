// Curated Spanish puzzle words for SuperLingo (12–14 characters)
// All lowercase, no accents — suitable for letter-by-letter reveal

export const puzzleWords12: string[] = [
	'comunicacion',
	'conocimiento',
	'construccion',
	'demostracion',
	'distribucion',
	'organizacion',
	'acercamiento',
	'conectividad',
	'coordinacion',
	'credibilidad',
	'cumplimiento',
	'documentales',
	'experiencias',
	'herramientas',
	'jurisdiccion',
	'nacionalidad',
	'obligaciones',
	'planificador',
	'preparativos',
	'protagonista',
	'sentimientos',
	'electricidad',
	'flexibilidad',
	'manualidades',
	'periodicidad',
	'posicionarse'
].filter((w) => w.length === 12);

export const puzzleWords13: string[] = [
	'contaminacion',
	'contemplacion',
	'independencia',
	'investigacion',
	'manifestacion',
	'negociaciones',
	'participacion',
	'transparencia',
	'determinacion',
	'planificacion',
	'pronunciacion',
	'publicaciones',
	'adaptabilidad',
	'interacciones',
	'normalizacion',
	'observaciones',
	'oportunidades',
	'posibilidades',
	'productividad',
	'recomendacion',
	'sustituciones',
	'visualizacion'
].filter((w) => w.length === 13);

export const puzzleWords14: string[] = [
	'administracion',
	'colaboraciones',
	'compensaciones',
	'comportamiento',
	'contribuciones',
	'descubrimiento',
	'desplazamiento',
	'diferenciacion',
	'funcionamiento',
	'implementacion',
	'independientes',
	'interpretacion',
	'modificaciones',
	'multiplicacion',
	'reconocimiento',
	'identificacion',
	'representacion',
	'transformacion',
	'caracteristica',
	'conversaciones',
	'deliberaciones',
	'discapacidades',
	'distribuciones',
	'introducciones',
	'investigadores',
	'localizaciones',
	'organizaciones',
	'reproducciones',
	'restauraciones',
	'sensibilidades'
].filter((w) => w.length === 14);

// Combined pool — pick from whichever has entries
export const puzzleWords: string[] = [...puzzleWords12, ...puzzleWords13, ...puzzleWords14];

export function getRandomPuzzleWord(): string {
	if (puzzleWords.length === 0) return 'conocimiento'; // fallback
	return puzzleWords[Math.floor(Math.random() * puzzleWords.length)];
}
