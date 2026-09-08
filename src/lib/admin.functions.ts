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
    z.object({ department: z.string(), count: z.number().int().min(1).max(14).default(14) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const department = data.department;
    if (!isDepartment(department)) throw new Error("No such department");
    const { supabase } = context;
    const { generateCatalogue, generateReview } = await import("./anthropic.server");

    const { data: existing } = await supabase.from("books").select("title").eq("department", data.department);
    const entries = await generateCatalogue(
      data.department,
      (existing ?? []).map((b) => b.title),
      data.count,
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
        spine_color: e.spine_color,
        review: reviews[i],
      })),
    );
    if (insertErr) throw new Error(insertErr.message);

    return { added: entries.length, department: data.department };
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
      .select("id, title, author, kind, year, pages, department, publisher:publishers(name, city, style_note)")
      .is("review", null)
      .limit(10);
    let written = 0;
    for (const b of books ?? []) {
      const review = await generateReview({
        ...b,
        publisher: b.publisher as unknown as { name: string; city: string; style_note: string | null } | null,
      });
      const { error } = await supabase.from("books").update({ review }).eq("id", b.id);
      if (!error) written++;
    }
    return { written };
  });
