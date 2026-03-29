# Palingo

A Spanish word game app with two games built on the same word engine.

## Games

### Palabra del Día
A Wordle-style game. Guess a Spanish word in 6 tries. Choose a word length of 4, 5, 6, or 7 letters. Tiles reveal after each guess:

- **Green** — correct letter, correct position
- **Orange** — correct letter, wrong position
- **Gray** — letter not in the word

Login is optional. When logged in, wins, losses, and streaks are saved per word length.

### Lingo
A TV-show inspired game built on top of the same word engine. A full game consists of 5 rounds.

Rules:
- The **first letter** of the target word is always shown
- You have **15 seconds** per guess attempt (enforced server-side)
- **Guess correctly** → a random number on your bingo card is pre-filled, then you pick one ball from the ball pit
- **Fail a word** → move directly to the next round, no ball phase

**Ball pit** — 16 balls total:
- 11 blue — nothing
- 4 green — automatically mark one random card number
- 1 gold — you choose which card number to mark

**Bingo card** — classic 5×5 B-I-N-G-O with center FREE square. Complete a row, column, or diagonal to win.

After all 5 rounds, the final bingo card result is shown with an option to start a new game.

## Languages

The UI is available in **Spanish** (default) and **English**. Toggle between them using the language button in the header. All words in play are always Spanish.

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) 2.x with Svelte 5 Runes
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/) — email + password authentication
- PWA — installable, requires internet connection

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL (or Docker)

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```sh
cp .env.example .env
```

```env
DATABASE_URL="postgres://root:mysecretpassword@localhost:5432/local"
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="your-32-char-secret-here"
```

Generate a secure secret:

```sh
openssl rand -base64 32
```

### 3. Start PostgreSQL

Using Docker:

```sh
docker run -d \
  --name palingo-db \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=local \
  -p 5432:5432 \
  postgres:16
```

### 4. Run migrations

```sh
npm run db:migrate
```

### 5. Seed words

```sh
npm run db:seed
```

This loads the Spanish word list into the `words` table.

### 6. Start the dev server

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Production Build

```sh
npm run build
npm run preview
```

For deployment, install the appropriate [SvelteKit adapter](https://kit.svelte.dev/docs/adapters) for your target environment (Node, Vercel, Cloudflare, etc.).

## Authentication

Authentication is optional — all games are playable without an account.

Creating an account enables:
- Win/loss/streak tracking for Palabra del Día
- Win tracking for Lingo

Sign up with any email address and password on the `/login` page.

## PWA

The app includes a service worker and web manifest. It can be installed on mobile and desktop via the browser's "Add to Home Screen" / install prompt.

The app requires an internet connection. Attempting to play offline shows an error message.

## Project Structure

```
src/
  app.css                         # Tailwind v4 theme tokens
  lib/
    game/
      word-engine.ts              # Shared Wordle logic (evaluateGuess, applyGuess)
      lingo-engine.ts             # Lingo-specific logic (bingo card, ball pit, timer)
    components/
      word/                       # Shared tile/row/board/keyboard components
      lingo/                      # CountdownTimer, BallPit, BingoCard
      LangToggle.svelte           # Language switcher
    i18n/
      translations.ts             # ES + EN strings
      lang.svelte.ts              # Reactive language store
    server/
      db/
        schema.ts                 # Drizzle schema (words, scores, auth tables)
  routes/
    +layout.svelte                # Root layout with offline banner
    +page.svelte                  # Home page
    login/                        # Auth pages
    palabra-del-dia/              # Wordle game
    lingo/                        # Lingo game
static/
  manifest.json                   # PWA manifest
  sw.js                           # Service worker
```
