import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { SpineBook } from "@/lib/catalogue.functions";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function firstSentences(text: string | null, count = 2) {
  if (!text) return null;
  const clean = text.trim().replace(/\*/g, "");
  const found = clean.match(/[^.!?]+[.!?]+["»']?/g);
  let out = (found ? found.slice(0, count).join(" ") : clean).trim();
  if (out.length > 320) out = `${out.slice(0, 300).trimEnd()}…`;
  return out;
}

function imprint(book: SpineBook) {
  const pub = book.publisher ? `${book.publisher.name}, ${book.publisher.city}` : null;
  return [book.kind, pub, String(book.year), `${book.pages} pages`].filter(Boolean).join(" · ");
}

/** The paper catalogue card shown on hover (desktop) or in the bottom sheet (phone). */
function CatalogueCard({ book, hideCue }: { book: SpineBook; hideCue?: boolean }) {
  const snippet = firstSentences(book.review);
  return (
    <div className="bg-paper p-4 text-ink">
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
      {!hideCue && <p className="mt-3 text-[15px] text-ink-soft">Open the card →</p>}
    </div>
  );
}


/** Deterministic binding style per publishing house. */
function houseHash(book: SpineBook) {
  const key = book.publisher?.name ?? "without an imprint";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 100000;
  return h;
}

/** Binding decoration drawn over the spine colour. */
function Binding({ book, style, height }: { book: SpineBook; style: number; height: number }) {
  const gilt = "oklch(0.82 0.09 82 / 70%)";
  const dark = "oklch(0 0 0 / 30%)";
  const light = "oklch(1 0 0 / 14%)";

  if (style === 0)
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute inset-x-[3px] top-[10px] h-px" style={{ background: gilt }} />
        <span className="absolute inset-x-[3px] top-[14px] h-px" style={{ background: gilt }} />
        <span className="absolute inset-x-[3px] bottom-[10px] h-px" style={{ background: gilt }} />
        <span className="absolute inset-x-[3px] bottom-[14px] h-px" style={{ background: gilt }} />
      </span>
    );

  if (style === 1)
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 border border-[oklch(0_0_0/25%)] bg-paper px-1 text-[9px] leading-[1.4] tabular-nums text-ink"
      >
        {String(200 + (houseHash(book) + book.pages) % 8800)}
      </span>
    );

  if (style === 2)
    return (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0"
        style={{ top: Math.round(height * 0.16), height: Math.round(height * 0.3), background: dark }}
      />
    );

  if (style === 3)
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute inset-x-[4px] top-[9px] h-px" style={{ background: light }} />
        <span className="absolute inset-x-[4px] top-[12px] h-px" style={{ background: light }} />
        <span
          className="absolute bottom-3 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border"
          style={{ borderColor: gilt }}
        />
      </span>
    );

  if (style === 4)
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute inset-x-0 top-0 h-[9px]" style={{ background: light }} />
        <span className="absolute inset-x-0 bottom-0 h-[9px]" style={{ background: light }} />
      </span>
    );

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "repeating-linear-gradient(to right, oklch(1 0 0 / 4%) 0 1px, transparent 1px 4px, oklch(0 0 0 / 6%) 4px 5px, transparent 5px 9px)",
      }}
    />
  );
}

export function Spine({ book }: { book: SpineBook }) {
  const isMobile = useIsMobile();
  const height = 132 + Math.round((book.pages / 420) * 76);
  const width = 40 + Math.min(12, Math.round((book.pages / 420) * 12));
  const taken = book.status === "taken_forever";
  const style = houseHash(book) % 6;
  const titleTop = [12, 14, Math.round(height * 0.5), 20, 16, 14][style] ?? 12;


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
            <CatalogueCard book={book} hideCue />

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
