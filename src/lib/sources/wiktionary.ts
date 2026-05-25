import { getPreferenceValues } from "@raycast/api";
import { PrefLang } from "../lang";
import { DictEntry, DictSource } from "../types";

// Wiktionary REST API: GET /page/definition/{word}
// 永远查 en.wiktionary.org —— 它对任意语种的词都返回英文释义，
// 是覆盖最广的入口（zh / es / ru / 等也有各自的 wiktionary，但
// 跨语种调度复杂，先用单一端点足矣）。
const ENDPOINT = "https://en.wiktionary.org/api/rest_v1/page/definition";

interface WikiDefinition {
  definition: string;
  examples?: string[];
  parsedExamples?: { example: string }[];
}

interface WikiEntry {
  partOfSpeech: string;
  language: string;
  definitions: WikiDefinition[];
}

type WikiResponse = Record<string, WikiEntry[]>;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function emptyEntry(query: string): DictEntry {
  return {
    query,
    source: "wiktionary",
    translations: [],
    explanations: [],
  };
}

function preferredLangCode(pref: PrefLang): string | undefined {
  if (pref === "auto") return undefined;
  if (pref === "zh-CHS") return "zh";
  if (pref === "pt") return "pt";
  return pref;
}

export const wiktionary: DictSource = {
  id: "wiktionary",
  async lookup(query, signal) {
    const { targetLanguage } = getPreferenceValues<{
      targetLanguage: PrefLang;
    }>();
    const preferred = preferredLangCode(targetLanguage);

    const url = `${ENDPOINT}/${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });

    if (res.status === 404) return emptyEntry(query);
    if (!res.ok) throw new Error(`Wiktionary 查询失败: ${res.status}`);

    const data = (await res.json()) as WikiResponse;
    const langPairs = Object.entries(data);

    // 把用户偏好语言的词条排到最前
    if (preferred) {
      langPairs.sort((a, b) => {
        if (a[0] === preferred) return -1;
        if (b[0] === preferred) return 1;
        return 0;
      });
    }

    const explanations: string[] = [];
    for (const [, entries] of langPairs) {
      for (const entry of entries) {
        const langLabel =
          entry.language && entry.language !== "Translingual"
            ? `[${entry.language}] `
            : "";
        const pos = entry.partOfSpeech
          ? `${entry.partOfSpeech.toLowerCase()}. `
          : "";
        for (const def of entry.definitions) {
          const text = stripHtml(def.definition);
          if (!text) continue;
          const example =
            def.examples?.[0] ?? def.parsedExamples?.[0]?.example ?? undefined;
          const exampleStr = example ? ` — e.g. "${stripHtml(example)}"` : "";
          explanations.push(`${langLabel}${pos}${text}${exampleStr}`);
        }
      }
    }

    if (explanations.length === 0) return emptyEntry(query);

    return {
      query,
      source: "wiktionary",
      explanations,
      translations: [],
    };
  },
};
