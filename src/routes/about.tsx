import { createFileRoute } from "@tanstack/react-router";
import { getRequestOrigin } from "@/lib/origin.functions";
import { ogImage } from "@/lib/og-meta";
import { Frame, Rule } from "@/components/library/Frame";

export const Route = createFileRoute("/about")({
  loader: async () => ({ origin: await getRequestOrigin() }),
  head: ({ loaderData }) => ({
    meta: [
      { title: "About the library — Bibliotheca Vacua" },
      {
        name: "description",
        content:
          "What Bibliotheca Vacua is: a catalogue of books that do not exist, written one page at a time for a single reader and gone when the loan ends.",
      },
      { property: "og:title", content: "About the library — Bibliotheca Vacua" },
      {
        property: "og:description",
        content: "A library where nothing exists until someone reads it, and what has been read cannot be read again.",
      },
      { property: "og:type", content: "article" },
      ...ogImage(loaderData?.origin, "about", "/about"),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-small-caps text-lg tracking-widest">{title}</h2>
      <div className="mt-2 space-y-4 text-[17px] leading-[1.65] [text-wrap:pretty]">{children}</div>
    </section>
  );
}

function AboutPage() {
  return (
    <Frame env="paper" narrow>
      <h1 className="text-small-caps pt-10 text-3xl tracking-wide">About the library</h1>
      <Rule />
      <div className="space-y-4 text-[17px] leading-[1.65] [text-wrap:pretty]">
        <p className="drop-cap">
          Bibliotheca Vacua is a library of books that do not exist. What you see on the shelves is real: a catalogue,
          the imprints, and for every book a review written by a critic who takes it seriously. The book itself is not
          there. It is written the moment a reader takes it out, one page at a time, for that reader alone, and when the
          loan ends it is gone. No two readers ever hold the same book.
        </p>
      </div>

      <Section title="How it works">
        <p>
          Browsing the hall, the shelves and the reviews is open to everyone. Taking a book out needs a reader's card. A
          loan lasts fourteen days; a reader may hold three books at a time. Nothing can be copied, printed or
          downloaded from the reading room. A book that a reader chooses to keep is printed once, as the only copy, with
          the reader's name on the title page, and the text is then deleted here; its spine stays on the shelf, marked
          as taken forever.
        </p>
      </Section>

      <Section title="Why">
        <p>
          Fifty-five years ago a Polish writer published a collection of reviews of books that had never been written,
          and observed that a book described is often better than a book read. Some years later an Argentinian librarian
          imagined a library that contained every possible book, and found it a nightmare: where everything exists,
          nothing can be found. This library is a reply to both. Here nothing exists until someone reads it, and what
          has been read cannot be read again. A text that can be copied without end is worth less than the paper it is
          printed on; a text that will exist once, for one person, is not. We think a book is not a text. A book is what
          happens between a text and one reader.
        </p>
      </Section>

      <Section title="The register">
        <p>
          The only thing this library accumulates is a record of attention: who took what, and when. Ordinary libraries
          keep the books and forget the readers. This one does the opposite.
        </p>
      </Section>

      <Section title="Colophon">
        <p>
          Bibliotheca Vacua opened on 12 September 2026. It is made by one person in Ukraine and written by machines
          under the supervision of a critic who does not exist either. Correspondence:{" "}
          <a href="mailto:librarian@bibliothecavacua.com" className="underline underline-offset-4">
            librarian@bibliothecavacua.com
          </a>
          .
        </p>
      </Section>
    </Frame>
  );
}
