import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LOAN_DAYS, MAX_ACTIVE_LOANS, MAX_LOANS_PER_DAY } from "./departments";

const BOOK_JOIN = "book:books(id, title, author, kind, year, pages, department, review)";

type LoanBook = {
  id: string;
  title: string;
  author: string;
  kind: string;
  year: number;
  pages: number;
  department: string;
  review: string | null;
};

/** Expire the caller's overdue loans and wipe their pages. */
async function expireStaleLoans(supabase: SupabaseCtx, userId: string) {
  await supabase
    .from("loans")
    .update({ status: "returned", pages: [] })
    .eq("user_id", userId)
    .eq("status", "active")
    .lt("ends_at", new Date().toISOString());
}

type SupabaseCtx = Parameters<typeof expireStaleLoansTyped>[0];
// Helper purely to derive the client type from the middleware context.
async function expireStaleLoansTyped(
  supabase: Awaited<ReturnType<typeof getCtx>>["supabase"],
) {
  return supabase;
}
async function getCtx() {
  return null as unknown as { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database> };
}

/* ------------------------------------------------------------------ */

export const takeOutBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ bookId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await expireStaleLoans(supabase, userId);

    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("id, status, department")
      .eq("id", data.bookId)
      .maybeSingle();
    if (bookErr) throw new Error(bookErr.message);
    if (!book) throw new Error("This book is not in the catalogue.");
    if (book.department === "restricted") throw new Error("Books in the restricted department are not lent.");
    if (book.status !== "available") throw new Error("This book has been taken forever.");

    const { data: active } = await supabase
      .from("loans")
      .select("id, book_id")
      .eq("user_id", userId)
      .eq("status", "active");
    const existing = active?.find((l) => l.book_id === data.bookId);
    if (existing) return { loanId: existing.id, alreadyOnLoan: true };
    if ((active?.length ?? 0) >= MAX_ACTIVE_LOANS) {
      throw new Error(`A reader may hold at most ${MAX_ACTIVE_LOANS} books at once.`);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: today } = await supabase
      .from("loans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("started_at", since);
    if ((today ?? 0) >= MAX_LOANS_PER_DAY) {
      throw new Error(`A reader may take out at most ${MAX_LOANS_PER_DAY} books in a day.`);
    }

    const endsAt = new Date(Date.now() + LOAN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: loan, error } = await supabase
      .from("loans")
      .insert({ user_id: userId, book_id: data.bookId, ends_at: endsAt })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { loanId: loan.id, alreadyOnLoan: false };
  });

export const getReaderCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await expireStaleLoans(supabase, userId);

    const [{ data: profile }, { data: loans }, { data: isAdmin }] = await Promise.all([
      supabase.from("profiles").select("display_name, card_number, issued_at").eq("user_id", userId).maybeSingle(),
      supabase
        .from("loans")
        .select(`id, started_at, ends_at, status, current_page, book:books(id, title, author, pages)`)
        .eq("user_id", userId)
        .order("started_at", { ascending: false }),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);

    return {
      profile,
      isAdmin: Boolean(isAdmin),
      loans: (loans ?? []).map((l) => ({
        ...l,
        book: l.book as unknown as Pick<LoanBook, "id" | "title" | "author" | "pages">,
      })),
    };
  });

export const getLoan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ loanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await expireStaleLoans(supabase, userId);
    const { data: loan, error } = await supabase
      .from("loans")
      .select(`id, ends_at, status, pages, current_page, bookmark_page, ${BOOK_JOIN}`)
      .eq("id", data.loanId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!loan) throw new Error("This loan is not on your card.");
    return shapeLoan(loan);
  });

/**
 * Turns to a page. If the page has not been written yet (it is the one right
 * after the last written page), it is written now — for this loan only.
 */
export const turnToPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ loanId: z.string().uuid(), page: z.number().int().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await expireStaleLoans(supabase, userId);
    const { data: loan, error } = await supabase
      .from("loans")
      .select(`id, ends_at, status, pages, current_page, bookmark_page, ${BOOK_JOIN}`)
      .eq("id", data.loanId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!loan) throw new Error("This loan is not on your card.");
    if (loan.status !== "active") throw new Error("This loan has ended; the book has vanished.");

    const book = loan.book as unknown as LoanBook;
    const pages = (loan.pages as string[]) ?? [];
    const target = Math.min(data.page, book.pages);

    if (target > pages.length + 1) throw new Error("Pages must be read in order.");

    if (target === pages.length + 1) {
      const { generatePage } = await import("./anthropic.server");
      const prev = pages[pages.length - 1] ?? null;
      const text = await generatePage({
        book,
        review: book.review,
        previousTail: prev ? prev.slice(-500) : null,
        pageNumber: target,
        totalPages: book.pages,
      });
      pages.push(text);
    }

    const { data: updated, error: upErr } = await supabase
      .from("loans")
      .update({ pages, current_page: target })
      .eq("id", loan.id)
      .select(`id, ends_at, status, pages, current_page, bookmark_page, ${BOOK_JOIN}`)
      .single();
    if (upErr) throw new Error(upErr.message);
    return shapeLoan(updated);
  });

export const setBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ loanId: z.string().uuid(), page: z.number().int().min(1).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("loans")
      .update({ bookmark_page: data.page })
      .eq("id", data.loanId);
    if (error) throw new Error(error.message);
    return { bookmark_page: data.page };
  });

export const returnBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ loanId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("loans")
      .update({ status: "returned", pages: [] })
      .eq("id", data.loanId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */

function shapeLoan(loan: {
  id: string;
  ends_at: string;
  status: "active" | "returned" | "kept";
  pages: unknown;
  current_page: number;
  bookmark_page: number | null;
  book: unknown;
}) {
  const pages = (loan.pages as string[]) ?? [];
  const book = loan.book as LoanBook;
  const current = Math.min(Math.max(loan.current_page, 1), Math.max(pages.length, 1));
  return {
    id: loan.id,
    endsAt: loan.ends_at,
    status: loan.status,
    currentPage: current,
    writtenPages: pages.length,
    bookmarkPage: loan.bookmark_page,
    text: pages[current - 1] ?? null,
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      kind: book.kind,
      pages: book.pages,
    },
  };
}

export type LoanView = ReturnType<typeof shapeLoan>;
