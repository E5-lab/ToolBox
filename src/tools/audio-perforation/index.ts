import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-perforation',
  name: '穿孔率计算',
  description: '穿孔板 / 微穿孔板的开孔率，按阵列形制由孔径与中心距直接求得',
  group: '声学计算',
  category: '材料与构件',
  icon: '⭕',
  keywords: 'perforation 穿孔率 穿孔板 微穿孔板 MPP 开孔率 中心距 阵列 声学',
  component: Component,
};

export default tool;
