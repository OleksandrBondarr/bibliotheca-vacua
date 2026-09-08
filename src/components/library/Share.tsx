import { useState } from "react";

/** A quiet line of share links. Plain share URLs, no third-party scripts. */
export function ShareLine({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const t = encodeURIComponent(title);
  const u = encodeURIComponent(url);

  const links: { label: string; href: string }[] = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { label: "Bluesky", href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: "Threads", href: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-8">
      <p className="text-small-caps text-sm text-muted-foreground">Share this catalogue card</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-muted-foreground">
        <button type="button" onClick={copy} className="underline-offset-2 hover:text-foreground hover:underline">
          {copied ? "link copied" : "copy link"}
        </button>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
