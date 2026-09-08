/** Deterministic binding style per publishing house, so a house's books look like a series. */
export function houseHash(publisherName: string | null | undefined) {
  const key = publisherName ?? "without an imprint";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 100000;
  return h;
}

export function bindingStyle(publisherName: string | null | undefined) {
  return houseHash(publisherName) % 6;
}
