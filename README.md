# ClassroomFinder @ BU

Find empty BU classrooms in real time. Pick a building and see what's free right now, or check a future day/time.

Built with Next.js (App Router, TypeScript), deployed on Vercel.

## How it works

- The `*.json` files at the repo root (`CAS.json`, `QST.json`, etc.) hold each building's class meeting schedule, scraped from BU's public class search.
- [`lib/availability.ts`](lib/availability.ts) computes free time windows per room by merging each room's busy intervals and finding the gap containing the query time.
- [`app/api/availability/route.ts`](app/api/availability/route.ts) is the API the frontend calls with a building, day, and time (or `now=true` for the current America/New_York time) and returns the list of free rooms.
- [`app/components/ClassroomFinder.tsx`](app/components/ClassroomFinder.tsx) is the interactive UI.

## Run it locally

```
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy

Push to a GitHub repo and import it in [Vercel](https://vercel.com/new) — no extra config needed, it's a standard Next.js app.

## Refreshing the class data

`run_scraper.py` re-scrapes BU's class search API and regenerates the building `*.json` files. It's a standalone Python script, unrelated to the Next.js app:

```
pip install beautifulsoup4 requests alive_progress
python run_scraper.py
```
