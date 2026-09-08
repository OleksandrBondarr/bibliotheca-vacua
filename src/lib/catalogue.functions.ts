import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { DEPARTMENTS, isDepartment, type Department } from "./departments";

export type PublisherRef = { name: string; city: string; style_note: string | null } | null;

export type SpineBook = {
  id: string;
  title: string;
  author: string;
  pages: number;
  spine_color: string;
  status: "available" | "taken_forever";
  department: string;
  shelf: string | null;
  featured: boolean;
  kind: string;
  year: number;
  review: string | null;
  publisher: PublisherRef;
};

export type BookDetail = SpineBook & {
  kept_by_name: string | null;
  kept_at: string | null;
};

export type TakenBook = {
  id: string;
  title: string;
  author: string;
  department: string;
  kept_by_name: string | null;
  kept_at: string | null;
};

const SPINE_COLUMNS =
  "id, title, author, pages, spine_color, status, department, shelf, featured, kind, year, review, publisher:publishers(name, city, style_note)";


export const getHall = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./public-client.server");
  const db = createPublicClient();

  const deptSlugs = DEPARTMENTS.map((d) => d.slug);

  const [total, taken, arrivals, featured, ...deptResults] = await Promise.all([
    db.from("books").select("id", { count: "exact", head: true }),
    db.from("books").select("id", { count: "exact", head: true }).eq("status", "taken_forever"),
    db
      .from("books")
      .select(SPINE_COLUMNS)
      .eq("featured", false)
      .order("created_at", { ascending: false })
      .limit(18),
    db.from("books").select(SPINE_COLUMNS).eq("featured", true).order("created_at", { ascending: true }),
    ...deptSlugs.map((slug) =>
      db
        .from("books")
        .select(SPINE_COLUMNS)
        .eq("department", slug)
        .order("created_at", { ascending: false })
        .limit(slug === "sciences" ? 40 : 14),
    ),

  ]);
  if (arrivals.error) throw new Error(arrivals.error.message);

  const departments = deptSlugs.map((slug, i) => {
    let books = (deptResults[i]?.data ?? []) as SpineBook[];
    // Sciences holds two named shelves; the hall shelf shows a mixture of both.
    if (slug === "sciences") {
      const a = books.filter((b) => b.shelf !== "not_yet");
      const bb = books.filter((b) => b.shelf === "not_yet");
      const mixed: SpineBook[] = [];
      for (let k = 0; k < Math.max(a.length, bb.length); k++) {
        if (a[k]) mixed.push(a[k]!);
        if (bb[k]) mixed.push(bb[k]!);
      }
      books = mixed.slice(0, 14);
    }

    return { slug: slug as Department, books };
  });


  return {
    total: total.count ?? 0,
    takenForever: taken.count ?? 0,
    arrivals: (arrivals.data ?? []) as SpineBook[],
    featured: (featured.data ?? []) as SpineBook[],
    departments,
  };
});


export const listDepartment = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ department: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (!isDepartment(data.department)) throw new Error("No such department");
    const { createPublicClient } = await import("./public-client.server");
    const db = createPublicClient();
    const { data: books, error } = await db
      .from("books")
      .select(SPINE_COLUMNS)
      .eq("department", data.department)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (books ?? []) as SpineBook[];
  });

export const getBook = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./public-client.server");
    const db = createPublicClient();
    const { data: book, error } = await db
      .from("books")
      .select(`${SPINE_COLUMNS}, kept_by_name, kept_at`)

      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (book as BookDetail | null) ?? null;
  });

export const listTaken = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./public-client.server");
  const db = createPublicClient();
  const { data, error } = await db
    .from("books")
    .select("id, title, author, department, kept_by_name, kept_at")
    .eq("status", "taken_forever")
    .order("kept_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TakenBook[];
});

/* Query options shared by loaders and components */
export const hallQuery = queryOptions({
  queryKey: ["hall"],
  queryFn: () => getHall(),
});

export const departmentQuery = (department: string) =>
  queryOptions({
    queryKey: ["department", department],
    queryFn: () => listDepartment({ data: { department } }),
  });

export const bookQuery = (id: string) =>
  queryOptions({
    queryKey: ["book", id],
    queryFn: () => getBook({ data: { id } }),
  });

export const takenQuery = queryOptions({
  queryKey: ["taken"],
  queryFn: () => listTaken(),
});
