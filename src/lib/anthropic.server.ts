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

const DEPARTMENT_BRIEFS: Record<string, string> = {
  novels:
    "Novels with rigorous, absurd construction: a formal constraint or impossible premise pursued with total seriousness.",
  poetry:
    "Poetry collections: strict old forms applied to impossible or minute subjects; liturgical, taxonomic, or elegiac.",
  treatises:
    "Scholarly treatises and monographs on impossible subjects, argued with academic apparatus and no jokes.",
  sciences:
    "Scientific monographs, conference proceedings, laboratory notebooks, tables of constants and field guides in physics, biology, mathematics, geology and chemistry, concerning phenomena, organisms, materials or quantities that cannot exist. Full scientific apparatus: methods, tables, footnotes, errata. HARD RULE: the subject must be plainly impossible. Never real diseases, real drugs, real medical, pharmacological, dietary or safety claims, and nothing a reader could mistake for real science or act upon.",
  memoirs:
    "Memoirs by unlikely narrators or of unlikely occupations; plain, aggrieved, intimate.",
  reference:
    "Reference works: dictionaries, gazetteers, concordances, tables of things that cannot be tabulated.",
  restricted:
    "Volumes the library holds but does not lend: sealed minutes, indices of indices, manuals whose instructions must not be followed.",
};

export async function generateCatalogue(
  department: string,
  existingTitles: string[],
  count = 14,
): Promise<CatalogueEntry[]> {
  const system = `You are the chief cataloguer of the Bibliotheca Vacua, an old and serious library. You invent books that are plausible yet strange: they must read like real entries in a catalogue of a real library, never like jokes or marketing. Never use names of real people, real publishers, or real books. Never mention that anything is invented. Return strict JSON only.`;

  const user = `Department: ${department}.
Brief: ${DEPARTMENT_BRIEFS[department] ?? ""}

Produce exactly ${count} books as a JSON array. Each element:
{
  "title": string (distinctive, unhurried; no colons-with-subtitles clichés more than twice),
  "author": string (invented; vary nationalities widely: Estonian, Nigerian, Uruguayan, Korean, Welsh, Persian, Finnish, Lebanese, Peruvian, Czech...),
  "kind": string (e.g. "Novel", "Treatise", "Monograph", "Poems", "Memoir", "Dictionary", "Gazetteer", "Proceedings"),
  "publisher_name": string (invented small press; reuse a name for 2–3 books so a house has a character),
  "publisher_city": string,
  "publisher_note": string (one sentence on the house's character and typography),
  "year": integer between 1958 and 2071,
  "pages": integer between 64 and 420,
  "spine_color": hex colour, muted and bookish (deep reds, bottle greens, slate blues, ochres, aubergines, near-blacks; never neon)
}
Avoid these existing titles: ${existingTitles.slice(0, 60).join("; ") || "none"}.
Output the JSON array and nothing else.`;

  const text = await askClaude(system, user, 6000);
  const entries = extractJson<CatalogueEntry[]>(text);
  return entries
    .filter((e) => e && e.title && e.author)
    .map((e) => ({
      ...e,
      year: clamp(Math.round(Number(e.year) || 1990), 1958, 2071),
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
  publisher?: { name: string; city: string; style_note: string | null } | null;
};

export async function generateReview(book: BookForPrompt, depth: "standard" | "deep" = "standard"): Promise<string> {
  const system =
    book.department === "sciences"
      ? `You are a reviewer for a learned scientific journal, writing the review notice of a monograph. Your tone is dry, precise and collegial, with the faintest professional impatience; you weigh method, evidence, tables and apparatus before style. You never hint that the book is invented; it simply exists in the literature. You never mention real people, real institutions, real journals or real books, and you never state anything a reader could take as a real medical, pharmacological or safety claim — the subject of the book is plainly impossible. No headings, no bullet points. Plain paragraphs separated by blank lines.`
      : `You are a senior critic writing for a serious literary review. You write about books that have long been published and argued over. Your tone is calm, exact, slightly ironic, never gushing. You never hint that a book is invented or fictional; it simply exists. You never mention real people, real critics, real institutions, or real books. No headings, no bullet points, no quotation of the book longer than a phrase. Plain paragraphs separated by blank lines.`;

  const length =
    depth === "deep"
      ? "Four paragraphs, 400–480 words total. Go deeper than usual: the philosophical problem the book circles, how its form embodies that problem, the quarrel it has caused among readers, its finest passage and its fault."
      : "Three or four paragraphs, 280–380 words total. Describe what the book does and how it is built, the argument it has provoked over the years, its best passage and its fault.";

  const user = `Write the review for the library's catalogue card.

Title: ${book.title}
Author: ${book.author}
Kind: ${book.kind}
Department: ${book.department}
Publisher: ${book.publisher?.name ?? "unknown"}, ${book.publisher?.city ?? ""} (${book.publisher?.style_note ?? ""})
Year: ${book.year}
Pages: ${book.pages}

${length} Write as if every reader already knows the book. Output the paragraphs only.`;

  return askClaude(system, user, depth === "deep" ? 1600 : 1200);
}

/* ------------------------------------------------------------------ */
/* The Lem-neighbourhood shelf                                         */
/* ------------------------------------------------------------------ */

export type LemEntry = CatalogueEntry & { department: string };

export async function generateLemCatalogue(existingTitles: string[], count = 14): Promise<LemEntry[]> {
  const system = `You are the chief cataloguer of the Bibliotheca Vacua, an old and serious library. You are assembling a commemorative shelf of books that live in the intellectual neighbourhood of a certain twentieth-century philosophical writer of speculative fiction. You must NOT name him, quote him, or use any of his titles, characters, places, or coinages. Nobody reading the entries should be able to point to a borrowed name. The books develop and reinterpret his themes with their own inventions: contact without understanding; technology as fate; machines that author; phantom worlds and simulated persons; the limits of translation between minds; the comedy of reason facing what it cannot digest. Invented authors and publishers only. Never use real people, real publishers, or real books. Never mention that anything is invented. Return strict JSON only.`;

  const user = `Produce exactly ${count} books as a JSON array, spread across the departments "novels", "poetry", "treatises", "memoirs", "reference" (at least two per department; none in "restricted"). Each element:
{
  "title": string (distinctive, unhurried),
  "author": string (invented; vary nationalities widely: Polish, Estonian, Nigerian, Uruguayan, Korean, Welsh, Persian, Finnish, Lebanese, Peruvian, Czech...),
  "kind": string (e.g. "Novel", "Treatise", "Monograph", "Poems", "Memoir", "Dictionary", "Gazetteer", "Proceedings"),
  "department": one of "novels" | "poetry" | "treatises" | "memoirs" | "reference",
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
      year: clamp(Math.round(Number(e.year) || 1990), 1958, 2071),
      pages: clamp(Math.round(Number(e.pages) || 200), 64, 420),
      spine_color: /^#[0-9a-f]{6}$/i.test(e.spine_color ?? "") ? e.spine_color : "#5a4a3a",
      kind: e.kind || "Book",
    }));
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

  const system = `You are the text of a book. You write exactly one page at a time, in the real voice of the book's genre and author, as it would appear in print. No headings, no page numbers, no summaries, no framing, no commentary, no notes to the reader. Never mention that the book is being written or is invented. Never refer to real people. Continue seamlessly from what came before. Unless this is the final page, the page ends mid-flow, in the middle of a paragraph or even a sentence, as a printed page does.`;

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
