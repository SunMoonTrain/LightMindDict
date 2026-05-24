export type SourceId = "youdao-public" | "youdao-cloud" | "baidu" | "deepl" | "custom";

export interface DictEntry {
  query: string;
  phonetic?: { uk?: string; us?: string };
  translations: string[];
  explanations?: string[];
  examples?: { src: string; trans: string }[];
  source: SourceId;
}

export interface DictSource {
  id: SourceId;
  lookup(query: string, signal?: AbortSignal): Promise<DictEntry>;
}
