# LightMindDict

一个面向 **Raycast for Windows** 的轻量词典插件，主打"查得快、看得清、源可换"。

## 特性

- 🔍 划词 / 输入即查，结果秒回
- 📚 支持中英互译、单词释义、例句、音标
- 🔊 发音播放（在线 TTS）
- 🪟 列表 / 详情 双视图，默认视图可配置
- 🔄 **单词源、翻译源分开配置**，默认走免费源，按需替换
- ⚙️ 全部配置项暴露在 Raycast Preferences 中，无需改代码

## 词典源

默认使用 **免费 / 无需 Key** 的公开接口，开箱即用：

| 源 | 说明 | 是否需要 Key | 默认 |
| --- | --- | --- | --- |
| 有道公开接口 (`dict.youdao.com/jsonapi`) | 中英互译、释义、例句、音标 | 否 | ✅ 单词 |
| Google Translate (`translate.googleapis.com`) | 句子翻译，多语种 | 否 | ✅ 句子 |
| 有道 TTS (`dict.youdao.com/dictvoice`) | 单词发音 | 否 | ✅ |
| Azure Translator | 句子翻译，企业级稳定 | 是 | 可选 |

**单词源 / 翻译源分开配置**：根据输入自动判断（含空格 / 标点 / 长度 > 10 视为句子）。默认单词走有道、句子走 Google。两个源都可以独立切换到 Google / Azure / 有道。

> 免费接口为非官方公开端点，可能限流或调整，请合理使用。Google Translate 在国内访问可能需代理，遇到不通可切换到 Azure。

### 待办源（看需求决定是否补）

- 有道智云开放平台（官方 API）
- 百度翻译开放平台
- DeepL API
- 自定义 HTTP 源（指定 URL 模板与字段映射）

## 安装

> 需要 Raycast for Windows（公测版及以上）。

```powershell
git clone https://github.com/SunMoonTrain/LightMindDict.git
cd LightMindDict
npm install
npm run dev
```

在 Raycast 中通过 "Import Extension" 加载本目录即可（首次需保留 `npm run dev` 运行；之后用 `npm run build` 后可独立加载 `dist/`）。

## 使用

- `Translate` — 输入框直接查词 / 句
- `Lookup Selection` — 对当前选中文本查词（推荐在 Raycast 偏好里绑全局快捷键）
- `Configure Azure` — 配置 Azure Translator 的 Key / Region（仅选 Azure 源时需要）

视图切换：搜索栏右侧 Dropdown 在列表视图 / 详情视图之间切换；默认视图在 Preferences 里设置。

## 配置

打开 Raycast → Extensions → LightMindDict → Preferences：

- **Word Source**：单词源（默认有道）
- **Translator Source**：翻译源（默认 Google）
- **Target Language**：默认目标语言（auto / 中 / 英 / 日 / 韩 / 西 / 法 / 德 / 俄 / 葡 / 意 / 阿 / 印 / 泰 / 越），auto 含 CJK → 英、否则 → 中。多语言场景建议把 Translator Source 切到 Google 或 Azure（Youdao 公开接口主要服务中英互译）
- **Default View**：Translate 命令打开时的初始视图（列表 / 详情）
- **TTS Voice**：发音偏好（美音 / 英音）

Azure 的 Key 与 Region 不在偏好里 —— 通过 `Configure Azure` 命令打开表单填写，保存在 Raycast LocalStorage，不需要 Azure 时偏好面板里完全看不到。

## 开发

```powershell
npm run dev        # 开发模式，热重载
npm run build      # 打包
npm run lint       # 代码检查
```

技术栈：TypeScript + React + Raycast API。

## 许可

MIT
