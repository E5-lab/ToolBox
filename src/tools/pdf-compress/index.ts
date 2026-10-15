import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/pdf-compress',
  name: 'PDF 压缩',
  description: '重新序列化以减小体积，无损版',
  category: 'PDF',
  icon: '🗜️',
  keywords: 'pdf compress 压缩 减小 体积',
  component: Component,
};

export default tool;
