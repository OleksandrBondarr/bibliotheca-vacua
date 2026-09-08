import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { hallQuery } from "@/lib/catalogue.functions";
import { DEPARTMENTS } from "@/lib/departments";
import { Frame } from "@/components/library/Frame";
import { Shelf } from "@/components/library/Shelf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bibliotheca Vacua — a library of books that do not exist" },
      { name: "description", content: "Shelves of invented books. Each is written the moment a reader takes it out, for that reader alone, and vanishes when the loan ends." },
      { property: "og:title", content: "Bibliotheca Vacua" },
      { property: "og:description", content: "A library of books that do not exist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(hallQuery),
  component: Hall,
  errorComponent: () => (
    <Frame env="hall">
      <p className="mt-20 text-center italic text-muted-foreground">The hall is dark for a moment. Try again shortly.</p>
    </Frame>
  ),
});

function Hall() {
  const { data } = useSuspenseQuery(hallQuery);

  return (
    <Frame env="hall">
      <section className="pt-16 pb-12 text-center">
        <h1 className="mx-auto max-w-xl text-4xl leading-tight [text-wrap:balance] sm:text-5xl">
          A library of books that do not exist
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
          Every book here is written the moment a reader takes it out, for that reader alone, and vanishes when the loan ends.
        </p>
        <p className="mt-8 text-small-caps text-sm text-muted-foreground">
          On the shelves: {data.total} books. Taken forever: {data.takenForever}.
        </p>
      </section>

      <section aria-labelledby="lem" className="mb-14">
        <div className="mb-3 px-1">
          <h2 id="lem" className="text-xl">
            In the neighbourhood of Lem
          </h2>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Opened 12 September 2026, for the 105th birthday of the writer who first described this library.
          </p>
        </div>
        <Shelf books={data.featured} empty="The shelf is being assembled." />
      </section>

      <section aria-labelledby="departments" className="mb-14">
        <h2 id="departments" className="mb-3 px-1 text-small-caps text-sm text-muted-foreground">
          Card catalogue
        </h2>
        <div className="grid grid-cols-2 gap-[3px] sm:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.slug}
              to="/department/$slug"
              params={{ slug: d.slug }}
              className="drawer group relative flex min-h-[92px] flex-col justify-between p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="inline-block w-fit border border-brass/60 bg-paper px-2 py-0.5 text-[13px] text-ink">
                {d.label}
              </span>
              <span className="flex items-end justify-between">
                <span className="text-xs italic text-hall-foreground/70">{d.note}</span>
                <span aria-hidden className="h-2 w-6 rounded-full bg-brass/80 shadow-[0_1px_0_oklch(0_0_0/50%)]" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="arrivals">
        <h2 id="arrivals" className="mb-3 px-1 text-small-caps text-sm text-muted-foreground">
          New arrivals
        </h2>
        <Shelf books={data.arrivals} empty="Nothing has arrived yet." />
      </section>
    </Frame>
  );
}
