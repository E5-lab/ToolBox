import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/pdf-merge',
  name: 'PDF 合并',
  description: '多份 PDF 合并为一份，浏览器本地处理',
  group: '文档工具',
  category: 'PDF 处理',
  icon: '🗂️',
  keywords: 'pdf merge 合并 拼接 文档',
  component: Component,
};

export default tool;
