<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NAlert, NButton, NInputNumber, NSelect, NSpace } from 'naive-ui';
import { useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import Barrier from '../../audio/kernel/barrier.js';

interface SourceItem {
  id: string;
  name: string;
  levels: number[];
}
interface GeoItem {
  D: number;
  A: number;
  B: number;
  delta: number;
  hLOS: number;
  hEffective: number;
  blocked: boolean;
  shadowAngle: number;
  distances: { d1: number; d2: number };
}
interface RowItem {
  f: number;
  source: number;
  N: number;
  kurzeAnderson: number;
  maekawa: number;
  deltaL: number;
  limited: boolean;
}
interface SpectrumResult {
  ok: boolean;
  error?: string;
  geometric?: GeoItem;
  sourceName?: string;
  weighted?: boolean;
  bands?: number[];
  rows?: RowItem[];
  overallBefore?: number;
  overallAfter?: number;
  insertionLoss?: number;
}
interface HeightResult {
  ok: boolean;
  error?: string;
  height?: number;
  achieved?: number;
  target?: number;
}

const BANDS = Barrier.BANDS as number[];
const SOURCES = Barrier.SOURCES as SourceItem[];

/* ---------------- 状态 ---------------- */
const hs = ref(1);
const hr = ref(1.5);
const hb = ref(3);
const d1 = ref(10);
const d2 = ref(20);
const sourceId = ref('road');
const formula = ref('kurzeAnderson');
const limit = ref(24);
const target = ref(10);
const solveOut = ref<HeightResult | null>(null);

const message = useMessage();
const copy = useCopy();

const sourceOptions = computed(() => SOURCES.map((s) => ({ label: s.name, value: s.id })));
const formulaOptions = [
  { label: 'Kurze–Anderson（ΔL = 10 lg(3 + 20N)）', value: 'kurzeAnderson' },
  { label: 'Maekawa（ΔL = 5 + 20 lg(√(2πN)/tanh√(2πN))）', value: 'maekawa' },
];

/* ---------------- 格式化 ---------------- */
function num(v: number | null | undefined, d = 2): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return Number(v).toFixed(d);
}

/* ---------------- 计算 ---------------- */
const result = computed<SpectrumResult>(() => {
  return Barrier.spectrum({
    hs: hs.value,
    hr: hr.value,
    hb: hb.value,
    d1: d1.value,
    d2: d2.value,
    sourceId: sourceId.value,
    formula: formula.value,
    maxLimit: limit.value,
  }) as unknown as SpectrumResult;
});

const ok = computed(() => !!result.value.ok);
const r = computed<SpectrumResult | null>(() => (ok.value ? result.value : null));

const verdict = computed(() => {
  const s = r.value;
  if (!s || s.insertionLoss == null) return '';
  const il = s.insertionLoss;
  const level =
    il < 3
      ? '几乎无效（屏障未起作用）'
      : il < 6
        ? '效果有限'
        : il < 10
          ? '有一定降噪效果'
          : il < 15
            ? '降噪效果良好'
            : '降噪效果显著（接近实用上限）';
  return (
    level +
    '　声源：' +
    s.sourceName +
    '　公式：' +
    (formula.value === 'maekawa' ? 'Maekawa' : 'Kurze–Anderson') +
    '　（' +
    (s.weighted ? 'A 计权' : '未计权') +
    '）'
  );
});

const limitedWarn = computed(() => {
  const s = r.value;
  if (!s || !s.rows) return false;
  return s.rows.some((x) => x.limited);
});
const lowWarn = computed(() => !!r.value && (r.value.insertionLoss as number) < 6);

const stats = computed(() => {
  const s = r.value;
  if (!s || !s.rows || !s.geometric) return [];
  const p500 = s.rows[BANDS.indexOf(500)] || s.rows[0];
  return [
    { label: '程差 δ', value: num(s.geometric.delta, 3), unit: 'm' },
    { label: '菲涅尔数 N @500 Hz', value: num(p500.N, 2), unit: '' },
    { label: '屏障顶超出视线', value: num(s.geometric.hEffective, 2), unit: 'm' },
    {
      label: '屏障后总声级',
      value: num(s.overallAfter, 1),
      unit: s.weighted ? 'dBA' : 'dB',
    },
  ];
});

const note = computed(() => {
  const s = r.value;
  if (!s || !s.geometric) return '';
  const g = s.geometric;
  return (
    '几何：声源高 ' +
    num(hs.value, 2) +
    ' m，屏障顶 ' +
    num(hb.value, 2) +
    ' m，接收点高 ' +
    num(hr.value, 2) +
    ' m；水平距离 d1 = ' +
    num(d1.value, 1) +
    ' m、d2 = ' +
    num(d2.value, 1) +
    ' m。视线在屏障处高度 ' +
    num(g.hLOS, 2) +
    ' m，程差 δ = ' +
    num(g.delta, 3) +
    ' m；按无限长屏障计算，未计入两端绕射。'
  );
});

/* ---------------- 高度反算 ---------------- */
function solveHeight() {
  const res = Barrier.requiredHeight({
    hs: hs.value,
    hr: hr.value,
    d1: d1.value,
    d2: d2.value,
    sourceId: sourceId.value,
    targetIL: target.value,
    formula: formula.value,
    maxLimit: limit.value,
  }) as unknown as HeightResult;
  solveOut.value = res;
  if (!res.ok) message.error(res.error || '反算失败');
}

/* ---------------- 导出 ---------------- */
function summaryText(): string {
  const s = r.value;
  if (!s || !s.geometric || !s.rows) return '';
  const g = s.geometric;
  const out: string[] = [];
  out.push('声屏障衰减计算 · 结果摘要');
  out.push(
    '几何：声源高 ' +
      num(hs.value, 2) +
      ' m / 屏障顶 ' +
      num(hb.value, 2) +
      ' m / 接收点高 ' +
      num(hr.value, 2) +
      ' m；d1 = ' +
      num(d1.value, 1) +
      ' m，d2 = ' +
      num(d2.value, 1) +
      ' m'
  );
  out.push(
    '程差 δ = ' +
      num(g.delta, 3) +
      ' m；视线在屏障处高度 ' +
      num(g.hLOS, 2) +
      ' m；屏障顶超出视线 ' +
      num(g.hEffective, 2) +
      ' m'
  );
  out.push(
    '声源谱：' +
      s.sourceName +
      '；绕射公式：' +
      (formula.value === 'maekawa' ? 'Maekawa' : 'Kurze–Anderson') +
      '；实用上限 ' +
      num(limit.value, 0) +
      ' dB'
  );
  out.push(
    'A 计权插入损失 ΔL = ' +
      (s.insertionLoss as number).toFixed(1) +
      ' dB（屏障前 ' +
      num(s.overallBefore, 1) +
      ' → 屏障后 ' +
      num(s.overallAfter, 1) +
      (s.weighted ? ' dBA' : ' dB') +
      '）'
  );
  out.push('逐带 ΔL：' + s.rows.map((x) => x.f + 'Hz=' + num(x.deltaL, 1)).join('，'));
  out.push('工具：声学计算工具箱 · 声屏障衰减');
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
  const s = r.value;
  if (!s || !s.rows) {
    message.warning('暂无可导出结果');
    return;
  }
  const rows: (string | number)[][] = [];
  rows.push(['声屏障衰减计算结果', '', '']);
  rows.push(['声源高度 (m)', num(hs.value, 2), '']);
  rows.push(['屏障顶高度 (m)', num(hb.value, 2), '']);
  rows.push(['接收点高度 (m)', num(hr.value, 2), '']);
  rows.push(['d1 (m)', num(d1.value, 2), '']);
  rows.push(['d2 (m)', num(d2.value, 2), '']);
  rows.push(['程差 δ (m)', num(s.geometric ? s.geometric.delta : null, 4), '']);
  rows.push(['A 计权插入损失 (dB)', (s.insertionLoss as number).toFixed(2), '']);
  rows.push([]);
  rows.push(['倍频带 (Hz)', '声源级 (dB)', 'N', 'Kurze-Anderson (dB)', 'Maekawa (dB)', '采用 ΔL (dB)']);
  s.rows.forEach((x) => {
    rows.push([x.f, num(x.source, 1), num(x.N, 4), num(x.kurzeAnderson, 2), num(x.maekawa, 2), num(x.deltaL, 2)]);
  });
  const csv =
    '\ufeff' +
    rows
      .map((row) => row.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'barrier-result.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- 断面示意图（自绘 canvas） ---------------- */
const canvasRef = ref<HTMLCanvasElement | null>(null);
let ro: ResizeObserver | null = null;

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return v && v.trim() ? v.trim() : fallback;
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const pairs = [
    [x1, y1, x2, y2],
    [x2, y2, x1, y1],
  ];
  pairs.forEach((p) => {
    const ang = Math.atan2(p[3] - p[1], p[2] - p[0]);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + 6.5 * Math.cos(ang + Math.PI / 7), p[1] + 6.5 * Math.sin(ang + Math.PI / 7));
    ctx.lineTo(p[0] + 6.5 * Math.cos(ang - Math.PI / 7), p[1] + 6.5 * Math.sin(ang - Math.PI / 7));
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

interface ChipColors {
  chip: string;
  border: string;
}

function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, C: ChipColors) {
  ctx.save();
  ctx.font = '600 11px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 12;
  const h = 18;
  const rx = x - w / 2;
  const ry = y - h / 2;
  const rr = 6;
  ctx.beginPath();
  ctx.moveTo(rx + rr, ry);
  ctx.arcTo(rx + w, ry, rx + w, ry + h, rr);
  ctx.arcTo(rx + w, ry + h, rx, ry + h, rr);
  ctx.arcTo(rx, ry + h, rx, ry, rr);
  ctx.arcTo(rx, ry, rx + w, ry, rr);
  ctx.closePath();
  ctx.fillStyle = C.chip;
  ctx.fill();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
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

  const C = {
    primary: cssVar('--n-primary-color', '#2563eb'),
    accent: '#f97316',
    muted: cssVar('--n-text-color-3', '#6b7280'),
    faint: cssVar('--n-text-color-3', '#94a3b8'),
    text: cssVar('--n-text-color', '#16202f'),
    chip: cssVar('--n-card-color', '#ffffff'),
    border: cssVar('--n-border-color', '#d3dae6'),
    danger: '#d03050',
    ok: '#18a058',
  };

  const vHs = Number.isFinite(hs.value) ? hs.value : 1;
  const vHr = Number.isFinite(hr.value) ? hr.value : 1.5;
  const vHb = Number.isFinite(hb.value) ? hb.value : 3;
  const vD1 = Number.isFinite(d1.value) && (d1.value as number) > 0 ? d1.value : 10;
  const vD2 = Number.isFinite(d2.value) && (d2.value as number) > 0 ? d2.value : 20;

  const m = { l: 56, r: 30, t: 46, b: 46 };
  const spanX = vD1 + vD2;
  const maxH = Math.max(vHs, vHr, vHb, 1) * 1.3;
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  // 断面图为示意：横向与纵向采用独立比例，保证几何关系清晰
  const sx = pw / spanX;
  const sy = ph / maxH;
  const ox = m.l;
  const yGround = m.t + ph;
  const X = (dd: number) => ox + dd * sx;
  const Y = (h: number) => yGround - h * sy;

  // 地面
  ctx.strokeStyle = C.faint;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(m.l - 20, yGround);
  ctx.lineTo(W - m.r + 14, yGround);
  ctx.stroke();
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(m.l - 20, yGround + 6);
  ctx.lineTo(W - m.r + 14, yGround + 6);
  ctx.stroke();
  ctx.setLineDash([]);

  const xS = X(0);
  const yS = Y(vHs);
  const xB = X(vD1);
  const yB = Y(vHb);
  const xR = X(spanX);
  const yR = Y(vHr);
  const hLOS = vHs + (vHr - vHs) * (vD1 / spanX);
  const yLOSatB = Y(hLOS);

  // 视线（虚线）
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = vHb > hLOS ? C.danger : C.ok;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(xS, yS);
  ctx.lineTo(xR, yR);
  ctx.stroke();
  ctx.setLineDash([]);

  const s = r.value;
  if (s) {
    chip(ctx, vHb > hLOS ? '视线被遮挡' : '视线未遮挡', X(spanX / 2), Y((vHs + vHr) / 2) - 14, vHb > hLOS ? C.danger : C.ok, C);
  }

  // 屏障
  ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
  ctx.strokeStyle = C.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(xB - 5, yB, 10, yGround - yB);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.primary;
  ctx.beginPath();
  ctx.arc(xB, yB, 3.4, 0, Math.PI * 2);
  ctx.fill();

  // 绕射路径
  if (s) {
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(xS, yS);
    ctx.lineTo(xB, yB);
    ctx.lineTo(xR, yR);
    ctx.stroke();
  }

  // 声源与接收点
  ctx.fillStyle = C.text;
  ctx.beginPath();
  ctx.arc(xS, yS, 4.5, 0, Math.PI * 2);
  ctx.fill();
  chip(ctx, '声源 ' + num(vHs, 2) + ' m', xS, yS - 16, C.text, C);
  ctx.fillStyle = C.text;
  ctx.beginPath();
  ctx.arc(xR, yR, 4.5, 0, Math.PI * 2);
  ctx.fill();
  chip(ctx, '接收点 ' + num(vHr, 2) + ' m', xR, yR - 16, C.text, C);

  // 高度标注
  ctx.strokeStyle = C.muted;
  ctx.fillStyle = C.muted;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(X(vD1) - 26, yGround);
  ctx.lineTo(X(vD1) - 26, yB);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(vD1) - 26, yGround, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X(vD1) - 26, yB, 2.4, 0, Math.PI * 2);
  ctx.fill();
  chip(ctx, 'hb ' + num(vHb, 2) + ' m', X(vD1) - 26, (yGround + yB) / 2, C.muted, C);

  // 水平距离标注
  const yDim = yGround + 22;
  arrow(ctx, X(0), yDim, X(vD1), yDim, C.muted);
  chip(ctx, 'd1 = ' + num(vD1, 1) + ' m', (X(0) + X(vD1)) / 2, yDim + 16, C.muted, C);
  arrow(ctx, X(vD1), yDim, X(vD1 + vD2), yDim, C.muted);
  chip(ctx, 'd2 = ' + num(vD2, 1) + ' m', (X(vD1) + X(spanX)) / 2, yDim + 16, C.muted, C);

  // 屏障顶 / 视线标注
  if (s && s.rows && s.geometric) {
    const p500 = s.rows[BANDS.indexOf(500)] || s.rows[0];
    chip(
      ctx,
      'δ = ' + num(s.geometric.delta, 3) + ' m，N(500Hz) = ' + num(p500.N, 2),
      xB + 90,
      yB - 16,
      C.accent,
      C
    );
  }
  ctx.beginPath();
  ctx.strokeStyle = C.faint;
  ctx.setLineDash([3, 3]);
  ctx.moveTo(xB - 60, yLOSatB);
  ctx.lineTo(xB + 60, yLOSatB);
  ctx.stroke();
  ctx.setLineDash([]);
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

watch([hs, hr, hb, d1, d2, limit, sourceId, formula], () => drawDiagram());
</script>

<template>
  <ToolPage
    title="🚧 声屏障衰减"
    description="菲涅尔数法计算绕射程差与插入损失，叠加声源谱得到 A 计权降噪量"
  >
    <div class="split">
      <div class="col">
        <div class="card">
          <h3 class="card-title"><span class="step">1</span> 几何与声源参数</h3>
          <div class="field-row">
            <div class="field">
              <label class="f-label">声源高度 h<sub>s</sub> <span class="unit-tag">m</span></label>
              <n-input-number v-model:value="hs" :step="0.1" size="small" />
            </div>
            <div class="field">
              <label class="f-label">接收点高度 h<sub>r</sub> <span class="unit-tag">m</span></label>
              <n-input-number v-model:value="hr" :step="0.1" size="small" />
            </div>
            <div class="field">
              <label class="f-label">屏障顶高度 h<sub>b</sub> <span class="unit-tag">m</span></label>
              <n-input-number v-model:value="hb" :step="0.1" size="small" />
            </div>
            <div class="field">
              <label class="f-label">声源→屏障 d1 <span class="unit-tag">m</span></label>
              <n-input-number v-model:value="d1" :step="0.5" :min="0.5" size="small" />
            </div>
            <div class="field">
              <label class="f-label">屏障→接收点 d2 <span class="unit-tag">m</span></label>
              <n-input-number v-model:value="d2" :step="0.5" :min="0.5" size="small" />
            </div>
            <div class="field">
              <label class="f-label">声源谱</label>
              <n-select v-model:value="sourceId" :options="sourceOptions" size="small" />
            </div>
            <div class="field">
              <label class="f-label">绕射公式</label>
              <n-select v-model:value="formula" :options="formulaOptions" size="small" />
            </div>
            <div class="field">
              <label class="f-label">实用上限 <span class="unit-tag">dB</span></label>
              <n-input-number v-model:value="limit" :step="1" :min="5" size="small" />
            </div>
          </div>
          <n-alert v-if="!ok" type="error" :show-icon="false" class="mt">
            {{ result.error }}
          </n-alert>
          <div v-else>
            <n-alert v-if="limitedWarn" type="warning" :show-icon="false" class="mt">
              部分频带的理论绕射衰减已超过设定的实用上限 {{ num(limit, 0) }} dB，结果已按上限截断（实际工程常受侧向绕射、透射漏声与地面效应限制）。
            </n-alert>
            <n-alert v-if="lowWarn" type="info" :show-icon="false" class="mt">
              插入损失偏低：可尝试提高屏障高度、缩短屏障与声源/接收点的距离，或改用吸声型屏障帽（带吸声内衬可再提升 1–3 dB）。
            </n-alert>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title"><span class="step">2</span> 断面示意 <span class="hint">(示意绘制，横纵比例独立)</span></h3>
          <div class="chart-wrap"><canvas ref="canvasRef" class="bar-canvas" /></div>
          <div class="legend">
            <span><i class="dot src"></i>声源 / 接收点</span>
            <span><i style="background: #2563eb"></i>屏障</span>
            <span><i style="background: #f97316"></i>绕射路径</span>
            <span><i style="background: #d03050"></i>视线（被遮挡）</span>
          </div>
          <p v-if="note" class="inline-note">{{ note }}</p>
        </div>
      </div>

      <div class="col">
        <div class="card hero">
          <div class="rc-title">A 计权插入损失 ΔL</div>
          <div class="hero-rate">
            <span>{{ r && r.insertionLoss != null ? (r.insertionLoss as number).toFixed(1) : '—' }}</span>
            <span class="unit">dB</span>
          </div>
          <div class="sub">{{ verdict }}</div>
          <div class="stat-grid">
            <div v-for="s in stats" :key="s.label" class="stat">
              <div class="s-label">{{ s.label }}</div>
              <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
            </div>
          </div>
          <n-space :size="6">
            <n-button size="small" @click="copySummary">复制摘要</n-button>
            <n-button size="small" @click="exportCsv">导出 CSV</n-button>
          </n-space>
        </div>

        <div class="card">
          <h3 class="card-title">倍频带明细</h3>
          <div class="table-wrap">
            <table v-if="r && r.rows" class="detail-table">
              <thead>
                <tr>
                  <th>频带</th>
                  <th>声源级 (dB)</th>
                  <th>N</th>
                  <th>Kurze–Anderson</th>
                  <th>Maekawa</th>
                  <th>采用 ΔL (dB)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="x in r.rows" :key="x.f">
                  <td>{{ x.f }} Hz</td>
                  <td>{{ num(x.source, 0) }}</td>
                  <td>{{ num(x.N, 2) }}</td>
                  <td>{{ num(x.kurzeAnderson, 1) }}</td>
                  <td>{{ num(x.maekawa, 1) }}</td>
                  <td :class="x.limited ? 'warn' : 'ok'">
                    {{ num(x.deltaL, 1) }}{{ x.limited ? '（截断）' : '' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="inline-note">请输入有效参数后查看倍频带明细。</p>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">所需屏障高度反算</h3>
          <div class="field-row">
            <div class="field">
              <label class="f-label">目标插入损失 <span class="unit-tag">dB</span></label>
              <n-input-number v-model:value="target" :step="1" :min="1" size="small" />
            </div>
            <div class="field field-auto">
              <n-button size="small" type="primary" @click="solveHeight">反算高度</n-button>
            </div>
          </div>
          <div v-if="solveOut" class="mt">
            <n-alert v-if="!solveOut.ok" type="error" :show-icon="false">{{ solveOut.error }}</n-alert>
            <div v-else class="kv-result">
              <div class="kv">
                <div class="k">建议屏障顶高度</div>
                <div class="v">{{ num(solveOut.height, 2) }}<small>m</small></div>
                <div class="s-sub mini">满足目标 {{ num(solveOut.target, 0) }} dB</div>
              </div>
              <div class="kv">
                <div class="k">该高度实际插入损失</div>
                <div class="v">{{ num(solveOut.achieved, 1) }}<small>dB</small></div>
                <div class="s-sub mini">{{ sourceId === 'road' ? '道路交通噪声谱' : '所选声源谱' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card notes">
      <h3 class="card-title">计算方法</h3>
      <ul>
        <li><strong>几何</strong>：D 为声源到接收点的直线距离，A 为声源到屏障顶的距离，B 为屏障顶到接收点的距离，程差 δ = A + B − D（即绕射相对直达的额外路程）。</li>
        <li><strong>菲涅尔数</strong>：N = 2δ/λ = 2fδ/c₀。N 越大，绕射衰减越多；同一几何下高频衰减大于低频，因此声屏障对低频噪声效果有限。</li>
        <li><strong>绕射衰减</strong>：Maekawa ΔL = 5 + 20·lg(√(2πN)/tanh√(2πN))；Kurze–Anderson ΔL = 10·lg(3 + 20N)，后者在小 N 时更平滑，默认使用。</li>
        <li><strong>A 计权插入损失</strong>：将各倍频带声源级加 A 计权后按能量叠加，分别计算屏障前后的总声级之差，得到与听感相关的降噪量。</li>
        <li><strong>实用上限</strong>：实际工程中因侧向绕射、屏障透射漏声、声源指向性与地面效应，插入损失通常在 10–20 dB 以内。本页默认按 24 dB 截断，可按项目经验调整。</li>
        <li><strong>视线校核</strong>：若屏障顶低于声源—接收点视线高度，绕射衰减可忽略（屏障无效），本页会直接提示。</li>
        <li><strong>所需高度反算</strong>：在给定水平距离与声源谱下逐 0.05 m 试算屏障高度，返回首个满足目标插入损失的高度。</li>
        <li><strong>注意</strong>：本模型只计绕射，不含地面声反射、气象条件（风速/温度梯度）与多屏障叠加，长距离户外预测请结合 GB/T 17247.2 等标准方法。</li>
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

.chart-wrap {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 6px;
}
.bar-canvas {
  display: block;
  width: 100%;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}
.legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 2px;
  vertical-align: -1px;
}
.legend i.dot.src {
  border-radius: 50%;
  background: var(--n-text-color);
}

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
  margin-left: 6px;
  font-size: 16px;
  font-weight: 500;
}
.sub {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  margin-bottom: 8px;
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

.table-wrap {
  overflow-x: auto;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.detail-table th,
.detail-table td {
  padding: 7px 9px;
  border-bottom: 1px solid var(--n-border-color);
  text-align: right;
  white-space: nowrap;
}
.detail-table th:first-child,
.detail-table td:first-child {
  text-align: left;
}
.detail-table th {
  color: var(--n-text-color-3);
  font-weight: 500;
}
.detail-table td.ok {
  color: #18a058;
}
.detail-table td.warn {
  color: #f0a020;
}

.kv-result {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
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

.mt {
  margin-top: 12px;
}
.inline-note {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--n-text-color-3);
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
