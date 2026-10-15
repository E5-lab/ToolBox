import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/timestamp',
  name: '时间戳转换',
  description: 'Unix 时间戳 ↔ 日期 互转',
  group: '开发工具',
  category: '时间转换',
  icon: '⏱️',
  keywords: 'timestamp unix time 时间 日期 转换 时间戳',
  component: Component,
};

export default tool;
