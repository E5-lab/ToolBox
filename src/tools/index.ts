import type { Tool } from './types';

import jsonFormatter from './json-formatter';
import timestamp from './timestamp';
import base64 from './base64';
import uuid from './uuid';
import numCn from './num-cn';
import markdown from './markdown';
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
  qrcode,
  flowchart,
  pdfMerge,
  pdfSplit,
  pdfCompress,
  pdfRotate,
];

export const categories: string[] = Array.from(new Set(tools.map((t) => t.category)));
