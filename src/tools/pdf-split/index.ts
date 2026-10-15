import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/pdf-split',
  name: 'PDF 拆分',
  description: '按页码提取页面，导出单份或多份',
  category: 'PDF',
  icon: '✂️',
  keywords: 'pdf split 拆分 提取 页面 导出',
  component: Component,
};

export default tool;
