import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const NAME_REQUIRED = "NAME_REQUIRED";

/** The name the library uses for a reader: first name, or name and initial. */
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "At least two characters, please.")
  .max(24, "At most twenty-four characters.")
  .regex(/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u, "Letters, spaces, hyphens and initials only.");

export const setDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: displayNameSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: data.name })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { display_name: data.name };
  });
