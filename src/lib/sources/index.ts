import { DictSource, SourceId } from "../types";
import { youdaoPublic } from "./youdao-public";

const registry: Partial<Record<SourceId, DictSource>> = {
  "youdao-public": youdaoPublic,
};

export function getSource(id: SourceId): DictSource {
  const src = registry[id];
  if (src) return src;
  // 其它源（youdao-cloud / baidu / deepl / custom）暂未实现，回退到免费源
  return youdaoPublic;
}
