import { DictSource, SourceId } from "../types";
import { azure } from "./azure";
import { google } from "./google";
import { wiktionary } from "./wiktionary";
import { youdaoPublic } from "./youdao-public";

const registry: Record<SourceId, DictSource> = {
  "youdao-public": youdaoPublic,
  google,
  azure,
  wiktionary,
};

export function getSource(id: SourceId): DictSource {
  return registry[id];
}
