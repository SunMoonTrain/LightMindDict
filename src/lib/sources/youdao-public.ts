import { detectInputLang } from "../lang";
import { DictEntry, DictSource } from "../types";

interface YoudaoJsonApi {
  ec?: {
    word?: {
      phone?: string;
      ukphone?: string;
      usphone?: string;
      trs?: { tr?: { l?: { i?: string[] } }[] }[];
    }[];
  };
  ce?: {
    word?: {
      trs?: { tr?: { l?: { i?: (string | { "#text"?: string })[] } }[] }[];
    }[];
  };
  jc?: {
    word?: {
      reading?: string;
      trs?: { tr?: { l?: { i?: string[] } }[] }[];
    }[];
  };
  cj?: {
    word?: {
      trs?: { tr?: { l?: { i?: string[] } }[] }[];
    }[];
  };
  fanyi?: { tran?: string };
  web_trans?: { "web-translation"?: { trans?: { value?: string }[] }[] };
}

function flattenCeItems(
  items: (string | { "#text"?: string })[] | undefined,
): string {
  if (!items) return "";
  return items
    .map((it) => (typeof it === "string" ? it : (it["#text"] ?? "")))
    .join("");
}

function pickStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((s): s is string => typeof s === "string" && s.length > 0);
}

async function fetchYoudao(
  query: string,
  le: string | undefined,
  signal?: AbortSignal,
): Promise<YoudaoJsonApi> {
  const url = new URL("https://dict.youdao.com/jsonapi");
  url.searchParams.set("q", query);
  if (le) url.searchParams.set("le", le);
  url.searchParams.set("doctype", "json");
  url.searchParams.set("jsonversion", "2");
  url.searchParams.set(
    "dicts",
    JSON.stringify({
      count: 99,
      dicts: [["ec", "ce", "jc", "cj", "fanyi", "web_trans"]],
    }),
  );
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Youdao request failed: ${res.status}`);
  return (await res.json()) as YoudaoJsonApi;
}

function parseResponse(data: YoudaoJsonApi, query: string): DictEntry {
  const entry: DictEntry = {
    query,
    source: "youdao-public",
    translations: [],
    explanations: [],
  };

  const ecWord = data.ec?.word?.[0];
  if (ecWord) {
    entry.phonetic = {
      uk: ecWord.ukphone ?? ecWord.phone,
      us: ecWord.usphone ?? ecWord.phone,
    };
    const expls =
      ecWord.trs?.flatMap((t) => t.tr?.flatMap((x) => x.l?.i ?? []) ?? []) ??
      [];
    entry.explanations = pickStrings(expls);
  }

  const ceWord = data.ce?.word?.[0];
  if (ceWord) {
    const expls =
      ceWord.trs?.flatMap(
        (t) => t.tr?.map((x) => flattenCeItems(x.l?.i)) ?? [],
      ) ?? [];
    entry.explanations = [
      ...(entry.explanations ?? []),
      ...expls.filter((s) => s.length > 0),
    ];
  }

  const jcWord = data.jc?.word?.[0];
  if (jcWord) {
    const reading = jcWord.reading;
    const expls =
      jcWord.trs?.flatMap((t) => t.tr?.flatMap((x) => x.l?.i ?? []) ?? []) ??
      [];
    const cleanExpls = pickStrings(expls);
    if (reading && cleanExpls.length > 0) {
      cleanExpls[0] = `【${reading}】${cleanExpls[0]}`;
    } else if (reading) {
      cleanExpls.push(`【${reading}】`);
    }
    entry.explanations = [...(entry.explanations ?? []), ...cleanExpls];
  }

  const cjWord = data.cj?.word?.[0];
  if (cjWord) {
    const expls =
      cjWord.trs?.flatMap((t) => t.tr?.flatMap((x) => x.l?.i ?? []) ?? []) ??
      [];
    entry.explanations = [...(entry.explanations ?? []), ...pickStrings(expls)];
  }

  if (data.fanyi?.tran) entry.translations.push(data.fanyi.tran);
  const webTrans = data.web_trans?.["web-translation"]?.[0]?.trans
    ?.map((t) => t.value)
    .filter(Boolean) as string[] | undefined;
  if (webTrans?.length) entry.translations.push(...webTrans);

  return entry;
}

function mergeEntries(a: DictEntry, b: DictEntry): DictEntry {
  const expls = [...(a.explanations ?? []), ...(b.explanations ?? [])];
  return {
    query: a.query,
    source: a.source,
    phonetic: a.phonetic ?? b.phonetic,
    explanations: Array.from(new Set(expls)),
    translations: Array.from(new Set([...a.translations, ...b.translations])),
  };
}

export const youdaoPublic: DictSource = {
  id: "youdao-public",
  async lookup(query, signal) {
    const lang = detectInputLang(query);

    // 纯汉字是真正的中/日歧义（林檎 在中日都成立）。并发跑两次：
    // 一次默认（中文模式），一次 le=jap（日语模式），合并结果。
    if (lang === "han") {
      const [chinese, japanese] = await Promise.all([
        fetchYoudao(query, undefined, signal),
        fetchYoudao(query, "jap", signal),
      ]);
      return mergeEntries(
        parseResponse(chinese, query),
        parseResponse(japanese, query),
      );
    }

    // 其它脚本能唯一确定语言
    const le =
      lang === "ja"
        ? "jap"
        : lang === "ko"
          ? "ko"
          : lang === "ru"
            ? "ru"
            : undefined;
    const data = await fetchYoudao(query, le, signal);
    return parseResponse(data, query);
  },
};
