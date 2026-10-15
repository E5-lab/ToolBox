import type { CategoryMeta, GroupMeta, Tool } from './types';

import jsonFormatter from './json-formatter';
import timestamp from './timestamp';
import base64 from './base64';
import uuid from './uuid';
import numCn from './num-cn';
import markdown from './markdown';
import baijiaxing from './baijiaxing';
import qrcode from './qrcode';
import flowchart from './flowchart';
import pdfMerge from './pdf-merge';
import pdfSplit from './pdf-split';
import pdfCompress from './pdf-compress';
import pdfRotate from './pdf-rotate';

export const tools: Tool[] = [
  jsonFormatter,
  timestamp,
  base64,
  uuid,
  numCn,
  markdown,
  baijiaxing,
  qrcode,
  flowchart,
  pdfMerge,
  pdfSplit,
  pdfCompress,
  pdfRotate,
];

/** 一级分类（顶部菜单）顺序与图标 */
export const groups: GroupMeta[] = [
  { name: '文本处理', icon: '📝' },
  { name: '开发工具', icon: '🧩' },
  { name: '图像工具', icon: '🖼️' },
  { name: '文档工具', icon: '📄' },
];

/** 二级分类（左侧菜单）顺序与图标 */
export const categoryMetas: CategoryMeta[] = [
  // 文本处理
  { name: '编码转换', icon: '🔤', group: '文本处理' },
  { name: '格式编辑', icon: '✏️', group: '文本处理' },
  // 开发工具
  { name: '格式化', icon: '🧩', group: '开发工具' },
  { name: '生成器', icon: '🎲', group: '开发工具' },
  { name: '时间转换', icon: '⏱️', group: '开发工具' },
  // 图像工具
  { name: '二维码', icon: '🔳', group: '图像工具' },
  { name: '绘图', icon: '📊', group: '图像工具' },
  // 文档工具
  { name: 'PDF 处理', icon: '📑', group: '文档工具' },
];

/** 每个一级分类下的二级分类（带数量），按登记顺序 */
export function categoriesOf(group: string): { name: string; icon: string; count: number }[] {
  const registered = categoryMetas.filter((c) => c.group === group);
  const used = Array.from(new Set(tools.filter((t) => t.group === group).map((t) => t.category)));
  const list = [
    ...registered.filter((c) => used.includes(c.name)),
    ...used
      .filter((n) => !registered.some((c) => c.name === n))
      .map((n) => ({ name: n, icon: '📦', group })),
  ];
  return list.map((c) => ({
    name: c.name,
    icon: c.icon,
    count: tools.filter((t) => t.group === group && t.category === c.name).length,
  }));
}

/** 每个一级分类的工具总数 */
export function countOfGroup(group: string): number {
  return tools.filter((t) => t.group === group).length;
}

/** 全部工具总数 */
export const totalCount = tools.length;

/** 按关键词过滤（跨全部字段） */
export function filterTools(keyword: string): Tool[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((t) =>
    (t.name + t.description + (t.keywords || '') + t.group + t.category)
      .toLowerCase()
      .includes(q)
  );
}
