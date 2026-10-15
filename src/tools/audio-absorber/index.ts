import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-absorber',
  name: '多孔吸声材料阻抗',
  description: '由流阻率推算特征阻抗与表面阻抗，得到倍频带法向吸声系数（Delany–Bazley 模型）',
  group: '声学计算',
  category: '材料与构件',
  icon: '🧽',
  keywords: 'absorber 吸声 多孔材料 阻抗 流阻率 吸声系数 NRC Delany Bazley 声学',
  component: Component,
};

export default tool;
