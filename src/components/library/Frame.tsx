import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";

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
  return (
    <div className={cn(env === "hall" ? "hall" : "paper", "min-h-screen bg-background text-foreground")}>
      <header className={cn("mx-auto flex items-baseline justify-between px-5 pt-5 pb-2", narrow ? "max-w-[560px]" : "max-w-5xl")}>
        <Link to="/" className="text-small-caps text-sm tracking-widest text-muted-foreground hover:text-foreground">
          Bibliotheca Vacua
        </Link>
        <nav className="flex gap-5 text-sm text-muted-foreground">
          <Link to="/taken" className="hover:text-foreground">
            Taken forever
          </Link>
          <Link to={session ? "/card" : "/auth"} className="hover:text-foreground">
            Reader's card
          </Link>
        </nav>
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
