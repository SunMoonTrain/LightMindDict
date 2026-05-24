import { DictSource, isSentence, SourceId, SourceMode } from "../types";
import { azure } from "./azure";
import { google } from "./google";
import { youdaoPublic } from "./youdao-public";

const registry: Record<SourceId, DictSource> = {
  "youdao-public": youdaoPublic,
  google,
  azure,
};

export function getSource(id: SourceId): DictSource {
  return registry[id];
}

export function resolveSourceId(mode: SourceMode, query: string): SourceId {
  if (mode === "smart") return isSentence(query) ? "google" : "youdao-public";
  return mode;
}
