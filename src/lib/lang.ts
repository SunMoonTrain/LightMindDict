const CJK_RE = /[一-龥぀-ヿ]/;

// 输入语言自动检测（基于 Unicode 区段，best-effort）。
// 注意 "han" = 汉字-only，无法靠脚本区分中文还是日文，
// 调用方需要决定怎么处理这种歧义（双查、默认中文、等）。
export type DetectedLang =
  | "ja"
  | "ko"
  | "ru"
  | "ar"
  | "th"
  | "han"
  | "latin"
  | "unknown";

export function detectInputLang(q: string): DetectedLang {
  if (/[぀-ヿ]/.test(q)) return "ja"; // 含假名 → 一定是日语
  if (/[가-힯]/.test(q)) return "ko"; // 含谚文音节 → 韩语
  if (/[А-џ]/.test(q)) return "ru"; // 西里尔
  if (/[؀-ۿ]/.test(q)) return "ar"; // 阿拉伯
  if (/[฀-๿]/.test(q)) return "th"; // 泰文
  if (/[一-龥]/.test(q)) return "han"; // 纯汉字（中/日歧义）
  if (/[A-Za-z]/.test(q)) return "latin"; // 拉丁字母
  return "unknown";
}

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
