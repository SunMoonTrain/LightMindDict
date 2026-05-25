# LightMindDict

一个面向 **Raycast for Windows** 的轻量词典插件，主打"查得快、看得清、源可换"。

## 特性

- 🔍 划词 / 输入即查，结果秒回
- 📚 中英互译、日中互译、单词释义、例句、音标
- 🔊 发音播放（在线 TTS）
- 🌐 **输入语言自动识别**（按 Unicode 区段，含假名 → 日、汉字-only → 中日并发双查）
- 🪟 列表 / 详情 双视图，默认视图可配置
- 💾 进程内 LRU 缓存（200 条），相同 `(源, 词)` 不重复发请求
- 🔄 **单词源、翻译源分开配置**，默认走免费源，按需替换
- ⚙️ 全部配置项暴露在 Raycast Preferences 中，无需改代码

## 词典源

默认使用 **免费 / 无需 Key** 的公开接口，开箱即用：

| 源 | 说明 | 是否需要 Key | 默认 |
| --- | --- | --- | --- |
| 有道公开接口 (`dict.youdao.com/jsonapi`) | 中英 + 日中互译、释义、例句、音标 | 否 | ✅ 单词 |
| Jisho (`jisho.org/api/v1/search/words`) | 专做日语（JMdict），假名/汉字/罗马字关联，JLPT 级别 | 否 | 可选 |
| Google Translate (`translate.googleapis.com`) | 句子翻译，多语种 | 否 | ✅ 句子 |
| 有道 TTS (`dict.youdao.com/dictvoice`) | 单词发音 | 否 | ✅ |
| Azure Translator | 句子翻译，企业级稳定 | 是 | 可选 |

**单词源 / 翻译源分开配置**：根据输入自动判断（含空格 / 标点 / 长度 > 10 视为句子）。默认单词走有道、句子走 Google。两个源都可以独立切换。

**有道的多语种支持**：扩展会按输入脚本自动检测语言并传 `le` 参数给有道——含假名 → 激活日中词库，含谚文 → 韩中词库，等。**纯汉字是真歧义**（如 "林檎" 在中日都是真词），会并发查询中文与日语两套字典并合并结果。

**专做日语用 Jisho**：JMdict 数据，覆盖最全。假名 / 汉字 / 罗马字三种写法互相关联，附带 JLPT 等级和常用度标记。如果你日语查得多，把 Word Source 切到 Jisho。

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
  > ⚠ **已知问题（Raycast Windows beta 平台层）**：`getSelectedText()` 在 Windows beta 上经常抓不到选区，会回退到读剪贴板。这是 Raycast 平台 API 的稳定性问题，不是本扩展的 bug —— 等他们修。当前应对方式：触发后 HUD 会显示来源（`划词 → xxx` 或 `⚠ 剪贴板 → xxx`）；看到 ⚠ 标记且内容不是想查的，就先 Ctrl+C 复制目标文本再触发一次（这次必走剪贴板路径，能拿到刚复制的内容）。
- `Configure Azure` — 配置 Azure Translator 的 Key / Region（仅选 Azure 源时需要）

视图切换：搜索栏右侧 Dropdown 在列表视图 / 详情视图之间切换；默认视图在 Preferences 里设置。

## 配置

打开 Raycast → Extensions → LightMindDict → Preferences：

- **Word Source**：单词源（默认有道；日语场景可换成 Jisho）
- **Translator Source**：翻译源（默认 Google）
- **Target Language**：**输出**语言（auto / 中 / 英 / 日 / 韩 / 西 / 法 / 德 / 俄 / 葡 / 意 / 阿 / 印 / 泰 / 越）
  - 影响 Google / Azure 翻译方向；**不影响**有道的输入语言判定（那个完全自动）
  - auto：含 CJK → 输出英文；否则 → 输出中文
- **Default View**：Translate 命令打开时的初始视图（列表 / 详情）
- **TTS Voice**：发音偏好（美音 / 英音）

Azure 的 Key 与 Region 不在偏好里 —— 通过 `Configure Azure` 命令打开表单填写，保存在 Raycast LocalStorage，不需要 Azure 时偏好面板里完全看不到。

## 输入语言自动识别

扩展通过 Unicode 区段判断输入是哪种语言，用来选合适的字典：

| 输入特征 | 识别为 | 处理 |
| --- | --- | --- |
| 含假名（ひらがな / カタカナ） | 日语 | 有道用 `le=jap`；激活日中词库 |
| 含谚文（한글） | 韩语 | 有道用 `le=ko` |
| 含西里尔字母（Кириллица） | 俄语 | 有道用 `le=ru` |
| 纯汉字 | **中日歧义** | 有道**并发跑两套**：中文模式 + 日语模式，合并结果 |
| 纯拉丁字母 | 英语（默认） | 有道用默认（中英） |

所以你不用手动告诉扩展"这是日语词"——直接查 `にほんご` / `日本語` / `林檎` / `りんご` / `안녕` 都能识别。

## 开发

```powershell
npm run dev        # 开发模式，热重载
npm run build      # 打包
npm run lint       # 代码检查
```

技术栈：TypeScript + React + Raycast API。

## 许可

MIT
