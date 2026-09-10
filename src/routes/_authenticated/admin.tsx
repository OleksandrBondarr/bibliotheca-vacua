import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { addLemShelf, addShelf, expandShortLemReviews, fillMissingReviews, getShelfCounts, replaceReadingRoomShelf, rewriteReviewBatch } from "@/lib/admin.functions";
import { DEPARTMENTS } from "@/lib/departments";
import { Frame, Rule, buttonPrimary, buttonQuiet } from "@/components/library/Frame";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Librarian's desk — Bibliotheca Vacua" },
      { name: "description", content: "Seed the catalogue and add shelves." },
      { property: "og:title", content: "Librarian's desk" },
      { property: "og:description", content: "Catalogue maintenance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const counts = useServerFn(getShelfCounts);
  const shelf = useServerFn(addShelf);
  const lem = useServerFn(addLemShelf);
  const readingRoom = useServerFn(replaceReadingRoomShelf);
  const fill = useServerFn(fillMissingReviews);
  const expandLem = useServerFn(expandShortLemReviews);
  const rewrite = useServerFn(rewriteReviewBatch);
  const [log, setLog] = useState<string[]>([]);
  const note = (s: string) => setLog((l) => [s, ...l].slice(0, 12));

  const { data, error, isPending } = useQuery({ queryKey: ["shelf-counts"], queryFn: () => counts(), retry: false });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["shelf-counts"] });
    qc.invalidateQueries({ queryKey: ["hall"] });
    qc.invalidateQueries({ queryKey: ["department"] });
  };

  const seed = useMutation({
    mutationFn: async () => {
      for (const d of DEPARTMENTS) {
        const have = data?.[d.slug] ?? 0;
        if (have >= 14) continue;
        note(`Cataloguing ${d.label}…`);
        const r = await shelf({ data: { department: d.slug, count: Math.min(14, 14 - have) } });
        note(`${d.label}: ${r.added} books added.`);
        refresh();
      }
    },
    onError: (e) => note(`Failed: ${e.message}`),
    onSuccess: () => note("Seeding complete."),
  });

  const addOne = useMutation({
    mutationFn: async (v: { department: string; shelf?: "impossible" | "not_yet" }) => {
      note(`Adding a shelf to ${v.department}…`);
      return shelf({ data: { department: v.department, count: 14, shelf: v.shelf } });
    },
    onSuccess: (r) => {
      note(`${r.department}${r.shelf ? ` (${r.shelf})` : ""}: ${r.added} books added.`);
      refresh();
    },
    onError: (e) => note(`Failed: ${e.message}`),
  });


  const addLem = useMutation({
    mutationFn: async () => {
      note("Replacing the Lem-neighbourhood shelf…");
      return lem();
    },
    onSuccess: (r) => {
      note(`Lem shelf replaced with ${r.added} books.`);
      refresh();
    },
    onError: (e) => note(`Failed: ${e.message}`),
  });

  const addReadingRoom = useMutation({
    mutationFn: async () => {
      note("Assembling The Reading Room…");
      return readingRoom();
    },
    onSuccess: (r) => {
      note(`The Reading Room replaced with ${r.added} books.`);
      refresh();
    },
    onError: (e) => note(`Failed: ${e.message}`),
  });

  const fillReviews = useMutation({
    mutationFn: () => fill(),
    onSuccess: (r) => {
      note(`${r.written} reviews written.`);
      refresh();
    },
    onError: (e) => note(`Failed: ${e.message}`),
  });

  const repairLem = useMutation({
    mutationFn: () => expandLem(),
    onSuccess: (r) => {
      note(`${r.written} Lem reviews expanded to house length.`);
      refresh();
    },
    onError: (e) => note(`Failed: ${e.message}`),
  });

  const rewriteAll = useMutation({
    mutationFn: async () => {
      let offset = 0;
      let written = 0;
      note("Rewriting reviews with the new catalogue-card prompt…");
      for (;;) {
        const r = await rewrite({ data: { offset, count: 10 } });
        written += r.written;
        offset = r.nextOffset;
        note(`Reviews rewritten: ${Math.min(offset, r.total)} of ${r.total}.`);
        refresh();
        if (r.done) return { written, total: r.total };
      }
    },
    onSuccess: (r) => note(`Done: ${r.written} of ${r.total} reviews rewritten.`),
    onError: (e) => note(`Failed: ${e.message}`),
  });

  const busy =
    seed.isPending || addOne.isPending || addLem.isPending || addReadingRoom.isPending || repairLem.isPending || fillReviews.isPending || rewriteAll.isPending;

  return (
    <Frame env="paper" narrow>
      <h1 className="pt-10 text-3xl">Librarian's desk</h1>
      <Rule />
      {isPending && <p className="italic text-muted-foreground">Counting the shelves…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && (
        <>
          <table className="w-full text-sm">
            <tbody>
              {DEPARTMENTS.map((d) => (
                <tr key={d.slug} className="border-b border-border">
                  <td className="py-2">{d.label}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{data[d.slug] ?? 0} books</td>
                  <td className="py-2 pl-4 text-right">
                    <button type="button" disabled={busy} onClick={() => addOne.mutate({ department: d.slug })} className="text-sm underline underline-offset-4 disabled:opacity-50">
                      add a shelf
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 space-y-3">
            <button type="button" disabled={busy} onClick={() => seed.mutate()} className={buttonPrimary}>
              {seed.isPending ? "Seeding…" : "Seed catalogue (fill thin departments)"}
            </button>
            <button type="button" disabled={busy} onClick={() => addLem.mutate()} className={buttonQuiet}>
              {addLem.isPending ? "Assembling…" : "Replace the Lem-neighbourhood shelf"}
            </button>
            <button type="button" disabled={busy} onClick={() => addReadingRoom.mutate()} className={buttonQuiet}>
              {addReadingRoom.isPending ? "Assembling…" : "Replace The Reading Room shelf"}
            </button>
            <button type="button" disabled={busy} onClick={() => repairLem.mutate()} className={buttonQuiet}>
              {repairLem.isPending ? "Expanding…" : "Expand short Lem reviews"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => addOne.mutate({ department: "sciences", shelf: "impossible" })}
              className={buttonQuiet}
            >
              Add impossible-sciences shelf
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => addOne.mutate({ department: "sciences", shelf: "not_yet" })}
              className={buttonQuiet}
            >
              Add sciences-not-yet-made shelf
            </button>

            <button type="button" disabled={busy} onClick={() => rewriteAll.mutate()} className={buttonQuiet}>
              {rewriteAll.isPending ? "Rewriting reviews…" : "Rewrite all reviews (v2)"}
            </button>
            <button type="button" disabled={busy} onClick={() => fillReviews.mutate()} className={buttonQuiet}>
              {fillReviews.isPending ? "Writing…" : "Write missing reviews"}
            </button>
            <p className="text-[15px] text-muted-foreground">
              Each shelf takes a minute or two to catalogue and review. Keep this page open.
            </p>
          </div>
        </>
      )}

      {log.length > 0 && (
        <ul className="mt-8 space-y-1 text-sm text-muted-foreground">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
