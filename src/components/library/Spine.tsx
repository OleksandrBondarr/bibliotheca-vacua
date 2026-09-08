import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { SpineBook } from "@/lib/catalogue.functions";
import { useIsMobile } from "@/hooks/use-mobile";
import { houseHash as publisherHash } from "@/lib/binding";
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
  return publisherHash(book.publisher?.name ?? null);
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

/** Relative luminance of a hex spine colour, so ink can be chosen for contrast. */
function luminance(hex: string | null) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return 0.2;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Vertical space each binding style occupies at head and foot of the spine. */
function reserve(style: number, height: number) {
  switch (style) {
    case 0:
      return { top: 22, bottom: 22 };
    case 1:
      return { top: 14, bottom: 32 };
    case 2:
      return { top: Math.round(height * 0.16 + height * 0.3) + 8, bottom: 12 };
    case 3:
      return { top: 20, bottom: 28 };
    case 4:
      return { top: 18, bottom: 18 };
    default:
      return { top: 14, bottom: 14 };
  }
}

export function Spine({ book }: { book: SpineBook }) {
  const isMobile = useIsMobile();
  const height = 132 + Math.round((book.pages / 420) * 76);
  const width = 40 + Math.min(12, Math.round((book.pages / 420) * 12));
  const taken = book.status === "taken_forever";
  const style = houseHash(book) % 6;
  const pale = luminance(book.spine_color) > 0.45;
  const ink = pale ? "oklch(0.24 0.02 60)" : "oklch(0.93 0.015 85)";
  const zone = reserve(style, height);
  const bottom = zone.bottom + (taken ? 18 : 0);
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
    <>
      <Binding book={book} style={style} height={height} />
      <span
        className="pointer-events-none absolute inset-x-0 z-[1] flex justify-center"
        style={{ top: zone.top, bottom }}
      >
        <span
          className="vertical-text block h-full truncate text-[12px] leading-none sm:text-[13px]"
          style={{ color: ink }}
        >
          {book.title}
          <span className="opacity-70">&nbsp;·&nbsp;{book.author}</span>
        </span>
      </span>
    </>
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
