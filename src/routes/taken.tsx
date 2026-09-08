import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { takenQuery } from "@/lib/catalogue.functions";
import { departmentLabel } from "@/lib/departments";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogImage } from "@/lib/og-meta";
import { Frame, Rule } from "@/components/library/Frame";

export const Route = createFileRoute("/taken")({
  loader: async ({ context }) => {
    const [, origin] = await Promise.all([
      context.queryClient.ensureQueryData(takenQuery),
      getRequestOrigin(),
    ]);
    return { origin };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Taken forever — Bibliotheca Vacua" },
      { name: "description", content: "The register of books that have left the library for good, with the reader who kept each and the date." },
      { property: "og:title", content: "Taken forever — Bibliotheca Vacua" },
      { property: "og:description", content: "The register of books kept for good." },
      { property: "og:type", content: "website" },
      ...ogImage(loaderData?.origin, "taken", "/taken"),
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TakenPage,
  errorComponent: () => (
    <Frame env="paper" narrow>
      <p className="mt-20 text-center italic text-muted-foreground">The register could not be opened. Try again shortly.</p>
    </Frame>
  ),
});

function TakenPage() {
  const { data: books } = useSuspenseQuery(takenQuery);
  return (
    <Frame env="paper" narrow>
      <h1 className="pt-10 text-3xl">Taken forever</h1>
      <p className="mt-2 text-sm italic text-muted-foreground">
        Books that have left the shelves for good, in the order they were kept.
      </p>
      <Rule />
      {books.length === 0 ? (
        <p className="text-[17px] leading-relaxed">
          No book has yet been taken forever. The first one will be numbered.
        </p>
      ) : (
        <ol className="space-y-6">
          {books.map((b, i) => (
            <li key={b.id} className="flex gap-4">
              <span className="w-8 shrink-0 pt-0.5 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
              <div>
                <Link to="/book/$id" params={{ id: b.id }} className="text-lg underline-offset-4 hover:underline">
                  {b.title}
                </Link>
                <div className="text-sm text-muted-foreground">
                  {b.author} · {departmentLabel(b.department)}
                </div>
                <div className="mt-1 text-sm">
                  Kept by {b.kept_by_name ?? "a reader"}
                  {b.kept_at && (
                    <>
                      {" "}on{" "}
                      {new Date(b.kept_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Frame>
  );
}
