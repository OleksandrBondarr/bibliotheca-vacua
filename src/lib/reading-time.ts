/**
 * The library never frightens a reader with a page total. It offers a measure
 * of time instead, derived from the length of the book.
 */
export function readingHint(pages: number): string {
  if (pages <= 90) return "an evening";
  if (pages <= 180) return "an evening or two";
  if (pages <= 300) return "several evenings";
  if (pages <= 420) return "a week of evenings";
  return "a long stretch of evenings";
}
