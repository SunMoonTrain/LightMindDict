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
  // 日中：输入日语 → 中文释义
  jc?: {
    word?: {
      reading?: string;
      trs?: { tr?: { l?: { i?: string[] } }[] }[];
    }[];
  };
  // 中日：输入中文 → 日语释义
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

export const youdaoPublic: DictSource = {
  id: "youdao-public",
  async lookup(query, signal) {
    const url = new URL("https://dict.youdao.com/jsonapi");
    url.searchParams.set("q", query);
    url.searchParams.set("doctype", "json");
    url.searchParams.set("jsonversion", "2");
    url.searchParams.set(
      "dicts",
      JSON.stringify({
        count: 99,
        // 加 jc / cj 让日中、中日字典也返回
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

    // 日中（输入日语词，返回中文释义）
    const jcWord = data.jc?.word?.[0];
    if (jcWord) {
      const reading = jcWord.reading;
      const expls =
        jcWord.trs?.flatMap((t) => t.tr?.flatMap((x) => x.l?.i ?? []) ?? []) ??
        [];
      const cleanExpls = pickStrings(expls);
      if (reading && cleanExpls.length > 0) {
        // 把假名读音拼在第一条释义前面：【にほんご】日语
        cleanExpls[0] = `【${reading}】${cleanExpls[0]}`;
      } else if (reading) {
        cleanExpls.push(`【${reading}】`);
      }
      entry.explanations = [...(entry.explanations ?? []), ...cleanExpls];
    }

    // 中日（输入中文，返回日语释义）
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

    // 翻译 + 网络释义
    if (data.fanyi?.tran) entry.translations.push(data.fanyi.tran);
    const webTrans = data.web_trans?.["web-translation"]?.[0]?.trans
      ?.map((t) => t.value)
      .filter(Boolean) as string[] | undefined;
    if (webTrans?.length) entry.translations.push(...webTrans);

    return entry;
  },
};
