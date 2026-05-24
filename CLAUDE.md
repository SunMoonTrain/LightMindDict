# CLAUDE.md

面向未来 Claude Code 会话的项目工作笔记。

## 项目定位

LightMindDict 是面向 **Raycast for Windows** 的轻量词典插件。**个人自用，已发布 v0.1.0，不打算提交 Raycast Store**。代码仓库：https://github.com/SunMoonTrain/LightMindDict

## 技术栈

- Raycast API + React + TypeScript（strict）
- 数据源（HTTP 拉取）：Youdao 公开接口 / Google Translate free endpoint / Azure Translator
- Prettier 3.8.3 强制格式

## 常用命令

```powershell
npm run dev        # ray develop，热重载（改 manifest 要重启）
npm run build      # ray build -e dist
npm run lint       # ray lint，提交前跑
npm run fix-lint   # ray lint --fix，自动套 Prettier
```

## 目录结构

```
src/
├── translate.tsx          # 主命令：查词 / 翻译，列表视图 + 详情视图
├── lookup-selection.tsx   # no-view 命令，通过 launchContext 把选中文本送给 translate
├── configure-azure.tsx    # Form，把 Azure Key/Region 存进 LocalStorage
└── lib/
    ├── types.ts           # SourceId / DictEntry / DictSource / isSentence()
    ├── lang.ts            # resolveTarget()：目标语言映射 + auto 检测
    ├── tts.ts             # 有道发音 URL 构造
    ├── azure-config.ts    # Azure 凭据 LocalStorage 读写
    └── sources/
        ├── index.ts            # 源注册表，getSource(id) → DictSource
        ├── youdao-public.ts    # 默认单词源（dict.youdao.com/jsonapi）
        ├── google.ts           # 默认翻译源（translate.googleapis.com，免费、可能需代理）
        └── azure.ts            # Azure Translator（从 LocalStorage 读凭据）

assets/
└── extension-icon.png     # 512x512，黑/橙/红/奶白配色

package.json               # Raycast manifest（commands / preferences / scripts）
```

## 关键约定

- **commit message 用中文**（subject + body），HEREDOC 传入；Co-Authored-By 保持英文格式
- **单词源 / 翻译源分开**：`translate.tsx` 用 `isSentence(query)`（含空格 / 中英文标点 / 长度 > 10）做路由
- **新源接入**：实现 `DictSource` 接口，注册到 `sources/index.ts`。源自己从 prefs / LocalStorage 读凭据
- **目标语言 `auto`**：含 CJK → 译成英文，否则译成中文
- **Azure 凭据走 LocalStorage**（不走偏好）—— 因为 Raycast 偏好 schema 不支持条件可见，不选 Azure 时面板就该看不到这些字段

## 已知约束 / 平台坑

1. **`<Action>` 自定义 `shortcut` 在 Raycast Windows beta 不响应**（连 SDK 内建快捷键也不行）。UI 不要依赖键盘快捷键，用 `<List.Dropdown>` 或主动作 Enter。声明可以留着，等平台修复自动生效
2. **`<Detail>` 没有 searchBar** —— 详情视图通过 `<List isShowingDetail>` + Section 行（释义 / 翻译 / 例句各 1 行）实现，左列承担"段落导航"职责
3. **manifest 改动需重启 `ray develop`**，热重载只覆盖代码
4. **LF → CRLF 警告可忽略**（Windows Git 默认行为，不影响内容）

## 范围外（用户明确不做）

- 查询历史 / 生词本（"我自己都不用"）
- Anki / CSV 导出
- 离线词库（StarDict / MDX）
- 提交 Raycast Store（中文 UI + 非官方 endpoint，风险大）

## 偏好（package.json `preferences`）

- `wordSource`：单词源，默认 `youdao-public`
- `translatorSource`：翻译源，默认 `google`
- `targetLanguage`：目标语言，`auto | zh-CHS | en | ja`
- `defaultView`：Translate 命令初始视图，`list | detail`
- `ttsVoice`：发音口音，`us | uk`

## 命令清单（package.json `commands`）

- `translate`（view）—— 主查词，搜索栏 + List/Detail 双视图
- `lookup-selection`（no-view）—— 抓选中文本（fallback 到剪贴板），调 launchCommand 唤起 translate
- `configure-azure`（view）—— Azure Key/Region 表单
