import {
  Clipboard,
  getSelectedText,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";

async function safeSelection(): Promise<string> {
  try {
    return (await getSelectedText()).trim();
  } catch {
    return "";
  }
}

async function safeClipboard(): Promise<string> {
  try {
    return ((await Clipboard.readText()) ?? "").trim();
  } catch {
    return "";
  }
}

export default async function LookupSelection() {
  // Raycast Windows beta 的 getSelectedText() 在抓不到选区时
  // 有时抛异常、有时返回空串，两种都要兜底到剪贴板。
  let text = await safeSelection();
  if (!text) text = await safeClipboard();

  if (!text) {
    await showHUD("没选中文本，剪贴板也空");
    return;
  }

  await launchCommand({
    name: "translate",
    type: LaunchType.UserInitiated,
    context: { query: text },
  });
}
