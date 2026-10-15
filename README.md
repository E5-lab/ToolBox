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
