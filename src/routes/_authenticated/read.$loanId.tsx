import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getLoan, requestKeep, returnBook, setBookmark, turnToPage, type LoanView } from "@/lib/loans.functions";
import { Prose, buttonLink, buttonPrimary, buttonQuiet } from "@/components/library/Frame";

export const Route = createFileRoute("/_authenticated/read/$loanId")({
  head: () => ({
    meta: [
      { title: "Reading room — Bibliotheca Vacua" },
      { name: "description", content: "A book being written for one reader." },
      { property: "og:title", content: "Reading room — Bibliotheca Vacua" },
      { property: "og:description", content: "Only text on paper." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReadingRoom,
});

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function PageImprint({ reader, page, total }: { reader: string; page: number; total: number }) {
  return (
    <p className="mt-8 border-t border-border/70 pt-3 text-center text-[15px] text-muted-foreground">
      Written for {reader} · p. {page} of {total} · Bibliotheca Vacua
    </p>
  );
}

function ReadingRoom() {
  const { loanId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchLoan = useServerFn(getLoan);
  const turn = useServerFn(turnToPage);
  const mark = useServerFn(setBookmark);
  const giveBack = useServerFn(returnBook);
  const keep = useServerFn(requestKeep);

  const key = ["loan", loanId];
  const { data: loan, isPending, error } = useQuery({
    queryKey: key,
    queryFn: () => fetchLoan({ data: { loanId } }),
    retry: false,
  });

  const turning = useMutation({
    mutationFn: (page: number) => turn({ data: { loanId, page } }),
    onSuccess: (next) => {
      qc.setQueryData<LoanView>(key, next);
      window.scrollTo({ top: 0 });
    },
  });
  const bookmarking = useMutation({
    mutationFn: (page: number | null) => mark({ data: { loanId, page } }),
    onSuccess: (r) => qc.setQueryData<LoanView>(key, (old) => (old ? { ...old, bookmarkPage: r.bookmark_page } : old)),
  });
  const returning = useMutation({
    mutationFn: () => giveBack({ data: { loanId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reader-card"] });
      navigate({ to: "/card" });
    },
  });

  const [keepOpen, setKeepOpen] = useState(false);
  const [gift, setGift] = useState(false);
  const [email, setEmail] = useState("");
  const keeping = useMutation({ mutationFn: () => keep({ data: { loanId, email } }) });

  if (isPending) {
    return (
      <div className="paper min-h-screen bg-background text-foreground">
        <p className="pt-32 text-center italic text-muted-foreground">Opening the book…</p>
      </div>
    );
  }
  if (error || !loan) {
    return (
      <div className="paper min-h-screen bg-background px-5 text-foreground">
        <p className="pt-32 text-center italic text-muted-foreground">{error?.message ?? "This loan is not on your card."}</p>
        <p className="mt-6 text-center">
          <Link to="/card" className={buttonLink}>
            Back to your card
          </Link>
        </p>
      </div>
    );
  }

  if (loan.status !== "active") {
    return (
      <div className="paper min-h-screen bg-background px-5 text-foreground">
        <p className="pt-32 text-center italic">This loan has ended. The book has returned to the shelf and its pages are gone.</p>
        <p className="mt-6 text-center">
          <Link to="/card" className={buttonLink}>
            Back to your card
          </Link>
        </p>
      </div>
    );
  }

  const days = daysLeft(loan.endsAt);
  const total = loan.book.pages;
  const atEnd = loan.currentPage >= total && loan.text !== null;
  const progress = (loan.currentPage / total) * 100;
  const isBookmarked = loan.bookmarkPage === loan.currentPage;
  const busy = turning.isPending;

  return (
    <div className="paper min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[560px] px-5 pb-24">
        <header className="flex items-baseline justify-between gap-4 pt-6 text-sm text-muted-foreground">
          <Link to="/card" className="min-w-0 truncate hover:text-foreground">
            {loan.book.title}
          </Link>
          <span className="shrink-0">returns in {days} {days === 1 ? "day" : "days"}</span>
        </header>
        <div className="mt-3 h-px w-full bg-border">
          <div className="h-px bg-foreground transition-[width]" style={{ width: `${progress}%` }} />
        </div>

        <article
          key={loan.currentPage}
          className="reading-text animate-page-in pt-10"
          onCopy={(event) => event.preventDefault()}
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
        >
          {loan.text === null ? (
            <p className="italic text-muted-foreground">
              The first page has not yet been written. Turn to it.
            </p>
          ) : (
            <Prose text={loan.text} dropCap={loan.currentPage === 1} className="text-[18px] leading-[1.7]" />
          )}
        </article>
        {!atEnd && <PageImprint reader={loan.readerName} page={loan.currentPage} total={total} />}

        {turning.error && <p className="mt-6 text-center text-sm text-destructive">{turning.error.message}</p>}

        {!atEnd && (
          <div className="mt-12">
            <button
              type="button"
              disabled={busy}
              onClick={() => turning.mutate(loan.text === null ? 1 : loan.currentPage + 1)}
              className={buttonPrimary}
            >
              {busy ? "The page is being written…" : loan.text === null ? "Open the book" : "Next page"}
            </button>
          </div>
        )}

        <footer className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <button
            type="button"
            disabled={busy || loan.currentPage <= 1}
            onClick={() => turning.mutate(loan.currentPage - 1)}
            className={buttonLink}
          >
            previous
          </button>
          <span className="tabular-nums">
            p. {loan.currentPage} of {total}
          </span>
          <span className="flex gap-3">
            {loan.bookmarkPage && !isBookmarked && loan.bookmarkPage <= loan.writtenPages && (
              <button type="button" disabled={busy} onClick={() => turning.mutate(loan.bookmarkPage!)} className={buttonLink}>
                to bookmark
              </button>
            )}
            <button
              type="button"
              disabled={bookmarking.isPending || loan.text === null}
              onClick={() => bookmarking.mutate(isBookmarked ? null : loan.currentPage)}
              className={buttonLink}
            >
              {isBookmarked ? "bookmarked" : "bookmark"}
            </button>
          </span>
        </footer>

        {atEnd && (
          <section className="mt-16 border-2 border-double border-foreground/70 p-6 text-center">
            <p className="text-[17px] leading-relaxed">
              This book returns to the shelf in {days} {days === 1 ? "day" : "days"} and will vanish. You alone have read it.
            </p>
            <div className="mt-6 space-y-3">
              <button type="button" onClick={() => setKeepOpen((o) => !o)} className={buttonPrimary}>
                Keep the book
              </button>
              {keepOpen && (
                <div className="border border-border bg-paper p-5 text-left">
                  {keeping.isSuccess ? (
                    <p className="text-[15px] leading-relaxed">Noted. We will write to you in October.</p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        keeping.mutate();
                      }}
                      className="space-y-3"
                    >
                      <p className="text-[15px] leading-relaxed">
                        Keeping books — the only printed copy, with your name on the title page — opens in October. Leave your email and we will write to you.
                      </p>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="reader@example.org"
                        className="w-full border-b border-foreground bg-transparent py-2 outline-none placeholder:text-muted-foreground/60"
                      />
                      <button type="submit" disabled={keeping.isPending} className={buttonQuiet}>
                        {keeping.isPending ? "Noting…" : "Write to me"}
                      </button>
                      {keeping.error && <p className="text-sm text-destructive">{keeping.error.message}</p>}
                    </form>
                  )}
                </div>
              )}
              <div className="flex justify-center gap-6 pt-2">
                <button type="button" onClick={() => setGift((g) => !g)} className={buttonLink}>
                  Give to someone
                </button>
                <button type="button" disabled={returning.isPending} onClick={() => returning.mutate()} className={buttonLink}>
                  Return to shelf
                </button>
              </div>
              {gift && <p className="text-sm italic text-muted-foreground">Gifts will be possible soon.</p>}
            </div>
            <PageImprint reader={loan.readerName} page={loan.currentPage} total={total} />
          </section>
        )}
      </div>
    </div>
  );
}
