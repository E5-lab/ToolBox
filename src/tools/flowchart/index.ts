import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/flowchart',
  name: '流程图绘制',
  description: '用 Mermaid 语法绘制流程图，导出 SVG',
  category: '绘图',
  icon: '📊',
  keywords: 'flowchart 流程图 mermaid 绘图 图表 思维导图',
  component: Component,
};

export default tool;
