import { Action, ActionPanel, Color, getPreferenceValues, Icon, LaunchProps, List, open } from "@raycast/api";
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
  defaultView: "list" | "detail";
}

type SectionKind = "explanations" | "translations" | "examples";

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

const SECTION_LABEL: Record<SectionKind, string> = {
  explanations: "释义",
  translations: "翻译",
  examples: "例句",
};

const SECTION_ICON: Record<SectionKind, Icon> = {
  explanations: Icon.Book,
  translations: Icon.Text,
  examples: Icon.QuoteBlock,
};

export default function Translate(props: LaunchProps<{ launchContext?: TranslateLaunchContext }>) {
  const prefs = getPreferenceValues<Prefs>();
  const initial = props.launchContext?.query ?? "";
  const [query, setQuery] = useState(initial);
  const [showDetail, setShowDetail] = useState(prefs.defaultView === "detail");
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

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && hasContent}
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
      ) : data && hasContent ? (
        showDetail ? (
          <DetailSections entry={data} voice={prefs.ttsVoice} />
        ) : (
          <ListRows entry={data} voice={prefs.ttsVoice} onShowDetail={() => setShowDetail(true)} />
        )
      ) : data ? (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="没有找到结果"
          description={`${data.query}（源：${SOURCE_LABEL[data.source]}）`}
        />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="查询中…" />
      )}
    </List>
  );
}

function DetailSections({ entry, voice }: { entry: DictEntry; voice: "us" | "uk" }) {
  const sourceTag = {
    tag: { value: SOURCE_LABEL[entry.source], color: SOURCE_COLOR[entry.source] },
    tooltip: `数据源：${SOURCE_LABEL[entry.source]}`,
  };
  const sections: SectionKind[] = [];
  if (entry.explanations?.length) sections.push("explanations");
  if (entry.translations.length) sections.push("translations");
  if (entry.examples?.length) sections.push("examples");

  return (
    <>
      {sections.map((kind) => (
        <List.Item
          key={kind}
          icon={SECTION_ICON[kind]}
          title={SECTION_LABEL[kind]}
          subtitle={`${countOf(entry, kind)} 项`}
          accessories={[sourceTag]}
          detail={<List.Item.Detail markdown={sectionMarkdown(entry, kind)} />}
          actions={<DetailRowActions entry={entry} kind={kind} voice={voice} />}
        />
      ))}
    </>
  );
}

function ListRows({
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
        content={fullMarkdown(entry)}
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

function DetailRowActions({
  entry,
  kind,
  voice,
}: {
  entry: DictEntry;
  kind: SectionKind;
  voice: "us" | "uk";
}) {
  const webUrl = browserUrlFor(entry);
  return (
    <ActionPanel>
      <Action.CopyToClipboard title={`复制${SECTION_LABEL[kind]}`} content={sectionPlain(entry, kind)} />
      <Action.CopyToClipboard
        title="复制完整释义"
        content={fullMarkdown(entry)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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

function countOf(entry: DictEntry, kind: SectionKind): number {
  switch (kind) {
    case "explanations":
      return entry.explanations?.length ?? 0;
    case "translations":
      return entry.translations.length;
    case "examples":
      return entry.examples?.length ?? 0;
  }
}

function sectionMarkdown(entry: DictEntry, kind: SectionKind): string {
  const lines: string[] = [`# ${entry.query}`, ""];
  const phonetic = phoneticOf(entry);
  if (phonetic) lines.push(`*${phonetic.replace("  ", "  ·  ")}*`, "");
  lines.push(`## ${SECTION_LABEL[kind]}`, "");
  if (kind === "explanations") {
    entry.explanations?.forEach((e) => lines.push(`- ${e}`));
  } else if (kind === "translations") {
    entry.translations.forEach((t) => lines.push(`- ${t}`));
  } else {
    entry.examples?.forEach((ex) => {
      lines.push(`> ${ex.src}`);
      lines.push(`>`);
      lines.push(`> ${ex.trans}`);
      lines.push("");
    });
  }
  return lines.join("\n");
}

function sectionPlain(entry: DictEntry, kind: SectionKind): string {
  if (kind === "explanations") return (entry.explanations ?? []).join("\n");
  if (kind === "translations") return entry.translations.join("\n");
  return (entry.examples ?? []).map((ex) => `${ex.src}\n${ex.trans}`).join("\n\n");
}

function fullMarkdown(entry: DictEntry): string {
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
