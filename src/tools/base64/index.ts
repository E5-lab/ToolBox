import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/base64',
  name: 'Base64 编解码',
  description: '文本与 Base64 互转，支持中文 UTF-8',
  group: '文本处理',
  category: '编码转换',
  icon: '🔤',
  keywords: 'base64 encode decode 编码 解码 转换 中文',
  component: Component,
};

export default tool;
