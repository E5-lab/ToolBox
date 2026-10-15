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
  {
    slug: 'base64',
    title: 'Base64 编解码',
    description: '文本与 Base64 互转，支持中文 UTF-8',
    category: '开发',
    icon: '🔤',
    keywords: 'base64 encode decode 编码 解码 转换 中文',
  },
  {
    slug: 'uuid',
    title: 'UUID 生成器',
    description: '批量生成 UUID v4，可复制/导出',
    category: '开发',
    icon: '🆔',
    keywords: 'uuid guid 生成 随机 唯一 标识符',
  },
  {
    slug: 'num-cn',
    title: '数字大写转换',
    description: '数字转人民币大写 / 中文大写，支持小数与负数',
    category: '实用',
    icon: '💴',
    keywords: '数字 大写 人民币 金额 中文 转换 rmb',
  },
  {
    slug: 'markdown',
    title: 'Markdown 编辑器',
    description: '实时预览的 Markdown 编辑，本地渲染',
    category: '文本',
    icon: '📝',
    keywords: 'markdown md 编辑器 预览 渲染 文本',
  },
  {
    slug: 'qrcode',
    title: '二维码生成器',
    description: '文本/链接生成二维码，可下载 PNG/SVG',
    category: '图像',
    icon: '🔳',
    keywords: 'qrcode 二维码 生成 扫码 下载',
  },
  {
    slug: 'flowchart',
    title: '流程图绘制',
    description: '用 Mermaid 语法绘制流程图，导出 SVG',
    category: '绘图',
    icon: '📊',
    keywords: 'flowchart 流程图 mermaid 绘图 图表 思维导图',
  },
  {
    slug: 'pdf-merge',
    title: 'PDF 合并',
    description: '多份 PDF 合并为一份，浏览器本地处理',
    category: 'PDF',
    icon: '🗂️',
    keywords: 'pdf merge 合并 拼接 文档',
  },
  {
    slug: 'pdf-split',
    title: 'PDF 拆分',
    description: '按页码提取页面，导出单份或多份',
    category: 'PDF',
    icon: '✂️',
    keywords: 'pdf split 拆分 提取 页面 导出',
  },
  {
    slug: 'pdf-compress',
    title: 'PDF 压缩',
    description: '重新序列化以减小体积，无损版',
    category: 'PDF',
    icon: '🗜️',
    keywords: 'pdf compress 压缩 减小 体积',
  },
  {
    slug: 'pdf-rotate',
    title: 'PDF 旋转',
    description: '按角度旋转全部或指定页，本地处理',
    category: 'PDF',
    icon: '🔄',
    keywords: 'pdf rotate 旋转 页面 方向',
  },
];
