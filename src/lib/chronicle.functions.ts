import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CHRONICLE_KINDS = ["card_issued", "taken_out", "returned", "kept_forever", "given"] as const;
export type ChronicleKind = (typeof CHRONICLE_KINDS)[number];

export const CHRONICLE_PAGE_SIZE = 60;
export const LIBRARY_OPENED = "The library opened on 12 September 2026.";

export type ChronicleEvent = {
  id: string;
  kind: string;
  reader_name: string;
  book_id: string | null;
  book_title: string | null;
  created_at: string;
};

export function chronicleVerb(kind: string): string {
  switch (kind) {
    case "card_issued":
      return "was issued a reader's card";
    case "taken_out":
      return "took out";
    case "returned":
      return "returned";
    case "kept_forever":
      return "kept for ever";
    case "given":
      return "gave to the library";
    default:
      return kind;
  }
}

/**
 * Enters one line in the Chronicle. The reader's name is stored as it stood at
 * that moment; readers who have asked to be left out are entered as "A reader".
 * Never allowed to break the action it records.
 */
export async function noteChronicle(
  supabase: {
    from: (t: "profiles") => {
      select: (c: string) => {
        eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { display_name: string | null; chronicle_opt_out: boolean } | null }> };
      };
    };
  },
  userId: string,
  kind: ChronicleKind,
  book?: { id?: string | null; title?: string | null },
) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, chronicle_opt_out")
      .eq("user_id", userId)
      .maybeSingle();
    const name =
      profile?.chronicle_opt_out || !profile?.display_name?.trim() ? "A reader" : profile.display_name.trim();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("chronicle_events").insert({
      kind,
      reader_name: name,
      book_id: book?.id ?? null,
      book_title: book?.title ?? null,
    });
  } catch {
    /* a missed line in the Chronicle must never stop a loan */
  }
}

export const listChronicle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ page: z.number().int().min(1).default(1), q: z.string().max(60).nullable().default(null) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./public-client.server");
    const db = createPublicClient();
    const from = (data.page - 1) * CHRONICLE_PAGE_SIZE;

    let query = db
      .from("chronicle_events")
      .select("id, kind, reader_name, book_id, book_title, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + CHRONICLE_PAGE_SIZE - 1);
    if (data.q && data.q.trim()) query = query.ilike("reader_name", `%${data.q.trim()}%`);

    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);
    return {
      events: (rows ?? []) as ChronicleEvent[],
      total: count ?? 0,
      page: data.page,
      pageSize: CHRONICLE_PAGE_SIZE,
    };
  });

export const setChronicleOptOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ optOut: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ chronicle_opt_out: data.optOut })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    // Opting out is retroactive: past lines under this reader's name become "A reader".
    if (data.optOut) {
      try {
        const { data: profile } = await context.supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", context.userId)
          .maybeSingle();
        const name = profile?.display_name?.trim();
        if (name) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("chronicle_events").update({ reader_name: "A reader" }).eq("reader_name", name);
        }
      } catch {
        /* the preference is saved even if rewriting the past lines fails */
      }
    }
    return { optOut: data.optOut };
  });

export const chronicleQuery = (page: number, q: string | null) =>
  queryOptions({
    queryKey: ["chronicle", page, q ?? ""],
    queryFn: () => listChronicle({ data: { page, q } }),
  });
