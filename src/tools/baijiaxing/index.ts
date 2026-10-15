import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/baijiaxing',
  name: '百家姓编解码',
  description: '用百家姓姓氏加密/解密文本，趣味暗语',
  category: '文本',
  icon: '📜',
  keywords: '百家姓 编码 解码 加密 解密 暗语 姓氏 隐写 baijiaxing',
  component: Component,
};

export default tool;
