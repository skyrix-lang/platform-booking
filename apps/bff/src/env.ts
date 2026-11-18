import { z } from "zod";

// The BFF's settings, checked once when the server starts (src/server.ts), so a
// missing value fails the deploy instead of the first request. Read them with
// env(), never process.env.

/** From the most to the least verbose; `silent` logs nothing. */
export const logLevels = ["debug", "info", "warn", "error", "silent"] as const;
export type LogLevel = (typeof logLevels)[number];

/** An empty value (`SMTP_HOST=` in .env) counts as unset. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    HOST: z.string().default("0.0.0.0"),
    /** The address people use, such as https://bookings.example.com. */
    PUBLIC_URL: z
      .url({ protocol: /^https?$/ })
      .transform((url) => url.replace(/\/$/, "")),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    /** Signs the short-lived sign-in cookie. Required with sign-in. */
    SESSION_SECRET: optional(z.string()),
    /**
     * Sign-in is optional: the site works without it, as the previous version
     * did. Set all three to turn it on (docs/decisions.md, "Open access").
     */
    OIDC_ISSUER: optional(z.url()),
    OIDC_CLIENT_ID: optional(z.string()),
    OIDC_CLIENT_SECRET: optional(z.string()),
    /** The least severe level that is logged (src/log.ts). */
    LOG_LEVEL: z.enum(logLevels).default("info"),
    /** The built SPA, served in production. Unset in development (Vite serves it). */
    STATIC_DIR: z.string().optional(),
    /**
     * The SMTP server mail is sent through (src/mail.ts). Unset, mail is only
     * logged, as in tests: nothing reaches anyone.
     */
    SMTP_HOST: optional(z.string()),
    /** 465 or 2465 use TLS from the start; 587, 2587 or 25 must upgrade with STARTTLS. */
    SMTP_PORT: optional(z.coerce.number().int().positive()).default(465),
    SMTP_USER: optional(z.string()),
    SMTP_PASSWORD: optional(z.string()),
    /** The sender, such as `Acme <no-reply@acme.example>`: a domain the server may send for. */
    MAIL_FROM: optional(z.string()),
  })
  .superRefine((env, context) => {
    if (env.SMTP_HOST) {
      for (const key of ["SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"] as const) {
        if (!env[key]) {
          context.addIssue({
            code: "custom",
            message: "Required when SMTP_HOST is set",
            path: [key],
          });
        }
      }
    }
    const oidc = [
      "OIDC_ISSUER",
      "OIDC_CLIENT_ID",
      "OIDC_CLIENT_SECRET",
    ] as const;
    if (oidc.some((key) => env[key])) {
      for (const key of [...oidc, "SESSION_SECRET"] as const) {
        if (!env[key]) {
          context.addIssue({
            code: "custom",
            message: "Required when sign-in (OIDC_*) is configured",
            path: [key],
          });
        }
      }
    }
    if (env.NODE_ENV !== "production") return;
    if (
      env.SESSION_SECRET !== undefined &&
      (env.SESSION_SECRET.length < 32 || env.SESSION_SECRET === "change-me")
    ) {
      context.addIssue({
        code: "custom",
        message: "Use a random value of at least 32 characters",
        path: ["SESSION_SECRET"],
      });
    }
    if (!env.PUBLIC_URL.startsWith("https://")) {
      const local = new URL(env.PUBLIC_URL).hostname === "localhost";
      if (!local) {
        context.addIssue({
          code: "custom",
          message: "Must be https:// in production",
          path: ["PUBLIC_URL"],
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Parses `source`, throwing one error that lists every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}`);
  }
  return result.data;
}

export interface SignInSettings {
  issuer: string;
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
}

/** The sign-in settings, or undefined when sign-in isn't configured. */
export function signInSettings(): SignInSettings | undefined {
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, SESSION_SECRET } =
    env();
  // parseEnv requires all four together.
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !SESSION_SECRET)
    return undefined;
  return {
    issuer: OIDC_ISSUER,
    clientId: OIDC_CLIENT_ID,
    clientSecret: OIDC_CLIENT_SECRET,
    sessionSecret: SESSION_SECRET,
  };
}

/** The sign-in settings, for code that only runs when sign-in is on. */
export function requireSignIn(): SignInSettings {
  const settings = signInSettings();
  if (!settings) throw new Error("Sign-in isn't configured (OIDC_*)");
  return settings;
}

let cached: Env | undefined;

/** The validated environment. Read on use, not at import: tools import the app without one. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
