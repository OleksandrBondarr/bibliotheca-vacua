import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getReaderCard, returnBook } from "@/lib/loans.functions";
import { setChronicleOptOut } from "@/lib/chronicle.functions";
import { Frame, Rule, buttonLink } from "@/components/library/Frame";
import { HeldShelf } from "@/components/library/HeldShelf";
import { setDisplayName, displayNameSchema } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/card")({
  validateSearch: (s) => z.object({ name: z.boolean().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Your reader's card — Bibliotheca Vacua" },
      { name: "description", content: "Your card, its stamp, and the books you have taken out." },
      { property: "og:title", content: "Reader's card — Bibliotheca Vacua" },
      { property: "og:description", content: "Your reader's card." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardPage,
});

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function NameField({ current, prompt }: { current: string | null; prompt: boolean }) {
  const save = useServerFn(setDisplayName);
  const qc = useQueryClient();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setValue(current ?? ""), [current]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = displayNameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "That name will not do.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await save({ data: { name: parsed.data } });
      await qc.invalidateQueries({ queryKey: ["reader-card"] });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The name could not be entered.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 border border-border p-5">
      <label className="block">
        <span className="text-small-caps text-sm text-muted-foreground">What should we call you?</span>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          maxLength={24}
          placeholder="Anna, or Anna K."
          className="mt-1 w-full border-b border-foreground bg-transparent py-2 text-lg outline-none placeholder:text-muted-foreground/60"
        />
      </label>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        A first name, or a name and an initial (2–24 characters). It is printed on your card, at the foot of every page written for you, and in the register of books kept forever.
      </p>
      {prompt && !current && (
        <p className="mt-2 text-[15px] italic text-destructive">A name is needed before the first book can be issued.</p>
      )}
      {error && <p className="mt-2 text-[15px] text-destructive">{error}</p>}
      {saved && <p className="mt-2 text-[15px] italic text-muted-foreground">Entered on your card.</p>}
      <button type="submit" disabled={busy} className="mt-4 w-full border border-foreground px-5 py-3 text-base hover:bg-accent disabled:opacity-50 sm:w-auto">
        {busy ? "Entering…" : current ? "Change the name" : "Enter the name"}
      </button>
    </form>
  );
}

/** Sends a book back to the shelf from the card. */
function ReturnButton({ loanId }: { loanId: string }) {
  const giveBack = useServerFn(returnBook);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => giveBack({ data: { loanId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reader-card"] }),
  });
  return (
    <button type="button" disabled={m.isPending} onClick={() => m.mutate()} className={buttonLink}>
      {m.isPending ? "returning…" : "return to the shelf"}
    </button>
  );
}

/** The reader may ask not to be named in the Chronicle. */
function ChronicleOptOut({ optedOut }: { optedOut: boolean }) {
  const save = useServerFn(setChronicleOptOut);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (value: boolean) => save({ data: { optOut: value } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reader-card"] }),
  });
  return (
    <label className="mt-8 flex items-start gap-3 border border-border p-5 text-[15px] leading-relaxed">
      <input
        type="checkbox"
        checked={optedOut}
        disabled={m.isPending}
        onChange={(e) => m.mutate(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0"
      />
      <span>
        Do not enter me in the Chronicle. Your entries will read simply “A reader”.
      </span>
    </label>
  );
}

function CardPage() {
  const fetchCard = useServerFn(getReaderCard);
  const { data, isPending, error } = useQuery({ queryKey: ["reader-card"], queryFn: () => fetchCard() });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { name: namePrompt } = Route.useSearch();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const validUntil = data?.profile ? new Date(new Date(data.profile.issued_at).getTime() + 365 * 86_400_000) : null;

  return (
    <Frame env="paper" narrow>
      <h1 className="pt-10 text-3xl">Reader's card</h1>
      <Rule />
      {isPending && <p className="italic text-muted-foreground">Fetching your card…</p>}
      {error && <p className="text-destructive">{error.message}</p>}
      {data && (
        <>
          <div className="relative border border-foreground/70 bg-paper-dark/40 p-6">
            <p className="text-small-caps text-xs text-muted-foreground">Bibliotheca Vacua · Reader</p>
            <p className="mt-3 text-2xl">{data.profile?.display_name || "Unnamed reader"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Card no.</dt>
              <dd className="tabular-nums">{data.profile?.card_number}</dd>
              <dt className="text-muted-foreground">Issued</dt>
              <dd>{data.profile && fmt(data.profile.issued_at)}</dd>
            </dl>
            {validUntil && (
              <div className="stamp absolute right-4 top-4 flex h-24 w-24 flex-col items-center justify-center text-center text-[10px] leading-tight uppercase tracking-wider">
                <span>valid until</span>
                <span className="mt-1 text-xs font-medium">{validUntil.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            )}
          </div>

          <NameField current={data.profile?.display_name ?? null} prompt={Boolean(namePrompt)} />

          <ChronicleOptOut optedOut={Boolean(data.profile?.chronicle_opt_out)} />

          <div className="mt-4 flex justify-between text-sm">
            {data.isAdmin ? (
              <Link to="/admin" className={buttonLink}>
                Librarian's desk
              </Link>
            ) : (
              <span />
            )}
            <button type="button" onClick={signOut} className={buttonLink}>
              Hand in the card
            </button>
          </div>

          <h2 className="mt-12 text-small-caps text-sm text-muted-foreground">Loans</h2>
          <Rule className="my-3" />
          {data.loans.filter((l) => l.status === "active").length >= 3 && (
            <p className="mb-3 text-[15px] italic leading-relaxed text-muted-foreground">
              You have three books on loan. Return one on your card to take another.
            </p>
          )}
          {data.loans.length === 0 ? (
            <p className="italic text-muted-foreground">Nothing has been taken out yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.loans.map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-4 py-3">
                  <div className="min-w-0">
                    {l.status === "active" ? (
                      <Link to="/read/$loanId" params={{ loanId: l.id }} className="underline-offset-4 hover:underline">
                        {l.book.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{l.book.title}</span>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {l.book.author} · {fmt(l.started_at)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    {l.status === "active" && (
                      <>
                        <div>on loan</div>
                        <div className="text-muted-foreground">
                          p. {l.current_page} · {daysLeft(l.ends_at)} d left
                        </div>
                        <div className="mt-1">
                          <ReturnButton loanId={l.id} />
                        </div>
                      </>
                    )}
                    {l.status === "returned" && <span className="text-muted-foreground">returned</span>}
                    {l.status === "kept" && <span>kept</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <HeldShelf />
    </Frame>
  );
}
