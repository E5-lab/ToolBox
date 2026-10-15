<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { NAlert, NButton, NInputNumber, NSpace } from 'naive-ui';
import { useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import Perforation from '../../audio/kernel/perforation.js';

/* ---------------- 内核返回结构（内核为 ESM 化的原生 JS，此处仅做类型声明） ---------------- */
interface WarnItem {
  level: string;
  text: string;
}
interface Klass {
  id: string;
  label: string;
  note: string;
}
interface PerfResult {
  ok: boolean;
  error?: string;
  pattern?: string;
  patternName?: string;
  rate?: number;
  fraction?: number;
  cell?: number;
  hole?: number;
  holes?: number;
  pitch?: number;
  dOverP?: number;
  solidRatio?: number;
  warnings?: WarnItem[];
  klass?: Klass;
}
interface SolveResult {
  ok: boolean;
  error?: string;
  P?: number;
  P1?: number;
  P2?: number;
  label?: string;
  rate?: number;
}
interface MppResult {
  f0: number;
  tEff: number;
  quarterWave: number;
  valid: boolean;
  note: string;
}
interface Geometry {
  holes: number[][];
  pitch: number;
  rowH: number;
  spanX: number;
  spanY: number;
  cellW: number;
  cellH: number;
  pitchLabel: string;
  rowLabel: string;
  d: number;
  exaggerated?: boolean;
}

/* ---------------- 阵列形制图标（原 ICONS 的 SVG 几何数据） ---------------- */
const PATTERN_ICONS: Record<string, { path: string; circles: number[][] }> = {
  square: {
    path: 'M10 10h20v20H10z',
    circles: [[10, 10, 3.4], [30, 10, 3.4], [10, 30, 3.4], [30, 30, 3.4]],
  },
  'diamond-square': {
    path: 'M20 7l13 13-13 13-13-13z',
    circles: [[20, 7, 3.2], [33, 20, 3.2], [7, 20, 3.2], [20, 33, 3.2]],
  },
  hex: {
    path: 'M20 8l12 20H8z',
    circles: [[20, 8, 3.2], [8, 28, 3.2], [32, 28, 3.2], [20, 28, 3.2]],
  },
  'diamond-rect': {
    path: 'M9 8h22v24H9z',
    circles: [[9, 8, 3], [31, 8, 3], [20, 20, 3], [9, 32, 3], [31, 32, 3]],
  },
};

const FIELD_META: Record<string, { label: string; min: number; step: number }> = {
  d: { label: '微孔直径 d', min: 0.05, step: 0.1 },
  P: { label: '中心距 P', min: 0.2, step: 0.1 },
  P1: { label: '横向中心距 P1', min: 0.2, step: 0.1 },
  P2: { label: '纵向轴线距 P2', min: 0.2, step: 0.1 },
};
const PITCH_LABEL: Record<string, string> = {
  'diamond-square': '相邻孔心距 P',
  hex: '相邻孔心距 P',
};
const DEFAULTS: Record<string, number> = { d: 5, P: 10, P1: 10, P2: 12 };

/* ---------------- 状态 ---------------- */
const pattern = ref('square');
const params = reactive<Record<string, number>>({ d: 5, P: 10, P1: 10, P2: 12 });

const revRate = ref(5);
const revP2 = ref(12);
const revOut = ref<SolveResult | null>(null);
const revDensity = ref(0);

const mppT = ref(1);
const mppD = ref(50);
const mpp = ref<MppResult | null>(null);

const plateW = ref(1000);
const plateH = ref(2000);
const plateOut = ref<{ area: number; holes: number; open: number } | null>(null);

const message = useMessage();
const copy = useCopy();

/* ---------------- 格式化 ---------------- */
function num(v: number | null | undefined, d = 2): string {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}
function group(n: number, digits: number): string {
  return Number(n).toFixed(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function fmt(x: number): string {
  return Number(x).toFixed(2).replace(/\.?0+$/, '') || '0';
}

/* ---------------- 派生 ---------------- */
const currentPattern = computed(() => Perforation.findPattern(pattern.value));

const fields = computed(() => {
  const keys = currentPattern.value ? currentPattern.value.fields : ['d', 'P'];
  return keys.map((key) => ({
    key,
    label: key === 'P' && PITCH_LABEL[pattern.value] ? PITCH_LABEL[pattern.value] : FIELD_META[key].label,
    min: FIELD_META[key].min,
    step: FIELD_META[key].step,
  }));
});

function setField(key: string, v: number | null) {
  params[key] = v == null || Number.isNaN(v) ? 0 : v;
}

const result = computed<PerfResult>(() =>
  Perforation.perforationRate({
    pattern: pattern.value,
    d: params.d,
    P: params.P,
    P1: params.P1,
    P2: params.P2,
  }) as unknown as PerfResult
);

/** 公式代入文本 */
const formula = computed(() => {
  const r = result.value;
  if (!r.ok || !currentPattern.value) return null;
  const d = params.d;
  const cellExpr = currentPattern.value.cell;
  let numeric: string;
  if (r.pattern === 'diamond-rect') {
    numeric = 'π × ' + num(d) + '² / (2 × ' + num(params.P1) + ' × ' + num(params.P2) + ')';
  } else if (r.pattern === 'square') {
    numeric = 'π × ' + num(d) + '² / (4 × ' + num(params.P) + '²)';
  } else if (r.pattern === 'diamond-square') {
    numeric = 'π × ' + num(d) + '² / (2 × ' + num(params.P) + '²)';
  } else {
    numeric = 'π × ' + num(d) + '² / (2√3 × ' + num(params.P) + '²)';
  }
  const pitchText =
    r.pattern === 'diamond-rect'
      ? 'P1 = ' + num(params.P1) + ' mm，P2 = ' + num(params.P2) + ' mm'
      : 'P = ' + num(params.P) + ' mm';
  return {
    cellExpr,
    numeric,
    rate: (r.rate as number).toFixed(4),
    hole: num(r.hole, 4),
    cell: num(r.cell, 4),
    pitchText,
    dOverP: num(r.dOverP, 3),
  };
});

/** 主结果数值文本 */
const rateText = computed(() => (result.value.ok ? (result.value.rate as number).toFixed(2) : '—'));

/** 派生量卡片 */
const stats = computed(() => {
  const r = result.value;
  if (!r.ok) return [];
  return [
    { label: '单孔面积', value: group(r.hole as number, 3), unit: 'mm²', sub: 'πd²/4' },
    { label: '单元面积', value: group(r.cell as number, 2), unit: 'mm²', sub: '对应 1 个孔' },
    { label: '孔数密度', value: group(r.holes as number, 0), unit: '个/m²', sub: '按单元面积折算' },
    { label: '剩余板面', value: ((r.solidRatio as number) * 100).toFixed(2), unit: '%', sub: '实体部分占比' },
  ];
});

/* ---------------- 阵列几何 ---------------- */
function buildGeometry(): Geometry | null {
  const d = Number(params.d);
  const P = Number(params.P);
  const P1 = Number(params.P1);
  const P2 = Number(params.P2);
  const g: Geometry = {
    holes: [],
    pitch: 0,
    rowH: 0,
    spanX: 0,
    spanY: 0,
    cellW: 0,
    cellH: 0,
    pitchLabel: '',
    rowLabel: '',
    d: d || 0,
  };

  if (pattern.value === 'square') {
    if (!(P > 0)) return null;
    g.pitch = P;
    g.rowH = P;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) g.holes.push([i * P, j * P]);
    g.spanX = 2 * P;
    g.spanY = 2 * P;
    g.cellW = P;
    g.cellH = P;
    g.pitchLabel = 'P = ' + fmt(P) + ' mm';
    g.rowLabel = 'P = ' + fmt(P) + ' mm';
  } else if (pattern.value === 'diamond-square') {
    if (!(P > 0)) return null;
    const rh = P / 2;
    g.pitch = P;
    g.rowH = rh;
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 3; i++) g.holes.push([i * P + (j % 2 ? P / 2 : 0), j * rh]);
    g.spanX = 2 * P + P / 2;
    g.spanY = 3 * rh;
    g.cellW = P;
    g.cellH = rh;
    g.pitchLabel = 'P = ' + fmt(P) + ' mm';
    g.rowLabel = 'P/2 = ' + fmt(rh) + ' mm';
  } else if (pattern.value === 'hex') {
    if (!(P > 0)) return null;
    const rh = (Math.sqrt(3) / 2) * P;
    g.pitch = P;
    g.rowH = rh;
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 3; i++) g.holes.push([i * P + (j % 2 ? P / 2 : 0), j * rh]);
    g.spanX = 2 * P + P / 2;
    g.spanY = 2 * rh;
    g.cellW = P;
    g.cellH = rh;
    g.pitchLabel = 'P = ' + fmt(P) + ' mm';
    g.rowLabel = '(√3/2)P = ' + fmt(rh) + ' mm';
  } else {
    if (!(P1 > 0) || !(P2 > 0)) return null;
    const rh = P2 / 2;
    g.pitch = Math.min(P1, P2);
    g.rowH = rh;
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 3; i++) g.holes.push([i * P1 + (j % 2 ? P1 / 2 : 0), j * rh]);
    g.spanX = 2 * P1 + P1 / 2;
    g.spanY = 3 * rh;
    g.cellW = P1;
    g.cellH = rh;
    g.pitchLabel = 'P1 = ' + fmt(P1) + ' mm';
    g.rowLabel = 'P2/2 = ' + fmt(rh) + ' mm';
  }
  return g;
}

const geometry = computed(() => buildGeometry());

const diagramNote = computed(() => {
  const g = geometry.value;
  if (!g) return '请输入有效参数后查看阵列示意';
  const P = Number(params.P);
  const P1 = Number(params.P1);
  const P2 = Number(params.P2);
  let text: string;
  if (pattern.value === 'square') {
    text =
      '正方形阵列：孔心沿水平与垂直方向正交对齐，相邻孔心距均为 ' +
      num(P) +
      ' mm，每个孔对应一个 ' +
      num(P) +
      ' × ' +
      num(P) +
      ' mm 的单元方格。';
  } else if (pattern.value === 'diamond-square') {
    text =
      '45° 菱形错排：隔行水平错开半个孔距，纵向行距为 ' +
      num(P / 2) +
      ' mm，单元面积按 ' +
      (P * P).toFixed(2) +
      ' mm² 计。';
  } else if (pattern.value === 'hex') {
    const rh = (Math.sqrt(3) / 2) * P;
    text =
      '等边三角形错排：隔行错开半个孔距，纵向行距为 (√3/2)P = ' +
      num(rh) +
      ' mm，单元面积 ' +
      (rh * P).toFixed(2) +
      ' mm²，为同孔径同孔距下最紧凑的阵列。';
  } else {
    text =
      '矩形错排：横向中心距 ' +
      num(P1) +
      ' mm，纵向行距 P2/2 = ' +
      num(P2 / 2) +
      ' mm，单元面积 ' +
      num((P1 * P2) / 2) +
      ' mm²。';
  }
  return text + (g.exaggerated ? '（示意图中孔径已放大绘制以便观察）' : '');
});

/* ---------------- 阵列示意图（自绘 canvas） ---------------- */
const canvasRef = ref<HTMLCanvasElement | null>(null);
let ro: ResizeObserver | null = null;

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v && v.trim() ? v.trim() : fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const pairs = [[x1, y1, x2, y2], [x2, y2, x1, y1]];
  pairs.forEach(function (p) {
    const ang = Math.atan2(p[3] - p[1], p[2] - p[0]);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + 7 * Math.cos(ang + Math.PI / 7), p[1] + 7 * Math.sin(ang + Math.PI / 7));
    ctx.lineTo(p[0] + 7 * Math.cos(ang - Math.PI / 7), p[1] + 7 * Math.sin(ang - Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

interface ChipColors {
  chipBg: string;
  chipBorder: string;
}

function chip(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  C: ChipColors,
  align?: string
) {
  ctx.save();
  ctx.font = '600 11.5px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 14;
  const h = 19;
  const left = align === 'right' ? x - w : x - w / 2;
  ctx.beginPath();
  roundRect(ctx, left, y - h / 2, w, h, 6);
  ctx.fillStyle = C.chipBg;
  ctx.fill();
  ctx.strokeStyle = C.chipBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + 7, y + 0.5);
  ctx.restore();
}

function drawDiagram() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(320, Math.round(rect.width || 560));
  const H = 330;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const g = geometry.value;
  if (!g) {
    ctx.fillStyle = cssVar('--n-text-color-3', '#6b7280');
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('请输入有效参数后查看阵列示意', 16, 30);
    return;
  }

  const C = {
    hole: cssVar('--n-primary-color', '#2563eb'),
    holeFill: 'rgba(37, 99, 235, 0.10)',
    cell: cssVar('--n-text-color-3', '#94a3b8'),
    line: cssVar('--n-text-color-3', '#6b7280'),
    accent: '#f97316',
    chipBg: cssVar('--n-card-color', '#ffffff'),
    chipBorder: cssVar('--n-border-color', '#d3dae6'),
  };

  const padL = 74;
  const padR = 34;
  const padT = 52;
  const padB = 46;
  const availW = W - padL - padR;
  const availH = H - padT - padB;
  const s = Math.min(availW / g.spanX, availH / g.spanY);
  const ox = padL + (availW - g.spanX * s) / 2;
  const oy = padT + (availH - g.spanY * s) / 2;
  const X = function (mm: number) {
    return ox + mm * s;
  };
  const Y = function (mm: number) {
    return oy + mm * s;
  };

  const rTrue = (g.d / 2) * s;
  const r = Math.max(3.2, Math.min(rTrue, g.rowH * s * 0.46, g.pitch * s * 0.46));
  g.exaggerated = Math.abs(r - rTrue) > 0.6;

  // 单元面积框（以第 2 个孔为中心）
  const anchor = g.holes[1] || g.holes[0];
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = C.cell;
  ctx.lineWidth = 1.2;
  const cx = X(anchor[0] - g.cellW / 2);
  const cy = Y(anchor[1] - g.cellH / 2);
  ctx.beginPath();
  roundRect(ctx, cx, cy, g.cellW * s, g.cellH * s, 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(37, 99, 235, 0.05)';
  ctx.fill();
  ctx.restore();
  chip(ctx, '单元面积 ' + (g.cellW * g.cellH).toFixed(2) + ' mm²', cx + (g.cellW * s) / 2, cy - 12, C.cell, C);

  // 孔
  g.holes.forEach(function (h) {
    ctx.beginPath();
    ctx.arc(X(h[0]), Y(h[1]), r, 0, Math.PI * 2);
    ctx.fillStyle = C.holeFill;
    ctx.fill();
    ctx.strokeStyle = C.hole;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });

  // 水平中心距标注（第 1 行前两个孔）
  const h1 = g.holes[0];
  const h2 = g.holes[1];
  const yTop = Y(h1[1]) - r - 18;
  arrow(ctx, X(h1[0]), yTop, X(h2[0]), yTop, C.line);
  chip(ctx, g.pitchLabel, (X(h1[0]) + X(h2[0])) / 2, yTop - 12, C.line, C);

  // 纵向行距标注
  const h3 = g.holes[0];
  let h4: number[] | null = null;
  for (let i = 0; i < g.holes.length; i++) {
    if (Math.abs(g.holes[i][0] - h3[0]) < 1e-6 && g.holes[i][1] > h3[1]) {
      h4 = g.holes[i];
      break;
    }
  }
  if (h4) {
    const xLeft = X(h3[0]) - r - 20;
    arrow(ctx, xLeft, Y(h3[1]), xLeft, Y(h4[1]), C.line);
    chip(ctx, g.rowLabel, xLeft - 4, (Y(h3[1]) + Y(h4[1])) / 2, C.line, C, 'right');
  }

  // 孔径标注（高亮孔）
  const hd = g.holes[1];
  arrow(ctx, X(hd[0]) - r, Y(hd[1]), X(hd[0]) + r, Y(hd[1]), C.accent);
  chip(ctx, 'd = ' + fmt(g.d) + ' mm', X(hd[0]), Y(hd[1]) + r + 16, C.accent, C);

  // 图例
  ctx.font = '11.5px system-ui, sans-serif';
  ctx.fillStyle = C.line;
  ctx.fillText('虚线框＝一个孔的单元面积；箭头为孔心距与孔径', padL - 58, H - 12);
}

onMounted(() => {
  drawDiagram();
  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => drawDiagram());
    ro.observe(canvasRef.value);
  }
  window.addEventListener('resize', drawDiagram);
});

onBeforeUnmount(() => {
  if (ro) ro.disconnect();
  window.removeEventListener('resize', drawDiagram);
});

watch([geometry, result], () => drawDiagram());

/* ---------------- 切换形制：清空共振结果、同步 P2 ---------------- */
watch(pattern, (v) => {
  mpp.value = null;
  plateOut.value = null;
  revOut.value = null;
  if (v === 'diamond-rect') revP2.value = params.P2;
});
watch([revRate, revP2], () => {
  revOut.value = null;
});

/* ---------------- 工具：反算 / 共振 / 板材 ---------------- */
function doReverse() {
  const res = Perforation.solvePitch({
    pattern: pattern.value,
    d: params.d,
    targetRate: revRate.value,
    P2: pattern.value === 'diamond-rect' ? revP2.value : null,
  }) as unknown as SolveResult;
  if (!res.ok) {
    revOut.value = null;
    message.error(res.error || '反算失败');
    return;
  }
  const cell = Perforation.unitCellArea(pattern.value, {
    P: res.P == null ? null : res.P,
    P1: res.P1 == null ? null : res.P1,
    P2: res.P2 == null ? null : res.P2,
  }) as unknown as number;
  revDensity.value = cell ? 1e6 / cell : 0;
  revOut.value = res;
  message.success('反算完成');
}

function doMpp() {
  const r = result.value;
  if (!r.ok) {
    message.error('请先输入有效的设计参数。');
    return;
  }
  const m = Perforation.mppResonance({
    d: params.d,
    t: mppT.value,
    cavity: mppD.value,
    rate: r.rate,
  }) as unknown as MppResult | null;
  if (!m) {
    message.error('板厚与空腔深度需为正数。');
    return;
  }
  mpp.value = m;
  message.success('估算完成');
}

function doPlate() {
  const r = result.value;
  if (!r.ok) {
    message.error('请先输入有效的设计参数。');
    return;
  }
  const w = Number(plateW.value);
  const h = Number(plateH.value);
  if (!(w > 0) || !(h > 0)) {
    message.error('板宽与板长需为正数。');
    return;
  }
  const areaM2 = (w * h) / 1e6;
  plateOut.value = {
    area: areaM2,
    holes: areaM2 * (r.holes as number),
    open: areaM2 * ((r.rate as number) / 100) * 1e4,
  };
}

function reset() {
  pattern.value = 'square';
  params.d = DEFAULTS.d;
  params.P = DEFAULTS.P;
  params.P1 = DEFAULTS.P1;
  params.P2 = DEFAULTS.P2;
  revRate.value = 5;
  revP2.value = DEFAULTS.P2;
  revOut.value = null;
  mppT.value = 1;
  mppD.value = 50;
  mpp.value = null;
  plateW.value = 1000;
  plateH.value = 2000;
  plateOut.value = null;
}

/* ---------------- 导出 ---------------- */
function summaryText(): string {
  const r = result.value;
  if (!r.ok || !currentPattern.value) return '';
  const p = currentPattern.value;
  const out: string[] = [];
  out.push('穿孔率计算 · 结果摘要');
  out.push('阵列形制：' + p.name + '（' + p.en + '）');
  let line = '孔径 d = ' + num(params.d) + ' mm';
  if (r.pattern === 'diamond-rect') {
    line += '，P1 = ' + num(params.P1) + ' mm，P2 = ' + num(params.P2) + ' mm';
  } else {
    line += '，中心距 P = ' + num(params.P) + ' mm';
  }
  out.push('设计参数：' + line);
  out.push('穿孔率 σ = ' + (r.rate as number).toFixed(4) + ' %（' + (r.klass as Klass).label + '）');
  out.push('单元面积 = ' + num(r.cell, 4) + ' mm²；单孔面积 = ' + num(r.hole, 4) + ' mm²');
  out.push(
    '孔数密度 = ' +
      group(r.holes as number, 0) +
      ' 个/m²；剩余板面 = ' +
      ((r.solidRatio as number) * 100).toFixed(2) +
      '%'
  );
  out.push(
    '孔径/中心距 = ' + num(r.dOverP, 3) + '；孔间剩余壁厚 = ' + num((r.pitch as number) - params.d) + ' mm'
  );
  (r.warnings || []).forEach(function (w) {
    out.push('提示：' + w.text);
  });
  if (mpp.value) {
    out.push('微穿孔板共振估算 f₀ = ' + num(mpp.value.f0, 0) + ' Hz（t′ = ' + num(mpp.value.tEff, 3) + ' mm）');
  }
  out.push('工具：声学计算工具箱 · 穿孔率计算');
  return out.join('\n');
}

function copySummary() {
  const txt = summaryText();
  if (!txt) {
    message.warning('暂无可复制结果');
    return;
  }
  copy(txt, '已复制结果摘要');
}

function exportCsv() {
  const r = result.value;
  if (!r.ok || !currentPattern.value) {
    message.warning('暂无可导出结果');
    return;
  }
  const p = currentPattern.value;
  const rows: (string | number)[][] = [];
  rows.push(['穿孔率计算结果', '', '']);
  rows.push(['阵列形制', p.name + '（' + p.en + '）', '']);
  rows.push(['参数', '值', '单位']);
  rows.push(['微孔直径 d', num(params.d), 'mm']);
  if (r.pattern === 'diamond-rect') {
    rows.push(['横向中心距 P1', num(params.P1), 'mm']);
    rows.push(['纵向轴线距 P2', num(params.P2), 'mm']);
    rows.push(['纵向行距 P2/2', num(params.P2 / 2), 'mm']);
  } else {
    rows.push(['中心距 P', num(params.P), 'mm']);
    if (r.pattern === 'diamond-square') rows.push(['纵向行距 P/2', num(params.P / 2), 'mm']);
    if (r.pattern === 'hex') rows.push(['纵向行距 (√3/2)P', num((Math.sqrt(3) / 2) * params.P), 'mm']);
  }
  rows.push([]);
  rows.push(['结果', '值', '单位/备注']);
  rows.push(['穿孔率 σ', (r.rate as number).toFixed(4), '%']);
  rows.push(['区间判定', (r.klass as Klass).label, (r.klass as Klass).note]);
  rows.push(['单元面积', num(r.cell, 4), 'mm²']);
  rows.push(['单孔面积', num(r.hole, 4), 'mm²']);
  rows.push(['孔数密度', group(r.holes as number, 0), '个/m²']);
  rows.push(['剩余板面比例', ((r.solidRatio as number) * 100).toFixed(2), '%']);
  rows.push(['孔径/中心距', num(r.dOverP, 3), '']);
  rows.push(['孔间剩余壁厚', num((r.pitch as number) - params.d), 'mm']);
  rows.push([]);
  rows.push(['加工校核提示', '']);
  if (!(r.warnings || []).length) rows.push(['未见明显加工限制', '']);
  (r.warnings || []).forEach(function (w) {
    rows.push([w.text, w.level]);
  });
  if (mpp.value) {
    rows.push([]);
    rows.push(['微穿孔板共振估算', '']);
    rows.push(['有效板厚 t′', num(mpp.value.tEff, 3), 'mm']);
    rows.push(['共振频率 f₀', num(mpp.value.f0, 1), 'Hz']);
    rows.push(['1/4 波长', num(mpp.value.quarterWave, 1), 'mm']);
  }
  const csv =
    '\ufeff' +
    rows
      .map(function (row) {
        return row
          .map(function (c) {
            return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
          })
          .join(',');
      })
      .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'perforation-result.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}
</script>

<template>
  <ToolPage title="⭕ 穿孔率计算" description="穿孔板 / 微穿孔板的开孔率，按阵列形制由孔径与中心距直接求得">
    <div class="split">
      <div class="col">
        <div class="card">
          <h3 class="card-title"><span class="step">1</span> 选择阵列形制</h3>
          <div class="pattern-grid">
            <div
              v-for="p in Perforation.PATTERNS"
              :key="p.id"
              class="pattern-card"
              :class="{ selected: pattern === p.id }"
              @click="pattern = p.id"
            >
              <span class="pc-icon">
                <svg viewBox="0 0 40 40" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path :d="PATTERN_ICONS[p.id].path" stroke-dasharray="3 3" opacity=".55" />
                  <circle
                    v-for="(c, i) in PATTERN_ICONS[p.id].circles"
                    :key="i"
                    :cx="c[0]"
                    :cy="c[1]"
                    :r="c[2]"
                  />
                </svg>
              </span>
              <span class="pc-body">
                <span class="pc-title">{{ p.name }}</span>
                <span class="pc-en">{{ p.en }}</span>
                <span class="pc-desc">{{ p.desc }}</span>
                <span class="pc-cell">单元面积 {{ p.cell }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title"><span class="step">2</span> 输入设计参数 <span class="hint">(mm)</span></h3>
          <div class="field-row">
            <div v-for="f in fields" :key="f.key" class="field">
              <label class="f-label">{{ f.label }} <span class="unit-tag">mm</span></label>
              <n-input-number
                :value="params[f.key]"
                :min="f.min"
                :step="f.step"
                size="small"
                @update:value="(v: number | null) => setField(f.key, v)"
              />
            </div>
          </div>
          <n-alert v-if="!result.ok" type="error" :show-icon="false" class="mt">{{ result.error }}</n-alert>
        </div>

        <div class="card">
          <h3 class="card-title"><span class="step">3</span> 阵列示意 <span class="hint">(按当前参数等比绘制)</span></h3>
          <div class="canvas-wrap"><canvas ref="canvasRef" class="perf-canvas" height="330"></canvas></div>
          <p class="inline-note">{{ diagramNote }}</p>
        </div>
      </div>

      <div class="col">
        <div class="card hero">
          <div class="rc-title">穿孔率 σ</div>
          <div class="hero-rate">
            <span>{{ rateText }}</span><span class="unit">%</span>
          </div>
          <div v-if="result.ok" class="sub">{{ result.klass.label }} · {{ result.klass.note }}</div>
          <div v-if="formula" class="formula">
            <div><span class="fx">σ = πd² / (4 · 单元面积系数)</span> 以单元面积 {{ formula.cellExpr }} 展开：</div>
            <div>σ = {{ formula.numeric }} × 100% = <span class="fx">{{ formula.rate }} %</span></div>
            <div>单孔面积 = πd²/4 = {{ formula.hole }} mm²　单元面积 = {{ formula.cell }} mm²</div>
            <div>{{ formula.pitchText }}　孔径/中心距 = {{ formula.dOverP }}</div>
          </div>
          <div class="stat-grid">
            <div v-for="s in stats" :key="s.label" class="stat">
              <div class="s-label">{{ s.label }}</div>
              <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
              <div class="s-sub">{{ s.sub }}</div>
            </div>
          </div>
          <n-space :size="6" class="mt">
            <n-button size="small" @click="copySummary">复制摘要</n-button>
            <n-button size="small" @click="exportCsv">导出 CSV</n-button>
            <n-button size="small" quaternary @click="reset">重置参数</n-button>
          </n-space>
        </div>

        <div class="card">
          <h3 class="card-title">加工校核</h3>
          <template v-if="result.ok">
            <n-alert
              v-for="(w, i) in result.warnings"
              :key="i"
              :type="w.level === 'warn' ? 'warning' : 'info'"
              :show-icon="false"
              class="mb"
            >
              {{ w.text }}
            </n-alert>
            <n-alert v-if="!result.warnings.length" type="success" :show-icon="false" class="mb">
              孔间壁厚与穿孔率均在常用加工区间内，未见明显限制。
            </n-alert>
            <n-alert type="default" :show-icon="false">
              孔间剩余壁厚 = 中心距 − 孔径 = {{ num(result.pitch - params.d) }} mm（按较小中心距
              {{ num(result.pitch) }} mm 校核）。
            </n-alert>
          </template>
          <p v-else class="inline-note">请输入有效参数后查看加工校核结果。</p>
        </div>
      </div>
    </div>

    <div class="split">
      <div class="card">
        <h3 class="card-title">反算中心距 <span class="hint">(已知目标穿孔率)</span></h3>
        <p class="inline-note">给出孔径与目标穿孔率，反求所需中心距；矩形错排需先固定 P2。</p>
        <div class="field-row">
          <div class="field">
            <label class="f-label">目标穿孔率 <span class="unit-tag">%</span></label>
            <n-input-number v-model:value="revRate" :min="0.05" :max="80" :step="0.1" size="small" />
          </div>
          <div class="field">
            <label class="f-label">固定 P2 <span class="unit-tag">mm，仅矩形错排</span></label>
            <n-input-number v-model:value="revP2" :min="0.1" :step="0.1" size="small" />
          </div>
        </div>
        <n-space :size="6" class="mt">
          <n-button size="small" type="primary" @click="doReverse">反算</n-button>
        </n-space>
        <div v-if="revOut" class="kv-result">
          <div class="kv">
            <div class="k">所需 {{ revOut.label }}</div>
            <div class="v">
              {{ revOut.P != null ? num(revOut.P) : num(revOut.P1) }}<small>mm</small>
            </div>
            <div class="s-sub mini">
              {{
                revOut.P != null
                  ? '按 ' + num(revRate, 2) + '% 目标穿孔率'
                  : '固定 P2 = ' + num(revOut.P2)
              }}
            </div>
          </div>
          <div class="kv">
            <div class="k">对应孔数密度</div>
            <div class="v">{{ group(revDensity, 0) }}<small>个/m²</small></div>
            <div class="s-sub mini">按单元面积折算</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">微穿孔板共振估算 <span class="hint">(可选)</span></h3>
        <p class="inline-note">
          f₀ = c / 2π · √(σ / (t′ · D))，t′ = t + 0.85d（Maa 端部修正），适用于孔径 ≤ 3 mm、穿孔率 ≤ 5%。
        </p>
        <div class="field-row">
          <div class="field">
            <label class="f-label">板厚 t <span class="unit-tag">mm</span></label>
            <n-input-number v-model:value="mppT" :min="0.1" :step="0.1" size="small" />
          </div>
          <div class="field">
            <label class="f-label">空腔深度 D <span class="unit-tag">mm</span></label>
            <n-input-number v-model:value="mppD" :min="1" :step="1" size="small" />
          </div>
        </div>
        <n-space :size="6" class="mt">
          <n-button size="small" @click="doMpp">估算共振频率</n-button>
        </n-space>
        <div v-if="mpp" class="kv-result">
          <div class="kv">
            <div class="k">共振频率 f₀</div>
            <div class="v">{{ num(mpp.f0, 0) }}<small>Hz</small></div>
            <div class="s-sub mini">有效板厚 t′ = {{ num(mpp.tEff, 3) }} mm</div>
          </div>
          <div class="kv">
            <div class="k">1/4 波长</div>
            <div class="v">{{ num(mpp.quarterWave, 0) }}<small>mm</small></div>
            <div class="s-sub mini">与空腔深度同量级时的对应关系</div>
          </div>
          <n-alert :type="mpp.valid ? 'success' : 'warning'" :show-icon="false" class="full">{{ mpp.note }}</n-alert>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">板材开孔估算 <span class="hint">(按当前穿孔率)</span></h3>
      <div class="field-row">
        <div class="field">
          <label class="f-label">板宽 <span class="unit-tag">mm</span></label>
          <n-input-number v-model:value="plateW" :min="1" :step="1" size="small" />
        </div>
        <div class="field">
          <label class="f-label">板长 <span class="unit-tag">mm</span></label>
          <n-input-number v-model:value="plateH" :min="1" :step="1" size="small" />
        </div>
        <div class="field field-auto">
          <n-button size="small" @click="doPlate">估算</n-button>
        </div>
      </div>
      <div v-if="plateOut" class="kv-result">
        <div class="kv">
          <div class="k">板面积</div>
          <div class="v">{{ num(plateOut.area, 3) }}<small>m²</small></div>
          <div class="s-sub mini">{{ num(plateW, 0) }} × {{ num(plateH, 0) }} mm</div>
        </div>
        <div class="kv">
          <div class="k">预计孔数</div>
          <div class="v">{{ group(plateOut.holes, 0) }}<small>个</small></div>
          <div class="s-sub mini">按设计穿孔率折算</div>
        </div>
        <div class="kv">
          <div class="k">总开孔面积</div>
          <div class="v">{{ num(plateOut.open, 1) }}<small>cm²</small></div>
          <div class="s-sub mini">占板面 {{ num(result.rate, 2) }}%</div>
        </div>
      </div>
    </div>

    <div class="card notes">
      <h3 class="card-title">计算方法</h3>
      <ul>
        <li>
          <strong>基本关系</strong>：穿孔率 σ = 单孔面积 / 单元面积 × 100%，单孔面积 = πd²/4；孔径 d 与中心距（孔心距）单位一致即可（本页统一用 mm）。
        </li>
        <li><strong>正方形对称阵列</strong>：单元面积 P²（一个孔对应 P × P 的方格），σ = πd² / (4P²) × 100%。</li>
        <li>
          <strong>45° 菱形错排</strong>：隔行错开半个孔距、行距 P/2，单元面积 P²/2，σ = πd² / (2P²) × 100%（沿用 E5-lab/AC_Calc 参考实现的约定）。
        </li>
        <li>
          <strong>矩形非等边错排</strong>：横向中心距 P1、纵向行距 P2/2，单元面积 P1·P2/2，σ = πd² / (2·P1·P2) × 100%。
        </li>
        <li>
          <strong>等边三角形错排（六方）</strong>：行距 (√3/2)P，单元面积 (√3/2)P²，σ = πd² / (2√3·P²) × 100%。这是等边三角阵列的几何精确解，同孔径同孔距下穿孔率高于正方形阵列约 15.5%。
        </li>
        <li>
          <strong>反算</strong>：由 σ 反解中心距，例如正方形阵列 P = √(πd² / (4σ))（σ 为分数），矩形错排需固定 P2 后解 P1。
        </li>
        <li>
          <strong>加工校核</strong>：孔间剩余壁厚 = 中心距 − 孔径，小于 0.8 mm 时冲孔/钻孔易变形；穿孔率 > 30% 时板面强度需另行校核。
        </li>
        <li>
          <strong>微穿孔板共振</strong>：f₀ = c/(2π)·√(σ/(t′·D))，t′ = t + 0.85d 为计入端部修正的有效板厚，D 为空腔深度；用于判断吸声峰值大致落点，配合 1/4 波长关系可做空腔深度初选。实际结构建议以阻抗管/混响室实测为准。
        </li>
        <li>
          <strong>常用区间</strong>：微穿孔板 σ 约 0.5%–3%（d 0.5–2 mm）；常规穿孔吸声板 σ 约 3%–15%；σ > 30% 接近全透声，吸声取决于后置材料。
        </li>
      </ul>
    </div>
  </ToolPage>
</template>

<style scoped>
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.card {
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  background: var(--n-card-color);
  padding: 16px;
  margin-bottom: 16px;
}
.split .card {
  margin-bottom: 0;
}
.card:last-child {
  margin-bottom: 0;
}
.card-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}
.step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 7px;
  border-radius: 50%;
  background: var(--n-primary-color);
  color: #fff;
  font-size: 12px;
}
.hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--n-text-color-3);
}

/* 阵列形制卡片 */
.pattern-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}
.pattern-card {
  display: flex;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.pattern-card:hover {
  border-color: var(--n-primary-color);
}
.pattern-card.selected {
  border-color: var(--n-primary-color);
  background: color-mix(in srgb, var(--n-primary-color) 8%, transparent);
}
.pc-icon {
  flex: 0 0 auto;
  color: var(--n-primary-color);
}
.pc-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.pc-title {
  font-size: 13.5px;
  font-weight: 600;
}
.pc-en {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}
.pc-desc {
  font-size: 12px;
  color: var(--n-text-color-2, var(--n-text-color));
  line-height: 1.45;
}
.pc-cell {
  font-size: 11.5px;
  color: var(--n-primary-color);
}

/* 输入 */
.field-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 150px;
  flex: 1 1 150px;
}
.field-auto {
  flex: 0 0 auto;
  min-width: 0;
  justify-content: flex-end;
}
.f-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}
.unit-tag {
  font-size: 11px;
  opacity: 0.8;
}

.canvas-wrap {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 6px;
  background: var(--n-color, transparent);
}
.perf-canvas {
  display: block;
  width: 100%;
}
.inline-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--n-text-color-3);
  line-height: 1.6;
}

/* 结果 */
.hero {
  border-color: color-mix(in srgb, var(--n-primary-color) 40%, var(--n-border-color));
}
.rc-title {
  font-size: 13px;
  color: var(--n-text-color-3);
}
.hero-rate {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--n-primary-color);
}
.hero-rate .unit {
  margin-left: 4px;
  font-size: 18px;
  font-weight: 500;
}
.sub {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  margin-bottom: 8px;
}
.formula {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--n-primary-color) 6%, transparent);
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--n-text-color-2, var(--n-text-color));
  white-space: pre-wrap;
}
.fx {
  font-weight: 600;
  color: var(--n-primary-color);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin: 12px 0;
}
.stat {
  padding: 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
}
.s-label {
  font-size: 12px;
  color: var(--n-text-color-3);
}
.s-value {
  font-size: 18px;
  font-weight: 600;
}
.s-value small {
  margin-left: 3px;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--n-text-color-3);
}
.s-sub {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}

.kv-result {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.kv {
  padding: 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
}
.kv .k {
  font-size: 12px;
  color: var(--n-text-color-3);
}
.kv .v {
  font-size: 19px;
  font-weight: 600;
}
.kv .v small {
  margin-left: 3px;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--n-text-color-3);
}
.s-sub.mini {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}
.full {
  grid-column: 1 / -1;
}

.mt {
  margin-top: 12px;
}
.mb {
  margin-bottom: 8px;
}

.notes ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--n-text-color-2, var(--n-text-color));
}

@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
