import type { CategoryMeta, Tool } from './types';

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
  // 开发
  jsonFormatter,
  timestamp,
  base64,
  uuid,
  // 文本
  markdown,
  baijiaxing,
  numCn,
  // 图像
  qrcode,
  flowchart,
  // PDF
  pdfMerge,
  pdfSplit,
  pdfCompress,
  pdfRotate,
];

/** 分类展示顺序与图标（顺序即侧栏顺序）。未登记的分类会自动追加。 */
const categoryMetas: CategoryMeta[] = [
  { name: '开发', icon: '🧩' },
  { name: '文本', icon: '📝' },
  { name: '图像', icon: '🖼️' },
  { name: 'PDF', icon: '📄' },
];

const usedCats = Array.from(new Set(tools.map((t) => t.category)));

export const categories: CategoryMeta[] = [
  ...categoryMetas.filter((c) => usedCats.includes(c.name)),
  // 若之后新增了未登记的分类，自动补上，避免工具“消失”
  ...usedCats
    .filter((name) => !categoryMetas.some((c) => c.name === name))
    .map((name) => ({ name, icon: '📦' })),
];

export function countByCategory(name: string): number {
  return tools.filter((t) => t.category === name).length;
}

export function filterTools(keyword: string): Tool[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((t) =>
    (t.name + t.description + (t.keywords || '') + t.category)
      .toLowerCase()
      .includes(q)
  );
}
