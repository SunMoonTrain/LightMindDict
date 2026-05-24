import { getPreferenceValues } from "@raycast/api";
import { DictSource } from "../types";
import { PrefLang, resolveTarget } from "../lang";

type GoogleResponse = [Array<[string, ...unknown[]]> | null, ...unknown[]];

export const google: DictSource = {
  id: "google",
  async lookup(query, signal) {
    const { targetLanguage } = getPreferenceValues<{
      targetLanguage: PrefLang;
    }>();
    const tl = resolveTarget(query, targetLanguage, "google");

    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "auto");
    url.searchParams.set("tl", tl);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", query);

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error(`Google 翻译失败: ${res.status}`);
    const data = (await res.json()) as GoogleResponse;

    const segments = data[0] ?? [];
    const text = segments
      .map((s) => (typeof s[0] === "string" ? s[0] : ""))
      .join("")
      .trim();
    const detected =
      typeof data[2] === "string" ? (data[2] as string) : undefined;

    return {
      query,
      source: "google",
      translations: text ? [text] : [],
      detectedLanguage: detected,
    };
  },
};
