import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/audio-barrier',
  name: '声屏障衰减',
  description: '菲涅尔数法计算绕射程差与插入损失，叠加声源谱得到 A 计权降噪量',
  group: '声学计算',
  category: '环境与振动',
  icon: '🚧',
  keywords: 'barrier 声屏障 绕射 菲涅尔数 Maekawa Kurze Anderson 程差 插入损失 视线校核 A计权 降噪 声学',
  component: Component,
};

export default tool;
