import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { SpineBook } from "@/lib/catalogue.functions";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function firstSentences(text: string | null, count = 2) {
  if (!text) return null;
  const parts = text.trim().split(/(?<=[.!?»"])\s+/);
  return parts.slice(0, count).join(" ");
}

function imprint(book: SpineBook) {
  const pub = book.publisher ? `${book.publisher.name}, ${book.publisher.city}` : null;
  return [book.kind, pub, String(book.year), `${book.pages} pages`].filter(Boolean).join(" · ");
}

/** The paper catalogue card shown on hover (desktop) or in the bottom sheet (phone). */
function CatalogueCard({ book, onOpen }: { book: SpineBook; onOpen?: () => void }) {
  const snippet = firstSentences(book.review);
  return (
    <div className="paper bg-paper p-4 text-ink">
      <p className="text-lg leading-snug">{book.title}</p>
      <p className="mt-0.5 text-[15px] text-ink">{book.author}</p>
      <p className="mt-2 text-[15px] leading-snug text-ink-soft">{imprint(book)}</p>
      <div className="my-3 h-px bg-rule" />
      {snippet ? (
        <p className="text-[15px] leading-relaxed text-ink">{snippet}</p>
      ) : (
        <p className="text-[15px] italic text-ink-soft">The review has not yet been written.</p>
      )}
      {book.status === "taken_forever" && (
        <p className="mt-3 text-small-caps text-[15px] text-stamp">Taken forever</p>
      )}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 w-full border border-ink px-4 py-3 text-[15px] text-ink"
        >
          Open
        </button>
      ) : (
        <p className="mt-3 text-[15px] text-ink-soft">Open the card →</p>
      )}
    </div>
  );
}

export function Spine({ book }: { book: SpineBook }) {
  const isMobile = useIsMobile();
  const height = 132 + Math.round((book.pages / 420) * 76);
  const width = 40 + Math.min(12, Math.round((book.pages / 420) * 12));
  const taken = book.status === "taken_forever";
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hover, setHover] = useState<{ left: number; top: number } | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  function openHover() {
    if (isMobile) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const cardWidth = 288;
      const left = Math.min(r.right + 10, window.innerWidth - cardWidth - 12);
      const top = Math.max(12, Math.min(r.top, window.innerHeight - 320));
      setHover({ left, top });
    }, 250);
  }

  function closeHover() {
    if (timer.current) clearTimeout(timer.current);
    setHover(null);
  }

  const label = `${book.title}, ${book.author}${taken ? " (taken forever)" : ""}`;
  const spineStyle = {
    height,
    width,
    backgroundColor: book.spine_color,
    boxShadow:
      "inset 3px 0 0 oklch(1 0 0 / 26%), inset 5px 0 0 oklch(1 0 0 / 10%), inset -3px 0 0 oklch(0 0 0 / 45%), 0 2px 3px oklch(0 0 0 / 40%)",
  } as const;

  const inner = (
    <span
      className="vertical-text pt-3 text-[12px] leading-none text-spine-ink sm:text-[13px]"
      style={{ maxHeight: height - 14, display: "block", overflow: "hidden" }}
    >
      <span className="block truncate" style={{ maxHeight: height - 14 }}>
        {book.title}
        <span className="opacity-70">&nbsp;·&nbsp;{book.author}</span>
      </span>
    </span>
  );

  const shell =
    "relative flex shrink-0 items-start justify-center overflow-hidden rounded-[2px] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-1";

  return (
    <div ref={ref} className="relative shrink-0" onMouseEnter={openHover} onMouseLeave={closeHover}>
      {isMobile ? (
        <button
          type="button"
          aria-label={label}
          onClick={() => setSheet(true)}
          className={cn(shell, taken && "hatched")}
          style={spineStyle}
        >
          {inner}
        </button>
      ) : (
        <Link to="/book/$id" params={{ id: book.id }} aria-label={label} className={cn(shell, taken && "hatched")} style={spineStyle}>
          {inner}
        </Link>
      )}

      {taken && (
        <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rotate-[-6deg] bg-paper px-1 text-[8px] uppercase tracking-wider text-ink">
          taken
        </span>
      )}

      {hover && !isMobile && (
        <Link
          to="/book/$id"
          params={{ id: book.id }}
          className="fixed z-50 block w-72 border border-rule shadow-[0_10px_30px_oklch(0_0_0/45%)]"
          style={{ left: hover.left, top: hover.top }}
        >
          <CatalogueCard book={book} />
        </Link>
      )}

      {sheet && isMobile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSheet(false)} aria-hidden />
          <div
            role="dialog"
            aria-label={book.title}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto border-t border-rule motion-safe:animate-page-in"
          >
            <CatalogueCard book={book} onOpen={undefined} />
            <div className="bg-paper px-4 pb-5">
              <Link
                to="/book/$id"
                params={{ id: book.id }}
                className="block w-full border border-ink bg-ink px-4 py-3 text-center text-[15px] text-paper"
              >
                Open
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
