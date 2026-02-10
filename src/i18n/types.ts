import type en from "./en.json";

export type Language = "en" | "it";

export const SUPPORTED_LANGUAGES: Language[] = ["en", "it"];
export const DEFAULT_LANGUAGE: Language = "en";

/**
 * Recursive mapped type that generates dot-notation paths from a nested object.
 * e.g. { nav: { dashboard: "Dashboard" } } → "nav.dashboard"
 */
type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

export type InterpolationValues = Record<string, string | number>;

export type Translations = typeof en;
