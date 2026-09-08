import type { Database } from "@/integrations/supabase/types";

export type Department = Database["public"]["Enums"]["department"];

export const DEPARTMENTS: { slug: Department; label: string; note: string; lent: boolean }[] = [
  { slug: "novels", label: "Novels", note: "Rigorous fictions", lent: true },
  { slug: "poetry", label: "Poetry", note: "Collections and hymns", lent: true },
  { slug: "treatises", label: "Treatises", note: "Monographs on impossible subjects", lent: true },
  { slug: "memoirs", label: "Memoirs", note: "Lives, some of them lived", lent: true },
  { slug: "reference", label: "Reference", note: "Dictionaries, tables, indices", lent: true },
  { slug: "restricted", label: "Restricted", note: "Not lent", lent: false },
];

export const LENDABLE_DEPARTMENTS = DEPARTMENTS.filter((d) => d.lent).map((d) => d.slug);

export function departmentLabel(slug: string): string {
  return DEPARTMENTS.find((d) => d.slug === slug)?.label ?? slug;
}

export function isDepartment(value: string): value is Department {
  return DEPARTMENTS.some((d) => d.slug === value);
}

export const LOAN_DAYS = 14;
export const MAX_ACTIVE_LOANS = 3;
export const MAX_LOANS_PER_DAY = 3;
