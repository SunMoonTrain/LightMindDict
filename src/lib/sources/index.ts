import { DictSource, SourceId } from "../types";
import { azure } from "./azure";
import { google } from "./google";
import { jisho } from "./jisho";
import { youdaoPublic } from "./youdao-public";

const registry: Record<SourceId, DictSource> = {
  "youdao-public": youdaoPublic,
  google,
  azure,
  jisho,
};

export function getSource(id: SourceId): DictSource {
  return registry[id];
}
