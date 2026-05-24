# LightMindDict

一个面向 **Raycast for Windows** 的轻量词典插件，主打"查得快、看得清、源可换"。

## 特性

- 🔍 划词 / 输入即查，结果秒回
- 📚 支持中英互译、单词释义、例句、音标
- 🔊 发音播放（在线 TTS）
- 🕘 查询历史与生词本（本地存储）
- 🔄 **多词典源可切换**，默认走免费源，按需替换
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

### 可换源（路线图）

- 有道智云开放平台（官方 API）
- 百度翻译开放平台
- DeepL API
- 欧路词典（Eudic）API
- 自定义 HTTP 源（指定 URL 模板与字段映射）

## 安装

> 需要 Raycast for Windows（公测版及以上）。

```powershell
git clone https://github.com/<you>/LightMindDict.git
cd LightMindDict
npm install
npm run dev
```

在 Raycast 中通过 "Import Extension" 加载本目录即可。

## 使用

- `Translate` — 输入框直接查词 / 句
- `Lookup Selection` — 对当前选中文本查词（可绑定全局快捷键）
- `History` — 浏览最近查询
- `Wordbook` — 管理生词本

## 配置

打开 Raycast → Extensions → LightMindDict → Preferences：

- **Primary Source**：主词典源
- **Fallback Source**：主源失败时的回退源
- **Target Language**：默认目标语言（auto / zh / en …）
- **TTS Voice**：发音偏好（美音 / 英音）
- **API Keys**：付费源的认证信息（可选）

## 开发

```powershell
npm run dev        # 开发模式，热重载
npm run build      # 打包
npm run lint       # 代码检查
```

技术栈：TypeScript + React + Raycast API。

## 路线图

- [ ] MVP：有道源 + 输入查词 + 发音
- [ ] 划词查询（选中文本触发）
- [ ] 生词本导出（Anki / CSV）
- [ ] 自定义 HTTP 源
- [ ] 离线词库支持（StarDict / MDX）

## 许可

MIT
