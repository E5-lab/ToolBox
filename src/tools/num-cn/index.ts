import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/num-cn',
  name: '数字大写转换',
  description: '数字转人民币大写 / 中文大写，支持小数与负数',
  category: '实用',
  icon: '💴',
  keywords: '数字 大写 人民币 金额 中文 转换 rmb',
  component: Component,
};

export default tool;
