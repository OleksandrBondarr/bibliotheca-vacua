import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/useSession";
import { getHeldShelf, dismissHeldBook } from "@/lib/reader.functions";
import { takeOutBook } from "@/lib/loans.functions";
import { departmentLabel } from "@/lib/departments";
import { buttonLink } from "@/components/library/Frame";
import { cn } from "@/lib/utils";
import type { SpineBook } from "@/lib/catalogue.functions";

function firstSentences(review: string | null, n = 2) {
  if (!review) return "";
  return (review.trim().match(/[^.!?]+[.!?]/g) ?? [review]).slice(0, n).join(" ").trim();
}

/** The reader's private short shelf. Anonymous visitors see nothing of it. */
export function HeldShelf({ heading = true, className }: { heading?: boolean; className?: string }) {
  const session = useSession();
  const fetchShelf = useServerFn(getHeldShelf);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const dismiss = useServerFn(dismissHeldBook);
  const takeOut = useServerFn(takeOutBook);

  const { data } = useQuery({
    queryKey: ["held-shelf"],
    queryFn: () => fetchShelf(),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  });

  const dismissM = useMutation({
    mutationFn: (bookId: string) => dismiss({ data: { bookId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["held-shelf"] }),
  });
  const takeM = useMutation({
    mutationFn: (bookId: string) => takeOut({ data: { bookId } }),
    onSuccess: (r) => navigate({ to: "/read/$loanId", params: { loanId: r.loanId } }),
  });

  if (!session || !data?.enabled || data.books.length === 0) return null;

  return (
    <section className={cn("mt-14", className)}>
      {heading && <h2 className="text-small-caps text-sm text-muted-foreground">Set aside for you</h2>}
      <p className="mt-2 italic text-muted-foreground">The librarian has set these aside for you.</p>
      {data.note && <p className="mt-2 max-w-prose text-sm text-muted-foreground">{data.note}</p>}
      <ul className="mt-5 space-y-4">
        {(data.books as SpineBook[]).map((b) => (
          <li key={b.id} className="border border-border bg-paper/5 p-4">
            <p className="text-lg leading-snug">{b.title}</p>
            <p className="text-sm text-muted-foreground">{b.author}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.kind} · {b.publisher?.name ?? "—"}
              {b.publisher?.city ? `, ${b.publisher.city}` : ""} · {b.year} · {b.pages} pp ·{" "}
              {departmentLabel(b.department)}
            </p>
            {b.review && <p className="mt-3 text-[15px] leading-relaxed">{firstSentences(b.review)}</p>}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="inline-flex w-full items-center justify-center border border-border px-5 py-3 text-base hover:bg-accent disabled:opacity-50 sm:w-auto"
                disabled={takeM.isPending}
                onClick={() => takeM.mutate(b.id)}
              >
                {takeM.isPending ? "Fetching…" : "Take out"}
              </button>
              <button
                className={buttonLink}
                disabled={dismissM.isPending}
                onClick={() => dismissM.mutate(b.id)}
              >
                Not for me
              </button>
            </div>
          </li>
        ))}
      </ul>
      {takeM.error && <p className="mt-3 text-sm text-destructive">{(takeM.error as Error).message}</p>}
    </section>
  );
}
