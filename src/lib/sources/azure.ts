import { getPreferenceValues } from "@raycast/api";
import { getAzureCreds } from "../azure-config";
import { PrefLang, resolveTarget } from "../lang";
import { DictSource } from "../types";

interface AzureResponse {
  translations: { text: string; to: string }[];
  detectedLanguage?: { language: string; score?: number };
}

export const azure: DictSource = {
  id: "azure",
  async lookup(query, signal) {
    const { targetLanguage } = getPreferenceValues<{ targetLanguage: PrefLang }>();
    const { key, region } = await getAzureCreds();
    if (!key) throw new Error("请先运行 'Configure Azure' 命令填入 Key");

    const to = resolveTarget(query, targetLanguage, "azure");
    const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(to)}`;

    const headers: Record<string, string> = {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/json",
    };
    if (region) headers["Ocp-Apim-Subscription-Region"] = region;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify([{ Text: query }]),
      signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Azure 翻译失败 ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as AzureResponse[];
    const first = data[0];
    const translations = first?.translations?.map((t) => t.text).filter(Boolean) ?? [];

    return {
      query,
      source: "azure",
      translations,
      detectedLanguage: first?.detectedLanguage?.language,
    };
  },
};
