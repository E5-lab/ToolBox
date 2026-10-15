# 我的工具箱（My Toolbox）

一个纯前端的在线工具集合站，**数据不出浏览器**。技术栈与设计语言完全参考 [it-tools](https://github.com/CorentinTh/it-tools)：

- **Vue 3** + **TypeScript** + **Vite**
- **Naive UI** 组件库（暗色 / 亮色主题，与 it-tools 一致）
- **Vue Router** 客户端路由（SPA）
- 工具逻辑全部在浏览器本地计算，不依赖后端、不上传数据

## 内置工具

| 分类 | 工具 |
|---|---|
| 开发 | JSON 格式化、时间戳转换、Base64 编解码、UUID 生成器 |
| 文本 | Markdown 编辑器、百家姓编解码、数字大写转换 |
| 图像 | 二维码生成器、流程图绘制（Mermaid） |
| PDF | PDF 合并、PDF 拆分、PDF 压缩、PDF 旋转 |

> PDF / 二维码 / 流程图 / Markdown 依赖 `pdf-lib`、`qrcode`、`mermaid`、`marked`，在构建时由 Vite 打包进静态资源；其余工具为纯原生 JS。

## 界面结构

- **顶栏**：品牌 logo + 全局搜索框（跨分类实时过滤）+ **我的收藏 / 最近使用**（弹窗列表）+ 主题切换
- **一级菜单**（顶部）：大类切换（文本处理 / 开发工具 / 图像工具 / 文档工具），带工具计数
- **二级菜单**（左侧）：当前大类下的子分类，带计数与高亮指示条
- **功能选择**（右侧）：该子分类下的工具卡片网格（带边框、图标块、收藏星标）
- **快捷区**：首页右上方展示「我的收藏」「最近使用」的快捷标签，一键直达
- **工具页**：统一的卡片容器（返回首页、标题、描述、内容区）

### 收藏与最近使用

- **收藏**：点击任意工具卡片右上角的 ☆ 切换，数据存于浏览器 `localStorage`（`toolbox:favorites`）
- **最近使用**：进入工具页自动记录，保留最近 12 个并去重置顶（`toolbox:recents`）
- 顶栏两个入口以弹窗展示完整列表；首页右上方以标签形式展示前 8 个
- 均为纯本地存储，不上传任何数据

## 本地开发

```bash
npm install
npm run dev      # 本地预览 http://localhost:5173
npm run build    # 产物输出到 dist/
```

## 部署到 Cloudflare

本项目是纯静态 SPA，产物为 `dist/`，通过 **Workers + Static Assets** 托管。

`wrangler.toml` 核心配置：
```toml
name = "toolbox"
compatibility_date = "2025-01-01"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

> 注意：**不要**在 `[assets]` 里写 `binding = "ASSETS"`。`ASSETS` 是 Cloudflare 的保留绑定名，
> 会导致部署报错 `The name 'ASSETS' is reserved`。省略 `binding` 即可自动使用静态资产托管。

**方式一：wrangler 命令行**
```bash
npm install
npm run build
npx wrangler deploy
```

**方式二：Cloudflare Dashboard 连接 Git**
1. Workers & Pages → Create → 导入 Git 仓库 `E5-lab/ToolBox`
2. 构建命令：`npm run build`
3. 部署命令：`npx wrangler deploy`（读取 `wrangler.toml` 中的 `[assets]`）
4. 保存并部署，之后每次 push 自动构建

**SPA 路由回退**：由 `wrangler.toml` 的 `not_found_handling = "single-page-application"` 统一处理，
无需 `public/_redirects`（二者同时存在会被判定为无限循环规则而部署失败）。

## 目录结构

```
src/
  App.vue                 # 顶层布局 + 顶栏（品牌/搜索/收藏/最近/主题）
  main.ts                 # 应用入口
  router/index.ts         # 路由（工具自动注册 + 记录最近使用）
  pages/Home.vue          # 首页：一级菜单 + 二级菜单 + 快捷区 + 卡片网格
  components/             # ToolPage / ToolCard / QuickAccess 共享组件
  composables/            # useCopy（复制）、useSearch（搜索）、useFavorites（收藏/最近）
  tools/                  # 每个工具一个文件夹（index.ts 元数据 + index.vue 组件）
    index.ts              # 汇总工具、两级分类与过滤函数
    <tool>/index.ts       # 工具元数据（path/name/group/category/icon…）
    <tool>/index.vue      # 工具界面
```

## 新增一个工具

1. 在 `src/tools/` 下新建文件夹，例如 `my-tool/`；
2. 写 `index.vue`（组件，使用 `<ToolPage>` 包裹标题与内容）；
3. 写 `index.ts` 导出 `Tool` 元数据（见 `src/tools/types.ts`）；
4. 在 `src/tools/index.ts` 的数组里加上该工具。

首页、搜索、路由会**自动生效**，无需改动其他文件。

## 声学计算模块（9 个）

在「声学计算」一级分类下，按四个二级分类组织，计算逻辑统一由 `src/audio/kernel/` 的
纯函数内核提供（ESM，可在 Node 直接 import 做单测），视图层只负责输入与呈现。

| 二级分类 | 工具 | 路由 | 说明 |
|---|---|---|---|
| 基础计算 | 穿孔率计算 | `/audio-perforation` | 穿孔板/微穿孔板开孔率，按阵列形制由孔径与中心距求得，含微穿孔板共振频率 |
| 基础计算 | 声压级叠加计算 | `/audio-levels` | 能量叠加、增量法、相干叠加、背景修正、距离衰减、声功率级换算 |
| 材料与构件 | 多孔吸声材料阻抗 | `/audio-absorber` | Delany–Bazley 模型，含材料预设、NRC、建议厚度 |
| 材料与构件 | 墙体隔声量 Rw / STC | `/audio-stc` | GB/T 50121-2005 计权隔声量 Rw + C/Ctr，ASTM E413 STC，双层墙 |
| 房间声学 | 室内混响时间 RT60 | `/audio-rt60` | Sabine / Eyring 双公式，材料库、房间用途目标值对照 |
| 房间声学 | 背景噪声评价 | `/audio-noise` | A 声级、NC/NR/RC Mark II 曲线评价，含低频一致性、QAI、RV |
| 房间声学 | 声屏障衰减 | `/audio-barrier` | 菲涅尔数 + Kurze–Anderson / Maekawa，声源谱、所需高度反算 |
| 环境与振动 | 弹簧减振器隔振效率 | `/audio-vibration` | 静变形法与频率比法并行校核，含厂家计算书复核、环新式复核 |
| 环境与振动 | 消声器计算 | `/audio-muffler` | 阻性（别洛夫式）、抗性（扩张室/共振腔）、组合验算与 A 计权 |

> 消声器目前没有统一的「设计计算」国家标准，现行标准（GB/T 25516、ISO 7235、
> GB/T 4760、GB/T 19512 等）规定的都是**测量**方法；模块中的设计公式来自
> GB/T 50087-2013 §6.3 与经典声学手册。

### 相关目录

```
src/audio/
  kernel/            # 9 个计算内核（纯函数，UMD→ESM 移植）
  AudioChart.vue     # 基于内核 chart-util.js 的 canvas 曲线组件
  PORTING_GUIDE.md   # 内核移植规范（新增模块时必读）
```

### 验证

```bash
node verify-kernel.mjs    # 内核自检 31 项
npm run build && node verify-toolbox.mjs   # 端到端 119 项（需先起本地静态服务）
```

`verify-toolbox.mjs` 用无头 Edge + 原生 CDP 驱动：核对 9 个工具在首页的入口与分类归属、
逐个路由可达与标题、声压级叠加三面板的关键数值与交互（增删声源、载入示例、相位预设切换、
线/点声源切换、背景修正与换算数值），并断言全程无未捕获 JS 异常。

