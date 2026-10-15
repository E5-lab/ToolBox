import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-rt60',
  name: '室内混响时间 RT60',
  description: 'Sabine / Eyring 逐频带计算，内置常用材料吸声系数库与空气吸收修正',
  group: '声学计算',
  category: '房间声学',
  icon: '🏛️',
  keywords: 'rt60 混响时间 室内 房间声学 Sabine Eyring 吸声系数 空气吸收 声学',
  component: Component,
};

export default tool;
