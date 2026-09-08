import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/** Open Graph preview image for a catalogue card. Public: social crawlers fetch it. */
export const Route = createFileRoute("/api/public/og/book/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id.replace(/\.png$/, "");
        if (!z.string().uuid().safeParse(id).success) {
          return new Response("Not found", { status: 404 });
        }
        try {
          const { createPublicClient } = await import("@/lib/public-client.server");
          const db = createPublicClient();
          const { data: book } = await db
            .from("books")
            .select("title, author, kind, year, pages, spine_color, review, publisher:publishers(name, city)")
            .eq("id", id)
            .maybeSingle();
          if (!book) return new Response("Not found", { status: 404 });

          const { renderBookOg } = await import("@/lib/og.server");
          const png = await renderBookOg(book as Parameters<typeof renderBookOg>[0]);
          return new Response(new Uint8Array(png), {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          });
        } catch (e) {
          console.error("og book image failed", e);
          return new Response("Image unavailable", { status: 500 });
        }
      },
    },
  },
});
