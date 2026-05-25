import { DictSource, SourceId } from "../types";
import { azure } from "./azure";
import { freeDictionary } from "./free-dictionary";
import { google } from "./google";
import { youdaoPublic } from "./youdao-public";

const registry: Record<SourceId, DictSource> = {
  "youdao-public": youdaoPublic,
  google,
  azure,
  "free-dictionary": freeDictionary,
};

export function getSource(id: SourceId): DictSource {
  return registry[id];
}
