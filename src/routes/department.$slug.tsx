import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { departmentQuery } from "@/lib/catalogue.functions";
import { DEPARTMENTS, isDepartment } from "@/lib/departments";
import { Frame } from "@/components/library/Frame";
import { ShelvesByPublisher } from "@/components/library/Shelf";

export const Route = createFileRoute("/department/$slug")({
  loader: ({ context, params }) => {
    if (!isDepartment(params.slug)) throw notFound();
    return context.queryClient.ensureQueryData(departmentQuery(params.slug));
  },
  head: ({ params }) => {
    const d = DEPARTMENTS.find((x) => x.slug === params.slug);
    const label = d?.label ?? "Department";
    return {
      meta: [
        { title: `${label} — Bibliotheca Vacua` },
        { name: "description", content: `${label}: ${d?.note ?? ""}. Shelves of the Bibliotheca Vacua.` },
        { property: "og:title", content: `${label} — Bibliotheca Vacua` },
        { property: "og:description", content: d?.note ?? "A department of the library." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: DepartmentPage,
  notFoundComponent: () => (
    <Frame env="hall">
      <p className="mt-20 text-center italic text-muted-foreground">There is no such drawer in the catalogue.</p>
    </Frame>
  ),
  errorComponent: () => (
    <Frame env="hall">
      <p className="mt-20 text-center italic text-muted-foreground">The shelves could not be reached. Try again shortly.</p>
    </Frame>
  ),
});

function DepartmentPage() {
  const { slug } = Route.useParams();
  const { data: books } = useSuspenseQuery(departmentQuery(slug));
  const dept = DEPARTMENTS.find((d) => d.slug === slug);

  return (
    <Frame env="hall">
      <section className="pt-10 pb-8">
        <h1 className="text-3xl">{dept?.label}</h1>
        <p className="mt-1 text-sm italic text-muted-foreground">
          {dept?.note}
          {dept && !dept.lent && ". Books in this department are held but not lent."}
          {" "}— {books.length} {books.length === 1 ? "volume" : "volumes"}.
        </p>
      </section>
      <ShelvesByPublisher books={books} />
    </Frame>
  );
}
