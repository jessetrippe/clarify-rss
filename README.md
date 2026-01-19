# Clarify RSS

A personal, plaintext RSS reader - PWA with local-first sync.

## Status

🚧 **In Development** - Phase 0 Complete

See [Project](./.build/PROJECT.md) for product scope and implementation roadmap.

## Features (Planned)

- Subscribe to RSS/Atom feeds
- Read articles offline with local storage
- Copy article content easily (the core feature!)
- Sync across devices (Mac, iPhone)
- Star articles for later
- Track read/unread status
- Progressive Web App (installable on iOS and desktop)

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Storage:** IndexedDB (via Dexie.js)
- **Backend:** Next.js API Routes (Netlify Functions)
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth (Magic Link)
- **Hosting:** Netlify

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Supabase Setup

1. Create a Supabase project and enable Magic Link auth.
2. Run the SQL in `supabase/schema.sql` to create tables.
3. Run the SQL in `supabase/rls.sql` to enable Row Level Security policies.
4. Set env vars (see `.env.example`).

## Project Structure

```
/app              # Next.js App Router pages
  /feeds          # Feed management views
  /starred        # Starred articles view
  /articles       # Article detail views
/lib              # Shared utilities and database
/components       # React components
  /ui             # Reusable UI components
/public           # Static assets
```

## Documentation

- [Project](./.build/PROJECT.md) - Product scope and implementation roadmap
- [Testing Guide](./.build/TESTING.md) - Manual testing steps and checklists

## License

Personal project - Not licensed for public use.
