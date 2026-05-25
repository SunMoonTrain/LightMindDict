import {
  Clipboard,
  getSelectedText,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";

const PREVIEW_LEN = 40;

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

function preview(text: string): string {
  return text.length > PREVIEW_LEN ? `${text.slice(0, PREVIEW_LEN)}…` : text;
}

export default async function LookupSelection() {
  let text = await safeSelection();
  let from: "划词" | "剪贴板" = "划词";
  if (!text) {
    text = await safeClipboard();
    from = "剪贴板";
  }

  if (!text) {
    await showHUD("没选中文本，剪贴板也空");
    return;
  }

  // 显式告诉用户抓到了什么，避免"以为划词了实际读的是旧剪贴板"
  await showHUD(`${from} → ${preview(text)}`);

  await launchCommand({
    name: "translate",
    type: LaunchType.UserInitiated,
    context: { query: text },
  });
}
