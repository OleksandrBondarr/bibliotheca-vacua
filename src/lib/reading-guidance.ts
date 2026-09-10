export type ReadingGuidance = {
  label: "Read from the first page" | "For consultation";
  note?: string;
};

const consultationKinds = /dictionary|gazetteer|concordance|register|proceedings|tables|index|manual|encyclop|atlas|catalogue/i;

export function readingGuidance(book: { department: string; kind: string; narrative?: boolean }): ReadingGuidance {
  const consultation =
    !book.narrative &&
    (book.department === "reference" || book.department === "treatises" || consultationKinds.test(book.kind));
  return consultation
    ? { label: "For consultation", note: "this book tells no story; open it anywhere" }
    : { label: "Read from the first page" };
}