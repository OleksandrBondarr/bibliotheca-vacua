import { createFileRoute } from "@tanstack/react-router";

const PAGES: Record<string, { headline: string; line: string }> = {
  hall: {
    headline: "Bibliotheca Vacua",
    line: "Shelves of books that do not exist. Each is written the moment a reader takes it out, for that reader alone, and vanishes when the loan ends.",
  },
  taken: {
    headline: "Taken forever",
    line: "The register of books kept for good: the reader who kept each, and the date it left the library.",
  },
  about: {
    headline: "About the library",
    line: "A library where nothing exists until someone reads it, and what has been read cannot be read again.",
  },
};

/** Open Graph preview images for the hall, the register and the about page. */
export const Route = createFileRoute("/api/public/og/page/$key")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const page = PAGES[params.key.replace(/\.png$/, "")];
        if (!page) return new Response("Not found", { status: 404 });
        try {
          const { renderPageOg } = await import("@/lib/og.server");
          const png = await renderPageOg(page.headline, page.line);
          return new Response(new Uint8Array(png), {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=86400, s-maxage=604800",
            },
          });
        } catch (e) {
          console.error("og page image failed", e);
          return new Response("Image unavailable", { status: 500 });
        }
      },
    },
  },
});
