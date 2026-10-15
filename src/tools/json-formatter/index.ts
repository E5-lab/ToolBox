import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/json-formatter',
  name: 'JSON 格式化',
  description: '格式化、压缩、校验 JSON 文本，纯本地计算',
  category: '开发',
  icon: '🧩',
  keywords: 'json format beautify validate 格式化 压缩 校验 美化',
  component: Component,
};

export default tool;
