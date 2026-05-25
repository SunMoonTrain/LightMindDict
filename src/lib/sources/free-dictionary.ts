import { getPreferenceValues } from "@raycast/api";
import { PrefLang } from "../lang";
import { DictEntry, DictSource } from "../types";

// 目标语言偏好 → Free Dictionary API 的 lang code。
// 这里"语言"被理解为"输入词所属语言"，因为 Free Dictionary
// 的 endpoint 是 /entries/{lang}/{word}，会返回该语言内的释义。
// 不在表里的语言（中文、阿拉伯、泰、越等）会回退到英语，
// 让 endpoint 返回 404 也能给用户一个直观的"没找到结果"。
const LANG_MAP: Partial<Record<PrefLang, string>> = {
  en: "en",
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
  ru: "ru",
  pt: "pt-BR",
  it: "it",
  ar: "ar",
  hi: "hi",
};

interface FDEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech?: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

function emptyEntry(query: string): DictEntry {
  return {
    query,
    source: "free-dictionary",
    translations: [],
    explanations: [],
  };
}

export const freeDictionary: DictSource = {
  id: "free-dictionary",
  async lookup(query, signal) {
    const { targetLanguage } = getPreferenceValues<{
      targetLanguage: PrefLang;
    }>();
    const lang = LANG_MAP[targetLanguage] ?? "en";

    const url = `https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal });

    if (res.status === 404) return emptyEntry(query);
    if (!res.ok) throw new Error(`Free Dictionary 查询失败: ${res.status}`);

    const data = (await res.json()) as FDEntry[];
    const first = data[0];
    if (!first) return emptyEntry(query);

    const phoneticText =
      first.phonetic ?? first.phonetics?.find((p) => p.text)?.text;

    const explanations: string[] = [];
    for (const meaning of first.meanings) {
      const pos = meaning.partOfSpeech ? `${meaning.partOfSpeech}. ` : "";
      for (const def of meaning.definitions) {
        const line = def.example
          ? `${pos}${def.definition} — e.g. "${def.example}"`
          : `${pos}${def.definition}`;
        explanations.push(line);
      }
    }

    return {
      query,
      source: "free-dictionary",
      phonetic: phoneticText
        ? { uk: phoneticText, us: phoneticText }
        : undefined,
      explanations,
      translations: [],
    };
  },
};
