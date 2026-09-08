import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordSignal, type SignalKind } from "@/lib/reader.functions";
import { useSession } from "@/hooks/useSession";

/** Quietly records one trace for a signed-in reader; anonymous visitors record nothing. */
export function useTrackSignal(
  kind: SignalKind,
  extra: { department?: string | null; bookId?: string | null } = {},
) {
  const session = useSession();
  const record = useServerFn(recordSignal);
  const sent = useRef<string | null>(null);
  const key = `${kind}:${extra.department ?? ""}:${extra.bookId ?? ""}`;

  useEffect(() => {
    if (!session || sent.current === key) return;
    sent.current = key;
    void record({
      data: {
        kind,
        department: extra.department ?? null,
        bookId: extra.bookId ?? null,
      },
    }).catch(() => undefined);
  }, [session, key, kind, extra.department, extra.bookId, record]);
}
