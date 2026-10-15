import { defineConfig } from 'astro/config';

// 纯静态工具站：所有逻辑在浏览器端执行，数据不出浏览器。
// 部署到 Cloudflare Workers（Static Assets），无需任何后端适配器。
export default defineConfig({
  output: 'static',
  // 改成你自己的域名，便于生成正确的绝对链接（部署前改掉即可）
  site: 'https://my-toolbox.workers.dev',
  trailingSlash: 'ignore',
});
