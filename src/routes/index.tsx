import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { hallQuery } from "@/lib/catalogue.functions";
import { DEPARTMENTS } from "@/lib/departments";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogImage } from "@/lib/og-meta";
import { Frame } from "@/components/library/Frame";
import { HeldShelf } from "@/components/library/HeldShelf";
import { DepartmentShelf, Shelf } from "@/components/library/Shelf";
import { departmentLabel } from "@/lib/departments";
import type { VitrineTheme } from "@/components/library/Shelf";

const LEM_VITRINE_THEME: VitrineTheme = {
  labelLines: {
    heading: "12 IX 1921 – 27 III 2006 · Kraków",
    caption: "The writer who first described this library.",
  },
  plaque: {
    enabled: true,
    text: "Lem Season · 12 · IX · 1921",
  },
  glowTint: "warm",
};

function DrawerFace({ label, note }: { label?: string; note?: string }) {
  return (
    <>
      <span className="w-full border border-brass/70 bg-brass/10 p-[3px] shadow-[inset_0_1px_0_oklch(1_0_0/12%)]">
        <span className="block min-h-[55px] bg-paper px-2 py-1 text-center text-ink">
          {label && <span className="text-small-caps block text-[15px] leading-tight">{label}</span>}
          {note && <span className="mt-0.5 block text-[15px] italic leading-tight text-ink-soft">{note}</span>}
        </span>
      </span>
      <span
        aria-hidden
        className="mb-1 h-2 w-8 rounded-full bg-brass/85 shadow-[0_1px_0_oklch(0_0_0/55%),inset_0_1px_0_oklch(1_0_0/35%)]"
      />
    </>
  );
}

/** A brass reading lamp with a pull switch: after closing, only its pool of light remains. */
function ReadingLamp({ closed, onPull }: { closed: boolean; onPull: () => void }) {
  return (
    <button
      type="button"
      onClick={onPull}
      aria-pressed={closed}
      aria-label={closed ? "Open the library again" : "After closing: dim the library"}
      title={closed ? "Open the library again" : "After closing"}
      className="reading-lamp"
    >
      <span aria-hidden className="pool" />
      <span aria-hidden className="shade" />
      <span aria-hidden className="pull" />
      <span aria-hidden className="stem" />
      <span aria-hidden className="foot" />
    </button>
  );
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [, origin] = await Promise.all([
      context.queryClient.ensureQueryData(hallQuery),
      getRequestOrigin(),
    ]);
    return { origin };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Bibliotheca Vacua — a library of books that do not exist" },
      { name: "description", content: "Shelves of invented books. Each is written the moment a reader takes it out, for that reader alone, and vanishes when the loan ends." },
      { property: "og:title", content: "Bibliotheca Vacua" },
      { property: "og:description", content: "A library of books that do not exist." },
      { property: "og:type", content: "website" },
      ...ogImage(loaderData?.origin, "hall", "/"),
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Hall,
  errorComponent: () => (
    <Frame env="hall">
      <p className="mt-20 text-center italic text-muted-foreground">The hall is dark for a moment. Try again shortly.</p>
    </Frame>
  ),
});

function Hall() {
  const { data } = useSuspenseQuery(hallQuery);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    setClosed(window.localStorage.getItem("bv-after-closing") === "1");
  }, []);
  function pull() {
    setClosed((was) => {
      const next = !was;
      window.localStorage.setItem("bv-after-closing", next ? "1" : "0");
      return next;
    });
  }

  return (
    <Frame env="hall">
      <div className={closed ? "hall-closed" : undefined}>
      <section className="relative pt-16 pb-12 text-center">
        <div aria-hidden className="dust">
          <span />
          <span />
        </div>
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

      <section id="lem" aria-labelledby="lem" className="mb-14 scroll-mt-20">
        <div className="mb-3 px-1">
          <h2 id="lem" className="text-xl">
            In the neighbourhood of Lem
          </h2>
          <p className="mt-1 text-sm italic text-muted-foreground">
            Opened 12 September 2026, for the 105th birthday of the writer who first described this library.
          </p>
        </div>
        <Shelf
          books={data.featured}
          empty="The shelf is being assembled."
          vitrine
          vitrineTheme={LEM_VITRINE_THEME}
        />
      </section>

      <section aria-labelledby="departments" className="mb-14">
        <h2 id="departments" className="mb-3 px-1 text-small-caps text-sm text-muted-foreground">
          Card catalogue
        </h2>
        <div className="rounded-sm border border-wood-light/40 bg-wood-dark/40 p-1 shadow-[inset_0_1px_0_oklch(1_0_0/6%),0_4px_12px_oklch(0_0_0/35%)]">
          <div className="catalogue-grid grid gap-[3px]">
            {DEPARTMENTS.map((d) => (
              <Link
                key={d.slug}
                to="/department/$slug"
                params={{ slug: d.slug }}
                className="drawer drawer-interactive group relative flex h-[130px] min-w-0 flex-col items-center justify-between rounded-sm p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-[150px]"
              >
                <DrawerFace label={d.label} note={d.note} />
              </Link>
            ))}
            <div aria-hidden className="drawer flex h-[130px] min-w-0 flex-col items-center justify-between rounded-sm p-2 sm:h-[150px]">
              <DrawerFace />
            </div>
            <div aria-hidden className="drawer catalogue-blank-tablet h-[150px] min-w-0 flex-col items-center justify-between rounded-sm p-2">
              <DrawerFace />
            </div>
          </div>
        </div>
      </section>


      <HeldShelf className="mb-14 mt-0" />

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
      </div>
      <ReadingLamp closed={closed} onPull={pull} />
    </Frame>
  );
}
