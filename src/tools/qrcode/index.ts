import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/qrcode',
  name: '二维码生成器',
  description: '文本/链接生成二维码，可下载 PNG/SVG',
  category: '图像',
  icon: '🔳',
  keywords: 'qrcode 二维码 生成 扫码 下载',
  component: Component,
};

export default tool;
