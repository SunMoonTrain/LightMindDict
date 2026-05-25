import { getPreferenceValues } from "@raycast/api";
import { PrefLang } from "../lang";
import { DictEntry, DictSource } from "../types";

// Wiktionary REST API（仅 en.wiktionary.org 提供）：
// - /page/definition/{title} —— 结构化释义，按语言分组。**但只对
//   "有标准释义段落" 的页面有效**，很多变体（如假名形式）会 404
// - /page/summary/{title} —— 任意页面的 lead 段落纯文本摘要，跟随
//   重定向，覆盖更广。definition 找不到时回退到这里
//
// User-Agent 是 Wikimedia API 的硬要求，缺失可能静默返回 404
const DEF_ENDPOINT = "https://en.wiktionary.org/api/rest_v1/page/definition";
const SUM_ENDPOINT = "https://en.wiktionary.org/api/rest_v1/page/summary";
const UA = "LightMindDict/0.1 (https://github.com/SunMoonTrain/LightMindDict)";

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

type WikiDefResponse = Record<string, WikiEntry[]>;

interface WikiSummary {
  title?: string;
  extract?: string;
  description?: string;
}

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
  return pref;
}

async function tryDefinition(
  query: string,
  preferred: string | undefined,
  signal?: AbortSignal,
): Promise<DictEntry | null> {
  const res = await fetch(`${DEF_ENDPOINT}/${encodeURIComponent(query)}`, {
    signal,
    headers: { Accept: "application/json", "User-Agent": UA },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wiktionary 查询失败: ${res.status}`);

  const data = (await res.json()) as WikiDefResponse;
  const langPairs = Object.entries(data);

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

  if (explanations.length === 0) return null;
  return {
    query,
    source: "wiktionary",
    explanations,
    translations: [],
  };
}

async function trySummary(
  query: string,
  signal?: AbortSignal,
): Promise<DictEntry | null> {
  const res = await fetch(`${SUM_ENDPOINT}/${encodeURIComponent(query)}`, {
    signal,
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as WikiSummary;
  const text = (data.extract ?? data.description ?? "").trim();
  if (!text) return null;

  return {
    query,
    source: "wiktionary",
    explanations: [text],
    translations: [],
  };
}

export const wiktionary: DictSource = {
  id: "wiktionary",
  async lookup(query, signal) {
    const { targetLanguage } = getPreferenceValues<{
      targetLanguage: PrefLang;
    }>();
    const preferred = preferredLangCode(targetLanguage);

    const fromDef = await tryDefinition(query, preferred, signal);
    if (fromDef) return fromDef;

    const fromSum = await trySummary(query, signal);
    if (fromSum) return fromSum;

    return emptyEntry(query);
  },
};
