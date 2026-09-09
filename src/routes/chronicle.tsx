import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { chronicleQuery, chronicleVerb, CHRONICLE_PAGE_SIZE, LIBRARY_OPENED } from "@/lib/chronicle.functions";
import { Frame, Rule, buttonLink } from "@/components/library/Frame";

const searchSchema = z.object({
  page: z.number().int().min(1).optional(),
  q: z.string().max(60).optional(),
});

export const Route = createFileRoute("/chronicle")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1, q: search.q ?? null }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(chronicleQuery(deps.page, deps.q)),
  head: () => ({
    meta: [
      { title: "The Chronicle — Bibliotheca Vacua" },
      {
        name: "description",
        content:
          "One line for every event in the library: cards issued, books taken out, returned, kept for ever. Nothing is ever removed.",
      },
      { property: "og:title", content: "The Chronicle — Bibliotheca Vacua" },
      { property: "og:description", content: "Everything that has happened in the library, one line at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChroniclePage,
  errorComponent: () => (
    <Frame env="paper" narrow>
      <p className="mt-20 text-center italic text-muted-foreground">The Chronicle could not be opened. Try again shortly.</p>
    </Frame>
  ),
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function ChroniclePage() {
  const { page = 1, q } = Route.useSearch();
  const { data } = useSuspenseQuery(chronicleQuery(page, q ?? null));
  const [term, setTerm] = useState(q ?? "");
  const lastPage = Math.max(1, Math.ceil(data.total / CHRONICLE_PAGE_SIZE));

  return (
    <Frame env="paper" narrow>
      <h1 className="pt-10 text-3xl">The Chronicle</h1>
      <p className="mt-2 text-sm italic text-muted-foreground">
        Everything that happens in the library, newest first. Nothing is ever struck out.
      </p>
      <Rule />

      <form
        method="get"
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="min-w-0 flex-1">
          <span className="text-small-caps text-sm text-muted-foreground">Search by reader</span>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="A name"
            className="mt-1 w-full border-b border-foreground bg-transparent py-2 outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <Link
          to="/chronicle"
          search={term.trim() ? { q: term.trim() } : {}}
          className="inline-flex w-full items-center justify-center border border-foreground px-5 py-3 text-base hover:bg-accent sm:w-auto"
        >
          Look
        </Link>
        {q ? (
          <Link to="/chronicle" search={{}} className={buttonLink}>
            all entries
          </Link>
        ) : null}
      </form>

      {data.events.length === 0 ? (
        <p className="text-[17px] leading-relaxed">Nothing has been entered under that name.</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.events.map((e) => (
            <li key={e.id} className="py-3 text-[17px] leading-snug">
              <span className="text-muted-foreground">{fmt(e.created_at)}</span>
              {" · "}
              {e.reader_name}
              {" · "}
              {chronicleVerb(e.kind)}
              {e.book_title ? (
                <>
                  {" "}
                  {e.book_id ? (
                    <Link to="/book/$id" params={{ id: e.book_id }} className="underline-offset-4 hover:underline">
                      {e.book_title}
                    </Link>
                  ) : (
                    e.book_title
                  )}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex items-baseline justify-between text-sm">
          {page > 1 ? (
            <Link to="/chronicle" search={{ page: page - 1, ...(q ? { q } : {}) }} className={buttonLink}>
              ← later entries
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            {page} / {lastPage}
          </span>
          {page < lastPage ? (
            <Link to="/chronicle" search={{ page: page + 1, ...(q ? { q } : {}) }} className={buttonLink}>
              earlier entries →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      <Rule className="my-8" />
      <p className="text-sm italic text-muted-foreground">{LIBRARY_OPENED}</p>
    </Frame>
  );
}
