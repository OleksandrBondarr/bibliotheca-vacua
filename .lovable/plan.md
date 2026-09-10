# Saturday opening priority pass

## What will change

1. **Rebuild the Lem vitrine first**
   - Add a database flag for the new Hall shelf and a named reviewer field.
   - Replace the current featured set with exactly 16 newly generated books in the requested 4/4/3/3/2 distribution.
   - Give every card a named invented reviewer and generate 400–500 word reviews that cross-reference disagreements elsewhere on the shelf.

2. **Add “The Reading Room” shelf**
   - Add a `narrative` book flag and a dedicated Hall shelf marker.
   - Generate exactly 16 genre-forward books with 1–4 word titles, 200–260 word plain-language reviews, and narrative page-generation instructions.
   - Place the shelf directly below the Lem vitrine with the supplied caption.

3. **Improve catalogue guidance**
   - Add “Read from the first page” or “For consultation” guidance to every quick-look card and full catalogue card.
   - Derive the label from department, kind, and the narrative flag.
   - Remove every visible page total while retaining internal length for loan progress and reading-time hints.

4. **Fix phone regressions**
   - Force touch previews into a body-level bottom sheet, never inside a shelf.
   - Add breathing room around the Lem caption and museum label.
   - Use a compact phone header with the reader identity inside the menu.

5. **Rebuild the lamp and Hall depth**
   - Replace the lamp with a compact CSS banker’s lamp and responsive reserved page space.
   - Apply a remembered near-black “lights off” layer with a fixed viewport-following warm-green pool.
   - Add subtle receding stacks behind the Hall and fade them first when lights are off.

6. **Add opt-in sound**
   - Add an off-by-default remembered sound control beside the lamp.
   - Lazy-load sub-1 MB freely licensed ambience and effects only after opt-in.
   - Connect lamp, issue stamp, and next-page actions; record source/licence comments.

## Technical details

- Apply schema changes through one Lovable Cloud migration with grants/RLS unchanged for the existing `books` table.
- Add admin-safe server actions for deterministic replacement/generation, then run both shelf jobs once and verify counts, reviews, reviewer names, narrative flags, and placement.
- Keep audio and visual effects client-only, reduced-motion aware, and avoid continuous animated filters.
- Validate at 390px and 1280px, including touch preview layering, header fit, shelf stability, lamp scrolling, and no horizontal overflow.
