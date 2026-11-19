import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const development = {
  PUBLIC_URL: "http://localhost:3000",
  DATABASE_URL:
    "postgres://platform_booking:platform_booking@localhost:5432/platform_booking",
  SESSION_SECRET: "change-me",
  OIDC_ISSUER: "http://localhost:8180/realms/platform-booking",
  OIDC_CLIENT_ID: "platform-booking-web",
  OIDC_CLIENT_SECRET: "platform-booking-web-secret",
};

const production = {
  ...development,
  NODE_ENV: "production",
  PUBLIC_URL: "https://bookings.example.com",
  SESSION_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("accepts the development defaults from .env.example", () => {
    expect(parseEnv(development).DATABASE_URL).toBe(development.DATABASE_URL);
  });

  it("lists every missing variable at once", () => {
    expect(() => parseEnv({})).toThrow(/PUBLIC_URL[\s\S]*DATABASE_URL/);
  });

  it("runs without sign-in, as the site is open", () => {
    const {
      SESSION_SECRET: _secret,
      OIDC_ISSUER: _issuer,
      OIDC_CLIENT_ID: _id,
      OIDC_CLIENT_SECRET: _clientSecret,
      ...open
    } = production;
    expect(parseEnv(open).OIDC_ISSUER).toBeUndefined();
  });

  it("needs every sign-in setting once one is set", () => {
    expect(() =>
      parseEnv({ ...development, OIDC_CLIENT_SECRET: "", SESSION_SECRET: "" }),
    ).toThrow(/OIDC_CLIENT_SECRET[\s\S]*SESSION_SECRET/);
  });

  it("rejects a database URL that isn't Postgres", () => {
    expect(() =>
      parseEnv({ ...development, DATABASE_URL: "mysql://localhost/db" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("drops a trailing slash from the public URL", () => {
    const env = parseEnv({
      ...development,
      PUBLIC_URL: "http://localhost:3000/",
    });
    expect(env.PUBLIC_URL).toBe("http://localhost:3000");
  });

  it("accepts a complete production setup", () => {
    expect(() => parseEnv(production)).not.toThrow();
  });

  it("requires a real secret in production", () => {
    expect(() =>
      parseEnv({ ...production, SESSION_SECRET: "change-me" }),
    ).toThrow(/SESSION_SECRET/);
  });

  it("requires https in production, except on localhost", () => {
    expect(() =>
      parseEnv({ ...production, PUBLIC_URL: "http://bookings.example.com" }),
    ).toThrow(/PUBLIC_URL/);
    expect(() =>
      parseEnv({ ...production, PUBLIC_URL: "http://localhost:3100" }),
    ).not.toThrow();
  });

  it("needs credentials and a sender once an SMTP server is set", () => {
    expect(() =>
      parseEnv({ ...development, SMTP_HOST: "smtp.tem.scaleway.com" }),
    ).toThrow(/SMTP_USER[\s\S]*SMTP_PASSWORD[\s\S]*MAIL_FROM/);
    const env = parseEnv({
      ...development,
      SMTP_HOST: "smtp.tem.scaleway.com",
      SMTP_USER: "project-id",
      SMTP_PASSWORD: "secret-key",
      MAIL_FROM: "no-reply@acme.example",
    });
    expect(env.SMTP_PORT).toBe(465);
  });

  it("treats an empty SMTP_HOST as unset", () => {
    expect(
      parseEnv({ ...development, SMTP_HOST: "" }).SMTP_HOST,
    ).toBeUndefined();
  });

  it("leaves analytics off unless a measurement id is set", () => {
    expect(parseEnv(development).GA_MEASUREMENT_ID).toBeUndefined();
    expect(
      parseEnv({ ...development, GA_MEASUREMENT_ID: "" }).GA_MEASUREMENT_ID,
    ).toBeUndefined();
    expect(
      parseEnv({ ...development, GA_MEASUREMENT_ID: "G-AB12CD34EF" })
        .GA_MEASUREMENT_ID,
    ).toBe("G-AB12CD34EF");
  });

  it("refuses anything but a GA4 measurement id: it lands in the page", () => {
    for (const id of ["UA-1234-1", "G-ab12", 'G-AB12"><script>', "GTM-AB12"]) {
      expect(() => parseEnv({ ...development, GA_MEASUREMENT_ID: id })).toThrow(
        /GA_MEASUREMENT_ID/,
      );
    }
  });
});
