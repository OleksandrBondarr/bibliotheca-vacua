import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getReaderCard } from "@/lib/loans.functions";
import { Frame, Rule, buttonLink } from "@/components/library/Frame";
import { HeldShelf } from "@/components/library/HeldShelf";

export const Route = createFileRoute("/_authenticated/card")({
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

function CardPage() {
  const fetchCard = useServerFn(getReaderCard);
  const { data, isPending, error } = useQuery({ queryKey: ["reader-card"], queryFn: () => fetchCard() });
  const qc = useQueryClient();
  const navigate = useNavigate();

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
            <p className="mt-3 text-2xl">{data.profile?.display_name ?? "Reader"}</p>
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
