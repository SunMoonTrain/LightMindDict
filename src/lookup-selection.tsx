import { Clipboard, getPreferenceValues, getSelectedText, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { SourceId } from "./lib/types";

interface Prefs {
  primarySource: SourceId;
}

export default async function LookupSelection() {
  void getPreferenceValues<Prefs>();
  let text = "";
  try {
    text = (await getSelectedText()).trim();
  } catch {
    text = ((await Clipboard.readText()) ?? "").trim();
  }
  if (!text) {
    await showHUD("没有可查询的文本");
    return;
  }
  await launchCommand({
    name: "translate",
    type: LaunchType.UserInitiated,
    fallbackText: text,
  });
}
