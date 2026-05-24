export function ttsUrl(word: string, voice: "us" | "uk" = "us"): string {
  const type = voice === "uk" ? 1 : 2;
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
}
