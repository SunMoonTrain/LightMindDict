const CJK_RE = /[一-龥぀-ヿ]/;

export type PrefLang = "auto" | "zh-CHS" | "en" | "ja";

export function resolveTarget(
  query: string,
  pref: PrefLang,
  dialect: "google" | "azure",
): string {
  if (pref === "auto") {
    const targetIsZh = !CJK_RE.test(query);
    if (dialect === "azure") return targetIsZh ? "zh-Hans" : "en";
    return targetIsZh ? "zh-CN" : "en";
  }
  if (pref === "zh-CHS") return dialect === "azure" ? "zh-Hans" : "zh-CN";
  return pref;
}
