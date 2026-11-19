import { DataAdapter, normalizePath } from "obsidian";

export type Locale = "ja-JP" | "en-US";
export type Messages = Record<string, string>;

export const detectLocale = (): Locale =>
  (navigator.language || "en-US").toLowerCase().startsWith("ja") ? "ja-JP" : "en-US";

export async function loadMessages(
  adapter: DataAdapter,
  pluginDir: string,
  locale: Locale,
): Promise<Messages> {
  const read = async (name: Locale) =>
    JSON.parse(
      await adapter.read(normalizePath(`${pluginDir}/locales/${name}.json`)),
    ) as Messages;

  try {
    return await read(locale);
  } catch {
    return locale === "en-US" ? {} : read("en-US");
  }
}
