import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { DEPARTMENTS } from "@/lib/departments";
import { getReaderCard } from "@/lib/loans.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Page frame: a quiet header with the library's name and two links,
 * in either the hall (dark) or paper environment.
 */
export function Frame({
  env,
  children,
  className,
  narrow,
}: {
  env: "hall" | "paper";
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  const session = useSession();
  const [open, setOpen] = useState(false);

  const { data: card } = useQuery({
    queryKey: ["reader-card", session?.user.id ?? null],
    queryFn: () => getReaderCard(),
    enabled: Boolean(session),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const item = "block py-2 text-base text-muted-foreground hover:text-foreground";

  return (
    <div className={cn(env === "hall" ? "hall" : "paper", "min-h-screen bg-background text-foreground")}>
      <header className={cn("mx-auto px-5 pt-5 pb-2", narrow ? "max-w-[560px]" : "max-w-5xl")}>
        <div className="flex items-baseline justify-between">
          <Link to="/" className="text-small-caps text-sm tracking-widest text-muted-foreground hover:text-foreground">
            Bibliotheca Vacua
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-small-caps text-sm tracking-widest text-muted-foreground hover:text-foreground"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {open ? (
          <nav className="rule-thin mt-3 border-t pt-3">
            <div className="grid gap-x-8 sm:grid-cols-2">
              <div>
                <p className="text-small-caps text-xs tracking-widest text-muted-foreground/70">Departments</p>
                {DEPARTMENTS.map((d) => (
                  <Link key={d.slug} to="/department/$slug" params={{ slug: d.slug }} className={item} onClick={() => setOpen(false)}>
                    {d.label}
                  </Link>
                ))}
              </div>
              <div>
                <p className="text-small-caps text-xs tracking-widest text-muted-foreground/70">The library</p>
                <Link to="/" className={item} onClick={() => setOpen(false)}>
                  Hall
                </Link>
                <Link to="/taken" className={item} onClick={() => setOpen(false)}>
                  Taken forever
                </Link>
                <Link to={session ? "/card" : "/auth"} className={item} onClick={() => setOpen(false)}>
                  Reader's card
                </Link>
                {card?.isAdmin ? (
                  <Link to="/admin" className={item} onClick={() => setOpen(false)}>
                    Librarian's desk
                  </Link>
                ) : null}
                {session ? (
                  <button
                    type="button"
                    className={cn(item, "text-left")}
                    onClick={async () => {
                      setOpen(false);
                      await supabase.auth.signOut();
                    }}
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </div>
          </nav>
        ) : null}
      </header>
      <main className={cn("mx-auto px-5 pb-20", narrow ? "max-w-[560px]" : "max-w-5xl", className)}>{children}</main>
    </div>
  );
}

export function Rule({ className }: { className?: string }) {
  return <div className={cn("rule-thin my-6", className)} />;
}

/** Splits review/page text into paragraphs; first gets a drop cap. */
export function Prose({ text, dropCap = true, className }: { text: string; dropCap?: boolean; className?: string }) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={cn("space-y-4 text-[17px] leading-[1.65] [text-wrap:pretty]", className)}>
      {paras.map((p, i) => (
        <p key={i} className={cn(i === 0 && dropCap && "drop-cap")}>
          {p}
        </p>
      ))}
    </div>
  );
}

export const buttonPrimary =
  "inline-flex w-full items-center justify-center border border-primary bg-primary px-5 py-3 text-base text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50";
export const buttonQuiet =
  "inline-flex w-full items-center justify-center border border-border bg-transparent px-5 py-3 text-base text-foreground transition-colors hover:bg-accent disabled:opacity-50";
export const buttonLink = "text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50";
