<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { NAlert, NButton, NCheckbox, NInputNumber, NSelect, NSpace } from 'naive-ui';
import { useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import AudioChart from '../../audio/AudioChart.vue';
import Muffler from '../../audio/kernel/muffler.js';

interface MaterialItem {
  id: string;
  name: string;
  alpha: number[];
}
interface SourceItem {
  id: string;
  name: string;
  levels: number[];
}
interface WarnItem {
  level: string;
  text: string;
}
interface ResRow {
  f: number;
  alpha: number;
  phiGB: number;
  phiPerov: number;
  dLgb: number;
  dLperov: number;
  factor: number;
  limited: boolean;
  dL: number;
}
interface ResistiveResult {
  ok: boolean;
  error?: string;
  S?: number;
  P?: number;
  PS?: number;
  D?: number;
  fc?: number;
  v?: number | null;
  flow?: number | null;
  geom?: string;
  formName?: string;
  length?: number;
  xi?: number;
  vmax?: number;
  rows?: ResRow[];
  warnings?: WarnItem[];
  simplified?: string;
}
interface ExpRow {
  f: number;
  kl: number;
  sin2: number;
  tl: number;
  tlTotal: number;
}
interface ExpansionResult {
  ok: boolean;
  error?: string;
  m?: number;
  l?: number;
  stages?: number;
  coeff?: number;
  rows?: ExpRow[];
  peakFreqs?: number[];
  passFreqs?: number[];
  peakTL?: number;
  peakTLTotal?: number;
  warnings?: WarnItem[];
  formula?: string;
  d1?: number | null;
  d2?: number | null;
}
interface ResoRow {
  f: number;
  x: number;
  tlRaw: number;
  tl: number;
  capped: boolean;
}
interface ResonatorResult {
  ok: boolean;
  error?: string;
  fr?: number;
  G?: number;
  V?: number;
  S0?: number;
  lEff?: number;
  cap?: number;
  rows?: ResoRow[];
  curve?: { f: number; tl: number }[];
  warnings?: WarnItem[];
  holes?: number;
  holeD?: number;
  plateT?: number;
  formula?: string;
}
interface ComboRow {
  f: number;
  dRes: number;
  tlExpansion: number;
  tlResonator: number;
  total: number;
  source: number | null;
  aWeight: number;
  sourceA: number | null;
  after: number | null;
  afterA: number | null;
}
interface ComboResult {
  ok: boolean;
  error?: string;
  rows?: ComboRow[];
  sourceName?: string;
  weighted?: boolean;
  before?: number | null;
  after?: number | null;
  insertionLoss?: number | null;
  warnings?: WarnItem[];
}
interface LossResult {
  ok: boolean;
  error?: string;
  dp?: number;
  xi?: number;
  v?: number;
  note?: string;
}

const BANDS = Muffler.BANDS as number[];
const MATERIALS = Muffler.MATERIALS as MaterialItem[];
const SOURCES = Muffler.SOURCES as SourceItem[];
const FORMS = Muffler.FORMS as { id: string; name: string; xi: number; vmax: number; note: string }[];
const GB_PHI = Muffler.GB_PHI as number[][];

const formOptions = FORMS.map((f) => ({ label: f.name, value: f.id }));
const materialOptions = MATERIALS.map((m) => ({ label: m.name, value: m.id })).concat([
  { label: '自定义（逐频带输入 α₀）', value: 'custom' },
]);
const sourceOptions = SOURCES.map((s) => ({ label: s.name, value: s.id }));
const formulaOptions = [
  { label: 'GB/T 50087-2013 表 6.3.1 φ(α₀)', value: 'gb' },
  { label: '别洛夫理论式 φ = 4.34(1−√(1−α₀))/(1+√(1−α₀))', value: 'perov' },
];

const message = useMessage();
const copy = useCopy();

/* ---------------- 面板切换 ---------------- */
const panel = ref('res');
const panelButtons = [
  { key: 'res', label: '阻性消声器' },
  { key: 'react', label: '抗性（扩张室 / 共振腔）' },
  { key: 'combo', label: '组合验算 · A 计权' },
];

/* ---------------- 阻性：几何与工况 ---------------- */
const form = ref('splitter');
const length = ref(1.5);
const cVal = ref<number | null>(null);
const dRound = ref(0.3);
const aRect = ref(0.5);
const bRect = ref(0.4);
const blades = ref(3);
const gap = ref(0.15);
const height = ref(1.0);
const linedEnds = ref(false);
const unfold = ref(1.3);
const material = ref('gw32-100');
const customAlpha = reactive<number[]>([0.2, 0.35, 0.65, 0.85, 0.9, 0.9, 0.9]);
const formula = ref('gb');
const flowH = ref<number | null>(9000);

const showRound = computed(() => form.value === 'round');
const showRect = computed(() => form.value === 'rect');
const showSplitter = computed(() => form.value === 'splitter' || form.value === 'baffle');
const showUnfold = computed(() => form.value === 'baffle');
const showAlphaCustom = computed(() => material.value === 'custom');

function selectedAlpha(): number[] {
  if (material.value !== 'custom') {
    const m = MATERIALS.find((x) => x.id === material.value);
    return m ? m.alpha.slice() : MATERIALS[0].alpha.slice();
  }
  return BANDS.map((_, i) => (Number.isFinite(customAlpha[i]) ? customAlpha[i] : 0));
}

function geomInput() {
  return {
    form: form.value,
    d: dRound.value,
    a: aRect.value,
    b: bRect.value,
    blades: blades.value,
    gap: gap.value,
    height: height.value,
    linedEnds: linedEnds.value,
    unfoldFactor: unfold.value,
    length: length.value,
    c: cVal.value,
  };
}

const flow = computed(() => (flowH.value != null && flowH.value > 0 ? flowH.value / 3600 : null));

/* ---------------- 面板 1：阻性 ---------------- */
const resInput = computed(() => ({
  ...geomInput(),
  alpha: selectedAlpha(),
  formula: formula.value,
  flow: flow.value,
}));

const resResult = computed<ResistiveResult>(() => Muffler.resistive(resInput.value) as unknown as ResistiveResult);
const res = computed<ResistiveResult | null>(() => (resResult.value.ok ? resResult.value : null));

const plResult = computed<LossResult>(() => {
  if (!res.value || res.value.v == null) return { ok: false };
  return Muffler.pressureLoss({ ...geomInput(), flow: flow.value }) as unknown as LossResult;
});

const adviceList = computed(() => {
  if (!res.value) return [];
  return Muffler.advice(geomInput()) as unknown as WarnItem[];
});

const resStats = computed(() => {
  const r = res.value;
  if (!r) return [];
  const list = [
    { label: '净流通面积 S', value: num(r.S, 3), unit: 'm²', sub: r.geom || '' },
    { label: '饰面周长比 P/S', value: num(r.PS, 2), unit: 'm⁻¹', sub: '' },
    { label: '当量直径 D', value: num((r.D as number) * 1000, 0), unit: 'mm', sub: '' },
    { label: '上限截止频率 f_c', value: num(r.fc, 0), unit: 'Hz', sub: 'f_c = 1.85c/D' },
  ];
  if (r.v != null) list.push({ label: '通道流速 v', value: num(r.v, 1), unit: 'm/s', sub: '上限 ' + r.vmax + ' m/s' });
  if (plResult.value.ok) {
    list.push({
      label: '全压损失 Δp',
      value: num(plResult.value.dp, 1),
      unit: 'Pa',
      sub: 'ξ = ' + num(plResult.value.xi, 2) + '（' + r.formName + ' 经验值）',
    });
  }
  return list;
});

/* ---------------- 面板 2：抗性 ---------------- */
const eD1 = ref(0.2);
const eD2 = ref(0.4);
const eM = ref<number | null>(null);
const eL = ref(0.5);
const eStages = ref(1);
const eC = ref<number | null>(null);

const expansionInput = computed(() => ({
  d1: eD1.value,
  d2: eD2.value,
  m: eM.value,
  l: eL.value,
  stages: eStages.value,
  c: eC.value,
}));

const expResult = computed<ExpansionResult>(
  () => Muffler.expansion(expansionInput.value) as unknown as ExpansionResult
);
const exp = computed<ExpansionResult | null>(() => (expResult.value.ok ? expResult.value : null));

const expStats = computed(() => {
  const e = exp.value;
  if (!e) return [];
  const list = [
    {
      label: '扩张比 m',
      value: num(e.m, 2),
      unit: '',
      sub: e.d1 && e.d2 ? '由 d₁/d₂ = ' + num(e.d1, 3) + '/' + num(e.d2, 3) + ' 换算' : '',
    },
    { label: '单节峰值 TL', value: num(e.peakTL, 1), unit: 'dB', sub: '10lg[1+¼(m−1/m)²]' },
  ];
  if ((e.stages as number) > 1) {
    list.push({
      label: (e.stages as number) + ' 节串联峰值',
      value: num(e.peakTLTotal, 1),
      unit: 'dB',
      sub: '',
    });
  }
  list.push({
    label: '第一通过频率',
    value: num(e.passFreqs ? e.passFreqs[0] : null, 0),
    unit: 'Hz',
    sub: 'c/(2l)，该处 TL=0',
  });
  return list;
});

const rhD = ref(0.008);
const rtT = ref(0.002);
const rnN = ref(50);
const rVol = ref<number | null>(null);
const rChD = ref(0.4);
const rChL = ref(0.5);
const rPipeD = ref(0.1);
const rCap = ref(20);

const resonatorInput = computed(() => ({
  holeD: rhD.value,
  plateT: rtT.value,
  holes: rnN.value,
  volume: rVol.value,
  chamberD: rChD.value,
  chamberL: rChL.value,
  pipeD: rPipeD.value,
  cap: rCap.value,
  c: eC.value,
}));

const resoResult = computed<ResonatorResult>(
  () => Muffler.resonator(resonatorInput.value) as unknown as ResonatorResult
);
const reso = computed<ResonatorResult | null>(() => (resoResult.value.ok ? resoResult.value : null));

const resoStats = computed(() => {
  const r = reso.value;
  if (!r) return [];
  return [
    { label: '共振频率 f_r', value: num(r.fr, 1), unit: 'Hz', sub: '(c/2π)√(G/V)' },
    { label: '声传导率 G', value: num(r.G, 3), unit: 'm', sub: 'S₀/(t+0.85d)' },
    {
      label: '颈口总面积 S₀',
      value: num((r.S0 as number) * 1e4, 1),
      unit: 'cm²',
      sub: r.holes + ' × ⌀' + num((r.holeD as number) * 1000, 0) + ' mm',
    },
    { label: '有效颈长', value: num((r.lEff as number) * 1000, 1), unit: 'mm', sub: '' },
  ];
});

const resoCurveX = computed(() => (reso.value && reso.value.curve ? reso.value.curve.map((p) => p.f) : []));
const resoCurveSeries = computed(() => {
  if (!reso.value || !reso.value.curve) return [];
  return [
    {
      values: reso.value.curve.map((p) => p.tl),
      color: '#2563eb',
      width: 2,
      points: false,
    },
  ];
});
const freqLabelFmt = (v: number) => (v >= 1000 ? v / 1000 + 'k' : String(Math.round(v)));

/* ---------------- 面板 3：组合验算 ---------------- */
const sourceId = ref('fan');
const weighted = ref(true);

const comboResult = computed<ComboResult>(() => {
  const input = {
    res: resResult.value.ok ? resInput.value : null,
    exp: expResult.value.ok ? expansionInput.value : null,
    reson: resoResult.value.ok ? resonatorInput.value : null,
    sourceId: sourceId.value,
    weighted: weighted.value,
  };
  return Muffler.combined(input) as unknown as ComboResult;
});
const combo = computed<ComboResult | null>(() => (comboResult.value.ok ? comboResult.value : null));

const comboStats = computed(() => {
  const c = combo.value;
  if (!c) return [];
  return [
    {
      label: '装前总声级',
      value: c.before == null ? '—' : num(c.before, 1),
      unit: c.weighted ? 'dB(A)' : 'dB',
      sub: c.sourceName + (c.weighted ? ' · A 计权' : ''),
    },
    {
      label: '装后总声级',
      value: c.after == null ? '—' : num(c.after, 1),
      unit: c.weighted ? 'dB(A)' : 'dB',
      sub: '',
    },
    {
      label: '插入损失 IL',
      value: c.insertionLoss == null ? '—' : num(c.insertionLoss, 1),
      unit: 'dB',
      sub: '各频带消声量按能量叠加',
    },
    { label: '计权方式', value: c.weighted ? 'A 计权' : '线性', unit: '', sub: '' },
  ];
});

const comboSeries = computed(() => {
  const c = combo.value;
  if (!c || !c.rows) return [];
  return [
    {
      values: c.rows.map((row) => (c.weighted ? row.sourceA : row.source)),
      color: '#94a3b8',
      width: 1.5,
      dash: [4, 3],
    },
    {
      values: c.rows.map((row) => (c.weighted ? row.afterA : row.after)),
      color: '#2563eb',
      width: 2,
    },
    { values: c.rows.map((row) => row.total), type: 'bar' as const, color: '#f97316' },
  ];
});

/* ---------------- 通用 ---------------- */
function num(v: number | null | undefined, d = 2): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return Number(v).toFixed(d);
}
function alertType(level: string): 'warning' | 'success' | 'info' {
  if (level === 'warn') return 'warning';
  if (level === 'ok') return 'success';
  return 'info';
}
function download(rows: (string | number)[][], filename: string) {
  const csv =
    '\ufeff' +
    rows
      .map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- 面板 1 导出 ---------------- */
function resSummary(): string {
  const r = res.value;
  if (!r || !r.rows) return '';
  const g = resInput.value;
  const out: string[] = ['阻性消声器计算 · 结果摘要'];
  out.push(
    '结构：' +
      r.formName +
      '；几何：' +
      r.geom +
      '；有效长度 ' +
      num(r.length, 2) +
      ' m；声速 ' +
      num(g.c == null ? Muffler.C0 : g.c, 0) +
      ' m/s'
  );
  out.push(
    '净流通面积 S = ' +
      num(r.S, 3) +
      ' m²，饰面周长比 P/S = ' +
      num(r.PS, 2) +
      ' m⁻¹，当量直径 D = ' +
      num((r.D as number) * 1000, 0) +
      ' mm，上限截止频率 f_c = ' +
      num(r.fc, 0) +
      ' Hz'
  );
  if (r.v != null) out.push('风量 Q = ' + num(flowH.value, 0) + ' m³/h，通道流速 v = ' + num(r.v, 1) + ' m/s（上限 ' + r.vmax + ' m/s）');
  if (plResult.value.ok) out.push('全压损失 Δp = ' + num(plResult.value.dp, 1) + ' Pa（ξ = ' + num(plResult.value.xi, 2) + '）');
  out.push('消声系数取法：' + (formula.value === 'perov' ? '别洛夫理论式' : 'GB/T 50087-2013 表 6.3.1'));
  out.push('常用简式：' + (r.simplified || '—'));
  out.push('逐带 ΔL：' + r.rows.map((row) => row.f + 'Hz=' + num(row.dL, 1)).join('，'));
  out.push('工具：声学计算工具箱 · 消声器计算（阻性，GB/T 50087-2013 第 6.3 节）');
  return out.join('\n');
}

function copyRes() {
  const txt = resSummary();
  if (!txt) {
    message.warning('暂无可复制结果');
    return;
  }
  copy(txt, '已复制结果摘要');
}

function exportRes() {
  const r = res.value;
  if (!r || !r.rows) {
    message.warning('暂无可导出结果');
    return;
  }
  const g = resInput.value;
  const rows: (string | number)[][] = [['阻性消声器计算结果', '', '']];
  rows.push(['结构形式', r.formName as string, r.geom as string]);
  rows.push(['有效长度 (m)', num(r.length, 2), '声速 (m/s)', num(g.c == null ? Muffler.C0 : g.c, 0)]);
  rows.push(['净流通面积 S (m²)', num(r.S, 4), '饰面周长 P (m)', num(r.P, 4)]);
  rows.push(['P/S (m⁻¹)', num(r.PS, 3), '当量直径 D (mm)', num((r.D as number) * 1000, 1)]);
  rows.push(['上限截止频率 f_c (Hz)', num(r.fc, 0), '通道流速 v (m/s)', r.v == null ? '' : num(r.v, 2)]);
  if (plResult.value.ok) rows.push(['全压损失 Δp (Pa)', num(plResult.value.dp, 2), '损失系数 ξ', num(plResult.value.xi, 3)]);
  rows.push(['消声系数取法', formula.value === 'perov' ? '别洛夫式' : 'GB/T 50087-2013 表 6.3.1', '', '']);
  rows.push([]);
  rows.push(['倍频带 (Hz)', 'α₀', 'φ(α₀) GB', 'φ 别洛夫', 'ΔL_GB (dB)', '采用 ΔL (dB)', '折减系数']);
  r.rows.forEach((row) => {
    rows.push([
      row.f,
      num(row.alpha, 3),
      num(row.phiGB, 3),
      num(row.phiPerov, 3),
      num(row.dLgb, 2),
      num(row.dL, 2),
      num(row.factor, 3),
    ]);
  });
  download(rows, 'muffler-resistive.csv');
}

/* ---------------- 面板 2 导出 ---------------- */
function exportReact() {
  const e = exp.value;
  const r = reso.value;
  if (!e && !r) {
    message.warning('暂无可导出结果');
    return;
  }
  const rows: (string | number)[][] = [['抗性消声器计算结果', '', '']];
  if (e && e.rows) {
    rows.push(['— 扩张室 —', '', '']);
    rows.push(['扩张比 m', num(e.m, 3), '长度 l (m)', num(e.l, 3)]);
    rows.push(['串联节数', e.stages as number, '单节峰值 TL (dB)', num(e.peakTL, 2)]);
    rows.push(['第一通过频率 (Hz)', num(e.passFreqs ? e.passFreqs[0] : null, 1), '公式', e.formula as string]);
    rows.push([]);
    rows.push(['倍频带 (Hz)', 'k·l', 'sin²(k·l)', '单节 TL (dB)', '合计 TL (dB)']);
    e.rows.forEach((row) => {
      rows.push([row.f, num(row.kl, 3), num(row.sin2, 4), num(row.tl, 2), num(row.tlTotal, 2)]);
    });
    rows.push([]);
  }
  if (r && r.rows) {
    rows.push(['— 共振腔 —', '', '']);
    rows.push(['共振频率 f_r (Hz)', num(r.fr, 2), '声传导率 G (m)', num(r.G, 4)]);
    rows.push(['腔容积 V (m³)', num(r.V, 4), '颈口总面积 S₀ (cm²)', num((r.S0 as number) * 1e4, 2)]);
    rows.push(['有效颈长 (mm)', num((r.lEff as number) * 1000, 2), '穿孔数量', r.holes as number]);
    rows.push(['消声量上限 (dB)', r.cap as number, '', '']);
    rows.push([]);
    rows.push(['倍频带 (Hz)', 'f/f_r − f_r/f', 'TL 原始 (dB)', '采用 TL (dB)', '是否截断']);
    r.rows.forEach((row) => {
      rows.push([row.f, num(row.x, 4), num(row.tlRaw, 2), num(row.tl, 2), row.capped ? '是' : '否']);
    });
  }
  download(rows, 'muffler-reactive.csv');
}

/* ---------------- 面板 3 导出 ---------------- */
function comboSummary(): string {
  const c = combo.value;
  if (!c || !c.rows) return '';
  const out: string[] = ['阻抗复合消声器组合验算 · 结果摘要'];
  out.push('声源谱：' + c.sourceName + '（' + (c.weighted ? 'A 计权' : '线性') + '）');
  out.push(
    '装前总声级 ' +
      num(c.before, 1) +
      ' → 装后 ' +
      num(c.after, 1) +
      ' ' +
      (c.weighted ? 'dB(A)' : 'dB') +
      '，插入损失 IL = ' +
      num(c.insertionLoss, 1) +
      ' dB'
  );
  out.push('逐带合计 ΔL：' + c.rows.map((row) => row.f + 'Hz=' + num(row.total, 1)).join('，'));
  out.push('工具：声学计算工具箱 · 消声器计算（阻抗复合）');
  return out.join('\n');
}

function copyCombo() {
  const txt = comboSummary();
  if (!txt) {
    message.warning('暂无可复制结果');
    return;
  }
  copy(txt, '已复制结果摘要');
}

function exportCombo() {
  const c = combo.value;
  if (!c || !c.rows) {
    message.warning('暂无可导出结果');
    return;
  }
  const rows: (string | number)[][] = [['阻抗复合消声器组合验算结果', '', '']];
  rows.push(['声源谱', c.sourceName as string, '计权', c.weighted ? 'A 计权' : '线性']);
  rows.push(['装前总声级', num(c.before, 2), '装后总声级', num(c.after, 2)]);
  rows.push(['插入损失 IL (dB)', num(c.insertionLoss, 2), '', '']);
  rows.push([]);
  rows.push(['倍频带 (Hz)', '声源 (dB)', 'A 计权 (dB)', '阻性 ΔL (dB)', '扩张室 TL (dB)', '共振腔 TL (dB)', '合计 ΔL (dB)', '装后 (dB)']);
  c.rows.forEach((row) => {
    rows.push([
      row.f,
      row.source == null ? '' : num(row.source, 1),
      row.sourceA == null ? '' : num(row.sourceA, 1),
      num(row.dRes, 2),
      num(row.tlExpansion, 2),
      num(row.tlResonator, 2),
      num(row.total, 2),
      row.after == null ? '' : num(row.after, 1),
    ]);
  });
  download(rows, 'muffler-combined.csv');
}
</script>

<template>
  <ToolPage
    title="🪈 消声器计算"
    description="阻性（GB/T 50087-2013 式 6.3.1，附别洛夫式对照与高频失效折减）、抗性（扩张室一维平面波解、共振腔 Helmholtz）与阻抗复合 A 计权验算"
  >
    <div class="mode-row">
      <span class="mode-label">结构</span>
      <n-button
        v-for="b in panelButtons"
        :key="b.key"
        size="small"
        :type="panel === b.key ? 'primary' : 'default'"
        :secondary="panel !== b.key"
        @click="panel = b.key"
      >
        {{ b.label }}
      </n-button>
    </div>

    <!-- ================= 面板 1：阻性消声器 ================= -->
    <div v-if="panel === 'res'">
      <div class="card">
        <h3 class="card-title"><span class="step">1</span> 结构形式与通道几何</h3>
        <div class="field-row">
          <div class="field">
            <label class="f-label">结构形式</label>
            <n-select v-model:value="form" :options="formOptions" size="small" />
          </div>
          <div class="field">
            <label class="f-label">有效长度 l <span class="unit-tag">m</span></label>
            <n-input-number v-model:value="length" :step="0.1" :min="0" size="small" />
          </div>
          <div class="field">
            <label class="f-label">声速 c <span class="unit-tag">m/s</span> <span class="hint mini">(留空 = 343)</span></label>
            <n-input-number v-model:value="cVal" :step="1" :min="0" size="small" placeholder="343" />
          </div>
        </div>
        <div v-if="showRound" class="field-row">
          <div class="field">
            <label class="f-label">管道内径 d <span class="unit-tag">m</span></label>
            <n-input-number v-model:value="dRound" :step="0.05" :min="0" size="small" />
          </div>
        </div>
        <div v-if="showRect" class="field-row">
          <div class="field">
            <label class="f-label">净宽 a <span class="unit-tag">m</span></label>
            <n-input-number v-model:value="aRect" :step="0.05" :min="0" size="small" />
          </div>
          <div class="field">
            <label class="f-label">净高 b <span class="unit-tag">m</span></label>
            <n-input-number v-model:value="bRect" :step="0.05" :min="0" size="small" />
          </div>
        </div>
        <div v-if="showSplitter" class="field-row">
          <div class="field">
            <label class="f-label">消声片数量 <span class="unit-tag">片</span></label>
            <n-input-number v-model:value="blades" :step="1" :min="1" size="small" />
          </div>
          <div class="field">
            <label class="f-label">片间净通道宽 <span class="unit-tag">m</span></label>
            <n-input-number v-model:value="gap" :step="0.01" :min="0" size="small" />
          </div>
          <div class="field">
            <label class="f-label">消声片高度 <span class="unit-tag">m</span></label>
            <n-input-number v-model:value="height" :step="0.1" :min="0" size="small" />
          </div>
        </div>
        <div class="field-row">
          <div v-if="showSplitter" class="field check-field">
            <n-checkbox v-model:checked="linedEnds">通道上下壁亦衬吸声材料</n-checkbox>
          </div>
          <div v-if="showUnfold" class="field">
            <label class="f-label">折板展开系数 <span class="unit-tag">1~2</span></label>
            <n-input-number v-model:value="unfold" :step="0.1" :min="1" :max="2" size="small" />
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title"><span class="step">2</span> 吸声材料与工况</h3>
        <div class="field-row">
          <div class="field">
            <label class="f-label">吸声材料（正入射 α₀ 预设）</label>
            <n-select v-model:value="material" :options="materialOptions" size="small" />
          </div>
          <div class="field">
            <label class="f-label">消声系数取法</label>
            <n-select v-model:value="formula" :options="formulaOptions" size="small" />
          </div>
          <div class="field">
            <label class="f-label">风量 Q <span class="unit-tag">m³/h</span> <span class="hint mini">(选填，用于流速/压损)</span></label>
            <n-input-number v-model:value="flowH" :step="500" :min="0" size="small" />
          </div>
        </div>
        <div v-if="showAlphaCustom" class="field-row alpha-row">
          <div v-for="(f, i) in BANDS" :key="f" class="field narrow">
            <label class="f-label">α₀ @{{ f >= 1000 ? f / 1000 + 'k' : f }}</label>
            <n-input-number v-model:value="customAlpha[i]" :step="0.05" :min="0" :max="1" size="small" />
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">计算结果</h3>
        <n-alert v-if="!res" type="error" :show-icon="false">{{ resResult.error }}</n-alert>
        <template v-else>
          <div class="stat-grid">
            <div v-for="s in resStats" :key="s.label" class="stat">
              <div class="s-label">{{ s.label }}</div>
              <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
              <div v-if="s.sub" class="s-sub">{{ s.sub }}</div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>倍频带 (Hz)</th>
                  <th>α₀</th>
                  <th>φ(α₀) GB 表</th>
                  <th>φ 别洛夫</th>
                  <th>ΔL_GB (dB)</th>
                  <th>采用 ΔL (dB)</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in res.rows" :key="row.f">
                  <td class="mono">{{ row.f }}</td>
                  <td>{{ num(row.alpha, 2) }}</td>
                  <td>{{ num(row.phiGB, 2) }}</td>
                  <td>{{ num(row.phiPerov, 2) }}</td>
                  <td>{{ num(row.dLgb, 1) }}</td>
                  <td class="mono"><strong>{{ num(row.dL, 1) }}</strong></td>
                  <td :class="row.limited ? 'warn' : 'muted'">
                    {{ row.limited ? '高频失效折减 ×' + num(row.factor, 2) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="inline-note">常用简式：{{ res.simplified }}</p>
          <n-space :size="6" class="mt">
            <n-button size="small" @click="copyRes">复制摘要</n-button>
            <n-button size="small" @click="exportRes">导出 CSV</n-button>
          </n-space>

          <h4 class="sub-head">校核与选型建议</h4>
          <n-alert
            v-for="(w, i) in (res.warnings || []).concat(adviceList)"
            :key="'w' + i"
            :type="alertType(w.level)"
            :show-icon="false"
            class="mt"
          >
            {{ w.text }}
          </n-alert>
          <p v-if="plResult.ok" class="inline-note">压力损失：{{ plResult.note }}</p>
        </template>
      </div>

      <div class="card notes">
        <h3 class="card-title">GB/T 50087-2013 表 6.3.1 消声系数 φ(α₀)</h3>
        <div class="table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th v-for="p in GB_PHI" :key="p[0]">α₀ = {{ num(p[0], 2) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td v-for="p in GB_PHI" :key="'v' + p[0]">{{ num(p[1], 2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="inline-note">
          表中数值按分段线性插值使用（α₀ ≥ 0.9 取 1.5）；别洛夫理论式 φ = 4.34(1−√(1−α₀))/(1+√(1−α₀)) 可作对照。
        </p>
      </div>
    </div>

    <!-- ================= 面板 2：抗性消声器 ================= -->
    <div v-if="panel === 'react'">
      <div class="split">
        <div class="col">
          <div class="card">
            <h3 class="card-title"><span class="step">A</span> 扩张室消声器 <span class="hint">(一维平面波解)</span></h3>
            <div class="field-row">
              <div class="field">
                <label class="f-label">主管内径 d₁ <span class="unit-tag">m</span></label>
                <n-input-number v-model:value="eD1" :step="0.02" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">扩张室内径 d₂ <span class="unit-tag">m</span></label>
                <n-input-number v-model:value="eD2" :step="0.05" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">扩张比 m <span class="hint mini">(留空按 d₂/d₁ 换算)</span></label>
                <n-input-number v-model:value="eM" :step="0.5" :min="0" size="small" placeholder="自动" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="f-label">扩张室长度 l <span class="unit-tag">m</span></label>
                <n-input-number v-model:value="eL" :step="0.05" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">串联节数</label>
                <n-input-number v-model:value="eStages" :step="1" :min="1" size="small" />
              </div>
              <div class="field">
                <label class="f-label">声速 c <span class="unit-tag">m/s</span> <span class="hint mini">(留空 = 343)</span></label>
                <n-input-number v-model:value="eC" :step="1" :min="0" size="small" placeholder="343" />
              </div>
            </div>
            <n-alert v-if="!exp" type="error" :show-icon="false" class="mt">{{ expResult.error }}</n-alert>
            <template v-else>
              <div class="stat-grid">
                <div v-for="s in expStats" :key="s.label" class="stat">
                  <div class="s-label">{{ s.label }}</div>
                  <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
                  <div v-if="s.sub" class="s-sub">{{ s.sub }}</div>
                </div>
              </div>
              <div class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>倍频带 (Hz)</th>
                      <th>k·l</th>
                      <th>sin²(k·l)</th>
                      <th>单节 TL (dB)</th>
                      <th>{{ exp.stages }} 节合计 (dB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in exp.rows" :key="row.f">
                      <td class="mono">{{ row.f }}</td>
                      <td>{{ num(row.kl, 2) }}</td>
                      <td>{{ num(row.sin2, 3) }}</td>
                      <td>{{ num(row.tl, 1) }}</td>
                      <td class="mono"><strong>{{ num(row.tlTotal, 1) }}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="inline-note">公式：{{ exp.formula }}</p>
              <n-alert
                v-for="(w, i) in exp.warnings || []"
                :key="'ew' + i"
                :type="alertType(w.level)"
                :show-icon="false"
                class="mt"
              >
                {{ w.text }}
              </n-alert>
            </template>
          </div>
        </div>

        <div class="col">
          <div class="card">
            <h3 class="card-title"><span class="step">B</span> 共振腔消声器 <span class="hint">(Helmholtz 旁支式)</span></h3>
            <div class="field-row">
              <div class="field">
                <label class="f-label">穿孔直径 d <span class="unit-tag">m</span> <span class="hint mini">(如 0.008 = 8 mm)</span></label>
                <n-input-number v-model:value="rhD" :step="0.001" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">板厚 / 颈长 t <span class="unit-tag">m</span></label>
                <n-input-number v-model:value="rtT" :step="0.001" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">穿孔数量 <span class="unit-tag">个</span></label>
                <n-input-number v-model:value="rnN" :step="1" :min="1" size="small" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="f-label">腔容积 V <span class="unit-tag">m³</span> <span class="hint mini">(留空按腔体尺寸算)</span></label>
                <n-input-number v-model:value="rVol" :step="0.005" :min="0" size="small" placeholder="自动" />
              </div>
              <div class="field">
                <label class="f-label">腔体内径 <span class="unit-tag">m</span></label>
                <n-input-number v-model:value="rChD" :step="0.05" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">腔体长度 <span class="unit-tag">m</span></label>
                <n-input-number v-model:value="rChL" :step="0.05" :min="0" size="small" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="f-label">主管内径 <span class="unit-tag">m</span></label>
                <n-input-number v-model:value="rPipeD" :step="0.01" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">消声量上限 <span class="unit-tag">dB</span> <span class="hint mini">(受声阻限制)</span></label>
                <n-input-number v-model:value="rCap" :step="1" :min="1" size="small" />
              </div>
            </div>
            <n-alert v-if="!reso" type="error" :show-icon="false" class="mt">{{ resoResult.error }}</n-alert>
            <template v-else>
              <div class="stat-grid">
                <div v-for="s in resoStats" :key="s.label" class="stat">
                  <div class="s-label">{{ s.label }}</div>
                  <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
                  <div v-if="s.sub" class="s-sub">{{ s.sub }}</div>
                </div>
              </div>
              <div class="table-wrap">
                <table class="detail-table">
                  <thead>
                    <tr>
                      <th>倍频带 (Hz)</th>
                      <th>f/f_r − f_r/f</th>
                      <th>TL 原始 (dB)</th>
                      <th>采用 TL (dB)</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in reso.rows" :key="row.f">
                      <td class="mono">{{ row.f }}</td>
                      <td>{{ num(row.x, 2) }}</td>
                      <td>{{ num(row.tlRaw, 1) }}</td>
                      <td class="mono"><strong>{{ num(row.tl, 1) }}</strong></td>
                      <td :class="row.capped ? 'warn' : 'muted'">
                        {{ row.capped ? '受上限 ' + num(reso.cap, 0) + ' dB 截断' : '—' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="chart-wrap">
                <AudioChart
                  :x="resoCurveX"
                  :series="resoCurveSeries"
                  x-log
                  :y-min="0"
                  :y-digits="0"
                  :x-label-fmt="freqLabelFmt"
                  :height="220"
                />
              </div>
              <p class="inline-note">共振腔传声损失频率特性（对数扫频 40 ~ 8000 Hz）</p>
              <p class="inline-note">公式：{{ reso.formula }}</p>
              <n-alert
                v-for="(w, i) in reso.warnings || []"
                :key="'rw' + i"
                :type="alertType(w.level)"
                :show-icon="false"
                class="mt"
              >
                {{ w.text }}
              </n-alert>
            </template>
          </div>
        </div>
      </div>

      <div class="card">
        <n-space :size="6">
          <n-button size="small" @click="exportReact">导出抗性计算 CSV</n-button>
        </n-space>
      </div>
    </div>

    <!-- ================= 面板 3：组合验算 ================= -->
    <div v-if="panel === 'combo'">
      <div class="card">
        <p class="inline-note">
          组合验算复用前两个面板已填的参数（阻性几何与材料、扩张室、共振腔），任一未填的结构按「无该结构」处理；声源谱可在下方选择预设后自动重算。
        </p>
      </div>

      <div class="card">
        <h3 class="card-title"><span class="step">1</span> 声源与计权</h3>
        <div class="field-row">
          <div class="field">
            <label class="f-label">声源谱预设（各倍频带声压级）</label>
            <n-select v-model:value="sourceId" :options="sourceOptions" size="small" />
          </div>
          <div class="field check-field">
            <n-checkbox v-model:checked="weighted">A 计权（推荐，评价人的主观感受）</n-checkbox>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">组合验算结果</h3>
        <n-alert v-if="!combo" type="error" :show-icon="false">{{ comboResult.error }}</n-alert>
        <template v-else>
          <div class="stat-grid">
            <div v-for="s in comboStats" :key="s.label" class="stat">
              <div class="s-label">{{ s.label }}</div>
              <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
              <div v-if="s.sub" class="s-sub">{{ s.sub }}</div>
            </div>
          </div>
          <div class="table-wrap">
            <table v-if="combo.rows" class="detail-table">
              <thead>
                <tr>
                  <th>倍频带 (Hz)</th>
                  <th>声源 (dB)</th>
                  <th>A 计权 (dB)</th>
                  <th>阻性 ΔL (dB)</th>
                  <th>扩张室 TL (dB)</th>
                  <th>共振腔 TL (dB)</th>
                  <th>合计 ΔL (dB)</th>
                  <th>装后 (dB)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in combo.rows" :key="row.f">
                  <td class="mono">{{ row.f }}</td>
                  <td>{{ row.source == null ? '—' : num(row.source, 1) }}</td>
                  <td>{{ row.sourceA == null ? '—' : num(row.sourceA, 1) }}</td>
                  <td>{{ num(row.dRes, 1) }}</td>
                  <td>{{ num(row.tlExpansion, 1) }}</td>
                  <td>{{ num(row.tlResonator, 1) }}</td>
                  <td class="mono"><strong>{{ num(row.total, 1) }}</strong></td>
                  <td>{{ row.after == null ? '—' : num(row.after, 1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="chart-wrap">
            <AudioChart
              :x="BANDS"
              :series="comboSeries"
              :y-min="0"
              :y-digits="0"
              :x-label-fmt="freqLabelFmt"
              :height="260"
            />
          </div>
          <div class="legend">
            <span><i style="background: #94a3b8"></i>装前声源（{{ combo.weighted ? 'A 计权' : '线性' }}）</span>
            <span><i style="background: #2563eb"></i>装后</span>
            <span><i style="background: #f97316"></i>逐带合计消声量 ΔL</span>
          </div>
          <n-space :size="6" class="mt">
            <n-button size="small" @click="copyCombo">复制摘要</n-button>
            <n-button size="small" @click="exportCombo">导出 CSV</n-button>
          </n-space>
          <div class="mt">
            <n-alert
              v-for="(w, i) in combo.warnings || []"
              :key="'cw' + i"
              :type="alertType(w.level)"
              :show-icon="false"
              class="mt"
            >
              {{ w.text }}
            </n-alert>
          </div>
        </template>
      </div>
    </div>
  </ToolPage>
</template>

<style scoped>
.mode-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.mode-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}

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
.hint.mini {
  font-size: 11px;
}
.sub-head {
  margin: 16px 0 8px;
  font-size: 13.5px;
  font-weight: 600;
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
.field.narrow {
  min-width: 96px;
  flex: 1 1 96px;
}
.check-field {
  justify-content: center;
  flex: 0 0 auto;
  min-width: 0;
}
.f-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}
.unit-tag {
  font-size: 11px;
  opacity: 0.8;
}
.alpha-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--n-border-color);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
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
.detail-table .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.detail-table td.warn {
  color: #f0a020;
}
.detail-table td.muted {
  color: var(--n-text-color-3);
}

.chart-wrap {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 6px;
  margin-top: 12px;
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

.mt {
  margin-top: 12px;
}
.inline-note {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--n-text-color-3);
}

.notes .table-wrap {
  margin-bottom: 4px;
}

@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
