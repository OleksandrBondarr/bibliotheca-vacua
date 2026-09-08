import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { hallQuery } from "@/lib/catalogue.functions";
import { DEPARTMENTS } from "@/lib/departments";
import { Frame } from "@/components/library/Frame";
import { DepartmentShelf, Shelf } from "@/components/library/Shelf";
import { departmentLabel } from "@/lib/departments";


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
      <div className="hall-light">
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
        <Shelf books={data.featured} empty="The shelf is being assembled." vitrine />
      </section>

      <section aria-labelledby="departments" className="mb-14">
        <h2 id="departments" className="mb-3 px-1 text-small-caps text-sm text-muted-foreground">
          Card catalogue
        </h2>
        <div className="grid grid-cols-2 gap-[4px] sm:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.slug}
              to="/department/$slug"
              params={{ slug: d.slug }}
              className="drawer group relative flex aspect-[2/3] flex-col items-center justify-between rounded-sm p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-full border border-brass/70 bg-brass/10 p-[3px] shadow-[inset_0_1px_0_oklch(1_0_0/12%)]">
                <span className="block bg-paper px-2 py-1.5 text-center text-ink">
                  <span className="text-small-caps block text-[15px] leading-tight">{d.label}</span>
                  <span className="mt-1 block text-[15px] italic leading-tight text-ink-soft">{d.note}</span>
                </span>
              </span>
              <span
                aria-hidden
                className="mb-1 h-2.5 w-10 rounded-full bg-brass/85 shadow-[0_1px_0_oklch(0_0_0/55%),inset_0_1px_0_oklch(1_0_0/35%)]"
              />
            </Link>
          ))}
        </div>
      </section>


      <section aria-labelledby="arrivals" className="mb-14">
        <h2 id="arrivals" className="mb-3 px-1 text-small-caps text-sm text-muted-foreground">
          New arrivals
        </h2>
        <Shelf books={data.arrivals} empty="Nothing has arrived yet." />
      </section>

      <section aria-labelledby="shelves" className="space-y-10">
        <h2 id="shelves" className="px-1 text-small-caps text-sm text-muted-foreground">
          The shelves
        </h2>
        {data.departments.map((d) => (
          <DepartmentShelf key={d.slug} slug={d.slug} label={departmentLabel(d.slug)} books={d.books} />
        ))}
      </section>

    </Frame>
  );
}
