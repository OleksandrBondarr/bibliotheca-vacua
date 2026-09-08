/**
 * Server-rendered Open Graph preview images (1200x630 PNG).
 * satori lays the card out as SVG; resvg (wasm) rasterises it.
 */
import satori from "satori";
import { bindingStyle } from "./binding";
import { OG_FONT_ITALIC_BASE64, OG_FONT_REGULAR_BASE64, decodeFont } from "./og-font";

const PAPER = "#ece6d8";
const PAPER_DARK = "#ded5c1";
const INK = "#1e1c19";
const INK_SOFT = "#5f5b52";
const RULE = "#bfae8b";
const BRASS = "#c9a961";

const RESVG_WASM_URL = "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

type El = { type: string; props: Record<string, unknown> };

function el(type: string, style: Record<string, unknown>, children?: unknown): El {
  return { type, props: { style, children } };
}

let resvgReady: Promise<typeof import("@resvg/resvg-wasm")> | null = null;

async function getResvg() {
  if (!resvgReady) {
    resvgReady = (async () => {
      const mod = await import("@resvg/resvg-wasm");
      const res = await fetch(RESVG_WASM_URL);
      if (!res.ok) throw new Error(`Could not load the rasteriser (${res.status})`);
      await mod.initWasm(await res.arrayBuffer());
      return mod;
    })().catch((e) => {
      resvgReady = null;
      throw e;
    });
  }
  return resvgReady;
}

function fonts() {
  return [
    { name: "Garamond", data: decodeFont(OG_FONT_REGULAR_BASE64), weight: 400 as const, style: "normal" as const },
    { name: "Garamond", data: decodeFont(OG_FONT_ITALIC_BASE64), weight: 400 as const, style: "italic" as const },
  ];
}

export function firstSentences(text: string | null | undefined, count = 1) {
  if (!text) return "";
  const clean = text.trim().replace(/\*/g, "");
  const found = clean.match(/[^.!?]+[.!?]+["»']?/g);
  let out = (found ? found.slice(0, count).join(" ") : clean).trim();
  const limit = count > 1 ? 240 : 180;
  if (out.length > limit) out = `${out.slice(0, limit - 1).trimEnd()}…`;
  return out;
}

/** The bindings, simplified for print: rules, a paper label, a band, a cap, a grain. */
function spine(color: string, style: number, shelfNumber: number) {
  const h = 420;
  const decor: El[] = [];
  const line = (top: number, colour: string) =>
    el("div", { position: "absolute", left: 8, right: 8, top, height: 2, background: colour });

  if (style === 0) {
    decor.push(line(26, BRASS), line(34, BRASS), line(h - 36, BRASS), line(h - 28, BRASS));
  } else if (style === 1) {
    decor.push(
      el(
        "div",
        {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 26,
          display: "flex",
          justifyContent: "center",
          background: PAPER,
          border: `1px solid ${INK_SOFT}`,
          color: INK,
          fontSize: 20,
          padding: "2px 0",
        },
        String(shelfNumber),
      ),
    );
  } else if (style === 2) {
    decor.push(
      el("div", { position: "absolute", left: 0, right: 0, top: Math.round(h * 0.16), height: Math.round(h * 0.3), background: "rgba(0,0,0,0.32)" }),
    );
  } else if (style === 3) {
    decor.push(
      line(24, "rgba(255,255,255,0.22)"),
      line(32, "rgba(255,255,255,0.22)"),
      el("div", {
        position: "absolute",
        left: 34,
        bottom: 34,
        width: 20,
        height: 20,
        border: `2px solid ${BRASS}`,
        transform: "rotate(45deg)",
      }),
    );
  } else if (style === 4) {
    decor.push(
      el("div", { position: "absolute", left: 0, right: 0, top: 0, height: 22, background: "rgba(255,255,255,0.18)" }),
      el("div", { position: "absolute", left: 0, right: 0, bottom: 0, height: 22, background: "rgba(255,255,255,0.18)" }),
    );
  } else {
    decor.push(
      el("div", {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.06), rgba(0,0,0,0.08))",
      }),
    );
  }

  return el(
    "div",
    {
      position: "relative",
      display: "flex",
      width: 92,
      height: h,
      background: color,
      borderRadius: 3,
      boxShadow: "6px 8px 18px rgba(0,0,0,0.28)",
    },
    [
      el("div", { position: "absolute", left: 0, top: 0, bottom: 0, width: 7, background: "rgba(255,255,255,0.22)" }),
      el("div", { position: "absolute", right: 0, top: 0, bottom: 0, width: 5, background: "rgba(0,0,0,0.35)" }),
      ...decor,
    ],
  );
}

function frame(children: unknown) {
  return el(
    "div",
    {
      width: 1200,
      height: 630,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      background: PAPER,
      backgroundImage: `linear-gradient(160deg, ${PAPER} 0%, ${PAPER_DARK} 100%)`,
      color: INK,
      fontFamily: "Garamond",
      padding: "56px 64px 40px 64px",
    },
    [
      children,
      el(
        "div",
        { display: "flex", marginTop: 24, fontSize: 24, color: INK_SOFT },
        "Bibliotheca Vacua — a library of books that do not exist",
      ),
    ],
  );
}

async function toPng(node: El) {
  const svg = await satori(node as never, { width: 1200, height: 630, fonts: fonts() });
  const { Resvg } = await getResvg();
  return new Resvg(svg).render().asPng();
}

export type OgBook = {
  title: string;
  author: string;
  kind: string;
  year: number;
  pages: number;
  spine_color: string;
  review: string | null;
  publisher: { name: string; city: string } | null;
};

export async function renderBookOg(book: OgBook) {
  const imprint = [
    book.kind,
    book.publisher ? `${book.publisher.name}, ${book.publisher.city}` : null,
    String(book.year),
    `${book.pages} pages`,
  ]
    .filter(Boolean)
    .join(" · ");

  const style = bindingStyle(book.publisher?.name ?? null);
  const shelf = 200 + ((book.pages * 31) % 8800);
  const title = book.title.length > 84 ? `${book.title.slice(0, 82)}…` : book.title;

  return toPng(
    frame(
      el("div", { display: "flex", flexDirection: "row", alignItems: "flex-start" }, [
        spine(book.spine_color || "#5b4a3a", style, shelf),
        el("div", { display: "flex", flexDirection: "column", marginLeft: 48, width: 900 }, [
          el("div", { display: "flex", fontSize: title.length > 46 ? 50 : 60, lineHeight: 1.1 }, title),
          el("div", { display: "flex", marginTop: 16, fontSize: 34, color: INK }, book.author),
          el("div", { display: "flex", marginTop: 12, fontSize: 24, color: INK_SOFT }, imprint),
          el("div", { display: "flex", marginTop: 24, marginBottom: 24, height: 1, background: RULE, width: 860 }),
          el(
            "div",
            { display: "flex", fontSize: 28, lineHeight: 1.4, color: INK },
            firstSentences(book.review, 1) || "The review has not yet been written.",
          ),
        ]),
      ]),
    ),
  );
}

export async function renderPageOg(headline: string, line: string) {
  return toPng(
    frame(
      el("div", { display: "flex", flexDirection: "column", justifyContent: "center", height: 460 }, [
        el("div", { display: "flex", fontSize: 74, lineHeight: 1.1 }, headline),
        el("div", { display: "flex", marginTop: 28, marginBottom: 28, height: 1, background: RULE, width: 900 }),
        el("div", { display: "flex", fontSize: 30, lineHeight: 1.4, color: INK_SOFT, width: 960 }, line),
      ]),
    ),
  );
}
