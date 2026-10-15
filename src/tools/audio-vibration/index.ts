import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-vibration',
  name: '弹簧减振器隔振效率',
  description: '静变形法选型计算书、频率比法含阻尼验算与目标效率反算，附传递率曲线与判定准则',
  group: '声学计算',
  category: '环境与振动',
  icon: '🌀',
  keywords: 'vibration 弹簧减振器 隔振效率 静变形 静态压缩量 频率比 传递率 固有频率 阻尼比 二分法 反算 声学',
  component: Component,
};

export default tool;
