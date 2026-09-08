import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { departmentLabel, isDepartment } from "./departments";
import type { SpineBook } from "./catalogue.functions";

/** Traces the librarian keeps of one reader. */
export const SIGNAL_KINDS = [
  "department_visit",
  "card_read",
  "review_end",
  "taken",
  "returned_early",
  "finished",
  "kept",
  "dismissed",
] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

export const SIGNALS_BEFORE_SHELF = 6;

const HELD_COLUMNS =
  "id, title, author, pages, spine_color, status, department, shelf, featured, kind, year, review, shelf_mark, publisher:publishers(name, city, style_note)";

/** Records one trace. Silently ignored for anonymous visitors (no bearer, no call). */
export const recordSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: z.enum(SIGNAL_KINDS),
        department: z.string().optional().nullable(),
        bookId: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("reader_signals").insert({
      user_id: userId,
      kind: data.kind,
      department: data.department && isDepartment(data.department) ? data.department : null,
      book_id: data.bookId ?? null,
    });
    return { ok: true };
  });

/** Records a trace from inside another server function, where we already have the client. */
export async function noteSignal(
  supabase: { from: (t: "reader_signals") => { insert: (v: unknown) => Promise<unknown> } },
  userId: string,
  kind: SignalKind,
  extra: { department?: string | null | undefined; bookId?: string | null | undefined } = {},
) {
  try {
    await supabase.from("reader_signals").insert({
      user_id: userId,
      kind,
      department: extra.department ?? null,
      book_id: extra.bookId ?? null,
    });
  } catch {
    /* a missed trace must never break a loan */
  }
}

const DAY = 86_400_000;

/**
 * The reader's own short shelf. Generates it when the reader has enough traces
 * and either has never had one, has dismissed all three, or has gathered six
 * new traces since the last one — at most once a day.
 */
export const getHeldShelf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: signals }, { data: state }] = await Promise.all([
      supabase
        .from("reader_signals")
        .select("kind, department, book_id, created_at")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("reader_shelf_state").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const { count: signalCount } = await supabase
      .from("reader_signals")
      .select("id", { count: "exact", head: true });

    const total = signalCount ?? 0;
    if (total < SIGNALS_BEFORE_SHELF) {
      return { enabled: false as const, note: null, books: [] as SpineBook[], signals: total };
    }

    const dismissed = new Set((signals ?? []).filter((s) => s.kind === "dismissed").map((s) => s.book_id));
    const { data: heldRaw } = await supabase
      .from("books")
      .select(HELD_COLUMNS)
      .eq("private_for", userId)
      .order("created_at", { ascending: false });
    let held = ((heldRaw ?? []) as unknown as SpineBook[]).filter((b) => !dismissed.has(b.id));

    const lastAt = state?.generated_at ? new Date(state.generated_at).getTime() : 0;
    const freshEnough = Date.now() - lastAt < DAY;
    const newSignals = total - (state?.signal_count ?? 0);
    // Cost guard: at most three private books written per reader per day.
    const dayAgo = new Date(Date.now() - DAY).toISOString();
    const { count: writtenToday } = await supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("private_for", userId)
      .gte("created_at", dayAgo);
    const budget = Math.max(0, 3 - (writtenToday ?? 0));
    const want = Math.max(0, 3 - held.length);
    const shouldGenerate =
      !freshEnough &&
      budget > 0 &&
      want > 0 &&
      (!state?.generated_at || held.length < 3 || newSignals >= SIGNALS_BEFORE_SHELF);

    let note = state?.note ?? null;

    if (shouldGenerate) {
      const summary = (signals ?? [])
        .slice(0, 40)
        .map((s) => {
          const when = new Date(s.created_at).toLocaleDateString("en-GB");
          const where = s.department ? ` in ${departmentLabel(s.department)}` : "";
          return `- ${describe(s.kind)}${where} (${when})`;
        })
        .join("\n");

      const { data: existing } = await supabase.from("books").select("title").limit(40);
      const { generateHeldShelf } = await import("./anthropic.server");
      const { generateReview } = await import("./anthropic.server");
      const shelf = await generateHeldShelf(summary, (existing ?? []).map((b) => b.title));

      shelf.entries = shelf.entries.slice(0, Math.min(want, budget));
      if (shelf.entries.length > 0) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const names = [...new Set(shelf.entries.map((e) => e.publisher_name))];
        const { data: known } = await supabaseAdmin.from("publishers").select("id, name").in("name", names);
        const publisherIds = new Map((known ?? []).map((p) => [p.name, p.id]));
        const missing = [
          ...new Map(
            shelf.entries.filter((e) => !publisherIds.has(e.publisher_name)).map((e) => [e.publisher_name, e]),
          ).values(),
        ];
        if (missing.length) {
          const { data: created } = await supabaseAdmin
            .from("publishers")
            .insert(
              missing.map((e) => ({ name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note })),
            )
            .select("id, name");
          for (const p of created ?? []) publisherIds.set(p.name, p.id);
        }

        const reviews = await Promise.all(
          shelf.entries.map((e) =>
            generateReview({
              title: e.title,
              author: e.author,
              kind: e.kind,
              year: e.year,
              pages: e.pages,
              department: e.department,
              publisher: { name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note },
            }).catch(() => null),
          ),
        );

        const { data: inserted } = await supabaseAdmin
          .from("books")
          .insert(
            shelf.entries.map((e, i) => ({
              title: e.title,
              author: e.author,
              kind: e.kind,
              publisher_id: publisherIds.get(e.publisher_name) ?? null,
              year: e.year,
              pages: e.pages,
              department: e.department as never,
              spine_color: e.spine_color,
              review: reviews[i] ?? null,
              private_for: userId,
            })),
          )
          .select(HELD_COLUMNS);

        held = [...((inserted ?? []) as unknown as SpineBook[]), ...held];
        note = shelf.note || note;

        await supabaseAdmin
          .from("reader_shelf_state")
          .upsert({ user_id: userId, generated_at: new Date().toISOString(), signal_count: total, note });
      }
    }

    return { enabled: held.length > 0, note, books: held.slice(0, 3), signals: total };
  });

/** "Not for me": records the dismissal and takes the book off the reader's shelf. */
export const dismissHeldBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ bookId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: book } = await supabase
      .from("books")
      .select("id, department")
      .eq("id", data.bookId)
      .eq("private_for", userId)
      .maybeSingle();
    if (!book) throw new Error("That book is not on your shelf.");

    await noteSignal(supabase as never, userId, "dismissed", {
      department: book.department,
      bookId: book.id,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A book already taken out keeps its loan; it simply leaves the shelf.
    const { count: loans } = await supabaseAdmin
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("book_id", book.id);
    if ((loans ?? 0) === 0) await supabaseAdmin.from("books").delete().eq("id", book.id);
    return { ok: true };
  });

function describe(kind: string) {
  switch (kind) {
    case "department_visit":
      return "looked over a department";
    case "card_read":
      return "read a catalogue card";
    case "taken":
      return "took a book out";
    case "returned_early":
      return "gave a book back before the fifth page";
    case "finished":
      return "read a book to its last page";
    case "kept":
      return "asked to keep a book";
    case "dismissed":
      return "set a suggestion aside as not for them";
    default:
      return kind;
  }
}
