# Bibliotheca Vacua

Build "Bibliotheca Vacua" — a library of books that do not exist. Mobile-first web app, language of the UI: English (we will add Russian later).

CONCEPT (this drives every design decision):
The library has shelves of invented books. Each book has a spine, a catalogue card and a REVIEW that is visible to everyone. The BOOK ITSELF does not exist until a reader "takes it out"; at that moment its text is written page by page by an AI, only for that reader, and it disappears when the loan ends. Nothing is downloadable or copyable. Tone: a real old library, not a startup. Calm, serious, slightly uncanny.

PAGES / SCREENS:
1. Hall (home): dark room (deep green-black #161d1a) with wooden shelves (#3a2e25). Headline "A library of books that do not exist". One-line explanation. Counter: "On the shelves: N books. Taken forever: M." Card-catalogue drawers as departments: Novels, Poetry, Treatises, Memoirs, Reference, Restricted (not lent). Below: a shelf "New arrivals" with vertical book spines (colored, varying heights, vertical text). Spines of books already taken forever are hatched/greyed with a small "taken" label.
2. Department page: shelves of spines for that department.
3. Book page: light paper background (#ece6d8, ink #1e1c19). Small cover, title, author, imprint line (kind · publisher, city, year · pages). The full review (3–4 paragraphs, serif). One primary button "Take out — 14 days", secondary "Give as a gift" (placeholder for now). Fine print: "The book will be written the moment it is issued and will exist only for you. In 14 days it returns to the shelf and vanishes — unless you choose to keep it."
4. Reading room: only text on paper. Top: title and "returns in N days". Thin progress line. Page text (≈180 words), "next page" button, page number "p. 27 of 214", bookmark. No other UI.
5. End of book screen: last page, then a framed box: "This book returns to the shelf in N days and will vanish. You alone have read it." Primary button "Keep the book" (placeholder: leads to a 'coming soon' state), quiet buttons "Give to someone", "Return to shelf".
6. Reader's card: sign-in via Supabase email magic link. Card shows name, card number, issue date, round stamp "valid until". Below: history of loans (on loan / returned / kept). Card is required to take a book out; browsing shelves and reviews is free without sign-in.

DATA (Supabase):
- publishers (name, city, character/style note)
- books (title, author, kind, publisher_id, year, pages, department, spine_color, status: available|taken_forever, review text, created_at)
- loans (user_id, book_id, started_at, ends_at, status active|returned|kept, pages jsonb — the generated pages for THIS loan only, current_page)
- profiles (user_id, display_name, card_number, issued_at)
Rules: reviews are generated once and stored (shared by all). Book pages are generated per loan and stored only in that loan row; when a loan ends (return / expiry / kept), delete the pages. A reader may have max 3 active loans and take out max 3 books per day.

AI GENERATION (Supabase Edge Functions, secret ANTHROPIC_API_KEY — I will add the key in secrets; never expose it to the browser):
- generate-catalogue: creates ~14 books for a department via Anthropic Messages API, model "claude-sonnet-4-6". Books must be plausible yet strange: monographs on impossible subjects, novels with rigorous absurd construction, treatises, memoirs, reference works, poetry collections. Invented authors with names of varied nationalities, invented publishers, years 1958–2071. Ask for strict JSON, parse it. Also a "seed catalogue" admin action so the shelves are never empty.
- generate-review: 3–4 paragraphs, serious slightly ironic critic, writes as if the book has long been published and argued about; never hints the book is invented; no real people.
- generate-page: given book, review, and the tail of the previous page, writes ONE page (~180 words) in the genre's real voice; no headings, no summaries, page ends mid-flow. Called when the reader presses "next page".
- Admin page (simple, protected) with buttons: seed catalogue, add a shelf to a department.

DESIGN:
Serif everywhere (system stack: "Iowan Old Style", Palatino, Georgia). Two environments: the Hall is dark wood & green-black; book/reading screens are paper. One primary action per screen. Drop caps on the first paragraph of reviews and pages. No cards-with-shadows startup look, no emojis, no marketing copy. Hatched pattern for taken spines. Respect prefers-reduced-motion. Must look excellent on a phone; also fine on desktop with a max width ~560px for reading.

Start with: database schema, edge functions with the Anthropic call, the Hall, department, book page, reader card auth, reading room with per-loan page generation, end-of-book screen (Keep = coming soon). Keep the code clean; we will add payments and print-on-demand next.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/043cdf1c-9d34-41e9-82c9-cdca8167ad3f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
