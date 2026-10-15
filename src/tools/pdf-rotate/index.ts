import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/pdf-rotate',
  name: 'PDF 旋转',
  description: '按角度旋转全部或指定页，本地处理',
  group: '文档工具',
  category: 'PDF 处理',
  icon: '🔄',
  keywords: 'pdf rotate 旋转 页面 方向',
  component: Component,
};

export default tool;
