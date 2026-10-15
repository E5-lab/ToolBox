import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-noise',
  name: '背景噪声评价',
  description: 'A 声级 / NC / NR / RC Mark II 评价，含低频一致性、QAI、RV 与房间目标值对照',
  group: '声学计算',
  category: '房间声学',
  icon: '📊',
  keywords: '背景噪声 噪声评价 A声级 SIL NC NR RC MarkII QAI RV 倍频程 房间声学 声学',
  component: Component,
};

export default tool;
