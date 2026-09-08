import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const EMAIL_LIMIT = 5; // per email per hour
const IP_LIMIT = 20; // per address per hour

/** The Turnstile site key is public; the browser needs it to draw the widget. */
export const getAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const siteKey = process.env["TURNSTILE_SITE_KEY"] ?? null;
  return { siteKey: siteKey && siteKey.trim() ? siteKey.trim() : null };
});

async function verifyTurnstile(token: string | null, ip: string | null) {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret || !secret.trim()) return true; // not configured yet
  if (!token) return false;
  const body = new URLSearchParams({ secret: secret.trim(), response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { success?: boolean };
  return Boolean(json.success);
}

function callerIp() {
  const headers = getRequest().headers;
  const forwarded = headers.get("x-forwarded-for");
  return headers.get("cf-connecting-ip") ?? (forwarded ? forwarded.split(",")[0]?.trim() ?? null : null);
}

/**
 * Sends the sign-in link, but only to a verified human, and only within the
 * house limits: five letters an hour to one address, twenty from one machine.
 */
export const requestMagicLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().email().max(200),
        token: z.string().max(4000).nullable().optional(),
        redirectTo: z.string().url().max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ip = callerIp();
    const email = data.email.trim().toLowerCase();

    if (!(await verifyTurnstile(data.token ?? null, ip))) {
      throw new Error("The bot check did not pass. Please try again.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [{ count: byEmail }, { count: byIp }] = await Promise.all([
      supabaseAdmin
        .from("auth_attempts")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", since),
      ip
        ? supabaseAdmin
            .from("auth_attempts")
            .select("id", { count: "exact", head: true })
            .eq("ip", ip)
            .gte("created_at", since)
        : Promise.resolve({ count: 0 } as { count: number }),
    ]);

    if ((byEmail ?? 0) >= EMAIL_LIMIT) {
      throw new Error("Too many letters have been sent to this address in the past hour. Please wait a little.");
    }
    if ((byIp ?? 0) >= IP_LIMIT) {
      throw new Error("Too many sign-in requests from this connection. Please wait an hour.");
    }

    await supabaseAdmin.from("auth_attempts").insert({ email, ip });

    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const res = await fetch(`${url}/auth/v1/otp?redirect_to=${encodeURIComponent(data.redirectTo)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ email, create_user: true, gotrue_meta_security: {} }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("magic link request failed", res.status, text);
      throw new Error("The letter could not be sent. Please try again shortly.");
    }
    return { ok: true };
  });
