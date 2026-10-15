# 我的工具箱 (My Toolbox)

纯前端在线工具集合，**数据不出浏览器**。两类工具并存：

- **专属工具**（本仓库，Astro 静态站，自己写 JS 逻辑）
- **it-tools 现成底座**（fork 部署，70+ 开发者工具，见下文「轨道 A」）

---

## 目录结构

```
my-toolbox/
├── astro.config.mjs        # 静态输出配置（output: 'static'）
├── wrangler.toml           # Cloudflare Workers 静态资产部署配置
├── src/
│   ├── data/tools.ts       # 工具清单（新增工具在此登记）
│   ├── layouts/Base.astro  # 页面基础布局
│   ├── components/         # Nav / Footer / ToolCard / SearchBar
│   ├── pages/
│   │   ├── index.astro     # 首页：分类导航 + 实时搜索
│   │   └── tools/          # 各工具独立页面（自己写逻辑）
│   │       ├── json-formatter.astro
│   │       └── timestamp.astro
│   └── styles/global.css
```

---

## 本地开发

```bash
npm install
npm run dev      # 默认 http://localhost:4321
```

---

## 部署到 Cloudflare（Workers + Static Assets）

> **Cloudflare 2025 改版提醒**：Pages 已并入 **Workers**。现在纯静态站统一用 **Workers + Static Assets** 部署，**不再有独立的 Pages 控制台入口**——你之前找不到 Pages 路径就是这个原因。本方案完全走 Workers，复用你现有的 Cloudflare 账号。

### 方式一：wrangler CLI（推荐，最稳、最可控）

```bash
npm install
npm run build
npx wrangler deploy
```

首次运行会打开浏览器让你登录 Cloudflare 账号。部署完成后拿到 `https://my-toolbox.<sub>.workers.dev` 域名。

### 方式二：Cloudflare Dashboard（Workers Builds 连接 Git）

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 左侧菜单 **Workers & Pages**（改版后的统一入口）
3. 右上角 **Create** → 选 **Worker** → 选「从 Git 仓库导入 / Connect to Git」
4. 选择你的 GitHub 仓库，构建配置：
   - 框架预设：Astro（或自定义）
   - 构建命令：`npm run build`
   - 输出目录：`dist`
5. 部署完成后，在 **Settings → Triggers / Domains** 绑定自定义域名（如 `tools.yourdomain.com`），Cloudflare 自动签发证书。

### 绑定自定义域名

在 Worker 的 Settings → Triggers → Custom Domains 添加你的子域，Cloudflare 自动配置 DNS 与 HTTPS。

---

## 轨道 A：部署 it-tools 作为现成底座

[it-tools](https://github.com/CorentinTh/it-tools) 是成熟的开发者工具集合（70+ 工具，Vue 3 纯静态站，数据不出浏览器）。

1. **Fork** 仓库到你的 GitHub
2. **本地构建**（产出 `dist/`）：

   ```bash
   pnpm install
   pnpm build
   ```

3. **部署到 Cloudflare Workers**（静态资产 + SPA 回退）。在 it-tools 项目根加 `wrangler.toml`：

   ```toml
   name = "it-tools"
   compatibility_date = "2026-10-01"

   [assets]
   directory = "./dist"
   not_found_handling = "single-page-application"
   ```

   > `not_found_handling = "single-page-application"` 很关键：it-tools 用 Vue Router，深层链接直接刷新才不会 404。

   然后：

   ```bash
   npx wrangler deploy
   ```

4. 或用 Dashboard：Workers & Pages → Create → 导入 it-tools 仓库，构建命令 `pnpm build`，输出 `dist`。

---

## 如何新增一个专属工具

1. 在 `src/data/tools.ts` 的 `tools` 数组加一条：`slug` / `title` / `description` / `category` / `icon` / `keywords`（keywords 用于搜索）
2. 在 `src/pages/tools/` 下新建 `${slug}.astro`，用 `<script>` 写浏览器端 JS 逻辑（数据不出浏览器）
3. `npm run build` 验证
4. 部署（`npx wrangler deploy` 或推送到连接的 Git 仓库自动构建）

首页导航、分类与实时搜索会**自动**根据 `tools.ts` 生效，无需改其他文件。

---

## 设计要点

- 纯静态、零后端，所有计算在浏览器本地完成
- 新增工具只需「登记清单 + 一个页面」，首页/搜索自动同步
- 部署统一走 Cloudflare Workers（Static Assets），复用现有账号
