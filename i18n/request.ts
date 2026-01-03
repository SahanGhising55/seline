import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { defaultLocale, localeCookieName, locales } from "./config";

export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const detectedLocale = requestHeaders.get("x-next-intl-locale") ?? defaultLocale;

  const locale = locales.includes(detectedLocale as (typeof locales)[number])
    ? (detectedLocale as (typeof locales)[number])
    : defaultLocale;

  const messages = (await import(`../locales/${locale}.json`)).default;

  return {
    locale,
    messages,
    localeCookie: localeCookieName,
  } as const;
});
