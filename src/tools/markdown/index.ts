import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/markdown',
  name: 'Markdown 编辑器',
  description: '实时预览的 Markdown 编辑，本地渲染',
  category: '文本',
  icon: '📝',
  keywords: 'markdown md 编辑器 预览 渲染 文本',
  component: Component,
};

export default tool;
