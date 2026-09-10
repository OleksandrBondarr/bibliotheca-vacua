import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { DEPARTMENTS } from "@/lib/departments";
import { getReaderCard } from "@/lib/loans.functions";
import { supabase } from "@/integrations/supabase/client";

/** True between 23:00 and 05:00 by the visitor's own clock. Client-side only. */
export function useNightShift() {
  const [night, setNight] = useState(false);
  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setNight(h >= 23 || h < 5);
    };
    check();
    const id = setInterval(check, 5 * 60_000);
    return () => clearInterval(id);
  }, []);
  return night;
}

/**
 * Page frame: a quiet header with the library's name, the reader's card and the
 * menu, in either the hall (dark) or paper environment.
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
  const night = useNightShift();

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

  const item =
    "block py-3 text-[17px] text-hall-foreground/75 hover:text-hall-foreground sm:py-2 sm:text-base";
  const readerName = card?.profile?.display_name?.trim() || null;

  return (
    <div
      className={cn(
        env === "hall" ? "hall hall-light" : "paper",
        env === "hall" && night && "hall-night",
        "min-h-screen overflow-x-hidden bg-background text-foreground",
      )}
    >
      <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
        <defs>
          <filter id="cloth-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.7 0.14" numOctaves="2" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.7" />
          </filter>
          <filter id="leather-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.12 0.32" numOctaves="3" seed="23" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.15" />
          </filter>
          <filter id="wood-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.24" numOctaves="2" seed="7" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" />
          </filter>
        </defs>
      </svg>
      <header className={cn("relative z-50 mx-auto px-5 pt-5 pb-2", narrow ? "max-w-[560px]" : "max-w-5xl")}>
        <div className="flex items-baseline justify-between gap-4">
          <Link to="/" className="text-small-caps min-w-0 truncate text-sm tracking-widest text-muted-foreground hover:text-foreground">
            <span className="sm:hidden">BV</span>
            <span className="hidden sm:inline">Bibliotheca Vacua</span>
            {env === "hall" && night && <span className="ml-2 italic tracking-normal">· Night shift</span>}
          </Link>
          <div className="flex shrink-0 items-baseline gap-4">
            <Link
              to={session ? "/card" : "/auth"}
              className="text-small-caps hidden max-w-[9rem] truncate text-sm tracking-widest text-muted-foreground hover:text-foreground sm:block"
            >
              {readerName ?? "Reader's card"}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="text-small-caps shrink-0 py-1 text-sm tracking-widest text-muted-foreground hover:text-foreground"
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {open ? (
          <>
            <div
              aria-hidden
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-[oklch(0_0_0/45%)] sm:bg-transparent"
            />
            <nav
              className={cn(
                "menu-panel fixed inset-0 z-[60] overflow-y-auto border border-[oklch(0.34_0.02_120)] px-5 pb-10 pt-5 text-hall-foreground shadow-[0_10px_30px_oklch(0_0_0/60%)]",
                "sm:absolute sm:inset-auto sm:right-5 sm:top-full sm:w-[320px] sm:max-w-[320px] sm:rounded-sm sm:px-5 sm:py-4",
              )}
            >
              <div className="mb-4 flex items-baseline justify-between sm:hidden">
                <span className="text-small-caps text-sm tracking-widest text-hall-foreground/70">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-small-caps py-1 text-sm tracking-widest text-hall-foreground/70"
                >
                  Close
                </button>
              </div>
              <div>
                {session && readerName && (
                  <p className="mb-4 border-b border-[oklch(0.34_0.02_120)] pb-4 text-[17px] text-hall-foreground">
                    {readerName}
                  </p>
                )}
                <p className="text-small-caps text-[15px] tracking-widest text-hall-foreground/60 sm:text-xs">Departments</p>
                {DEPARTMENTS.map((d) => (
                  <Link key={d.slug} to="/department/$slug" params={{ slug: d.slug }} className={item} onClick={() => setOpen(false)}>
                    {d.label}
                  </Link>
                ))}
              </div>
              <div className="mt-5 border-t border-[oklch(0.34_0.02_120)] pt-4 sm:mt-4 sm:pt-3">
                <p className="text-small-caps text-[15px] tracking-widest text-hall-foreground/60 sm:text-xs">The library</p>
                <Link to="/" className={item} onClick={() => setOpen(false)}>
                  Hall
                </Link>
                <Link to="/" hash="lem" className={item} onClick={() => setOpen(false)}>
                  The Lem shelf
                </Link>
                <Link to="/about" className={item} onClick={() => setOpen(false)}>
                  About the library
                </Link>
                <Link to="/chronicle" className={item} onClick={() => setOpen(false)}>
                  The Chronicle
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
                    className={cn(item, "w-full text-left")}
                    onClick={async () => {
                      setOpen(false);
                      await supabase.auth.signOut();
                    }}
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </nav>
          </>
        ) : null}
      </header>
      <main className={cn("mx-auto px-5 pb-10", narrow ? "max-w-[560px]" : "max-w-5xl", className)}>{children}</main>
      <footer className={cn("mx-auto px-5 pb-12 pt-4", narrow ? "max-w-[560px]" : "max-w-5xl")}>
        <div className="rule-thin mb-3 opacity-60" />
        <p className="text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">
            About the library
          </Link>
          {" · "}
          <Link to="/chronicle" className="hover:text-foreground">
            The Chronicle
          </Link>
          {" · "}
          <Link to="/taken" className="hover:text-foreground">
            Taken forever
          </Link>
          {" · "}
          <Link to={session ? "/card" : "/auth"} className="hover:text-foreground">
            Reader's card
          </Link>
        </p>
        <p className="mt-2 text-sm italic text-muted-foreground">The reading room is open at all hours.</p>
      </footer>
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
