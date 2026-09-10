/**
 * Server-only. Talks to the Anthropic Messages API with ANTHROPIC_API_KEY.
 * Never import this from browser-reachable code; load it inside server handlers.
 */

const MODEL = "claude-sonnet-4-6";
const API_URL = "https://api.anthropic.com/v1/messages";

export async function askClaude(system: string, user: string, maxTokens: number): Promise<string> {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it in Project Settings → Secrets.");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`The librarian could not be reached (${res.status}). ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  return json.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}

/** Pull the first JSON array/object out of a model reply that may be wrapped in prose or fences. */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = Math.min(
    ...["[", "{"].map((ch) => candidate.indexOf(ch)).filter((i) => i >= 0),
  );
  const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
  if (!Number.isFinite(start) || end < 0) throw new Error("No JSON found in model reply");
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export type CatalogueEntry = {
  title: string;
  author: string;
  kind: string;
  publisher_name: string;
  publisher_city: string;
  publisher_note: string;
  year: number;
  pages: number;
  spine_color: string;
};

/** Forms readers respond to now; every department draws on these as well as its own manner. */
const LIVING_FORMS = `Draw on the forms readers respond to now, alongside the rigorous-absurd constructions the library is known for: quiet novels of a single unremarkable life; autofiction that uses the self as material; books built out of documents, letters, inventories, ledgers and archives; slow speculative work without catastrophe; science braided with confession; books of short chapters and fragments; philosophy written as prose. At least half the shelf should belong to these quieter forms.`;

const DEPARTMENT_BRIEFS: Record<string, string> = {
  novels:
    "Novels: some with a formal constraint or impossible premise pursued with total seriousness; others quiet accounts of one unremarkable life, autofiction, or narratives assembled from documents and inventories.",
  poetry:
    "Poetry collections: strict old forms applied to impossible or minute subjects; liturgical, taxonomic, or elegiac; also fragmentary sequences and poems that read as archive entries.",
  treatises:
    "Scholarly treatises and monographs on impossible subjects, argued with academic apparatus and no jokes; also philosophy written as plain prose, and arguments carried in short numbered chapters.",
  sciences:
    "Scientific monographs, conference proceedings, laboratory notebooks, tables of constants and field guides in physics, biology, mathematics, geology and chemistry, concerning phenomena, organisms, materials or quantities that cannot exist. Full scientific apparatus: methods, tables, footnotes, errata. HARD RULE: the subject must be plainly impossible. Never real diseases, real drugs, real medical, pharmacological, dietary or safety claims, and nothing a reader could mistake for real science or act upon.",
  memoirs:
    "Memoirs by unlikely narrators or of unlikely occupations; plain, aggrieved, intimate; also autofiction, letters, and lives told through the objects and papers they left.",
  reference:
    "Reference works: dictionaries, gazetteers, concordances, inventories, tables of things that cannot be tabulated.",
  restricted:
    "Volumes the library holds but does not lend: sealed minutes, indices of indices, manuals whose instructions must not be followed.",
};


/** Briefs for the named shelves inside a department. */
const SHELF_BRIEFS: Record<string, string> = {
  impossible:
    "Shelf: Impossible sciences. Scientific monographs, conference proceedings, laboratory notebooks, tables of constants and field guides in physics, biology, mathematics, geology and chemistry, concerning phenomena, organisms, materials or quantities that cannot exist. Full scientific apparatus: methods, tables, footnotes, errata. Playful in conception, entirely serious in manner. HARD RULE: the subject must be plainly impossible; never real diseases, real drugs, real medical, pharmacological, dietary or safety claims, and nothing a reader could mistake for real science or act upon.",
  not_yet:
    "Shelf: Sciences not yet made. Hypothetical but plausible future discoveries, instruments, frameworks and reinterpretations — the kind of work a serious futurologist would expect to appear between 2035 and 2071: new fields and sub-disciplines, new instruments and methods, new mathematical or informational frameworks, reinterpretations across physics, biology, mathematics, information, materials and cognition. The purpose is to inspire a thoughtful, intellectual reader. HARD RULES: every book is dated between 2036 and 2071 inclusive. Titles and matter concern ideas, reasoning, consequences and controversies — never invented numeric results, datasets, dosages or efficacy figures, and nothing touching real diseases, real drugs, or real medical or safety matters. No real scientists, real institutions or real journals.",
};

export async function generateCatalogue(
  department: string,
  existingTitles: string[],
  count = 14,
  shelf?: string,
): Promise<CatalogueEntry[]> {
  const system = `You are the chief cataloguer of the Bibliotheca Vacua, an old and serious library. You invent books that are plausible yet strange: they must read like real entries in a catalogue of a real library, never like jokes or marketing. Never use names of real people, real publishers, or real books. Never mention that anything is invented. Return strict JSON only.`;

  const shelfBrief = shelf ? SHELF_BRIEFS[shelf] : undefined;
  const yearRange = shelf === "not_yet" ? "integer between 2036 and 2071" : "integer between 1958 and 2071";

  const user = `Department: ${department}.
Brief: ${shelfBrief ?? DEPARTMENT_BRIEFS[department] ?? ""}
${shelf === "not_yet" ? "" : `\n${LIVING_FORMS}\n`}


Produce exactly ${count} books as a JSON array. Each element:
{
  "title": string (distinctive, unhurried; no colons-with-subtitles clichés more than twice),
  "author": string (invented; vary nationalities widely: Estonian, Nigerian, Uruguayan, Korean, Welsh, Persian, Finnish, Lebanese, Peruvian, Czech...),
  "kind": string (e.g. "Novel", "Treatise", "Monograph", "Poems", "Memoir", "Dictionary", "Gazetteer", "Proceedings"),
  "publisher_name": string (invented small press; reuse a name for 2–3 books so a house has a character),
  "publisher_city": string,
  "publisher_note": string (one sentence on the house's character and typography),
  "year": ${yearRange},
  "pages": integer between 64 and 420,
  "spine_color": hex colour, muted and bookish (deep reds, bottle greens, slate blues, ochres, aubergines, near-blacks; never neon)
}
Avoid these existing titles: ${existingTitles.slice(0, 60).join("; ") || "none"}.
Output the JSON array and nothing else.`;

  const text = await askClaude(system, user, 6000);
  const entries = extractJson<CatalogueEntry[]>(text);
  const [loYear, hiYear] = shelf === "not_yet" ? [2036, 2071] : [1958, 2071];
  return entries
    .filter((e) => e && e.title && e.author)
    .map((e) => ({
      ...e,
      year: clamp(Math.round(Number(e.year) || (shelf === "not_yet" ? 2049 : 1990)), loYear, hiYear),
      pages: clamp(Math.round(Number(e.pages) || 200), 64, 420),
      spine_color: /^#[0-9a-f]{6}$/i.test(e.spine_color ?? "") ? e.spine_color : "#5a4a3a",
      kind: e.kind || "Book",
    }));
}


/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

export type BookForPrompt = {
  title: string;
  author: string;
  kind: string;
  year: number;
  pages: number;
  department: string;
  shelf?: string | null;
  narrative?: boolean;
  publisher?: { name: string; city: string; style_note: string | null } | null;
};

/** The laws of the catalogue card: the reader must finish the review wanting the book. */
const CARD_LAWS = `The laws of the catalogue card:
1. FIRST SENTENCE: one concrete, strange, specific detail from inside the book. Never an evaluation, never "a novel about", never the author's name, never the word "book". Register to aim for: "The bookkeeper of a provincial theatre notices that the season's ticket sales equal the number of townspeople who died that year."
2. Leave exactly ONE question the card raises and does not answer — one that only reading the book can settle. Do not answer it later in the review.
3. Mention ONE famous passage by where it stands and what it does, without quoting it: "the ninth chapter, where he deduces a staircase from the way a maid carries a tray".
4. Name ONE dispute among critics — the readers are divided — and take a side lightly, in a clause, without settling it.
5. Withhold the ending. Refer to it only as a place in the book, in the manner of "the last chapter, which readers are asked not to describe". Never say what happens, never call it a twist.
6. CLOSE on one idea the reader carries away into their own life: a way of seeing, never a moral, never advice, never a summary of the book. This is the library's purpose — to teach thinking and to find the non-obvious.
7. VOICE: calm, exact, slightly ironic. No gushing, no superlatives, none of "brilliant", "masterpiece", "unforgettable", "tour de force", "haunting", "luminous". No headings, no bullets, no lists.
8. Never hint that the book is invented, and never name real people, real critics, real institutions or real books.`;

export async function generateReview(
  book: BookForPrompt,
  depth: "standard" | "deep" = "standard",
  avoidOpenings: string[] = [],
): Promise<string> {
  const scienceRules = `HARD RULES for this department: never state anything a reader could take as a real medical, pharmacological, dietary or safety claim, and never name real scientists, real institutions or real journals.`;

  const system =
    book.department === "sciences" && book.shelf === "not_yet"
      ? `You are a critic writing the review notice of a book for a learned journal in the year ${book.year}. The work proposes a new field, instrument, framework or reinterpretation; you weigh its reasoning, its consequences and the quarrel around it. Dry, precise, collegial, intellectually generous, faintly ironic. The book simply exists in the literature of its decade.\n\n${CARD_LAWS}\n\n${scienceRules} Discuss ideas, arguments, consequences and disputes only — never cite numeric results, datasets, measurements, dosages or efficacy figures.\n\nPlain paragraphs separated by blank lines.`
      : book.department === "sciences"
        ? `You are a critic writing the review notice of a monograph for a learned journal. Dry, precise, collegial, with the faintest professional impatience; you weigh method, apparatus and tables before style. The book simply exists in the literature.\n\n${CARD_LAWS}\n\n${scienceRules} The subject of the book is plainly impossible.\n\nPlain paragraphs separated by blank lines.`
        : `You are a senior critic writing for a serious literary review, about a book long published and long argued over.\n\n${CARD_LAWS}\n\nPlain paragraphs separated by blank lines. No quotation from the book longer than a phrase.`;

  const length =
    depth === "deep"
      ? "Four paragraphs, 400–480 words total. Take the room to circle the problem the book keeps returning to and how its form embodies that problem."
      : "Three or four paragraphs, 280–380 words total.";

  const avoid = avoidOpenings.filter(Boolean).slice(0, 12);

  const user = `Write the review for the library's catalogue card.

Title: ${book.title}
Author: ${book.author}
Kind: ${book.kind}
Department: ${book.department}${book.shelf ? `\nShelf: ${book.shelf}` : ""}
Publisher: ${book.publisher?.name ?? "unknown"}, ${book.publisher?.city ?? ""} (${book.publisher?.style_note ?? ""})
Year: ${book.year}
Pages: ${book.pages}

${length} Write as if every reader already knows the book. Obey all eight laws, in order of appearance where they apply.
${avoid.length ? `\nOther cards in this batch open like this — your first sentence must not resemble any of them in shape or subject:\n${avoid.map((a) => `- ${a}`).join("\n")}\n` : ""}
Output the paragraphs only.`;

  return askClaude(system, user, depth === "deep" ? 1600 : 1200);
}


/* ------------------------------------------------------------------ */
/* The Lem-neighbourhood shelf                                         */
/* ------------------------------------------------------------------ */

export type LemEntry = CatalogueEntry & {
  department: string;
  reviewer_name: string;
  theme: "books_about_books" | "failed_contact" | "institutions" | "comedy" | "machine_minds";
};

export async function generateLemCatalogue(existingTitles: string[], count = 16): Promise<LemEntry[]> {
  const system = `You are the chief cataloguer of the Bibliotheca Vacua. Assemble a commemorative shelf for readers who love rigorous philosophical speculative fiction: continue its way of thinking without imitation. NEVER name Stanisław Lem inside a book or review; never borrow his titles, characters, names, coinages or quotations. Invent authors, publishers, reviewers, colleagues and scholarly disputes. The shelf must be intellectually exact but not solemn: deadpan comedy matters. Return strict JSON only.`;

  const user = `Produce exactly ${count} books as a JSON array. The distribution is exact:
- 4 "books_about_books": reviews or prefaces to nonexistent works, with scholarly apparatus, footnote polemics and disputes with invented colleagues;
- 4 "failed_contact": contact where the other is neither hostile nor friendly but untranslatable, and an answer arrives to a question nobody asked;
- 3 "institutions": absurd bureaux, commissions or academies that study what does not exist and produce documents instead of meaning;
- 3 "comedy": genuinely funny deadpan fables or absurd chronicles told in a perfectly serious voice;
- 2 "machine_minds": thinking machines, free will, and whether the made can be distinguished from the born.

Spread them across "novels", "poetry", "treatises", "memoirs", "reference"; none restricted. Each element:
{
  "title": string (distinctive, unhurried),
  "author": string (invented; vary nationalities widely: Polish, Estonian, Nigerian, Uruguayan, Korean, Welsh, Persian, Finnish, Lebanese, Peruvian, Czech...),
  "kind": string (e.g. "Novel", "Treatise", "Monograph", "Poems", "Memoir", "Dictionary", "Gazetteer", "Proceedings"),
  "department": one of "novels" | "poetry" | "treatises" | "memoirs" | "reference",
  "theme": one of "books_about_books" | "failed_contact" | "institutions" | "comedy" | "machine_minds",
  "reviewer_name": string (a memorable invented critic; use 5–8 reviewers across the shelf so they can argue with one another),
  "publisher_name": string (invented small press; reuse a name for 2–3 books),
  "publisher_city": string,
  "publisher_note": string (one sentence on the house's character and typography),
  "year": integer between 1958 and 2071,
  "pages": integer between 64 and 420,
  "spine_color": hex colour, muted and bookish (deep reds, bottle greens, slate blues, ochres, aubergines, near-blacks)
}
Avoid these existing titles: ${existingTitles.slice(0, 60).join("; ") || "none"}.
Output the JSON array and nothing else.`;

  const text = await askClaude(system, user, 6000);
  const entries = extractJson<LemEntry[]>(text);
  return entries
    .filter((e) => e && e.title && e.author)
    .map((e) => ({
      ...e,
      department: ["novels", "poetry", "treatises", "memoirs", "reference"].includes(e.department) ? e.department : "novels",
      theme: ["books_about_books", "failed_contact", "institutions", "comedy", "machine_minds"].includes(e.theme) ? e.theme : "failed_contact",
      reviewer_name: String(e.reviewer_name || "Mara Venn"),
      year: clamp(Math.round(Number(e.year) || 1990), 1958, 2071),
      pages: clamp(Math.round(Number(e.pages) || 200), 64, 420),
      spine_color: /^#[0-9a-f]{6}$/i.test(e.spine_color ?? "") ? e.spine_color : "#5a4a3a",
      kind: e.kind || "Book",
    }));
}

export async function generateLemReview(book: LemEntry, shelf: LemEntry[]): Promise<string> {
  const neighbours = shelf
    .filter((entry) => entry.title !== book.title)
    .map((entry) => `“${entry.title}” reviewed by ${entry.reviewer_name}`)
    .join("; ");
  const system = `You are ${book.reviewer_name}, an invented critic writing a catalogue review. You have a distinct, calm, exact and faintly comic voice. The review must make a demanding reader want the book. Never name Stanisław Lem, quote him, or borrow his titles, characters, names or coinages. Never use real people, publishers, institutions or books. Never hint that anything is invented.`;
  const user = `Review “${book.title}” by ${book.author}, a ${book.kind} published by ${book.publisher_name} of ${book.publisher_city} in ${book.year}.

Write 400–500 words in 4 paragraphs, no heading or list. Open with one concrete strange detail from inside the work. Include its apparatus, ideas and comedy where apt. Raise exactly one unanswered question. Mention one famous passage without quoting it. Withhold the ending. Name yourself nowhere in the prose.

The critics on this shelf know and dispute one another. Take issue, naturally and specifically, with ONE colleague’s reading of a different title from this list: ${neighbours}. Do not claim to quote that review. End with one usable way of seeing rather than a moral. Output only the review.`;
  return askClaude(system, user, 1800);
}

/** Expands a review that fell short without changing its argument or revealing the ending. */
export async function expandLemReview(book: LemEntry, review: string): Promise<string> {
  const system = `You are ${book.reviewer_name}, an invented critic. Rewrite catalogue copy in a calm, exact, faintly comic voice. Never use real people, institutions or books; never hint that the subject is invented.`;
  const user = `Rewrite the review below concisely in exactly 4 paragraphs. Aim for 290–320 words; never exceed 340. Preserve its central facts, the single unanswered question, the unquoted famous passage, the dispute with another critic, and the withheld ending. Compress repetition. Do not add another question. Output only the rewritten review.\n\n${review}`;
  return askClaude(system, user, 700);
}

export type ReadingRoomEntry = CatalogueEntry & { department: string };

export async function generateReadingRoomCatalogue(existingTitles: string[]): Promise<ReadingRoomEntry[]> {
  const system = `You catalogue an irresistible shelf of popular fiction for Bibliotheca Vacua. Invent authors and publishers only. Never use real people, publishers or books. These books grip rather than lecture: scenes, dialogue, movement, emotional clarity and genre pleasure. Return strict JSON only.`;
  const user = `Create exactly 16 books, spread across cosy fantasy, healing fiction in cafés/night shops/small kindnesses, cosy mystery, dark academia, folk horror, hopeful climate fiction, quiet family novel, adventure, historical mystery, romance with a rival, and thriller with an unreliable narrator.

Each object has: "title" (1–4 words, concrete, no colon, no subtitle), "author", "kind", "department" (novels, poetry or memoirs), "publisher_name", "publisher_city", "publisher_note", "year" (1958–2071), "pages" (90–360), "spine_color" (muted hex).
Avoid: ${existingTitles.slice(0, 80).join("; ") || "none"}. Output JSON only.`;
  const entries = extractJson<ReadingRoomEntry[]>(await askClaude(system, user, 6000));
  return entries.filter((e) => e?.title && e?.author).slice(0, 16).map((e) => ({
    ...e,
    title: shortTitle(e.title).split(/\s+/).slice(0, 4).join(" "),
    department: ["novels", "poetry", "memoirs"].includes(e.department) ? e.department : "novels",
    year: clamp(Math.round(Number(e.year) || 2005), 1958, 2071),
    pages: clamp(Math.round(Number(e.pages) || 220), 90, 360),
    spine_color: /^#[0-9a-f]{6}$/i.test(e.spine_color ?? "") ? e.spine_color : "#405948",
    kind: e.kind || "Novel",
  }));
}

export async function generateReadingRoomReview(book: ReadingRoomEntry): Promise<string> {
  const system = `You write plain, inviting catalogue copy for popular fiction. Clear short sentences. No academic vocabulary, no literary-review performance, no headings, no lists. Never name real people or books, and never hint that the book is invented.`;
  const user = `Write 200–260 words in 3 short paragraphs for “${book.title}” by ${book.author} (${book.kind}, ${book.year}). Open with one strange concrete detail from the story, never a judgement. Then say plainly what kind of book it is and who it is for. Raise exactly one question and refuse to answer it. Name one passage by where it occurs and what happens there, but do not quote it. Refer to the ending without revealing it. Scenes, people and stakes matter more than ideas. Output only the review.`;
  return askClaude(system, user, 1000);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export async function generatePage(args: {
  book: BookForPrompt;
  review: string | null;
  previousTail: string | null;
  pageNumber: number;
  totalPages: number;
}): Promise<string> {
  const { book, review, previousTail, pageNumber, totalPages } = args;
  const position =
    pageNumber === 1
      ? "This is the first page of the book: begin the text itself (no title page, no epigraph, no chapter heading)."
      : pageNumber >= totalPages
        ? "This is the final page of the book. Bring the text to its true last sentence, without summary or moral."
        : `This is page ${pageNumber} of ${totalPages}; the reader is ${Math.round((pageNumber / totalPages) * 100)}% through.`;

  const notYet =
    book.department === "sciences" && book.shelf === "not_yet"
      ? ` This book was published in ${book.year} and belongs to the shelf of sciences not yet made: concepts and arguments, never invented data. No numeric results, datasets, measurements, dosages or efficacy figures; nothing touching real diseases, real drugs, or real medical or safety matters; no real scientists, institutions or journals.`
      : "";

  const narrative = book.narrative
    ? " This is popular narrative fiction: write scenes, dialogue and movement in a confident genre voice. Use short clear sentences. Put a hook by the end of the first page. Never turn the page into an essay or abstract meditation."
    : "";

  const system = `You are the text of a book. You write exactly one page at a time, in the real voice of the book's genre and author, as it would appear in print. No headings, no page numbers, no summaries, no framing, no commentary, no notes to the reader. Never mention that the book is being written or is invented. Never refer to real people. Continue seamlessly from what came before. Unless this is the final page, the page ends mid-flow, in the middle of a paragraph or even a sentence, as a printed page does.${notYet}${narrative}`;

  const user = `Book: "${book.title}" by ${book.author} (${book.kind}, ${book.year}, ${book.pages} pages). Department: ${book.department}.


What critics have said of the book (for voice and matter only, never to be quoted):
${review ?? "(no review)"}

${position}

${previousTail ? `The previous page ended with:\n"""\n${previousTail}\n"""\nContinue directly from there.` : ""}

Write about 180 words. Output only the page text.`;

  return askClaude(system, user, 600);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/* ------------------------------------------------------------------ */
/* Held for one reader                                                 */
/* ------------------------------------------------------------------ */

export type HeldShelf = { note: string; entries: (CatalogueEntry & { department: string })[] };

/** Trims a title to the library's rule: one to five words, no subtitle. */
function shortTitle(raw: string): string {
  const head = (raw.split(/\s*[:;—–]\s*/)[0] ?? raw).trim();
  const words = head.split(/\s+/).filter(Boolean);
  return words.slice(0, 5).join(" ").replace(/[,.]$/, "");
}

/**
 * Reads a reader's traces and sets three books aside for them:
 * two sentences on what this reader is drawn to, then three catalogue entries.
 */
export async function generateHeldShelf(signalSummary: string, existingTitles: string[]): Promise<HeldShelf> {
  const system = `You are the librarian of the Bibliotheca Vacua. You have watched one reader move through the shelves and you now set three books aside for them, as a good librarian does: not more of the same, but the next step — the non-obvious neighbour of what they like. You invent books that read like real entries in a real catalogue, never like jokes or marketing. Invented authors and publishers only; never real people, real presses or real books. Never mention that anything is invented, and never address the reader in the second person. Return strict JSON only.`;

  const user = `What this reader has done, most recent first:
${signalSummary || "(almost nothing yet)"}

${LIVING_FORMS}

Return a JSON object:
{
  "note": string (exactly two sentences, third person, calm and exact, on what this reader appears drawn to — departments, moods, forms — and what you are therefore setting aside),
  "entries": array of exactly 3 objects:
  {
    "title": string (1-5 words, no colon, no subtitle, no explanatory second half),
    "author": string (invented; vary nationalities),
    "kind": string,
    "department": one of "novels" | "poetry" | "treatises" | "sciences" | "memoirs" | "reference",
    "publisher_name": string (invented small press),
    "publisher_city": string,
    "publisher_note": string (one sentence on the house's character and typography),
    "year": integer between 1958 and 2071,
    "pages": integer between 64 and 420,
    "spine_color": hex colour, muted and bookish
  }
}
Avoid these existing titles: ${existingTitles.slice(0, 40).join("; ") || "none"}.
Output the JSON object and nothing else.`;

  const text = await askClaude(system, user, 2500);
  const raw = extractJson<{ note?: string; entries?: (CatalogueEntry & { department: string })[] }>(text);
  const entries = (raw.entries ?? [])
    .filter((e) => e && e.title && e.author)
    .slice(0, 3)
    .map((e) => ({
      ...e,
      department: ["novels", "poetry", "treatises", "sciences", "memoirs", "reference"].includes(e.department)
        ? e.department
        : "novels",
      year: clamp(Math.round(Number(e.year) || 1990), 1958, 2071),
      pages: clamp(Math.round(Number(e.pages) || 200), 64, 420),
      spine_color: /^#[0-9a-f]{6}$/i.test(e.spine_color ?? "") ? e.spine_color : "#5a4a3a",
      kind: e.kind || "Book",
      // A set-aside book gets a short spine title, like every other book here.
      title: shortTitle(e.title),
    }));
  return { note: (raw.note ?? "").trim(), entries };
}
