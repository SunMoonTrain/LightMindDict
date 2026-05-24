import { DictEntry, DictSource } from "../types";

interface YoudaoJsonApi {
  ec?: {
    word?: { phone?: string; ukphone?: string; usphone?: string; trs?: { tr?: { l?: { i?: string[] } }[] }[] }[];
  };
  ce?: {
    word?: { trs?: { tr?: { l?: { i?: (string | { "#text"?: string })[] } }[] }[] }[];
  };
  fanyi?: { tran?: string };
  web_trans?: { "web-translation"?: { trans?: { value?: string }[] }[] };
}

function flattenCeItems(items: (string | { "#text"?: string })[] | undefined): string {
  if (!items) return "";
  return items.map((it) => (typeof it === "string" ? it : (it["#text"] ?? ""))).join("");
}

export const youdaoPublic: DictSource = {
  id: "youdao-public",
  async lookup(query, signal) {
    const url = new URL("https://dict.youdao.com/jsonapi");
    url.searchParams.set("q", query);
    url.searchParams.set("doctype", "json");
    url.searchParams.set("jsonversion", "2");
    url.searchParams.set("dicts", JSON.stringify({ count: 99, dicts: [["ec", "ce", "fanyi", "web_trans"]] }));

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error(`Youdao request failed: ${res.status}`);
    const data = (await res.json()) as YoudaoJsonApi;

    const entry: DictEntry = {
      query,
      source: "youdao-public",
      translations: [],
      explanations: [],
    };

    const ecWord = data.ec?.word?.[0];
    if (ecWord) {
      entry.phonetic = { uk: ecWord.ukphone ?? ecWord.phone, us: ecWord.usphone ?? ecWord.phone };
      const expls = ecWord.trs?.flatMap((t) => t.tr?.flatMap((x) => x.l?.i ?? []) ?? []) ?? [];
      entry.explanations = expls.filter((s): s is string => typeof s === "string" && s.length > 0);
    }

    const ceWord = data.ce?.word?.[0];
    if (ceWord) {
      const expls = ceWord.trs?.flatMap((t) => t.tr?.map((x) => flattenCeItems(x.l?.i)) ?? []) ?? [];
      entry.explanations = [...(entry.explanations ?? []), ...expls.filter((s) => s.length > 0)];
    }

    if (data.fanyi?.tran) entry.translations.push(data.fanyi.tran);
    const webTrans = data.web_trans?.["web-translation"]?.[0]?.trans?.map((t) => t.value).filter(Boolean) as
      | string[]
      | undefined;
    if (webTrans?.length) entry.translations.push(...webTrans);

    return entry;
  },
};
