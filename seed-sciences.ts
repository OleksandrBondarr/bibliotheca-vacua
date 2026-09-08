/** One-off: generate the Sciences shelf. Run with bun, then delete. */
import { createClient } from "@supabase/supabase-js";
import { generateCatalogue, generateReview } from "./src/lib/anthropic.server";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const department = "sciences" as const;

const { data: existing } = await supabase.from("books").select("title").eq("department", department);
const entries = await generateCatalogue(department, (existing ?? []).map((b: { title: string }) => b.title), 14);
console.log("catalogue:", entries.length);

const names = [...new Set(entries.map((e) => e.publisher_name))];
const { data: known } = await supabase.from("publishers").select("id, name").in("name", names);
const ids = new Map((known ?? []).map((p: { name: string; id: string }) => [p.name, p.id]));
const missing = [...new Map(entries.filter((e) => !ids.has(e.publisher_name)).map((e) => [e.publisher_name, e])).values()];
if (missing.length) {
  const { data: created, error } = await supabase
    .from("publishers")
    .insert(missing.map((e) => ({ name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note })))
    .select("id, name");
  if (error) throw error;
  for (const p of created ?? []) ids.set(p.name, p.id);
}

const reviews = await Promise.all(
  entries.map((e) =>
    generateReview({
      title: e.title,
      author: e.author,
      kind: e.kind,
      year: e.year,
      pages: e.pages,
      department,
      publisher: { name: e.publisher_name, city: e.publisher_city, style_note: e.publisher_note },
    }).catch((err) => {
      console.error("review failed", e.title, err.message);
      return null;
    }),
  ),
);

const { error } = await supabase.from("books").insert(
  entries.map((e, i) => ({
    title: e.title,
    author: e.author,
    kind: e.kind,
    publisher_id: ids.get(e.publisher_name) ?? null,
    year: e.year,
    pages: e.pages,
    department,
    spine_color: e.spine_color,
    review: reviews[i] ?? null,
  })),
);
if (error) throw error;
console.log("inserted", entries.length, "with reviews:", reviews.filter(Boolean).length);
