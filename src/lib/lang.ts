const CJK_RE = /[一-龥぀-ヿ]/;

export type PrefLang =
  | "auto"
  | "zh-CHS"
  | "en"
  | "ja"
  | "ko"
  | "es"
  | "fr"
  | "de"
  | "ru"
  | "pt"
  | "it"
  | "ar"
  | "hi"
  | "th"
  | "vi";

// 多数语种 Google 和 Azure 使用相同 ISO 639-1 代码，只列差异。
const GOOGLE_CODE: Partial<Record<PrefLang, string>> = {
  "zh-CHS": "zh-CN",
};

const AZURE_CODE: Partial<Record<PrefLang, string>> = {
  "zh-CHS": "zh-Hans",
};

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
  const map = dialect === "azure" ? AZURE_CODE : GOOGLE_CODE;
  return map[pref] ?? pref;
}
