import {
  Clipboard,
  getSelectedText,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";

export default async function LookupSelection() {
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
    context: { query: text },
  });
}
