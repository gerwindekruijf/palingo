import { db } from '$lib/server/db';
import { words } from '$lib/server/db/schema';
import { wordsByLength } from './spanish-words';

async function seed() {
	const allWords = Object.entries(wordsByLength).flatMap(([len, list]) =>
		list.map((word) => ({ word, length: parseInt(len), isActive: true }))
	);

	console.log(`Seeding ${allWords.length} words...`);

	// Insert in batches to avoid query size limits
	const batchSize = 100;
	for (let i = 0; i < allWords.length; i += batchSize) {
		const batch = allWords.slice(i, i + batchSize);
		await db.insert(words).values(batch).onConflictDoNothing();
	}

	console.log('Done!');
	process.exit(0);
}

seed().catch((e) => {
	console.error(e);
	process.exit(1);
});
