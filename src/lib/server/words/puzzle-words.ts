// Curated Spanish puzzle words for SuperLingo (12–13 characters)
// All lowercase, no accents — suitable for letter-by-letter reveal

export const puzzleWords12: string[] = [
	'comunicacion',
	'conocimiento',
	'construccion',
	'contaminacion',
	'contemplacion',
	'demostracion',
	'desplazamiento',
	'distribucion',
	'establecimiento',
	'identificacion',
	'independencia',
	'investigacion',
	'manifestacion',
	'negociaciones',
	'organizacion',
	'participacion',
	'representacion',
	'responsabilidad',
	'transformacion',
	'transparencia',
	// fallback short enough
	'administracion',
	'aprovechamiento',
	'caracteristicas',
	'clasificaciones',
	'colaboraciones',
	'compensaciones',
	'comportamiento',
	'concentracion',
	'consideracion',
	'contribuciones',
].filter((w) => w.length === 12);

export const puzzleWords13: string[] = [
	'administracion',
	'aprovechamiento',
	'caracteristica',
	'clasificaciones',
	'colaboraciones',
	'compensaciones',
	'comportamiento',
	'concentraciones',
	'consideraciones',
	'contribuciones',
	'convocatoria',
	'correspondencia',
	'descubrimiento',
	'desplazamiento',
	'determinacion',
	'diferenciacion',
	'establecimiento',
	'funcionamiento',
	'implementacion',
	'independientes',
	'infraestructura',
	'interpretacion',
	'investigaciones',
	'modificaciones',
	'multiplicacion',
	'planificacion',
	'presentaciones',
	'pronunciacion',
	'publicaciones',
	'reconocimiento',
].filter((w) => w.length === 13);

// Combined pool — pick from whichever has entries
export const puzzleWords: string[] = [...puzzleWords12, ...puzzleWords13];

export function getRandomPuzzleWord(): string {
	if (puzzleWords.length === 0) return 'conocimiento'; // fallback
	return puzzleWords[Math.floor(Math.random() * puzzleWords.length)];
}
