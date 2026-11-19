import { getLanguage, moment, requireApiVersion } from "obsidian";
import enMessages from "./locales/en-US.json";
import jaMessages from "./locales/ja-JP.json";

export type Locale = "ja-JP" | "en-US";
export type Messages = Record<string, string>;

const messages: Record<Locale, Messages> = {
  "ja-JP": jaMessages,
  "en-US": enMessages,
};

export const detectLocale = (): Locale => {
  const language = requireApiVersion("1.8.7") ? getLanguage() : moment.locale();
  return language.toLowerCase().startsWith("ja") ? "ja-JP" : "en-US";
};

export function loadMessages(locale: Locale): Messages {
  return messages[locale];
}
