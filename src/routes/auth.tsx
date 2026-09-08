import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Frame, Rule, buttonPrimary } from "@/components/library/Frame";

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

  useEffect(() => {
    if (session) navigate({ to: safePath(redirect), replace: true });
  }, [session, redirect, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const target = safePath(redirect);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
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
