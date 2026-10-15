import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/uuid',
  name: 'UUID 生成器',
  description: '批量生成 UUID v4，可复制/导出',
  category: '开发',
  icon: '🆔',
  keywords: 'uuid guid 生成 随机 唯一 标识符',
  component: Component,
};

export default tool;
