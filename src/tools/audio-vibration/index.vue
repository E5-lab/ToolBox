<script setup lang="ts">
import { computed, ref } from 'vue';
import { NAlert, NButton, NInputNumber, NSelect, NSpace } from 'naive-ui';
import { useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import AudioChart from '../../audio/AudioChart.vue';
import Vibration from '../../audio/kernel/vibration.js';

interface AnalyzeResult {
  ok: boolean;
  error?: string;
  device?: number;
  baseWeight?: number;
  safety?: number;
  count?: number;
  rpm?: number | null;
  freq?: number;
  stiffnessInput?: number;
  stiffnessUnit?: string;
  dynamicFactor?: number;
  damping?: number;
  ratedLoad?: number | null;
  unitLoad?: number;
  deflection?: number;
  f0?: number;
  z?: number;
  TUndamped?: number;
  T?: number;
  efficiencyUndamped?: number;
  efficiency?: number;
  lossDb?: number;
  amplified?: boolean;
  guide?: { title: string; note: string };
  grade?: { label: string; note: string };
  warnings?: { level: string; text: string }[];
  steps?: { no: number; title: string; formula: string; subst: string; value: number; unit: string; note: string }[];
}
interface RatioResult {
  ok: boolean;
  error?: string;
  freq?: number;
  f0?: number;
  deflection?: number;
  damping?: number;
  z?: number;
  TUndamped?: number;
  T?: number;
  efficiencyUndamped?: number;
  efficiency?: number;
  lossDb?: number;
  lossDbUndamped?: number;
  peakT?: number;
  amplified?: boolean;
  guide?: { title: string };
  grade?: { label: string };
}
interface ReverseResult {
  ok: boolean;
  error?: string;
  target?: number;
  T?: number;
  z?: number;
  exact?: boolean;
  f0?: number;
  deflection?: number;
  maxStiffnessKgPerMm?: number | null;
  maxStiffness?: number | null;
  unit?: string;
  feasible?: boolean;
  note?: string;
}
interface TableRow {
  target: number;
  z: number;
  f0: number;
  deflection: number;
  maxStiffness: number | null;
}

const STIFFNESS_UNITS = Vibration.STIFFNESS_UNITS as Record<string, { factor: number; label: string }>;
const RATIO_GUIDE = Vibration.RATIO_GUIDE as { from: number; to: number; level: string; title: string; note: string }[];
const EFFICIENCY_GRADES = Vibration.EFFICIENCY_GRADES as {
  min: number;
  level: string;
  label: string;
  note: string;
}[];

const unitOptions = Object.keys(STIFFNESS_UNITS).map((k) => ({ label: k, value: k }));
const dynamicOptions = [
  { label: '1.0 · 钢弹簧（含阻尼弹簧）', value: 1 },
  { label: '1.5 · 软木 / 玻璃棉板', value: 1.5 },
  { label: '2.0 · 橡胶减振器 / 橡胶垫', value: 2 },
  { label: '2.3 · 硬橡胶', value: 2.3 },
];

const PRESETS = [
  {
    id: 'fan',
    name: '离心风机（样本例题）：234 kg / 1450 r/min / 4 只 / 3 kg/mm',
    v: {
      device: 234,
      base: 0,
      safety: 1.3,
      count: 4,
      rpm: 1450,
      stiffness: 3,
      unit: 'kg/mm',
      dynamic: 1,
      damping: 0.05,
      rated: 80,
    },
  },
  {
    id: 'pump',
    name: '水泵（高转速软弹簧）：620 kg + 台座 300 / 2950 r/min / 8 只 / 3 kg/mm',
    v: {
      device: 620,
      base: 300,
      safety: 1.3,
      count: 8,
      rpm: 2950,
      stiffness: 3,
      unit: 'kg/mm',
      dynamic: 1,
      damping: 0.08,
      rated: 200,
    },
  },
  {
    id: 'ahu',
    name: '空调机组（橡胶减振器）：1450 kg / 960 r/min / 6 只 / 8 kg/mm / d = 2',
    v: {
      device: 1450,
      base: 0,
      safety: 1.3,
      count: 6,
      rpm: 960,
      stiffness: 8,
      unit: 'kg/mm',
      dynamic: 2,
      damping: 0.08,
      rated: 400,
    },
  },
  {
    id: 'chiller',
    name: '冷冻机房离心机：5543 kg + 台座 1300 / 2950 r/min / 12 只 / 20 kg/mm',
    v: {
      device: 5543,
      base: 1300,
      safety: 1.3,
      count: 12,
      rpm: 2950,
      stiffness: 20,
      unit: 'kg/mm',
      dynamic: 1,
      damping: 0.05,
      rated: 800,
    },
  },
  {
    id: 'weak',
    name: '需改进（弹簧偏硬、效率不足）：800 kg / 1450 r/min / 4 只 / 120 kg/mm',
    v: {
      device: 800,
      base: 0,
      safety: 1.3,
      count: 4,
      rpm: 1450,
      stiffness: 120,
      unit: 'kg/mm',
      dynamic: 1,
      damping: 0.05,
      rated: 300,
    },
  },
];
const presetOptions = [{ label: '载入示例…', value: '' }].concat(
  PRESETS.map((p) => ({ label: p.name, value: p.id }))
);

const Z_BASE = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2, 2.2, 2.5, 2.8,
  3.2, 3.6, 4, 4.5, 5, 6, 7, 8,
];

/* ---------------- 面板切换 ---------------- */
const panel = ref('select');
const panelButtons = [
  { key: 'select', label: '静变形法 · 计算书' },
  { key: 'verify', label: '频率比法 · 验算' },
  { key: 'reverse', label: '反算与对照' },
];

/* ---------------- 面板 1：静变形法 ---------------- */
const device = ref(234);
const base = ref(0);
const safety = ref(1.3);
const count = ref(4);
const rpm = ref<number | null>(1450);
const stiffness = ref(3);
const unit = ref('kg/mm');
const dynamic = ref(1);
const damping = ref(0.05);
const rated = ref<number | null>(80);
const preset = ref('');

const message = useMessage();
const copy = useCopy();

function onPreset(v: string) {
  preset.value = '';
  const p = PRESETS.find((x) => x.id === v);
  if (!p) return;
  device.value = p.v.device;
  base.value = p.v.base;
  safety.value = p.v.safety;
  count.value = p.v.count;
  rpm.value = p.v.rpm;
  stiffness.value = p.v.stiffness;
  unit.value = p.v.unit;
  dynamic.value = p.v.dynamic;
  damping.value = p.v.damping;
  rated.value = p.v.rated;
}

/* ---------------- 面板 2：频率比法 ---------------- */
const vFreq = ref(24.2);
const vF0 = ref(3.13);
const vDefl = ref<number | null>(25.4);
const vDamping = ref(0.05);
const vDyn2 = ref(1);

/* ---------------- 面板 3：反算与对照 ---------------- */
const tEta = ref(90);
const tFreq = ref(24.2);
const tLoad = ref(76);
const tDamping = ref(0);
const tUnit = ref('kg/mm');

/* ---------------- 格式化 ---------------- */
function num(v: number | null | undefined, d = 2): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return Number(v).toFixed(d);
}
function alertType(level: string): 'error' | 'warning' | 'success' | 'info' {
  if (level === 'danger') return 'error';
  if (level === 'warn') return 'warning';
  if (level === 'ok') return 'success';
  return 'info';
}
function guideClass(level: string): string {
  if (level === 'danger') return 'warn';
  if (level === 'good') return 'ok';
  return '';
}
function rangeText(from: number, to: number): string {
  return to === Infinity ? 'z > ' + from : from + ' ≤ z ≤ ' + to;
}
function gradeRange(min: number): string {
  return min === -Infinity ? 'η < 80%' : 'η ≥ ' + min + '%';
}

/* ---------------- 面板 1 计算 ---------------- */
const analyzeResult = computed<AnalyzeResult>(
  () =>
    Vibration.analyze({
      deviceWeight: device.value,
      baseWeight: base.value,
      safety: safety.value,
      count: count.value,
      rpm: rpm.value,
      stiffness: stiffness.value,
      stiffnessUnit: unit.value,
      dynamicFactor: dynamic.value,
      damping: damping.value,
      ratedLoad: rated.value,
    }) as unknown as AnalyzeResult
);
const ar = computed<AnalyzeResult | null>(() => (analyzeResult.value.ok ? analyzeResult.value : null));

const analyzeVerdict = computed(() => {
  const r = ar.value;
  if (!r) return '';
  return (
    (r.amplified
      ? '传递率大于 1：当前方案在放大振动，不可用'
      : '传递率 T = ' + num(r.T, 4) + '　频率比 z = ' + num(r.z, 2) + '　评级：' + (r.grade ? r.grade.label : '—')) +
    '　（无阻尼简化式效率 ' +
    num(r.efficiencyUndamped, 1) +
    '%）'
  );
});

const analyzeStats = computed(() => {
  const r = ar.value;
  if (!r) return [];
  return [
    { label: '静态压缩量 δ', value: num(r.deflection, 1), unit: 'mm' },
    { label: '固有频率 f₀', value: num(r.f0, 2), unit: 'Hz' },
    { label: '扰动频率 f', value: num(r.freq, 2), unit: 'Hz' },
    { label: '频率比 z', value: num(r.z, 2), unit: '' },
    { label: '每只承载 P', value: num(r.unitLoad, 1), unit: 'kg' },
    { label: '振动级降低量', value: num(r.lossDb, 1), unit: 'dB' },
  ];
});

/* ---------------- 面板 2 计算 ---------------- */
const ratioResult = computed<RatioResult>(
  () =>
    Vibration.byRatio({
      freq: vFreq.value,
      f0: vF0.value,
      deflection: vDefl.value,
      damping: vDamping.value,
      dynamicFactor: vDyn2.value,
    }) as unknown as RatioResult
);
const rr = computed<RatioResult | null>(() => (ratioResult.value.ok ? ratioResult.value : null));

const ratioVerdict = computed(() => {
  const r = rr.value;
  if (!r) return '';
  return (
    (r.amplified ? '传递率大于 1：振动被放大，此频率比不可用' : '频率比 z = ' + num(r.z, 2)) +
    '　' +
    (r.guide ? r.guide.title : '') +
    '　评级：' +
    (r.grade ? r.grade.label : '—')
  );
});

const ratioStats = computed(() => {
  const r = rr.value;
  if (!r) return [];
  return [
    { label: '频率比 z', value: num(r.z, 2), unit: '', sub: '' },
    { label: '固有频率 f₀', value: num(r.f0, 2), unit: 'Hz', sub: '' },
    { label: '静态压缩量 δ', value: num(r.deflection, 1), unit: 'mm', sub: '' },
    { label: '共振峰值 T', value: num(r.peakT, 1), unit: '倍', sub: 'z = 1 时' },
  ];
});

const ratioCompare = computed(() => {
  const r = rr.value;
  if (!r) return [];
  return [
    { name: '力传递率 T', und: num(r.TUndamped, 4), damped: num(r.T, 4) },
    { name: '隔振效率 η', und: num(r.efficiencyUndamped, 2) + ' %', damped: num(r.efficiency, 2) + ' %' },
    { name: '振动级降低量 ΔL', und: num(r.lossDbUndamped, 2) + ' dB', damped: num(r.lossDb, 2) + ' dB' },
    { name: '适用说明', und: '弹簧类（阻尼很小）的常用简化式', damped: '考虑阻尼比 D = ' + num(r.damping, 3) + ' 的完整式' },
  ];
});

/* ---------------- 面板 3 计算 ---------------- */
const reverseBase = computed(() => ({
  targetEfficiency: tEta.value,
  freq: tFreq.value,
  damping: tDamping.value,
  loadKg: tLoad.value,
  dynamicFactor: 1,
  stiffnessUnit: tUnit.value,
}));

const reverseResult = computed<ReverseResult>(
  () => Vibration.reverse(reverseBase.value) as unknown as ReverseResult
);
const rv = computed<ReverseResult | null>(() => (reverseResult.value.ok ? reverseResult.value : null));

const reverseKv = computed(() => {
  const r = rv.value;
  if (!r) return [];
  const list = [
    { k: '目标隔振效率 η', v: num(r.target, 1), unit: '%' },
    { k: '所需力传递率 T ≤', v: num(r.T, 4), unit: '' },
    { k: '所需频率比 z ≥', v: num(r.z, 2), unit: r.exact ? '(解析解)' : '(数值解)' },
    { k: '所需固有频率 f₀ ≤', v: num(r.f0, 2), unit: 'Hz' },
    { k: '所需静态压缩量 δ ≥', v: num(r.deflection, 2), unit: 'mm' },
  ];
  if (r.maxStiffnessKgPerMm != null) {
    list.push({ k: '单只最大允许刚度 k ≤', v: num(r.maxStiffness, 3), unit: r.unit || tUnit.value });
  } else {
    list.push({ k: '单只最大允许刚度', v: '—', unit: '' });
  }
  return list;
});

const effTable = computed<TableRow[]>(
  () =>
    Vibration.efficiencyTable({
      freq: reverseBase.value.freq,
      damping: reverseBase.value.damping,
      loadKg: reverseBase.value.loadKg,
      dynamicFactor: 1,
      stiffnessUnit: tUnit.value,
      targets: [80, 85, 90, 95, 97, 98, 99],
    }) as unknown as TableRow[]
);

/* ---------------- 传递率曲线 ---------------- */
function buildXs(maxZ0: number, markZ: number | null | undefined): number[] {
  let maxZ = maxZ0;
  if (markZ != null && Number.isFinite(markZ) && markZ > maxZ) {
    maxZ = Math.min(Math.ceil(markZ * 1.05), 60);
  }
  const xs: number[] = [];
  Z_BASE.forEach((z) => {
    if (z <= maxZ + 1e-9) xs.push(z);
  });
  for (let z = 9; z < maxZ - 1e-9; z += 1) xs.push(z);
  if (markZ != null && Number.isFinite(markZ) && markZ > 0.05 && markZ <= maxZ) xs.push(markZ);
  xs.sort((a, b) => a - b);
  return xs.filter((v, i, a) => i === 0 || Math.abs(v - a[i - 1]) > 1e-9);
}

const CAP = 40;

function buildSeries(xs: number[], dmp: number, markZ: number | null | undefined) {
  const tu: (number | null)[] = [];
  const td: (number | null)[] = [];
  const mk: (number | null)[] = [];
  xs.forEach((x) => {
    const a = Vibration.transmissibility(x, dmp) as number | null;
    const b = Vibration.transmissibilityUndamped(x) as number | null;
    td.push(a == null ? null : Math.min(a, CAP));
    tu.push(b == null ? null : Math.min(b, CAP));
    const hit = markZ != null && Math.abs(x - markZ) < 1e-9;
    mk.push(hit && a != null ? Math.min(a, CAP) : null);
  });
  return [
    { values: tu, color: '#94a3b8', dash: [4, 3], width: 1.5, points: false },
    { values: td, color: '#2563eb', width: 2, points: false },
    { values: mk, color: '#f97316', points: true, radius: 4.5 },
  ];
}

const zLabelFmt = (v: number) => (v < 1 ? '' : v >= 10 ? v.toFixed(0) : v.toFixed(1));
const hBands = [{ from: 0, to: 1, color: 'rgba(249,115,22,0.08)' }];

const chartX = computed(() => buildXs(8, ar.value ? (ar.value.z as number) : null));
const chartSeries = computed(() =>
  buildSeries(chartX.value, ar.value ? (ar.value.damping as number) : 0.05, ar.value ? (ar.value.z as number) : null)
);

const verifyX = computed(() => {
  const z = rr.value ? (rr.value.z as number) : null;
  return buildXs(Math.max(6, z != null ? Math.ceil(z * 1.15) : 6), z);
});
const verifySeries = computed(() =>
  buildSeries(verifyX.value, rr.value ? (rr.value.damping as number) : 0.05, rr.value ? (rr.value.z as number) : null)
);

/* ---------------- 导出 ---------------- */
function summaryText(): string {
  const r = ar.value;
  if (!r || !r.steps) return '';
  const out: string[] = ['弹簧减振器隔振效率计算书（静变形法）', ''];
  out.push(
    '已知条件：设备自重 ' +
      num(r.device, 1) +
      ' kg，台座/配重 ' +
      num(r.baseWeight, 1) +
      ' kg，安全系数 ' +
      num(r.safety, 2) +
      '，减振器 ' +
      r.count +
      ' 只' +
      (r.rpm ? '，转速 ' + num(r.rpm, 0) + ' r/min' : '') +
      '。'
  );
  out.push(
    '减振器：单只刚度 ' +
      num(r.stiffnessInput, 3) +
      ' ' +
      r.stiffnessUnit +
      '，动/静刚度比 d = ' +
      num(r.dynamicFactor, 2) +
      '，阻尼比 D = ' +
      num(r.damping, 3) +
      (r.ratedLoad != null ? '，单只额定荷载 ' + num(r.ratedLoad, 1) + ' kg' : '') +
      '。'
  );
  out.push('');
  out.push('计算过程：');
  r.steps.forEach((s) => {
    out.push(s.no + '. ' + s.title);
    out.push('   公式：' + s.formula);
    out.push('   代入：' + s.subst + ' → ' + num(s.value, 2) + (s.unit ? ' ' + s.unit : ''));
  });
  out.push('');
  out.push(
    '结论：频率比 z = ' +
      num(r.z, 2) +
      '，传递率 T = ' +
      num(r.T, 4) +
      '，隔振效率 η = ' +
      num(r.efficiency, 2) +
      '%（无阻尼简化式 ' +
      num(r.efficiencyUndamped, 2) +
      '%），振动级降低 ' +
      num(r.lossDb, 1) +
      ' dB；判定：' +
      (r.guide ? r.guide.title : '') +
      '，效率等级 ' +
      (r.grade ? r.grade.label : '—') +
      '。'
  );
  if (r.warnings && r.warnings.length) {
    out.push('');
    out.push('校核提示：');
    r.warnings.forEach((w) => out.push('   · ' + w.text));
  }
  out.push('');
  out.push('工具：声学计算工具箱 · 弹簧减振（隔振效率计算书）　依据：《噪声与振动控制工程技术导则》第 7.4 节');
  return out.join('\n');
}

function copySheet() {
  const txt = summaryText();
  if (!txt) {
    message.warning('暂无可复制结果');
    return;
  }
  copy(txt, '已复制计算书');
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

function exportCsv() {
  const r = ar.value;
  if (!r || !r.steps) {
    message.warning('暂无可导出结果');
    return;
  }
  const rows: (string | number)[][] = [['弹簧减振器隔振效率计算书', '', '', '', '']];
  rows.push(['设备自重 (kg)', num(r.device, 1), '台座/配重 (kg)', num(r.baseWeight, 1), '']);
  rows.push(['安全系数 K', num(r.safety, 2), '减振器数量 (只)', r.count as number, '']);
  rows.push(['转速 (r/min)', r.rpm == null ? '' : num(r.rpm, 0), '扰动频率 f (Hz)', num(r.freq, 2), '']);
  rows.push([
    '单只刚度',
    num(r.stiffnessInput, 3),
    '刚度单位',
    r.stiffnessUnit as string,
    '→ kg/mm ' + num((r.stiffnessInput as number) * STIFFNESS_UNITS[r.stiffnessUnit as string].factor, 4),
  ]);
  rows.push(['动/静刚度比 d', num(r.dynamicFactor, 2), '阻尼比 D', num(r.damping, 3), '']);
  rows.push([]);
  rows.push(['步骤', '项目', '公式', '代入', '结果']);
  r.steps.forEach((s) => {
    rows.push([s.no, s.title, s.formula, s.subst, num(s.value, 2) + (s.unit ? ' ' + s.unit : '')]);
  });
  rows.push([]);
  rows.push(['结论', '隔振效率 (%)', num(r.efficiency, 2), '无阻尼式 (%)', num(r.efficiencyUndamped, 2)]);
  rows.push(['传递率 T', num(r.T, 4), '频率比 z', num(r.z, 2), '振动级降低 (dB) ' + num(r.lossDb, 1)]);
  download(rows, 'vibration-calc-sheet.csv');
}
</script>

<template>
  <ToolPage
    title="🌀 弹簧减振器隔振效率"
    description="静变形法（选型计算书）与频率比法（含阻尼传递率验算）并行校核，附目标效率反算与传递率曲线"
  >
    <div class="mode-row">
      <span class="mode-label">方法</span>
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

    <!-- ============ 面板 1：静变形法（选型计算书） ============ -->
    <div v-if="panel === 'select'">
      <div class="split">
        <div class="col">
          <div class="card">
            <h3 class="card-title"><span class="step">1</span> 已知条件 <span class="hint">(设备与安装)</span></h3>
            <div class="field-row">
              <div class="field">
                <label class="f-label">设备自重 G₁（含电机） <span class="unit-tag">kg</span></label>
                <n-input-number v-model:value="device" :step="1" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">台座 / 配重 G₂ <span class="unit-tag">kg</span></label>
                <n-input-number v-model:value="base" :step="1" :min="0" size="small" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="f-label">安全系数 K</label>
                <n-input-number v-model:value="safety" :step="0.05" :min="1" size="small" />
              </div>
              <div class="field">
                <label class="f-label">减振器数量 N <span class="unit-tag">只</span></label>
                <n-input-number v-model:value="count" :step="1" :min="1" size="small" />
              </div>
              <div class="field">
                <label class="f-label">设备转速 n <span class="unit-tag">r/min</span></label>
                <n-input-number v-model:value="rpm" :step="10" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">载入示例</label>
                <n-select
                  :value="preset"
                  :options="presetOptions"
                  size="small"
                  @update:value="(v: string) => onPreset(v)"
                />
              </div>
            </div>
            <p class="inline-note">扰动频率 f = n / 60。</p>
          </div>

          <div class="card">
            <h3 class="card-title"><span class="step">2</span> 减振器参数 <span class="hint">(样本数据)</span></h3>
            <div class="field-row">
              <div class="field">
                <label class="f-label">单只竖向刚度 k</label>
                <n-input-number v-model:value="stiffness" :step="0.1" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">刚度单位</label>
                <n-select v-model:value="unit" :options="unitOptions" size="small" />
              </div>
              <div class="field">
                <label class="f-label">动 / 静刚度比 d</label>
                <n-select v-model:value="dynamic" :options="dynamicOptions" size="small" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="f-label">阻尼比 D</label>
                <n-input-number v-model:value="damping" :step="0.01" :min="0" :max="0.5" size="small" />
              </div>
              <div class="field">
                <label class="f-label">单只额定荷载（可选校核） <span class="unit-tag">kg</span></label>
                <n-input-number v-model:value="rated" :step="1" :min="0" size="small" placeholder="样本额定值" />
              </div>
            </div>
            <p class="inline-note">
              回转设备系统的阻尼比宜取 0.05 ~ 0.12（《噪声与振动控制工程技术导则》7.4.2.3）；留空额定荷载则跳过荷载校核。
            </p>
            <n-alert v-if="!ar" type="error" :show-icon="false" class="mt">{{ analyzeResult.error }}</n-alert>
          </div>
        </div>

        <div class="col">
          <div class="card hero">
            <div class="rc-title">隔振效率 η</div>
            <div class="hero-rate">
              <span>{{ ar ? num(ar.efficiency, 1) : '—' }}</span>
              <span class="unit">%</span>
            </div>
            <div class="sub">{{ analyzeVerdict }}</div>
            <div class="stat-grid">
              <div v-for="s in analyzeStats" :key="s.label" class="stat">
                <div class="s-label">{{ s.label }}</div>
                <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
              </div>
            </div>
            <n-space :size="6">
              <n-button size="small" @click="copySheet">复制计算书</n-button>
              <n-button size="small" @click="exportCsv">导出 CSV</n-button>
            </n-space>
          </div>

          <div class="card">
            <h3 class="card-title">传递率曲线 <span class="hint">(横轴 z = f / f₀)</span></h3>
            <div class="chart-wrap">
              <AudioChart
                :x="chartX"
                :series="chartSeries"
                :y-min="0"
                :y-max="4"
                :y-ticks="4"
                :y-digits="1"
                :h-bands="hBands"
                :x-label-fmt="zLabelFmt"
                :height="240"
              />
            </div>
            <div class="legend">
              <span><i style="background: #2563eb"></i>含阻尼 T（当前 D）</span>
              <span><i style="background: #94a3b8"></i>无阻尼 T₀ = |1/(1−z²)|</span>
              <span><i style="background: #f97316"></i>当前工作点</span>
              <span><i class="band"></i>0 &lt; z &lt; 1 共振放大区（T &gt; 1）</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">计算书 <span class="hint">(公式与代入过程)</span></h3>
        <div class="table-wrap">
          <table v-if="ar && ar.steps" class="detail-table book">
            <thead>
              <tr>
                <th>步骤</th>
                <th>项目</th>
                <th>公式</th>
                <th>代入</th>
                <th>结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in ar.steps" :key="s.no">
                <td class="mono"><strong>{{ s.no }}</strong></td>
                <td class="proj">
                  <strong>{{ s.title }}</strong>
                  <span class="note">{{ s.note }}</span>
                </td>
                <td class="mono">{{ s.formula }}</td>
                <td class="mono">{{ s.subst }}</td>
                <td class="mono"><strong>{{ num(s.value, 2) }}</strong> {{ s.unit }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="inline-note">请输入有效参数后查看计算书。</p>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">校核与提示</h3>
        <div v-if="ar">
          <n-alert v-if="!ar.warnings || !ar.warnings.length" type="success" :show-icon="false">
            各项校核通过：频率比、静态压缩量与荷载利用率均在合理范围内。
          </n-alert>
          <template v-else>
            <n-alert
              v-for="(w, i) in ar.warnings"
              :key="i"
              :type="alertType(w.level)"
              :show-icon="false"
              class="mt"
            >
              {{ w.text }}
            </n-alert>
          </template>
        </div>
        <p v-else class="inline-note">请输入有效参数后查看校核结果。</p>
      </div>
    </div>

    <!-- ============ 面板 2：频率比法（含阻尼验算） ============ -->
    <div v-if="panel === 'verify'">
      <div class="split">
        <div class="col">
          <div class="card">
            <h3 class="card-title"><span class="step">1</span> 扰动频率与系统固有频率</h3>
            <div class="field-row">
              <div class="field">
                <label class="f-label">扰动频率 f <span class="unit-tag">Hz</span></label>
                <n-input-number v-model:value="vFreq" :step="0.1" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">固有频率 f₀ <span class="unit-tag">Hz</span></label>
                <n-input-number v-model:value="vF0" :step="0.1" :min="0" size="small" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="f-label">或：静态压缩量 δ <span class="unit-tag">mm</span></label>
                <n-input-number v-model:value="vDefl" :step="0.5" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">阻尼比 D</label>
                <n-input-number v-model:value="vDamping" :step="0.01" :min="0" :max="0.5" size="small" />
              </div>
              <div class="field">
                <label class="f-label">动 / 静刚度比 d</label>
                <n-select v-model:value="vDyn2" :options="dynamicOptions" size="small" />
              </div>
            </div>
            <p class="inline-note">
              已知固有频率时直接填 f₀；只知道弹簧静压缩量时填 δ，程序按 f₀ = 15.76 / √δ × √d 反推（d 为动、静刚度比）。
            </p>
            <n-alert v-if="!rr" type="error" :show-icon="false" class="mt">{{ ratioResult.error }}</n-alert>
          </div>
        </div>

        <div class="col">
          <div class="card hero">
            <div class="rc-title">隔振效率（含阻尼）</div>
            <div class="hero-rate">
              <span>{{ rr ? num(rr.efficiency, 1) : '—' }}</span>
              <span class="unit">%</span>
            </div>
            <div class="sub">{{ ratioVerdict }}</div>
            <div class="stat-grid">
              <div v-for="s in ratioStats" :key="s.label" class="stat">
                <div class="s-label">{{ s.label }}</div>
                <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
                <div v-if="s.sub" class="s-sub">{{ s.sub }}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">两种方法对比 <span class="hint">(同一频率比)</span></h3>
            <div class="table-wrap">
              <table v-if="rr" class="detail-table">
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>无阻尼简化式 T₀ = |1/(1−z²)|</th>
                    <th>含阻尼式 T = √{[1+(2Dz)²]/[(1−z²)²+(2Dz)²]}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in ratioCompare" :key="c.name">
                    <td class="proj"><strong>{{ c.name }}</strong></td>
                    <td class="mono">{{ c.und }}</td>
                    <td class="mono">{{ c.damped }}</td>
                  </tr>
                  <tr v-if="rr">
                    <td class="proj"><strong>两式差异</strong></td>
                    <td class="mono warn">
                      {{ num((rr.efficiencyUndamped as number) - (rr.efficiency as number), 2) }} %（简化式偏乐观）
                    </td>
                    <td class="mono ok">以含阻尼值为设计依据更稳妥</td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="inline-note">请输入有效参数后查看对比。</p>
            </div>
            <p v-if="rr" class="inline-note">
              阻尼的两面性：阻尼能显著压低共振区的放大倍数（峰值 T = √(1+4D²)/(2D)，D = 0.05 时约 10 倍），但在 z &gt; √2
              的高频段会使传递率略高于无阻尼值，因此实际效率略低于简化式。
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">传递率随频率比变化</h3>
        <div class="chart-wrap">
          <AudioChart
            :x="verifyX"
            :series="verifySeries"
            :y-min="0"
            :y-max="4"
            :y-ticks="4"
            :y-digits="1"
            :h-bands="hBands"
            :x-label-fmt="zLabelFmt"
            :height="250"
          />
        </div>
        <div class="legend">
          <span><i style="background: #2563eb"></i>含阻尼 T（D = 设定值）</span>
          <span><i style="background: #94a3b8"></i>无阻尼简化式 T₀</span>
          <span><i style="background: #f97316"></i>当前 z</span>
        </div>
      </div>
    </div>

    <!-- ============ 面板 3：反算与对照 ============ -->
    <div v-if="panel === 'reverse'">
      <div class="split">
        <div class="col">
          <div class="card">
            <h3 class="card-title"><span class="step">1</span> 目标效率反算 <span class="hint">(要达标该选多软的弹簧)</span></h3>
            <div class="field-row">
              <div class="field">
                <label class="f-label">目标隔振效率 η <span class="unit-tag">%</span></label>
                <n-input-number v-model:value="tEta" :step="1" :min="0" :max="99.9" size="small" />
              </div>
              <div class="field">
                <label class="f-label">扰动频率 f <span class="unit-tag">Hz</span></label>
                <n-input-number v-model:value="tFreq" :step="0.1" :min="0" size="small" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="f-label">单只承载 P <span class="unit-tag">kg</span></label>
                <n-input-number v-model:value="tLoad" :step="1" :min="0" size="small" />
              </div>
              <div class="field">
                <label class="f-label">阻尼比 D</label>
                <n-input-number v-model:value="tDamping" :step="0.01" :min="0" :max="0.5" size="small" />
              </div>
              <div class="field">
                <label class="f-label">刚度单位</label>
                <n-select v-model:value="tUnit" :options="unitOptions" size="small" />
              </div>
            </div>
            <n-alert v-if="!rv" type="error" :show-icon="false" class="mt">{{ reverseResult.error }}</n-alert>
            <div v-else>
              <div class="kv-result mt">
                <div v-for="kv in reverseKv" :key="kv.k" class="kv">
                  <div class="k">{{ kv.k }}</div>
                  <div class="v">{{ kv.v }}<small>{{ kv.unit }}</small></div>
                </div>
              </div>
              <n-alert v-if="!rv.feasible" type="warning" :show-icon="false" class="mt">{{ rv.note }}</n-alert>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="card">
            <h3 class="card-title">效率 – 频率比 – 静变形对照表</h3>
            <div class="table-wrap">
              <table v-if="effTable.length" class="detail-table">
                <thead>
                  <tr>
                    <th>目标效率 η</th>
                    <th>频率比 z ≥</th>
                    <th>固有频率 f₀ ≤ (Hz)</th>
                    <th>静态压缩量 δ ≥ (mm)</th>
                    <th>单只刚度 k ≤ ({{ tUnit }})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in effTable" :key="row.target">
                    <td :class="row.target >= 95 ? 'ok' : ''">{{ num(row.target, 0) }} %</td>
                    <td>{{ num(row.z, 2) }}</td>
                    <td>{{ num(row.f0, 2) }}</td>
                    <td>{{ num(row.deflection, 2) }}</td>
                    <td>{{ row.maxStiffness == null ? '—' : num(row.maxStiffness, 3) }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-else class="inline-note">请输入有效参数后查看对照表。</p>
            </div>
            <p class="inline-note">
              按钢弹簧（动、静刚度比 d = 1）计算；若采用橡胶类减振器，所需静态压缩量应再乘以 d（1.5 ~ 2.3），对应的允许刚度更小。
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title">频率比判定准则与效率等级</h3>
        <div class="split">
          <div class="col">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>频率比 z</th>
                  <th>判定</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in RATIO_GUIDE" :key="g.title">
                  <td class="mono">{{ rangeText(g.from, g.to) }}</td>
                  <td :class="guideClass(g.level)">{{ g.title }}</td>
                  <td class="wrap">{{ g.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="col">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>隔振效率 η</th>
                  <th>等级</th>
                  <th>典型适用场所</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in EFFICIENCY_GRADES" :key="g.label">
                  <td class="mono">{{ gradeRange(g.min) }}</td>
                  <td :class="guideClass(g.level)">{{ g.label }}</td>
                  <td class="wrap">{{ g.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card notes">
        <h3 class="card-title">计算方法</h3>
        <ul>
          <li>
            <strong>方法一 · 静变形法（静态压缩量法）</strong>：由设备运行重量与所选减振器的竖向刚度求出静态压缩量 δ，再由 δ
            求系统固有频率 f₀ = 4.9823·√(K_D/W) ≈ 15.76/√δ（δ 取 mm；橡胶类需再乘 √d，因动、静刚度比 d 大于
            1）。这是选型时的正算流程，也是减振器样本最常用的表达方式。
          </li>
          <li>
            <strong>方法二 · 频率比法（含阻尼传递率）</strong>：直接按频率比 z = f/f₀ 与阻尼比 D 计算力传递率 T =
            √{[1+(2Dz)²] / [(1−z²)²+(2Dz)²]}；D = 0 时退化为标准的无阻尼简化式 T = |1/(1−z²)|。
          </li>
          <li>
            <strong>隔振效率</strong>：η = (1 − T) × 100%；与分贝表示的对应关系为 ΔL = 20·lg(1/T)，例如 T = 0.1 相当于降低 20
            dB（效率 90%），T = 0.01 相当于降低 40 dB（效率 99%）。
          </li>
          <li>
            <strong>频率比准则</strong>：《噪声与振动控制工程技术导则》规定频率比宜取 2.5 ~ 4，<strong>禁止小于 1.4</strong>。z &lt; 1
            时传递率大于 1，减振器反而放大振动；z = √2 是隔振与放大的临界点。
          </li>
          <li>
            <strong>参数方向</strong>：刚度越小（弹簧越软）→ 静态压缩量越大 → 固有频率越低 →
            频率比与效率越高。但压缩量过大会带来弹簧高度、稳定性与设备晃动问题，常用弹簧减振器的静态压缩量多在 10 ~ 50 mm。
          </li>
          <li>
            <strong>选型要点</strong>：每只减振器的实际荷载宜为样本额定荷载的 50% ~ 100%（最佳荷载略大于实际承载），既保证刚度假定成立，又避免长期低荷载导致疲劳；设备重心与减振器刚度中心应在同一铅垂线上，重量分布不均时按实际支点反力分配。
          </li>
          <li>
            <strong>反算</strong>：由目标效率 η 先反求所需传递率 T = 1 − η，无阻尼时 z = √(1 + 1/T) 有解析解；含阻尼时用二分法数值求解，再换算为所需固有频率、静态压缩量与单只最大允许刚度。
          </li>
          <li>
            <strong>注意</strong>：本模块按单频稳态简谐激励、线性弹簧-质量系统计算；回转型设备除旋转频率 f = n/60
            外还可能存在 2f 等谐波（不平衡、对中不良），必要时应按最高谐波校核。冲击、瞬态激励与多层隔振体系需另行分析。
          </li>
        </ul>
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
.f-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}
.unit-tag {
  font-size: 11px;
  opacity: 0.8;
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
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
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

.chart-wrap {
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  padding: 6px;
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
.legend i.band {
  background: rgba(249, 115, 22, 0.28);
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
.detail-table td:first-child,
.detail-table td.proj,
.detail-table td.wrap {
  text-align: left;
  white-space: normal;
}
.detail-table th {
  color: var(--n-text-color-3);
  font-weight: 500;
}
.detail-table .mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: nowrap;
}
.detail-table td.note,
.detail-table .note {
  display: block;
  margin-top: 4px;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--n-text-color-3);
  white-space: normal;
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
