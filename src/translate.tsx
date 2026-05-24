import { Action, ActionPanel, getPreferenceValues, Icon, List, open } from "@raycast/api";
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

export default function Translate() {
  const prefs = getPreferenceValues<Prefs>();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const sourceId: SourceId = isSentence(trimmed) ? prefs.translatorSource : prefs.wordSource;

  const { data, isLoading, error } = usePromise(
    async (q: string, id: typeof sourceId): Promise<DictEntry | null> => {
      if (!q) return null;
      return getSource(id).lookup(q);
    },
    [trimmed, sourceId],
    { execute: trimmed.length > 0 },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="输入要查的词或句子"
      throttle
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="查询失败" description={error.message} />
      ) : !trimmed ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="输入要查的词" />
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

  const hasContent = (entry.explanations?.length ?? 0) > 0 || entry.translations.length > 0;
  if (!hasContent) {
    return <List.EmptyView icon={Icon.QuestionMark} title="没有找到结果" description={entry.query} />;
  }

  return (
    <>
      {entry.explanations?.length ? (
        <List.Section title="释义">
          {entry.explanations.map((line, i) => (
            <List.Item
              key={`ex-${i}`}
              icon={Icon.Book}
              title={line}
              accessories={phonetic && i === 0 ? [{ text: phonetic }] : undefined}
              actions={<EntryActions entry={entry} text={line} voice={voice} />}
            />
          ))}
        </List.Section>
      ) : null}
      {entry.translations.length ? (
        <List.Section title="翻译">
          {entry.translations.map((line, i) => (
            <List.Item
              key={`tr-${i}`}
              icon={Icon.Text}
              title={line}
              actions={<EntryActions entry={entry} text={line} voice={voice} />}
            />
          ))}
        </List.Section>
      ) : null}
    </>
  );
}

function EntryActions({ entry, text, voice }: { entry: DictEntry; text: string; voice: "us" | "uk" }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="复制" content={text} />
      <Action
        title="播放发音"
        icon={Icon.SpeakerHigh}
        onAction={() => open(ttsUrl(entry.query, voice))}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
      />
      <Action.OpenInBrowser
        title="在有道网页打开"
        url={`https://dict.youdao.com/result?word=${encodeURIComponent(entry.query)}&lang=en`}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    </ActionPanel>
  );
}
