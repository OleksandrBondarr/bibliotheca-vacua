import type { ReactNode } from "react";
import type { SpineBook } from "@/lib/catalogue.functions";
import { cn } from "@/lib/utils";
import { Spine } from "./Spine";

/** A wooden shelf holding a row of spines; scrolls sideways on a phone. */
export function Shelf({ books, empty }: { books: SpineBook[]; empty?: ReactNode }) {
  return (
    <div>
      <div className={cn("flex items-end gap-[3px] overflow-x-auto px-4 pt-3 [scrollbar-width:thin]", books.length > 0 && "min-h-[208px]")}>
        {books.length === 0 ? (
          <p className="pb-4 text-sm italic text-muted-foreground">{empty ?? "The shelf is empty."}</p>
        ) : (
          books.map((b) => <Spine key={b.id} book={b} />)
        )}
      </div>
      <div className="plank h-3.5 rounded-b-sm" />
    </div>
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
