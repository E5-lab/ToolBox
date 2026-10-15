import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-muffler',
  name: '消声器计算',
  description: '阻性（GB/T 50087-2013 式 6.3.1）、抗性（扩张室 / 共振腔）与阻抗复合的 A 计权插入损失验算',
  group: '声学计算',
  category: '环境与振动',
  icon: '🪈',
  keywords: 'muffler 消声器 阻性 抗性 扩张室 共振腔 压力损失 插入损失 A计权 GB 50087 别洛夫 声学',
  component: Component,
};

export default tool;
