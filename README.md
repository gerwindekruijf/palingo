# Palingo

A Spanish word game app with three games built on the same word engine.

## Games

All three games use the same word engine. Tiles reveal after each guess:

- **Green** — correct letter, correct position
- **Orange** — correct letter, wrong position
- **Gray** — letter not in the word

### Palabra del Día

A Wordle-style game. Pick a word length (4, 5, 6, or 7 letters) and guess the word in 6 attempts. No timer, no rounds — just you and the word. On win or loss a new word is loaded automatically.

Stats (wins, losses, streak) are tracked per word length in the browser session, or saved to your account when logged in.

### Lingo

A TV-show inspired game with 5 rounds of 6-letter words, a bingo card, and a ball pit. The goal is to complete a bingo.

**Each round:**
1. **Guess** — The first letter is pre-revealed. You have 6 attempts and **60 seconds** to guess the word.
2. **Bonus** — If all 6 attempts fail, a bonus row unlocks with a second letter hint and **80 seconds** on the clock.
3. **Ball pit** — Guess correctly and you pick 1 ball from a pit of 16:
   - 11 blue — nothing
   - 4 green — auto-marks a random number on your bingo card
   - 1 gold — you choose which number to mark
4. A correct guess also auto-marks one random card number before the ball phase.

**Bingo card** — 5×5 B-I-N-G-O grid (numbers 1–75, center FREE). Complete any row, column, or diagonal to win. Numbers are marked from word guesses, green balls, and gold balls.

**Scoring** (logged-in users): 10 points per word guessed, +25 bonus for bingo.

### SuperLingo

An advanced variant with 5 rounds of 7-letter words and a hidden **puzzle word** (12–13 letters). The goal is to solve the puzzle word.

**Each round:**
1. **Guess** — First letter shown, 7 attempts, **60 seconds**.
2. **Bonus** — If all 7 fail, a bonus row with a second letter hint and 60 seconds.
3. **Letter balls** — Guess correctly and pick 1 ball from a pit of 15 (shared across all rounds):
   - 10–11 single-letter balls — reveals one letter of the puzzle word
   - 1 double-letter ball — reveals two letters at once
   - 2 empty balls — nothing

**Puzzle word** — Displayed as a row of tiles, hidden positions show `?`. Once at least one letter is revealed, you can attempt to guess the full puzzle word at any time. Guess correctly to win early; a wrong guess has no penalty.

**Scoring** (logged-in users): 10 points per word guessed, +50 bonus for solving the puzzle word.

## Languages

The UI is available in **Spanish** (default), **English**, and **Dutch**. Toggle between them using the flag buttons in the header. All words in play are always Spanish.

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) 2.x with Svelte 5 Runes
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/) — social login (Google, Apple, Microsoft)
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

Creating an account enables persistent score and streak tracking across all three games.

Sign in with Google, Apple, or Microsoft on the `/login` page.

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
      superlingo/                 # LetterBallPit, PuzzleWord
      LangToggle.svelte           # Language switcher
    i18n/
      translations.ts             # ES + EN + NL strings
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
    superlingo/                   # SuperLingo game
static/
  manifest.json                   # PWA manifest
  sw.js                           # Service worker
```
