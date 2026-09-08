import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAuthConfig, requestMagicLink } from "@/lib/auth.functions";
import { useSession } from "@/hooks/useSession";
import { Frame, Rule, buttonPrimary } from "@/components/library/Frame";

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; size?: string }) => string;
  getResponse: (id?: string) => string | undefined;
  reset: (id?: string) => void;
};

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Reader's card — Bibliotheca Vacua" },
      { name: "description", content: "Sign in with your email to receive a reader's card and take books out." },
      { property: "og:title", content: "Reader's card — Bibliotheca Vacua" },
      { property: "og:description", content: "A card is required to take books out. Browsing is free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function safePath(p: string | undefined) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/card";
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const session = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchConfig = useServerFn(getAuthConfig);
  const sendLink = useServerFn(requestMagicLink);
  const { data: config } = useQuery({ queryKey: ["auth-config"], queryFn: () => fetchConfig(), staleTime: Infinity });
  const siteKey = config?.siteKey ?? null;
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Cloudflare Turnstile, managed mode: usually invisible, a challenge only when suspicious.
  useEffect(() => {
    if (!siteKey || sent) return;
    let cancelled = false;
    function render() {
      const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (cancelled || !ts || !widgetRef.current || widgetId.current) return;
      widgetId.current = ts.render(widgetRef.current, { sitekey: siteKey, size: "flexible" });
    }
    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) render();
    else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (existing) existing.addEventListener("load", render);
      else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        script.dataset["turnstile"] = "true";
        script.addEventListener("load", render);
        document.head.appendChild(script);
      }
    }
    return () => { cancelled = true; };
  }, [siteKey, sent]);

  useEffect(() => {
    if (session) navigate({ to: safePath(redirect), replace: true });
  }, [session, redirect, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const target = safePath(redirect);
    const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    const token = siteKey ? ts?.getResponse(widgetId.current ?? undefined) ?? null : null;
    try {
      await sendLink({
        data: {
          email: email.trim(),
          token,
          redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`,
        },
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The letter could not be sent.");
      if (siteKey && ts) ts.reset(widgetId.current ?? undefined);
    }
    setBusy(false);
  }

  return (
    <Frame env="paper" narrow>
      <h1 className="pt-10 text-3xl">Reader's card</h1>
      <p className="mt-2 text-[17px] leading-relaxed text-muted-foreground">
        Browsing the shelves and reading the reviews is free. A card is required to take a book out.
      </p>
      <Rule />
      {sent ? (
        <div className="border border-border p-5">
          <p className="text-[17px] leading-relaxed">
            A letter has been sent to <span className="italic">{email}</span>. Open the link inside it and your card will be waiting.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-small-caps text-sm text-muted-foreground">Your email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border-b border-foreground bg-transparent py-2 text-lg outline-none placeholder:text-muted-foreground/60"
              placeholder="reader@example.org"
            />
          </label>
          <div ref={widgetRef} className="min-h-0" />
          <button type="submit" disabled={busy} className={buttonPrimary}>
            {busy ? "Sending…" : "Send me a sign-in link"}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            No password. We send a link; the link is your signature.
          </p>
        </form>
      )}
    </Frame>
  );
}
