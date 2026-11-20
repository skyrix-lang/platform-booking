import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@platform-booking/core";
import { browserLanguage, i18n, resources } from "./i18n";

/**
 * Every key of a messages file, as "a.b.c", plural forms ("x_one", "x_few")
 * counted once: languages have different plural categories.
 */
const keys = (messages: object, prefix = ""): string[] =>
  Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? keys(value as object, `${prefix}${key}.`)
      : [`${prefix}${key.replace(/_(zero|one|two|few|many|other)$/, "")}`],
  );
const unique = (list: string[]) => [...new Set(list)].sort();

describe.each(LANGUAGES.slice(1))("the %s messages", (language) => {
  const english = resources[LANGUAGES[0]]!;
  it.each(Object.keys(english))("have every key of %s", (namespace) => {
    const translated = resources[language]![namespace as keyof typeof english];
    expect(unique(keys(translated))).toEqual(
      unique(keys(english[namespace as keyof typeof english])),
    );
  });
});

describe("browserLanguage", () => {
  it("is the default whatever the browser asks for", () => {
    expect(browserLanguage(["fr-FR", "de"])).toBe("en");
    expect(browserLanguage([])).toBe("en");
  });
});

it("sets <html lang>", () => {
  expect(i18n.language).toBe("en");
  expect(document.documentElement.lang).toBe("en");
});
