import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, LaunchProps, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getSource } from "./lib/sources";
import { ttsUrl } from "./lib/tts";
import { DictEntry, isSentence, SourceId } from "./lib/types";

type TranslateLaunchContext = { query?: string };

interface Prefs {
  wordSource: SourceId;
  translatorSource: SourceId;
  targetLanguage: string;
  ttsVoice: "us" | "uk";
}

const SOURCE_LABEL: Record<SourceId, string> = {
  "youdao-public": "有道",
  google: "Google",
  azure: "Azure",
};

const SOURCE_COLOR: Record<SourceId, Color> = {
  "youdao-public": Color.Red,
  google: Color.Blue,
  azure: Color.PrimaryText,
};

export default function Translate(props: LaunchProps<{ launchContext?: TranslateLaunchContext }>) {
  const prefs = getPreferenceValues<Prefs>();
  const initial = props.launchContext?.query ?? "";
  const [query, setQuery] = useState(initial);
  const [showDetail, setShowDetail] = useState(false);
  const trimmed = query.trim();
  const sentence = isSentence(trimmed);
  const sourceId: SourceId = sentence ? prefs.translatorSource : prefs.wordSource;

  const { data, isLoading, error } = usePromise(
    async (q: string, id: typeof sourceId): Promise<DictEntry | null> => {
      if (!q) return null;
      return getSource(id).lookup(q);
    },
    [trimmed, sourceId],
    { execute: trimmed.length > 0 },
  );

  const navTitle = `${trimmed ? (sentence ? "翻译" : "查词") : "LightMindDict"} · ${SOURCE_LABEL[sourceId]}`;
  const hasContent = !!data && ((data.explanations?.length ?? 0) > 0 || data.translations.length > 0);

  if (showDetail && data && hasContent) {
    const phonetic = phoneticOf(data);
    return (
      <Detail
        isLoading={isLoading}
        markdown={entryMarkdown(data)}
        metadata={detailMetadata(data, phonetic)}
        navigationTitle={navTitle}
        actions={
          <DetailActions
            entry={data}
            voice={prefs.ttsVoice}
            onBackToSearch={() => setShowDetail(false)}
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="输入要查的词或句子"
      navigationTitle={navTitle}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="视图模式"
          value={showDetail ? "detail" : "list"}
          onChange={(v) => setShowDetail(v === "detail")}
        >
          <List.Dropdown.Item title="列表视图" value="list" icon={Icon.AppWindowList} />
          <List.Dropdown.Item title="详情视图" value="detail" icon={Icon.AppWindowSidebarRight} />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="查询失败"
          description={`${error.message}（源：${SOURCE_LABEL[sourceId]}）`}
        />
      ) : !trimmed ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="输入要查的词"
          description={`单词 → ${SOURCE_LABEL[prefs.wordSource]} ｜ 句子 → ${SOURCE_LABEL[prefs.translatorSource]}`}
        />
      ) : data ? (
        <Results
          entry={data}
          voice={prefs.ttsVoice}
          onShowDetail={() => setShowDetail(true)}
        />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="查询中…" />
      )}
    </List>
  );
}

function Results({
  entry,
  voice,
  onShowDetail,
}: {
  entry: DictEntry;
  voice: "us" | "uk";
  onShowDetail: () => void;
}) {
  const phonetic = phoneticOf(entry);

  const sourceTag = {
    tag: { value: SOURCE_LABEL[entry.source], color: SOURCE_COLOR[entry.source] },
    tooltip: `数据源：${SOURCE_LABEL[entry.source]}`,
  };
  const subtitle = `来自 ${SOURCE_LABEL[entry.source]}`;

  const hasContent = (entry.explanations?.length ?? 0) > 0 || entry.translations.length > 0;
  if (!hasContent) {
    return (
      <List.EmptyView
        icon={Icon.QuestionMark}
        title="没有找到结果"
        description={`${entry.query}（源：${SOURCE_LABEL[entry.source]}）`}
      />
    );
  }

  return (
    <>
      {entry.explanations?.length ? (
        <List.Section title="释义" subtitle={subtitle}>
          {entry.explanations.map((line, i) => (
            <List.Item
              key={`ex-${i}`}
              icon={Icon.Book}
              title={line}
              accessories={[
                ...(phonetic && i === 0 ? [{ text: phonetic }] : []),
                ...(i === 0 ? [sourceTag] : []),
              ]}
              actions={<ListRowActions entry={entry} text={line} voice={voice} onShowDetail={onShowDetail} />}
            />
          ))}
        </List.Section>
      ) : null}
      {entry.translations.length ? (
        <List.Section title="翻译" subtitle={subtitle}>
          {entry.translations.map((line, i) => (
            <List.Item
              key={`tr-${i}`}
              icon={Icon.Text}
              title={line}
              accessories={i === 0 ? [sourceTag] : undefined}
              actions={<ListRowActions entry={entry} text={line} voice={voice} onShowDetail={onShowDetail} />}
            />
          ))}
        </List.Section>
      ) : null}
    </>
  );
}

function ListRowActions({
  entry,
  text,
  voice,
  onShowDetail,
}: {
  entry: DictEntry;
  text: string;
  voice: "us" | "uk";
  onShowDetail: () => void;
}) {
  const webUrl = browserUrlFor(entry);
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="复制" content={text} />
      <Action
        title="展开详情"
        icon={Icon.AppWindowSidebarRight}
        onAction={onShowDetail}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
      />
      <Action
        title="播放发音"
        icon={Icon.SpeakerHigh}
        onAction={() => open(ttsUrl(entry.query, voice))}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
      />
      <Action.CopyToClipboard
        title="复制完整释义"
        content={entryMarkdown(entry)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      {webUrl ? (
        <Action.OpenInBrowser
          title={`在 ${SOURCE_LABEL[entry.source]} 网页打开`}
          url={webUrl}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      ) : null}
    </ActionPanel>
  );
}

function DetailActions({
  entry,
  voice,
  onBackToSearch,
}: {
  entry: DictEntry;
  voice: "us" | "uk";
  onBackToSearch: () => void;
}) {
  const webUrl = browserUrlFor(entry);
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="复制完整释义" content={entryMarkdown(entry)} />
      <Action
        title="返回搜索"
        icon={Icon.ArrowLeft}
        onAction={onBackToSearch}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
      />
      <Action
        title="播放发音"
        icon={Icon.SpeakerHigh}
        onAction={() => open(ttsUrl(entry.query, voice))}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
      />
      {webUrl ? (
        <Action.OpenInBrowser
          title={`在 ${SOURCE_LABEL[entry.source]} 网页打开`}
          url={webUrl}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      ) : null}
    </ActionPanel>
  );
}

function phoneticOf(entry: DictEntry): string | undefined {
  if (!entry.phonetic) return undefined;
  const parts = [
    entry.phonetic.uk && `UK /${entry.phonetic.uk}/`,
    entry.phonetic.us && `US /${entry.phonetic.us}/`,
  ].filter(Boolean) as string[];
  return parts.length ? parts.join("  ") : undefined;
}

function entryMarkdown(entry: DictEntry): string {
  const lines: string[] = [`# ${entry.query}`, ""];
  const phonetic = phoneticOf(entry);
  if (phonetic) lines.push(`*${phonetic.replace("  ", "  ·  ")}*`, "");
  if (entry.explanations?.length) {
    lines.push("## 释义", "");
    entry.explanations.forEach((e) => lines.push(`- ${e}`));
    lines.push("");
  }
  if (entry.translations.length) {
    lines.push("## 翻译", "");
    entry.translations.forEach((t) => lines.push(`- ${t}`));
    lines.push("");
  }
  if (entry.examples?.length) {
    lines.push("## 例句", "");
    entry.examples.forEach((ex) => {
      lines.push(`> ${ex.src}`);
      lines.push(`>`);
      lines.push(`> ${ex.trans}`);
      lines.push("");
    });
  }
  return lines.join("\n");
}

function detailMetadata(entry: DictEntry, phonetic: string | undefined) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="数据源">
        <Detail.Metadata.TagList.Item text={SOURCE_LABEL[entry.source]} color={SOURCE_COLOR[entry.source]} />
      </Detail.Metadata.TagList>
      {entry.detectedLanguage ? <Detail.Metadata.Label title="检测语言" text={entry.detectedLanguage} /> : null}
      {phonetic ? <Detail.Metadata.Label title="音标" text={phonetic} /> : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="字数" text={String([...entry.query].length)} />
    </Detail.Metadata>
  );
}

function browserUrlFor(entry: DictEntry): string | undefined {
  const q = encodeURIComponent(entry.query);
  switch (entry.source) {
    case "youdao-public":
      return `https://dict.youdao.com/result?word=${q}&lang=en`;
    case "google":
      return `https://translate.google.com/?sl=auto&tl=zh-CN&text=${q}`;
    case "azure":
      return undefined;
  }
}
