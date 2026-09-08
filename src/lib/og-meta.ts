/** Absolute Open Graph image and url tags for a page, once the request origin is known. */
export function ogImage(origin: string | undefined, key: "hall" | "taken" | "about", path: string) {
  if (!origin) return [];
  return [
    { property: "og:url", content: `${origin}${path}` },
    { property: "og:image", content: `${origin}/api/public/og/page/${key}.png` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:image", content: `${origin}/api/public/og/page/${key}.png` },
  ];
}
