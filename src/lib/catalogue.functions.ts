import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { isDepartment } from "./departments";

export type SpineBook = {
  id: string;
  title: string;
  author: string;
  pages: number;
  spine_color: string;
  status: "available" | "taken_forever";
  department: string;
  featured: boolean;
};

export type BookDetail = SpineBook & {
  kind: string;
  year: number;
  review: string | null;
  kept_by_name: string | null;
  kept_at: string | null;
  publisher: { name: string; city: string; style_note: string | null } | null;
};

export type TakenBook = {
  id: string;
  title: string;
  author: string;
  department: string;
  kept_by_name: string | null;
  kept_at: string | null;
};

const SPINE_COLUMNS = "id, title, author, pages, spine_color, status, department, featured";

export const getHall = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./public-client.server");
  const db = createPublicClient();

  const [total, taken, arrivals, featured] = await Promise.all([
    db.from("books").select("id", { count: "exact", head: true }),
    db.from("books").select("id", { count: "exact", head: true }).eq("status", "taken_forever"),
    db.from("books").select(SPINE_COLUMNS).order("created_at", { ascending: false }).limit(18),
    db.from("books").select(SPINE_COLUMNS).eq("featured", true).order("created_at", { ascending: true }),
  ]);
  if (arrivals.error) throw new Error(arrivals.error.message);

  return {
    total: total.count ?? 0,
    takenForever: taken.count ?? 0,
    arrivals: (arrivals.data ?? []) as SpineBook[],
    featured: (featured.data ?? []) as SpineBook[],
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
      .select(
        `${SPINE_COLUMNS}, kind, year, review, kept_by_name, kept_at, publisher:publishers(name, city, style_note)`,
      )
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
