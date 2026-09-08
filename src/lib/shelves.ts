/** Named shelves within a department. Only Sciences uses them so far. */
export type ShelfKey = "impossible" | "not_yet";

export const SCIENCE_SHELVES: { key: ShelfKey; label: string; note: string }[] = [
  {
    key: "impossible",
    label: "Impossible sciences",
    note: "Monographs, proceedings and tables on phenomena that cannot exist, with full apparatus.",
  },
  {
    key: "not_yet",
    label: "Sciences not yet made",
    note: "Works dated 2036–2071: fields, instruments and frameworks a serious futurologist would expect.",
  },
];

export function isShelfKey(value: string): value is ShelfKey {
  return value === "impossible" || value === "not_yet";
}

export function shelfLabel(key: string | null): string | null {
  return SCIENCE_SHELVES.find((s) => s.key === key)?.label ?? null;
}
