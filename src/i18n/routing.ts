import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  // Portuguese lives at /, English at /en; the choice is remembered in the NEXT_LOCALE cookie.
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
