export type SourceId = "youdao-public" | "google" | "azure" | "free-dictionary";

export interface DictEntry {
  query: string;
  phonetic?: { uk?: string; us?: string };
  translations: string[];
  explanations?: string[];
  examples?: { src: string; trans: string }[];
  source: SourceId;
  detectedLanguage?: string;
}

export interface DictSource {
  id: SourceId;
  lookup(query: string, signal?: AbortSignal): Promise<DictEntry>;
}

export function isSentence(s: string): boolean {
  return /\s|[,.，。！？!?:;；：]/.test(s) || s.length > 10;
}
