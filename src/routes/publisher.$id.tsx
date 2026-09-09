import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { publisherQuery } from "@/lib/catalogue.functions";
import { Frame } from "@/components/library/Frame";
import { Shelves } from "@/components/library/Shelf";

export const Route = createFileRoute("/publisher/$id")({
  loader: async ({ context, params }) => {
    if (!z.string().uuid().safeParse(params.id).success) throw notFound();
    const data = await context.queryClient.ensureQueryData(publisherQuery(params.id));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.publisher.name ?? "A publishing house";
    return {
      meta: [
        { title: `${name} — Bibliotheca Vacua` },
        {
          name: "description",
          content: `${name} of ${loaderData?.publisher.city ?? "an unnamed city"}: every book of this house held in the Bibliotheca Vacua.`,
        },
        { property: "og:title", content: `${name} — Bibliotheca Vacua` },
        { property: "og:description", content: loaderData?.publisher.style_note ?? "A publishing house of the library." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: PublisherPage,
  notFoundComponent: () => (
    <Frame env="hall">
      <p className="mt-20 text-center italic text-muted-foreground">No such house has printed for this library.</p>
    </Frame>
  ),
  errorComponent: () => (
    <Frame env="hall">
      <p className="mt-20 text-center italic text-muted-foreground">The imprint could not be read. Try again shortly.</p>
    </Frame>
  ),
});

function PublisherPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(publisherQuery(id));
  if (!data) return null;

  return (
    <Frame env="hall">
      <section className="pt-10 pb-8">
        <h1 className="text-3xl">{data.publisher.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.publisher.city}</p>
        {data.publisher.style_note && (
          <p className="mt-2 max-w-prose text-[17px] italic leading-relaxed text-muted-foreground">
            {data.publisher.style_note}
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {data.books.length} {data.books.length === 1 ? "volume" : "volumes"} on the shelves.
        </p>
      </section>
      <Shelves books={data.books} perRow={14} />
    </Frame>
  );
}
