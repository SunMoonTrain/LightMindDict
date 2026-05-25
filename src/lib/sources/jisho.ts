import { DictEntry, DictSource } from "../types";

// Jisho.org —— 专做日语的开源词典，数据源 JMdict。
// API: GET https://jisho.org/api/v1/search/words?keyword=...
// 无需 Key，假名 / 汉字 / 罗马字三种写法都能查到并互相关联。
const ENDPOINT = "https://jisho.org/api/v1/search/words";

interface JishoJapanese {
  word?: string;
  reading?: string;
}

interface JishoSense {
  english_definitions: string[];
  parts_of_speech: string[];
  tags?: string[];
  info?: string[];
}

interface JishoData {
  slug: string;
  is_common?: boolean;
  jlpt?: string[];
  japanese: JishoJapanese[];
  senses: JishoSense[];
}

interface JishoResponse {
  meta: { status: number };
  data: JishoData[];
}

function emptyEntry(query: string): DictEntry {
  return { query, source: "jisho", translations: [], explanations: [] };
}

function formatPos(parts: string[] | undefined): string {
  if (!parts?.length) return "";
  // 过滤掉 "Wikipedia definition" 这种无信息词性标
  const clean = parts.filter((p) => p !== "Wikipedia definition");
  if (!clean.length) return "";
  return `${clean.join(", ").toLowerCase()}. `;
}

export const jisho: DictSource = {
  id: "jisho",
  async lookup(query, signal) {
    const url = `${ENDPOINT}?keyword=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Jisho 查询失败: ${res.status}`);

    const data = (await res.json()) as JishoResponse;
    if (!data.data?.length) return emptyEntry(query);

    const first = data.data[0];
    const explanations: string[] = [];

    // 第一行：词形 + 读音（如 "日本語【にほんご】"）
    const head = first.japanese?.[0];
    if (head) {
      const writing = head.word;
      const reading = head.reading;
      if (writing && reading && writing !== reading) {
        explanations.push(`${writing}【${reading}】`);
      } else if (reading || writing) {
        explanations.push(reading ?? writing ?? "");
      }
    }

    // 每个 sense 一行
    for (const sense of first.senses ?? []) {
      const pos = formatPos(sense.parts_of_speech);
      const defs = (sense.english_definitions ?? []).join("; ");
      if (defs) explanations.push(`${pos}${defs}`);
    }

    // JLPT 等级 + is_common 标记
    const tags: string[] = [];
    if (first.is_common) tags.push("常用");
    if (first.jlpt?.length) tags.push(first.jlpt[0].toUpperCase());
    if (tags.length) explanations.push(`【${tags.join(" · ")}】`);

    // 其它写法 / 读音
    if (first.japanese && first.japanese.length > 1) {
      const alts = first.japanese
        .slice(1)
        .map((j) =>
          j.word && j.reading && j.word !== j.reading
            ? `${j.word}【${j.reading}】`
            : (j.reading ?? j.word ?? ""),
        )
        .filter(Boolean);
      if (alts.length) explanations.push(`其他写法: ${alts.join(", ")}`);
    }

    return {
      query,
      source: "jisho",
      explanations,
      translations: [],
    };
  },
};
