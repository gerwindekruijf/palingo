import { boolean, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const words = pgTable(
	'words',
	{
		id: serial('id').primaryKey(),
		word: text('word').notNull().unique(),
		length: integer('length').notNull(),
		isActive: boolean('is_active').notNull().default(true)
	},
	(t) => [index('words_length_idx').on(t.length)]
);

// Scores for both games — one row per user per game
export const scores = pgTable(
	'scores',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		game: text('game').notNull(), // 'palabra' | 'lingo'
		wordLength: integer('word_length').notNull(),
		wins: integer('wins').notNull().default(0),
		losses: integer('losses').notNull().default(0),
		totalScore: integer('total_score').notNull().default(0),
		currentStreak: integer('current_streak').notNull().default(0),
		bestStreak: integer('best_streak').notNull().default(0),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [index('scores_user_game_idx').on(t.userId, t.game, t.wordLength)]
);

export * from './auth.schema';
