export interface Tool {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  keywords: string;
}

// 工具清单：新增工具时，在这里登记一条，并在 src/pages/tools/ 下建立同名页面即可。
export const tools: Tool[] = [
  {
    slug: 'json-formatter',
    title: 'JSON 格式化',
    description: '格式化、压缩、校验 JSON 文本，纯本地计算',
    category: '开发',
    icon: '🧩',
    keywords: 'json format beautify validate 格式化 压缩 校验 美化',
  },
  {
    slug: 'timestamp',
    title: '时间戳转换',
    description: 'Unix 时间戳 ↔ 日期 互转',
    category: '开发',
    icon: '⏱️',
    keywords: 'timestamp unix time 时间 日期 转换 时间戳',
  },
];
