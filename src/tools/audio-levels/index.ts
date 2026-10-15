import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-levels',
  name: '声压级叠加计算',
  description: 'dB 不能直接相加 —— 多声源能量叠加、增量速算、相干叠加、背景修正与常用换算',
  group: '声学计算',
  category: '基础计算',
  icon: '🔊',
  keywords: '声压级 叠加 dB 声级 能量叠加 增量法 相干 背景修正 声功率 levels spl db',
  component: Component,
};

export default tool;
