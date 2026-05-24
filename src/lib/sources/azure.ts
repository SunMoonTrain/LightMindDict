import { getPreferenceValues } from "@raycast/api";
import { DictEntry, DictSource } from "../types";
import { PrefLang, resolveTarget } from "../lang";

interface AzurePrefs {
  azureKey?: string;
  azureRegion?: string;
  targetLanguage: PrefLang;
}

interface AzureResponse {
  translations: { text: string; to: string }[];
  detectedLanguage?: { language: string; score?: number };
}

export const azure: DictSource = {
  id: "azure",
  async lookup(query, signal) {
    const { azureKey, azureRegion, targetLanguage } = getPreferenceValues<AzurePrefs>();
    if (!azureKey) throw new Error("请在偏好设置中填入 Azure Translator Key");

    const to = resolveTarget(query, targetLanguage, "azure");
    const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${encodeURIComponent(to)}`;

    const headers: Record<string, string> = {
      "Ocp-Apim-Subscription-Key": azureKey,
      "Content-Type": "application/json",
    };
    if (azureRegion) headers["Ocp-Apim-Subscription-Region"] = azureRegion;

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
