import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { SpineBook } from "@/lib/catalogue.functions";
import { getReaderCard } from "@/lib/loans.functions";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { Spine } from "./Spine";

export type VitrineTheme = {
  labelLines: {
    heading: string;
    caption: string;
  };
  banner: {
    enabled: boolean;
    text: string;
    colors: {
      paper: "warm";
      stitch: "red-thread";
      ink: "dark";
    };
  };
  glowTint: "warm";
};

/** Small brass plaque fixed to the front of a shelf. */
export function Plaque({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 ml-4 inline-flex max-w-[calc(100%-2rem)] flex-col gap-0.5 border border-brass/60 bg-brass/15 px-2.5 py-1 text-hall-foreground">
      {children}
    </div>
  );
}

/** A wooden shelf holding a row of spines; scrolls sideways on a phone. */
export function Shelf({
  books,
  empty,
  plaque,
  vitrine,
  vitrineTheme,
  privateBooks = false,
}: {
  books: SpineBook[];
  empty?: ReactNode;
  plaque?: ReactNode;
  vitrine?: boolean;
  vitrineTheme?: VitrineTheme;
  privateBooks?: boolean;
}) {
  const scroller = useDragScroll<HTMLDivElement>();
  const session = useSession();
  const fetchCard = useServerFn(getReaderCard);
  const { data: card } = useQuery({
    queryKey: ["reader-card"],
    queryFn: () => fetchCard(),
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const activeBookIds = new Set(
    (card?.loans ?? []).filter((loan) => loan.status === "active").map((loan) => loan.book.id),
  );
  return (
    <div className="shelf-case">
      {plaque}
      <div
        className={cn(
          vitrine && "vitrine rounded-sm pt-1",
          vitrineTheme?.glowTint === "warm" && "vitrine-glow-warm",
        )}
      >
        {vitrineTheme?.banner.enabled && (
          <span
            className={cn(
              "vitrine-banner text-small-caps",
              `vitrine-banner-paper-${vitrineTheme.banner.colors.paper}`,
              `vitrine-banner-stitch-${vitrineTheme.banner.colors.stitch}`,
              `vitrine-banner-ink-${vitrineTheme.banner.colors.ink}`,
            )}
          >
            {vitrineTheme.banner.text}
          </span>
        )}
        <div
          ref={scroller}
          className={cn(
            "shelf-scroll shelf-bed flex items-end gap-[3px] px-4 pt-3 [perspective:700px]",
            books.length > 0 && "min-h-[208px]",
          )}
        >
          {vitrineTheme && (
            <aside className="vitrine-label shrink-0 self-end" aria-label="Commemorative label">
              <span className="text-small-caps block text-[15px] leading-snug">
                {vitrineTheme.labelLines.heading}
              </span>
              <span className="mt-2 block text-[15px] italic leading-snug text-ink-soft">
                {vitrineTheme.labelLines.caption}
              </span>
            </aside>
          )}
          {books.length === 0 ? (
            <p className="pb-4 text-sm italic text-muted-foreground">{empty ?? "The shelf is empty."}</p>
          ) : (
            books.map((b) => (
              <Spine key={b.id} book={b} onLoan={activeBookIds.has(b.id)} setAside={privateBooks} />
            ))
          )}
        </div>
        <div className="plank h-[18px] rounded-b-sm" />
      </div>
    </div>
  );
}

/** A shelf with a department plaque and a link to the whole department. */
export function DepartmentShelf({
  slug,
  label,
  books,
}: {
  slug: string;
  label: string;
  books: SpineBook[];
}) {
  return (
    <Shelf
      books={books}
      empty="This shelf is still being filled."
      plaque={
        <Plaque>
          <span className="text-small-caps text-sm">{label}</span>
          <Link
            to="/department/$slug"
            params={{ slug }}
            className="text-[15px] text-hall-foreground/80 underline-offset-2 hover:underline"
          >
            whole department →
          </Link>
        </Plaque>
      }
    />
  );
}

/** Rows of shelves for a department: wraps spines into rows of a fixed count. */
export function Shelves({ books, perRow = 12 }: { books: SpineBook[]; perRow?: number }) {
  if (books.length === 0) return <Shelf books={[]} />;
  const rows: SpineBook[][] = [];
  for (let i = 0; i < books.length; i += perRow) rows.push(books.slice(i, i + perRow));
  return (
    <div className="space-y-8">
      {rows.map((row, i) => (
        <Shelf key={i} books={row} />
      ))}
    </div>
  );
}

/** Department page: one shelf per publisher, plaque naming the house and its manner. */
export function ShelvesByPublisher({ books }: { books: SpineBook[] }) {
  if (books.length === 0) return <Shelf books={[]} />;
  const groups = new Map<string, { publisher: SpineBook["publisher"]; books: SpineBook[] }>();
  for (const b of books) {
    const key = b.publisher?.name ?? "—";
    const g = groups.get(key) ?? { publisher: b.publisher, books: [] };
    g.books.push(b);
    groups.set(key, g);
  }
  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([key, g]) => (
        <Shelf
          key={key}
          books={g.books}
          plaque={
            <Plaque>
              <span className="text-small-caps text-sm">
                {g.publisher ? `${g.publisher.name}, ${g.publisher.city}` : "Without an imprint"}
              </span>
              {g.publisher?.style_note && (
                <span className="text-[15px] italic text-hall-foreground/75">{g.publisher.style_note}</span>
              )}
            </Plaque>
          }
        />
      ))}
    </div>
  );
}

/** A department held on named shelves (Sciences): one shelf per name, in order. */
export function NamedShelves({
  books,
  shelves,
}: {
  books: SpineBook[];
  shelves: { key: string; label: string; note: string }[];
}) {
  return (
    <div className="space-y-8">
      {shelves.map((s) => {
        const rows = books.filter((b) => (b.shelf ?? shelves[0]?.key) === s.key);
        return (
          <Shelf
            key={s.key}
            books={rows}
            empty="This shelf is still being filled."
            plaque={
              <Plaque>
                <span className="text-small-caps text-sm">{s.label}</span>
                <span className="text-[15px] italic text-hall-foreground/75">{s.note}</span>
              </Plaque>
            }
          />
        );
      })}
    </div>
  );
}

