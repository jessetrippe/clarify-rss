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
- **Backend:** Cloudflare Workers + D1 (SQLite)
- **Auth:** Cloudflare Access (Zero Trust)
- **Hosting:** Cloudflare Pages

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
