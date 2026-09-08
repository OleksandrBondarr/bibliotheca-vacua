import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordSignal } from "@/lib/reader.functions";
import { useSession } from "@/hooks/useSession";

/** Invisible marker at the foot of a review: notes that the reader read it through. */
export function ReviewEnd({ bookId, department }: { bookId: string; department?: string | null }) {
  const session = useSession();
  const record = useServerFn(recordSignal);
  const el = useRef<HTMLDivElement | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    const node = el.current;
    if (!node || !session || sent.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || sent.current) return;
        sent.current = true;
        obs.disconnect();
        void record({ data: { kind: "review_end", bookId, department: department ?? null } }).catch(
          () => undefined,
        );
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [session, bookId, department, record]);

  return <div ref={el} aria-hidden className="h-px w-full" />;
}
