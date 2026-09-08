import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { bookQuery } from "@/lib/catalogue.functions";
import { takeOutBook } from "@/lib/loans.functions";
import { departmentLabel, LOAN_DAYS } from "@/lib/departments";
import { useSession } from "@/hooks/useSession";
import { Frame, Prose, Rule, buttonPrimary, buttonQuiet } from "@/components/library/Frame";

const bookNotFound = () => (
  <Frame env="paper" narrow>
    <p className="mt-20 text-center italic text-muted-foreground">This book is not in the catalogue.</p>
  </Frame>
);

export const Route = createFileRoute("/book/$id")({
  loader: async ({ context, params }) => {
    if (!z.string().uuid().safeParse(params.id).success) throw notFound();
    const book = await context.queryClient.ensureQueryData(bookQuery(params.id));
    if (!book) throw notFound();
    return book;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — ${loaderData.author} · Bibliotheca Vacua` : "Bibliotheca Vacua" },
      { name: "description", content: loaderData?.review?.slice(0, 155) ?? "A book from the Bibliotheca Vacua." },
      { property: "og:title", content: loaderData?.title ?? "Bibliotheca Vacua" },
      { property: "og:description", content: loaderData?.review?.slice(0, 200) ?? "A book that does not exist." },
      { property: "og:type", content: "book" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookPage,
  notFoundComponent: bookNotFound,
  errorComponent: () => (
    <Frame env="paper" narrow>
      <p className="mt-20 text-center italic text-muted-foreground">The catalogue card could not be read. Try again shortly.</p>
    </Frame>
  ),
});

function BookPage() {
  const { id } = Route.useParams();
  const { data: book } = useSuspenseQuery(bookQuery(id));
  const session = useSession();
  const navigate = useNavigate();
  const takeOut = useServerFn(takeOutBook);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gift, setGift] = useState(false);

  if (!book) return bookNotFound();

  const restricted = book.department === "restricted";
  const taken = book.status === "taken_forever";

  async function handleTakeOut() {
    if (!book) return;
    if (!session) {
      navigate({ to: "/auth", search: { redirect: `/book/${book.id}` } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await takeOut({ data: { bookId: book.id } });
      navigate({ to: "/read/$loanId", params: { loanId: res.loanId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The book could not be issued.");
      setBusy(false);
    }
  }

  return (
    <Frame env="paper" narrow>
      <div className="pt-8">
        <Link to="/department/$slug" params={{ slug: book.department }} className="text-sm text-muted-foreground hover:text-foreground">
          ← {departmentLabel(book.department)}
        </Link>
      </div>

      <header className="mt-6 flex gap-5">
        <div
          aria-hidden
          className="h-24 w-16 shrink-0 rounded-[2px]"
          style={{
            backgroundColor: book.spine_color,
            boxShadow: "inset 3px 0 0 oklch(0 0 0 / 30%), 1px 1px 0 oklch(0 0 0 / 30%)",
          }}
        />
        <div>
          <h1 className="text-2xl leading-tight [text-wrap:balance] sm:text-3xl">{book.title}</h1>
          <p className="mt-1 text-lg">{book.author}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {book.kind}
            {book.publisher && <> · {book.publisher.name}, {book.publisher.city}</>} · {book.year} · {book.pages} pages
          </p>
        </div>
      </header>

      <Rule />

      {book.review ? (
        <Prose text={book.review} />
      ) : (
        <p className="italic text-muted-foreground">The review has not yet been written.</p>
      )}

      <Rule className="my-10" />

      {taken ? (
        <div className="border border-border p-5 text-center">
          <p className="text-small-caps text-sm text-muted-foreground">Taken forever</p>
          <p className="mt-2">
            Kept by {book.kept_by_name ?? "a reader"}
            {book.kept_at && <> on {new Date(book.kept_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</>}. It will not be lent again.
          </p>
        </div>
      ) : restricted ? (
        <p className="text-center italic text-muted-foreground">This book is held in the restricted department and is not lent.</p>
      ) : (
        <div className="space-y-3">
          <button type="button" onClick={handleTakeOut} disabled={busy || session === undefined} className={buttonPrimary}>
            {busy ? "Issuing…" : `Take out — ${LOAN_DAYS} days`}
          </button>
          <button type="button" onClick={() => setGift((g) => !g)} className={buttonQuiet}>
            Give as a gift
          </button>
          {gift && <p className="text-center text-sm italic text-muted-foreground">Gifts will be possible soon.</p>}
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <p className="pt-3 text-center text-[13px] leading-relaxed text-muted-foreground">
            The book will be written the moment it is issued and will exist only for you. In {LOAN_DAYS} days it returns to the shelf and vanishes — unless you choose to keep it.
          </p>
        </div>
      )}
    </Frame>
  );
}
