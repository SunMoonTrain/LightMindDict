import { getPreferenceValues } from "@raycast/api";
import { PrefLang } from "../lang";
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

// Youdao 的 `le` 参数决定使用哪个语言上下文的词库。
// 不设的话默认 le=eng（英中互译），无论 dicts 怎么写都不激活日 / 韩词库。
function youdaoLocale(pref: PrefLang, query: string): string | undefined {
  if (pref === "ja") return "jap";
  if (pref === "ko") return "ko";
  if (pref === "fr") return "fr";

  if (pref === "auto") {
    // 含假名 → 日语
    if (/[぀-ゟ゠-ヿ]/.test(query)) return "jap";
    // 含韩文谚文音节 → 韩语
    if (/[가-힯]/.test(query)) return "ko";
  }

  return undefined; // 默认（中英）
}

export const youdaoPublic: DictSource = {
  id: "youdao-public",
  async lookup(query, signal) {
    const { targetLanguage } = getPreferenceValues<{
      targetLanguage: PrefLang;
    }>();
    const le = youdaoLocale(targetLanguage, query);

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
    const data = (await res.json()) as YoudaoJsonApi;

    const entry: DictEntry = {
      query,
      source: "youdao-public",
      translations: [],
      explanations: [],
    };

    // 英中
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

    // 中英
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

    // 日中
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

    // 中日
    const cjWord = data.cj?.word?.[0];
    if (cjWord) {
      const expls =
        cjWord.trs?.flatMap((t) => t.tr?.flatMap((x) => x.l?.i ?? []) ?? []) ??
        [];
      entry.explanations = [
        ...(entry.explanations ?? []),
        ...pickStrings(expls),
      ];
    }

    if (data.fanyi?.tran) entry.translations.push(data.fanyi.tran);
    const webTrans = data.web_trans?.["web-translation"]?.[0]?.trans
      ?.map((t) => t.value)
      .filter(Boolean) as string[] | undefined;
    if (webTrans?.length) entry.translations.push(...webTrans);

    return entry;
  },
};
