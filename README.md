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
| 有道公开接口 (`dict.youdao.com/jsonapi`) | 中英互译、释义、例句、音标 | 否 | ✅ |
| 有道 TTS (`dict.youdao.com/dictvoice`) | 单词发音 | 否 | ✅ |
| Bing 词典 | 备用释义 / 例句 | 否 | 可选 |
| Free Dictionary API (`dictionaryapi.dev`) | 英英释义 | 否 | 可选 |

> 免费接口为非官方公开端点，可能限流或调整，请合理使用。

### 可换源（付费 / 高质量）

在 Preferences 里填上对应 Key 即可切换：

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
