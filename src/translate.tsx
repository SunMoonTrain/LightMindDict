import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getSource } from "./lib/sources";
import { ttsUrl } from "./lib/tts";
import { DictEntry, isSentence, SourceId } from "./lib/types";

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

export default function Translate() {
  const prefs = getPreferenceValues<Prefs>();
  const [query, setQuery] = useState("");
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

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="输入要查的词或句子"
      navigationTitle={navTitle}
      throttle
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
        <Results entry={data} voice={prefs.ttsVoice} />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="查询中…" />
      )}
    </List>
  );
}

function Results({ entry, voice }: { entry: DictEntry; voice: "us" | "uk" }) {
  const phonetic = entry.phonetic
    ? [entry.phonetic.uk && `UK /${entry.phonetic.uk}/`, entry.phonetic.us && `US /${entry.phonetic.us}/`]
        .filter(Boolean)
        .join("  ")
    : undefined;

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
              actions={<EntryActions entry={entry} text={line} voice={voice} />}
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
              actions={<EntryActions entry={entry} text={line} voice={voice} />}
            />
          ))}
        </List.Section>
      ) : null}
    </>
  );
}

function EntryActions({ entry, text, voice }: { entry: DictEntry; text: string; voice: "us" | "uk" }) {
  const webUrl = browserUrlFor(entry);
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="复制" content={text} />
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
