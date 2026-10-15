import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-stc',
  name: '墙体隔声量 Rw / STC',
  description: '质量定律估算或输入实测隔声量，按 GB/T 50121-2005 给出 Rw（含 C、Ctr）与 ASTM E413 的 STC',
  group: '声学计算',
  category: '材料与构件',
  icon: '🧱',
  keywords: 'stc rw 隔声量 墙体 质量定律 吻合频率 GB/T 50121 ASTM E413 频谱修正量 声学',
  component: Component,
};

export default tool;
