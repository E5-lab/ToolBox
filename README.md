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
| 实用 | 数字大写转换 |
| 文本 | Markdown 编辑器 |
| 图像 | 二维码生成器 |
| 绘图 | 流程图绘制（Mermaid） |
| PDF | PDF 合并、PDF 拆分、PDF 压缩、PDF 旋转 |

> PDF / 二维码 / 流程图 依赖 `pdf-lib`、`qrcode`、`marked`、`mermaid`，在构建时由 Vite 打包进静态资源；其余工具为纯原生 JS。

## 本地开发

```bash
npm install
npm run dev      # 本地预览 http://localhost:5173
npm run build    # 产物输出到 dist/
```

## 部署到 Cloudflare（Workers + Static Assets）

Cloudflare 2025 已将 Pages 并入 Workers，纯静态站推荐用 **Workers + Static Assets** 部署：

**方式一：wrangler 命令行（推荐）**
```bash
npm run build
npx wrangler deploy        # 读取 wrangler.toml，产物 dist 作为静态资产
```
`wrangler.toml` 已配置 `not_found_handling = "single-page-application"`，支持前端路由刷新不 404。

**方式二：Cloudflare Dashboard**
1. Workers & Pages → Create → 导入 Git 仓库 `E5-lab/ToolBox`
2. 构建命令：`npm run build`，输出目录：`dist`
3. 保存并部署，之后每次 push 自动构建

## 目录结构

```
src/
  App.vue                 # 顶层布局 + 主题（暗/亮）
  main.ts                 # 应用入口
  router/index.ts         # 路由（工具自动注册）
  pages/Home.vue          # 首页：分类网格 + 搜索
  components/             # ToolPage / ToolCard 共享组件
  composables/useCopy.ts  # 复制工具
  tools/                  # 每个工具一个文件夹（index.ts 元数据 + index.vue 组件）
    index.ts              # 汇总所有工具并导出
    <tool>/index.ts       # 工具元数据（path/name/category/icon…）
    <tool>/index.vue      # 工具界面
```

## 新增一个工具

1. 在 `src/tools/` 下新建文件夹，例如 `my-tool/`；
2. 写 `index.vue`（组件，使用 `<ToolPage>` 包裹标题与内容）；
3. 写 `index.ts` 导出 `Tool` 元数据（见 `src/tools/types.ts`）；
4. 在 `src/tools/index.ts` 的数组里加上该工具。

首页、搜索、路由会**自动生效**，无需改动其他文件。
