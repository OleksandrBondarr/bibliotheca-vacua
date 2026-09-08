import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  return [book.kind, pub, String(book.year), `${book.pages} pages`, `Shelf mark ${book.shelf_mark}`]
    .filter(Boolean)
    .join(" · ");
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

/** Small paper slip near the foot of the spine. */
function Slip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      data-spine-decoration
      className="pointer-events-none absolute bottom-[5px] left-1/2 z-[3] -translate-x-1/2 border border-ink/25 bg-paper px-1 text-[11px] leading-[1.35] tabular-nums text-ink"
    >
      {children}
    </span>
  );
}

/** Binding decoration drawn over the spine colour. */
function Binding({ style }: { style: number }) {
  const gilt = "oklch(0.82 0.09 82 / 70%)";
  const dark = "oklch(0 0 0 / 30%)";
  const light = "oklch(1 0 0 / 14%)";
  if (style === 0)
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span data-spine-decoration className="spine-gilt absolute inset-x-[3px] top-[4px] h-px" style={{ background: gilt }} />
        <span data-spine-decoration className="spine-gilt absolute inset-x-[3px] top-[7px] h-px" style={{ background: gilt }} />
      </span>
    );

  if (style === 1) return null;


  if (style === 2)
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span data-spine-decoration className="spine-blind absolute inset-x-[4px] top-[4px] h-px" style={{ background: dark }} />
        <span data-spine-decoration className="spine-blind absolute inset-x-[4px] top-[7px] h-px" style={{ background: dark }} />
      </span>
    );

  if (style === 3)
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span data-spine-decoration className="absolute inset-x-[4px] top-[7px] h-px" style={{ background: light }} />
        <span data-spine-decoration className="absolute inset-x-[4px] top-[7px] h-px" style={{ background: light }} />
      </span>
    );

  if (style === 4)
    return (
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span data-spine-decoration className="absolute inset-x-0 top-0 h-[9px]" style={{ background: light }} />
        <span data-spine-decoration className="absolute inset-x-0 bottom-0 h-[9px]" style={{ background: light }} />
      </span>
    );

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to right, oklch(1 0 0 / 4%) 0 1px, transparent 1px 4px, oklch(0 0 0 / 6%) 4px 5px, transparent 5px 9px)",
        }}
      />
    </span>
  );
}

/** A publisher's blind-stamped geometric mark, repeated across its bindings. */
function PublisherMark({ book }: { book: SpineBook }) {
  const hash = houseHash(book);
  const shape = hash % 6;
  const markColor = `color-mix(in oklch, ${book.spine_color}, var(--ink) 42%)`;

  return (
    <span
      aria-hidden
      data-spine-decoration
      className="spine-blind pointer-events-none absolute bottom-[22px] left-1/2 z-[2] h-2 w-2 -translate-x-1/2 opacity-70"
      style={{ color: markColor }}
    >
      {shape === 0 && <span className="absolute left-0 top-[3px] h-px w-2 bg-current" />}
      {shape === 1 && <span className="absolute left-px top-px h-1.5 w-1.5 rotate-45 border border-current" />}
      {shape === 2 && <span className="absolute inset-px rounded-full border border-current" />}
      {shape === 3 && <><span className="absolute left-0 top-[3px] h-px w-2 bg-current" /><span className="absolute left-[3px] top-0 h-2 w-px bg-current" /></>}
      {shape === 4 && <><span className="absolute left-0 top-1 h-px w-[5px] -rotate-45 bg-current" /><span className="absolute right-0 top-1 h-px w-[5px] rotate-45 bg-current" /></>}
      {shape === 5 && <><span className="absolute left-0 top-[3px] h-px w-2 bg-current" /><span className="absolute left-[3px] top-0 h-2 w-px bg-current" /><span className="absolute left-px top-px h-1.5 w-1.5 rotate-45 border border-current" /></>}
    </span>
  );
}

function PageBlock() {
  return (
    <span
      aria-hidden
       className="page-block pointer-events-none absolute inset-x-[2px] top-0 z-[3] h-[6px] border-b border-ink/20 bg-paper"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0 1px, color-mix(in oklch, var(--paper), var(--ink) 14%) 1px 2px), linear-gradient(to right, var(--paper-dark), var(--paper) 72%)",
      }}
    />
  );
}

function Ribbon() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-[6px] top-0 z-[5] h-7 w-[7px] bg-stamp shadow-[0_1px_1px_oklch(0_0_0/30%)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]"
    />
  );
}

function SetAsideSlip() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -left-[5px] top-5 z-[4] h-8 w-4 border border-ink/25 bg-paper shadow-[0_1px_2px_oklch(0_0_0/25%)] after:absolute after:right-0 after:top-0 after:border-b-[5px] after:border-l-[5px] after:border-b-paper-dark after:border-l-transparent"
    />
  );
}


/** Relative luminance of a hex spine colour, so ink can be chosen for contrast. */
function luminance(hex: string | null) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m || !m[1]) return 0.2;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function Spine({ book, onLoan = false, setAside = false }: { book: SpineBook; onLoan?: boolean; setAside?: boolean }) {
  const isMobile = useIsMobile();
  const objectHash = [...book.id].reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) % 10007, 17);
  const heightJitter = (objectHash % 7) - 3;
  const height = Math.max(184, 132 + Math.round((book.pages / 420) * 76) + heightJitter);
  const width = 40 + Math.min(12, Math.round((book.pages / 420) * 12));
  const taken = book.status === "taken_forever";
  const style = houseHash(book) % 6;
  const pale = luminance(book.spine_color) > 0.45;
  const ink = pale ? "oklch(0.24 0.02 60)" : "oklch(0.93 0.015 85)";
  // The title owns the middle of the spine; decorations live only in the head
  // and foot zones, so nothing can ever run across the lettering.
  const titleTop = 13;
  const titleBottom = 32;
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hover, setHover] = useState<{ left: number; top: number } | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || !ref.current) return;
    const title = ref.current.querySelector<HTMLElement>("[data-spine-title]");
    const decorations = ref.current.querySelectorAll<HTMLElement>("[data-spine-decoration]");
    if (!title) return;
    const titleTopEdge = title.offsetTop;
    const titleBottomEdge = title.offsetTop + title.offsetHeight;
    const intersects = [...decorations].some((decoration) => {
      const decorationTop = decoration.offsetTop;
      const decorationBottom = decoration.offsetTop + decoration.offsetHeight;
      return titleTopEdge < decorationBottom && titleBottomEdge > decorationTop;
    });
    if (intersects) {
      ref.current.dataset["spineCollision"] = "true";
      console.warn(`[Bibliotheca Vacua] Spine decoration intersects title: ${book.title}`);
    } else {
      delete ref.current.dataset["spineCollision"];
    }
  }, [book.title, height, style]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  useEffect(() => {
    if (!hover) return;
    const close = () => setHover(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [hover]);

  function openHover() {
    if (isMobile) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const cardWidth = 288;
      const cardHeight = Math.min(460, window.innerHeight - 24);
      const roomOnRight = window.innerWidth - r.right;
      const left = roomOnRight >= cardWidth + 22
        ? r.right + 10
        : Math.max(12, r.left - cardWidth - 10);
      const top = Math.max(12, Math.min(r.top, window.innerHeight - cardHeight - 12));
      setHover({ left, top });
    }, 250);
  }

  function closeHover() {
    if (timer.current) clearTimeout(timer.current);
    setHover(null);
  }

  const label = `${book.title}, ${book.author}${taken ? " (taken forever)" : ""}`;
   const lean = objectHash % 5 === 0 ? (objectHash % 2 === 0 ? 2 : -2) : 0;
   const faded = objectHash % 9 === 0;
   const material = style === 2 || style === 3 ? "leather" : style === 5 ? "paper" : "cloth";
   const spineStyle = {
    height,
    width,
    backgroundColor: book.spine_color,
  } as const;

  // Size the lettering to the space available, rather than truncating early.
  const titleZone = height - titleTop - titleBottom;
  const titleLen = book.title.length;
  const titleSize = titleLen * 7 <= titleZone ? 13 : titleLen * 6.2 <= titleZone ? 12 : titleLen * 5.6 <= titleZone ? 11 : 10;
  const titleLines = titleLen * (titleSize * 0.55) > titleZone ? 2 : 1;
  const showAuthor = titleLines === 1 && titleLen * (titleSize * 0.55) < titleZone * 0.6 && width >= 46;

  const inner = (
    <>
       <span aria-hidden className={cn("spine-material", `spine-material-${material}`, faded && "spine-faded")} />
      <Binding style={style} />
      <span
         data-spine-title
         className="pointer-events-none absolute inset-x-0 z-[1] flex items-center justify-center overflow-hidden px-1"
        style={{ top: titleTop, bottom: titleBottom }}
      >
        <span className="flex h-full max-h-full flex-row-reverse items-center justify-center gap-[2px] overflow-hidden">
          <span
            className={cn("vertical-text block h-full max-h-full overflow-hidden leading-[1.1]", style === 0 && "spine-title-gilt")}
            style={{ color: ink, fontSize: titleSize, maxWidth: titleLines * (titleSize + 2), textOverflow: "ellipsis" }}
          >
            {book.title}
          </span>
          {showAuthor && (
            <span
              className="vertical-text block h-full max-h-full overflow-hidden whitespace-nowrap text-[10px] leading-none"
              style={{ color: ink, opacity: 0.75, textOverflow: "ellipsis" }}
            >
              {book.author}
            </span>
          )}
        </span>
      </span>
       <Slip>{book.shelf_mark}</Slip>
    </>
  );


   const shell =
     "physical-spine relative mt-[6px] flex shrink-0 items-start justify-center overflow-hidden rounded-b-[2px] outline-none";

  return (
     <div
       ref={ref}
       className="book-object relative shrink-0"
       style={{ "--spine-lean": `${lean}deg` } as CSSProperties}
       onMouseEnter={openHover}
       onMouseLeave={closeHover}
     >
      <PageBlock />
      {onLoan && <Ribbon />}
      {setAside && <SetAsideSlip />}
      {isMobile ? (
        <button
          type="button"
          aria-label={label}
          onClick={() => setSheet(true)}
          className={cn(shell, taken && "hatched")}
          style={spineStyle}
        >
          {inner}
          <PublisherMark book={book} />
        </button>
      ) : (
        <Link to="/book/$id" params={{ id: book.id }} aria-label={label} className={cn(shell, taken && "hatched")} style={spineStyle}>
          {inner}
          <PublisherMark book={book} />
        </Link>
      )}

       {hover && !isMobile && createPortal(
        <Link
          to="/book/$id"
          params={{ id: book.id }}
           className="fixed z-[100] block w-72 border border-rule shadow-[0_10px_30px_oklch(0_0_0/45%)]"
          style={{ left: hover.left, top: hover.top }}
        >
          <CatalogueCard book={book} />
         </Link>,
         document.body,
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
