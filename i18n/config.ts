export const locales = ["en", "tr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// We keep localePrefix disabled to avoid changing existing routes.
export const localePrefix = "never";

export const localeCookieName = "NEXT_LOCALE";
