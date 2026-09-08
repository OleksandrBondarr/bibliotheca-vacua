import { Link } from "@tanstack/react-router";
import type { SpineBook } from "@/lib/catalogue.functions";
import { cn } from "@/lib/utils";

export function Spine({ book }: { book: SpineBook }) {
  const height = 132 + Math.round((book.pages / 420) * 76);
  const width = 30 + Math.min(16, Math.floor(book.title.length / 5)) * 1;
  const taken = book.status === "taken_forever";
  const surname = book.author.trim().split(/\s+/).pop() ?? "";

  return (
    <Link
      to="/book/$id"
      params={{ id: book.id }}
      aria-label={`${book.title}, ${book.author}${taken ? " (taken forever)" : ""}`}
      className={cn(
        "relative flex shrink-0 items-start justify-center overflow-hidden rounded-[2px] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-1",
        taken && "hatched",
      )}
      style={{
        height,
        width,
        backgroundColor: book.spine_color,
        boxShadow:
          "inset 2px 0 0 oklch(1 0 0 / 14%), inset -2px 0 0 oklch(0 0 0 / 40%), 0 2px 3px oklch(0 0 0 / 40%)",
      }}
    >
      <span
        className="vertical-text truncate pt-3 text-[11px] leading-none text-spine-ink"
        style={{ maxHeight: height - 14 }}
      >
        {book.title}
        <span className="opacity-70">&nbsp;·&nbsp;{surname}</span>
      </span>
      {taken && (
        <span className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rotate-[-6deg] bg-paper px-1 text-[8px] uppercase tracking-wider text-ink">
          taken
        </span>
      )}
    </Link>
  );
}
