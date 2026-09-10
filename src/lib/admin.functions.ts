import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEPARTMENTS, isDepartment } from "./departments";


async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !isAdmin) throw new Error("Only the librarian may do this.");
}

export const getShelfCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("books").select("department");
    const counts: Record<string, number> = {};
    for (const d of DEPARTMENTS) counts[d.slug] = 0;
    for (const row of data ?? []) counts[row.department] = (counts[row.department] ?? 0) + 1;
    return counts;
  });

/**
 * Adds a shelf (~14 books, each with its review) to one department.
 * The seed action on the admin page calls this for every thin department.
 */
export const addShelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        department: z.string(),
        count: z.number().int().min(1).max(14).default(14),
        shelf: z.enum(["impossible", "not_yet"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const department = data.department;
    if (!isDepartment(department)) throw new Error("No such department");
    const shelf = department === "sciences" ? (data.shelf ?? "impossible") : null;
    const { supabase } = context;
    const { generateCatalogue, generateReview } = await import("./anthropic.server");

    const existingQuery = supabase.from("books").select("title").eq("department", department);
    const { data: existing } = shelf ? await existingQuery.eq("shelf", shelf) : await existingQuery;
    const entries = await generateCatalogue(
      department,
      (existing ?? []).map((b) => b.title),
      data.count,
      shelf ?? undefined,
    );

    // Publishers: reuse by name, create the rest.
    const names = [...new Set(entries.map((e) => e.publisher_name))];
    const { data: known } = await supabase.from("publishers").select("id, name").in("name", names);
    const publisherIds = new Map((known ?? []).map((p) => [p.name, p.id]));
    const missing = entries.filter((e) => !publisherIds.has(e.publisher_name));
    const uniqueMissing = [...new Map(missing.map((e) => [e.publisher_name, e])).values()];
    if (uniqueMissing.length) {
      const { data: created, error } = await supabase
        .from("publishers")
        .insert(uniqueMissing.map((e) => ({ name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note })))
        .select("id, name");
      if (error) throw new Error(error.message);
      for (const p of created ?? []) publisherIds.set(p.name, p.id);
    }

    // Reviews are written once and shared by everyone.
    const reviews = await Promise.all(
      entries.map((e) =>
        generateReview({
          title: e.title,
          author: e.author,
          kind: e.kind,
          year: e.year,
          pages: e.pages,
          department: data.department,
          shelf,
          publisher: { name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note },
        }).catch(() => null),
      ),
    );

    const { error: insertErr } = await supabase.from("books").insert(
      entries.map((e, i) => ({
        title: e.title,
        author: e.author,
        kind: e.kind,
        publisher_id: publisherIds.get(e.publisher_name) ?? null,
        year: e.year,
        pages: e.pages,
        department,
        shelf,
        spine_color: e.spine_color,
        review: reviews[i] ?? null,
      })),
    );
    if (insertErr) throw new Error(insertErr.message);

    return { added: entries.length, department: data.department, shelf };
  });


/**
 * Adds the commemorative "In the neighbourhood of Lem" shelf: 14 featured books
 * across departments, with deeper reviews.
 */
export const addLemShelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { expandLemReview, generateLemCatalogue, generateLemReview } = await import("./anthropic.server");

    const { data: allTitles } = await supabase.from("books").select("title");
    const entries = await generateLemCatalogue((allTitles ?? []).map((b) => b.title), 16);

    const names = [...new Set(entries.map((e) => e.publisher_name))];
    const { data: known } = await supabase.from("publishers").select("id, name").in("name", names);
    const publisherIds = new Map((known ?? []).map((p) => [p.name, p.id]));
    const missing = entries.filter((e) => !publisherIds.has(e.publisher_name));
    const uniqueMissing = [...new Map(missing.map((e) => [e.publisher_name, e])).values()];
    if (uniqueMissing.length) {
      const { data: created, error } = await supabase
        .from("publishers")
        .insert(uniqueMissing.map((e) => ({ name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note })))
        .select("id, name");
      if (error) throw new Error(error.message);
      for (const p of created ?? []) publisherIds.set(p.name, p.id);
    }

    const reviews = await Promise.all(entries.map(async (entry) => {
      try {
        const review = await generateLemReview(entry, entries);
        return review.trim().split(/\s+/).length < 400 ? await expandLemReview(entry, review) : review;
      } catch {
        return null;
      }
    }));

    const { error: clearErr } = await supabase.from("books").update({ featured: false }).eq("featured", true);
    if (clearErr) throw new Error(clearErr.message);

    const { error: insertErr } = await supabase.from("books").insert(
      entries.map((e, i) => ({
        title: e.title,
        author: e.author,
        kind: e.kind,
        publisher_id: publisherIds.get(e.publisher_name) ?? null,
        year: e.year,
        pages: e.pages,
        department: (isDepartment(e.department) ? e.department : "novels") as Database["public"]["Enums"]["department"],
        spine_color: e.spine_color,
        review: reviews[i] ?? null,
        reviewer_name: e.reviewer_name,
        featured: true,
      })),
    );
    if (insertErr) throw new Error(insertErr.message);
    return { added: entries.length };
  });

/** Replaces the Hall's immediate-reading shelf with sixteen narrative books. */
export const replaceReadingRoomShelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { generateReadingRoomCatalogue, generateReadingRoomReview } = await import("./anthropic.server");
    const { data: allTitles } = await supabase.from("books").select("title");
    const entries = await generateReadingRoomCatalogue((allTitles ?? []).map((b) => b.title));

    const names = [...new Set(entries.map((e) => e.publisher_name))];
    const { data: known } = await supabase.from("publishers").select("id, name").in("name", names);
    const publisherIds = new Map((known ?? []).map((p) => [p.name, p.id]));
    const uniqueMissing = [...new Map(entries.filter((e) => !publisherIds.has(e.publisher_name)).map((e) => [e.publisher_name, e])).values()];
    if (uniqueMissing.length) {
      const { data: created, error } = await supabase
        .from("publishers")
        .insert(uniqueMissing.map((e) => ({ name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note })))
        .select("id, name");
      if (error) throw new Error(error.message);
      for (const publisher of created ?? []) publisherIds.set(publisher.name, publisher.id);
    }

    const reviews = await Promise.all(entries.map((entry) => generateReadingRoomReview(entry).catch(() => null)));
    const { error: clearErr } = await supabase.from("books").update({ shelf: null, narrative: false }).eq("shelf", "reading_room");
    if (clearErr) throw new Error(clearErr.message);
    const { error } = await supabase.from("books").insert(entries.map((entry, index) => ({
      title: entry.title,
      author: entry.author,
      kind: entry.kind,
      publisher_id: publisherIds.get(entry.publisher_name) ?? null,
      year: entry.year,
      pages: entry.pages,
      department: (isDepartment(entry.department) ? entry.department : "novels") as Database["public"]["Enums"]["department"],
      shelf: "reading_room",
      spine_color: entry.spine_color,
      review: reviews[index] ?? null,
      narrative: true,
    })));
    if (error) throw new Error(error.message);
    return { added: entries.length };
  });

/** Repairs only short Lem reviews after a model returns below the shelf's house length. */
export const expandShortLemReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { expandLemReview } = await import("./anthropic.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: books, error } = await supabaseAdmin
      .from("books")
      .select("id, title, author, kind, year, pages, department, spine_color, reviewer_name, review, publisher:publishers(name, city, style_note)")
      .eq("featured", true);
    if (error) throw new Error(error.message);
    let written = 0;
    let eligible = 0;
    for (const book of books ?? []) {
      const wordCount = book.review?.trim().split(/\s+/).length ?? 0;
      if (!book.review || (wordCount >= 400 && wordCount <= 500)) continue;
      eligible += 1;
      const publisher = book.publisher as unknown as { name: string; city: string; style_note: string | null } | null;
      const review = await expandLemReview({
        title: book.title,
        author: book.author,
        kind: book.kind,
        year: book.year,
        pages: book.pages,
        department: book.department,
        spine_color: book.spine_color,
        publisher_name: publisher?.name ?? "Vacant Press",
        publisher_city: publisher?.city ?? "Kraków",
        publisher_note: publisher?.style_note ?? "",
        reviewer_name: book.reviewer_name ?? "Mara Venn",
        theme: "failed_contact",
      }, book.review);
      const { error: updateError } = await supabaseAdmin.from("books").update({ review }).eq("id", book.id);
      if (updateError) throw new Error(updateError.message);
      written += 1;
    }
    return { written, eligible, found: books?.length ?? 0 };
  });

/** Writes reviews for any books that are missing one. */
export const fillMissingReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { generateReview } = await import("./anthropic.server");
    const { data: books } = await supabase
      .from("books")
      .select("id, title, author, kind, year, pages, department, shelf, featured, publisher:publishers(name, city, style_note)")
      .is("review", null)
      .limit(10);
    let written = 0;
    for (const b of books ?? []) {
      const review = await generateReview(
        {
          ...b,
          publisher: b.publisher as unknown as { name: string; city: string; style_note: string | null } | null,
        },
        b.featured ? "deep" : "standard",
      );
      const { error } = await supabase.from("books").update({ review }).eq("id", b.id);
      if (!error) written++;
    }
    return { written };
  });

const firstSentence = (review: string | null) => {
  if (!review) return "";
  const m = review.trim().match(/[^.!?]+[.!?]/);
  return (m?.[0] ?? review.slice(0, 120)).trim();
};

/**
 * Rewrites reviews with the v2 catalogue-card prompt, ten at a time.
 * The client walks the offset forward until `done` comes back true.
 */
export const rewriteReviewBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ offset: z.number().int().min(0).default(0), count: z.number().int().min(1).max(10).default(10) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabase } = context;
    const { generateReview } = await import("./anthropic.server");

    const { count: total } = await supabase.from("books").select("id", { count: "exact", head: true });
    const { data: books, error } = await supabase
      .from("books")
      .select("id, title, author, kind, year, pages, department, shelf, featured, publisher:publishers(name, city, style_note)")
      .order("created_at", { ascending: true })
      .range(data.offset, data.offset + data.count - 1);
    if (error) throw new Error(error.message);

    // Openings already in the catalogue, so no two cards begin the same way.
    const { data: recent } = await supabase
      .from("books")
      .select("review")
      .not("review", "is", null)
      .order("created_at", { ascending: true })
      .range(Math.max(0, data.offset - 12), Math.max(0, data.offset - 1));
    const avoid = (recent ?? []).map((r) => firstSentence(r.review));

    let written = 0;
    const results = await Promise.all(
      (books ?? []).map(async (b) => {
        try {
          const review = await generateReview(
            {
              ...b,
              publisher: b.publisher as unknown as { name: string; city: string; style_note: string | null } | null,
            },
            b.featured ? "deep" : "standard",
            avoid,
          );
          const { error: upErr } = await supabase.from("books").update({ review }).eq("id", b.id);
          return upErr ? null : review;
        } catch {
          return null;
        }
      }),
    );
    written = results.filter(Boolean).length;

    const nextOffset = data.offset + (books?.length ?? 0);
    return {
      written,
      attempted: books?.length ?? 0,
      nextOffset,
      total: total ?? 0,
      done: (books?.length ?? 0) < data.count || nextOffset >= (total ?? 0),
    };
  });

