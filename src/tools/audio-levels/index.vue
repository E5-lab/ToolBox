<script setup lang="ts">
/*
 * audio-levels/index.vue — 声压级叠加计算
 * 由 acoustic-calc-repo/public/js/view-levels.js（701 行）移植为 Vue 3 SFC
 * 计算逻辑 100% 复用内核 src/audio/kernel/levels.js 与 acoustics.js（A 计权）
 */
import { computed, ref } from 'vue';
import {
  NAlert,
  NButton,
  NInput,
  NInputNumber,
  NSelect,
  NSlider,
  NTag,
} from 'naive-ui';
import { useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import AudioChart from '../../audio/AudioChart.vue';
import { useCopy } from '../../composables/useCopy';
import Levels from '../../audio/kernel/levels.js';
import Acoustics from '../../audio/kernel/acoustics.js';

/* ============================ 类型 ============================ */
interface SourceRow {
  name: string;
  level: number | null;
  count: number | null;
}
interface SourceOut {
  name: string;
  level: number;
  count: number;
  energy: number;
  partial: number;
  share: number;
  removalDrop: number | null;
  dominant?: boolean;
}
interface SourceResult {
  ok: boolean;
  error?: string;
  rows: SourceOut[];
  total: number;
  count: number;
  totalCount: number;
  average: number;
  maxPartial: number;
  incrementOverMax: number;
  incrementOverTotal: number | null;
  dominant: SourceOut | null;
}
interface ReduceRow {
  name: string;
  level: number;
  count: number;
  others: number;
  need: number | null;
  feasible: boolean;
  resultLevel: number | null;
  reason: string | null;
}
interface ReduceResult {
  ok: boolean;
  error?: string;
  already: boolean;
  total: number;
  target: number;
  needed: number;
  rows: ReduceRow[];
  minimal: number | null;
  feasible: boolean;
}

/* ============================ 常量 ============================ */
const bandList = Levels.OCT_BANDS as number[];
const incrementTable = Levels.INCREMENT_TABLE as { diff: number; increment: number }[];
const backgroundTable = Levels.BACKGROUND_TABLE as { diff: number; correction: number }[];

const sourcePresets = [
  {
    id: 'workshop',
    name: '车间：冲床 ×2 + 空压机 + 风机',
    rows: [
      { name: '冲床', level: 88, count: 2 },
      { name: '空压机', level: 85, count: 1 },
      { name: '风机', level: 80, count: 1 },
    ],
  },
  {
    id: 'road',
    name: '交通：快车道 + 辅道 + 背景',
    rows: [
      { name: '快车道', level: 74, count: 1 },
      { name: '辅道', level: 68, count: 1 },
      { name: '背景', level: 60, count: 1 },
    ],
  },
  {
    id: 'chiller',
    name: '屋面：冷却塔 ×3（等强 82）',
    rows: [{ name: '冷却塔', level: 82, count: 3 }],
  },
  {
    id: 'equal',
    name: '三个等强声源（各 70）',
    rows: [
      { name: '声源 1', level: 70, count: 1 },
      { name: '声源 2', level: 70, count: 1 },
      { name: '声源 3', level: 70, count: 1 },
    ],
  },
  {
    id: 'dominant',
    name: '一强一弱（85 + 68）',
    rows: [
      { name: '主机', level: 85, count: 1 },
      { name: '辅机', level: 68, count: 1 },
    ],
  },
];
const presetOptions = sourcePresets.map((p) => ({ label: p.name, value: p.id }));

const directivityOptions = [
  { label: '1 · 自由场（悬空）', value: 1 },
  { label: '2 · 半自由场（地面）', value: 2 },
  { label: '4 · 1/4 空间（墙角）', value: 4 },
  { label: '8 · 1/8 空间（三面交角）', value: 8 },
];

const distanceTypeOptions = [
  { label: '点声源（6 dB/倍距）', value: 'point' },
  { label: '线声源（3 dB/倍距）', value: 'line' },
];

/* ============================ 状态 ============================ */
const panel = ref<'sum' | 'method' | 'convert'>('sum');
const message = useMessage();
const copy = useCopy();

/* --- 面板 1：多声源叠加 --- */
let rowSeq = 0;
function newRow(name = '', level: number | null = null, count: number | null = 1): SourceRow & { key: number } {
  return { key: ++rowSeq, name, level, count };
}
const rows = ref<(SourceRow & { key: number })[]>([
  newRow('冲床', 88, 2),
  newRow('空压机', 85, 1),
  newRow('风机', 80, 1),
]);
const target = ref(88);

/* --- 面板 1：等声级声源 --- */
const eqLevel = ref(75);
const eqCount = ref(4);

/* --- 面板 1：倍频带谱 --- */
const specA = ref('72 75 78 80 82 79 74 68');
const specB = ref('68 70 73 76 78 76 72 66');

/* --- 面板 2：两声级叠加 --- */
const pairL1 = ref(80);
const pairL2 = ref(74);

/* --- 面板 2：相干叠加 --- */
const cohL1 = ref(80);
const cohL2 = ref(80);
const cohPhase = ref(0);

/* --- 面板 3：背景修正 --- */
const bgTotal = ref(75);
const bgLevel = ref(70);

/* --- 面板 3：声压 ↔ 声压级 --- */
const splIn = ref(94);
const paIn = ref(1);

/* --- 面板 3：距离衰减 --- */
const r1 = ref(1);
const r2 = ref(10);
const distType = ref<'point' | 'line'>('point');

/* --- 面板 3：声功率级 ↔ 声压级 --- */
const lwIn = ref(100);
const lpIn = ref(72);
const r3 = ref(10);
const qFactor = ref(2);

/* ============================ 格式化 ============================ */
function num(v: number | null | undefined, d = 2): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return Number(v).toFixed(d);
}
function pct(v: number | null | undefined, d = 1): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return (Number(v) * 100).toFixed(d) + '%';
}
/** 声压比等派生量：大数用科学计数，避免一行放不下 */
function fmtSci(v: number | null | undefined, digits = 3): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  var abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e4 || abs < 1e-2)) {
    return v.toExponential(digits - 1).replace('e+', '×10^').replace('e-', '×10^-');
  }
  return Number(v).toPrecision(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}
/** 声压三档单位：自动选 Pa / mPa / µPa，避免出现 1002374.5 µPa 这种读数 */
function fmtPa(pa: number | null | undefined): string {
  if (pa == null || Number.isNaN(pa) || !Number.isFinite(pa)) return '—';
  const trim = (s: string) => s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  if (pa >= 1) return trim(Number(pa).toFixed(3)) + ' Pa';
  if (pa >= 0.001) return trim(Number(pa * 1000).toFixed(2)) + ' mPa';
  return trim(Number(pa * 1e6).toFixed(1)) + ' µPa';
}
function parseSpec(text: string): (number | null)[] {
  const parts = String(text || '')
    .split(/[\s,，、;；]+/)
    .filter((s) => s !== '');
  return parts.map((s) => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : null;
  });
}

/* ============================ 计算：多声源叠加 ============================ */
const sumResult = computed<SourceResult>(() => {
  const payload = rows.value
    .filter((r) => r.level != null && Number.isFinite(r.level))
    .map((r) => ({ name: r.name, level: r.level as number, count: r.count == null ? 1 : r.count }));
  if (!payload.length) {
    return { ok: false, error: '请至少输入一个声源的声压级', rows: [] } as unknown as SourceResult;
  }
  const res = Levels.sources(payload) as SourceResult;
  if (!res.ok) return res;
  // 标记最强声源
  const dominant = res.dominant;
  if (dominant) {
    res.rows.forEach((r) => {
      if (res.dominant && r.name === res.dominant.name && r.energy === res.dominant.energy) r.dominant = true;
    });
  }
  return res;
});

const sumOk = computed(() => !!sumResult.value.ok);
const sumR = computed(() => (sumOk.value ? sumResult.value : null));

const sumVerdict = computed(() => {
  const s = sumR.value;
  if (!s) return '';
  const inc = s.incrementOverTotal;
  if (inc == null) return '仅一个声源，无叠加增量';
  if (inc >= 2.5) return '多个声源强度接近，叠加增量接近 +3 dB —— 需要分别治理才有效';
  if (inc >= 1) return '存在一定叠加增量，先降最强声源仍有明显收益';
  return '最强声源已占主导，优先降低它即可';
});

/** 达成目标所需的总降噪量（复用于结论条） */
const reduceResult = computed<ReduceResult>(() => {
  const payload = rows.value
    .filter((r) => r.level != null && Number.isFinite(r.level))
    .map((r) => ({ name: r.name, level: r.level as number, count: r.count == null ? 1 : r.count }));
  if (!payload.length) return { ok: false, error: '请至少输入一个声源' } as unknown as ReduceResult;
  if (target.value == null) return { ok: false, error: '请输入目标声级' } as unknown as ReduceResult;
  return Levels.requiredReduction(payload, target.value) as ReduceResult;
});

/* --- 等声级声源叠加 --- */
const eqResult = computed(() => {
  const l = eqLevel.value;
  const n = Math.max(1, Math.round(eqCount.value == null ? 1 : eqCount.value));
  if (l == null || !Number.isFinite(l)) return { ok: false, n, increment: null, total: null };
  const r = Levels.sources([{ name: '', level: l, count: n }]) as SourceResult;
  if (!r.ok || !r.rows.length) return { ok: false, n, increment: null, total: null };
  // 相对单台的增加量 = 叠加总级 − 单台声级（均由内核能量叠加给出）
  return { ok: true, n, increment: r.total - r.rows[0].level, total: r.total };
});

/* --- 倍频带谱叠加 --- */
const specResult = computed(() => {
  const a = parseSpec(specA.value);
  const b = parseSpec(specB.value);
  const r = Levels.sumSpectra(a, b, bandList) as {
    ok: boolean;
    error?: string;
    rows: { f: number; a: number | null; b: number | null; sum: number | null; missing: string | null }[];
    totalA: number | null;
    totalB: number | null;
    total: number | null;
    increment: number | null;
  };
  if (!r.ok) return r;
  // A 计权总级
  const withA = (arr: (number | null)[]) => {
    const has = arr.some((v) => v != null && !Number.isNaN(v));
    if (!has) return null;
    const padded = bandList.map((_, i) => (arr[i] == null ? null : arr[i]));
    const res = Acoustics.aWeighted(padded as number[], bandList) as { LA: number | null } | number | null;
    if (res == null) return null;
    return typeof res === 'number' ? res : res.LA;
  };
  const rowsOut = r.rows.map((row) => {
    const pr = row.a != null && row.b != null ? (Levels.pair(row.a, row.b) as any) : null;
    return {
      ...row,
      inc: pr && pr.ok ? pr.increment : null,
      sumA: row.sum == null ? null : row.sum + Acoustics.aWeightAt(row.f),
    };
  });
  const summed = r.rows.map((x) => (x.sum == null ? null : x.sum));
  const awA = withA(a);
  const awB = withA(b);
  const awSum = withA(summed);
  return {
    ...r,
    rows: rowsOut,
    // 未计权的能量叠加总级（内核原值）
    totalALin: r.totalA,
    totalBLin: r.totalB,
    totalLin: r.total,
    totalInc: r.increment,
    // A 计权总级
    totalA: awA,
    totalB: awB,
    totalALevel: awSum,
    totalIncA: awA != null && awB != null && awSum != null ? awSum - Math.max(awA, awB) : null,
  };
});
const specRows = computed(() => (specResult.value.ok ? (specResult.value as any).rows : []));

/* ============================ 计算：方法与相干 ============================ */
const pairResult = computed(() => Levels.pair(pairL1.value, pairL2.value) as any);

const incCurve = computed(() => {
  const curve = Levels.incrementCurve(20, 0.5) as { diff: number; increment: number }[];
  const cur = pairResult.value.ok ? pairResult.value.diff : null;
  return {
    xs: curve.map((p) => p.diff),
    series: [
      {
        values: curve.map((p) => p.increment),
        color: '#2563eb',
        type: 'line' as const,
        width: 2,
      },
      {
        // 当前差值位置的高亮标记
        values: curve.map((p) => (cur != null && Math.abs(p.diff - cur) < 0.26 ? p.increment : null)),
        color: '#f97316',
        type: 'line' as const,
        width: 0,
        points: true,
        radius: 4,
      },
    ],
  };
});

const cohResult = computed(() => Levels.coherent(cohL1.value, cohL2.value, cohPhase.value) as any);

const cohChart = computed(() => {
  const xs: number[] = [];
  const vals: (number | null)[] = [];
  for (let p = 0; p <= 360; p += 5) {
    const r = Levels.coherent(cohL1.value, cohL2.value, p) as any;
    xs.push(p);
    vals.push(r.ok ? r.value : null);
  }
  return { xs, vals };
});

/* ============================ 计算：修正与换算 ============================ */
const bgResult = computed(() => Levels.subtract(bgTotal.value, bgLevel.value) as any);

const splResult = computed(() => Levels.levelToPressure(splIn.value) as any);
const paResult = computed(() => Levels.pressureToLevel(paIn.value) as any);

const distResult = computed(
  () => Levels.distanceAttenuation({ r1: r1.value, r2: r2.value, type: distType.value }) as any
);

const pwToSpl = computed(() => Levels.powerToSpl({ lw: lwIn.value, r: r3.value, q: qFactor.value }) as any);
const splToPw = computed(() => Levels.splToPower({ lp: lpIn.value, r: r3.value, q: qFactor.value }) as any);

/* ============================ 交互 ============================ */
function addRow() {
  rows.value.push(newRow('声源 ' + (rows.value.length + 1), null, 1));
}
function removeRow(i: number) {
  if (rows.value.length <= 1) {
    message.warning('至少保留一个声源');
    return;
  }
  rows.value.splice(i, 1);
}
function clearRows() {
  rows.value = [newRow('', null, 1)];
}
function loadPreset(id: string | null) {
  if (!id) return;
  const p = sourcePresets.find((x) => x.id === id);
  if (!p) return;
  rows.value = p.rows.map((r) => newRow(r.name, r.level, r.count));
  message.success('已载入示例：' + p.name);
}
function applyPhase(v: number) {
  cohPhase.value = v;
}

/* ============================ 摘要与导出 ============================ */
function summaryText(): string {
  const s = sumR.value;
  if (!s) return '（无有效声源）';
  const out: string[] = [];
  out.push('声压级叠加计算（' + new Date().toLocaleString('zh-CN') + '）');
  out.push('声源：' + s.rows.map((r) => `${r.name || '未命名'} ${r.level} dB${r.count > 1 ? ' ×' + r.count : ''}`).join('；'));
  out.push('贡献占比：' + s.rows.map((r) => `${r.name || '未命名'} ${pct(r.share)}`).join('；'));
  out.push(`叠加后总声级：${num(s.total, 1)} dB（比最强单源 +${num(s.incrementOverMax, 1)} dB）`);
  out.push(`按台数能量平均：${num(s.average, 1)} dB`);
  const red = reduceResult.value;
  if (red.ok && !red.already) {
    out.push(`目标 ${num(target.value, 1)} dB：需降低 ${num(red.needed, 1)} dB` +
      (red.minimal != null ? `，最小可行单源降噪量 ${num(red.minimal, 1)} dB` : '，单靠降某一声源无法达标'));
  } else if (red.ok && red.already) {
    out.push(`目标 ${num(target.value, 1)} dB：当前总级已达标`);
  }
  const sp = specResult.value as any;
  if (sp.ok) {
    out.push(`倍频带谱叠加总级：A ${num(sp.totalA, 1)} dB / B ${num(sp.totalB, 1)} dB → 叠加 ${num(sp.total, 1)} dB`);
  }
  return out.join('\n');
}

function csvRows(): (string | number | null)[][] {
  const out: (string | number | null)[][] = [];
  const s = sumR.value;
  out.push(['声压级叠加计算']);
  out.push([]);
  out.push(['声源名称', '声压级 dB', '台数', '单独作用级 dB', '能量占比', '撤除后总级下降 dB']);
  if (s) {
    s.rows.forEach((r) => {
      out.push([r.name || '', num(r.level, 1), r.count, num(r.partial, 2), pct(r.share, 2), r.removalDrop == null ? '' : num(r.removalDrop, 2)]);
    });
    out.push([]);
    out.push(['叠加后总声级 dB', num(s.total, 2)]);
    out.push(['比最强单源高出 dB', num(s.incrementOverMax, 2)]);
    out.push(['按台数能量平均 dB', num(s.average, 2)]);
    out.push(['声源数量', s.count, '总台数', s.totalCount]);
  }
  const red = reduceResult.value;
  if (red.ok && !red.already && red.rows.length) {
    out.push([]);
    out.push([`达标反算（目标 ${num(target.value, 1)} dB，总降噪需求 ${num(red.needed, 2)} dB）`]);
    out.push(['声源', '当前级 dB', '其余声源合计 dB', '需降低 dB', '可行', '降后级 dB', '说明']);
    red.rows.forEach((r) => {
      out.push([r.name || '', num(r.level, 1), num(r.others, 2), r.need == null ? '' : num(r.need, 2), r.feasible ? '是' : '否', r.resultLevel == null ? '' : num(r.resultLevel, 1), r.reason || '']);
    });
  }
  const sp = specResult.value as any;
  if (sp.ok) {
    out.push([]);
    out.push(['倍频带谱叠加']);
    out.push(['频率 Hz', '设备A dB', '设备B dB', '叠加 dB', '叠加A计权 dB']);
    sp.rows.forEach((r: any) => {
      out.push([r.f, r.a == null ? '' : num(r.a, 1), r.b == null ? '' : num(r.b, 1), r.sum == null ? '' : num(r.sum, 2), r.sumA == null ? '' : num(r.sumA, 2)]);
    });
    out.push(['总级 dB', sp.totalA == null ? '' : num(sp.totalA, 1), sp.totalB == null ? '' : num(sp.totalB, 1), sp.total == null ? '' : num(sp.total, 2), sp.totalALevel == null ? '' : num(sp.totalALevel, 1)]);
  }
  const coh = cohResult.value;
  if (coh.ok) {
    out.push([]);
    out.push(['相干叠加', 'L₁ dB', num(cohL1.value, 1), 'L₂ dB', num(cohL2.value, 1), '相位差 °', cohPhase.value]);
    out.push(['相干合成 dB', coh.value == null ? '完全抵消' : num(coh.value, 2), '能量叠加 dB', num(coh.energySum, 2)]);
  }
  const bg = bgResult.value;
  if (bg.ok) {
    out.push([]);
    out.push(['背景修正', '实测总级 dB', num(bgTotal.value, 1), '背景级 dB', num(bgLevel.value, 1)]);
    out.push(['被测声源级 dB', num(bg.value, 2), '修正量 dB', num(bg.correction, 2), '差值 dB', num(bg.diff, 2)]);
  }
  const d = distResult.value;
  if (d.ok) {
    out.push([]);
    out.push(['距离衰减', d.type === 'line' ? '线声源' : '点声源']);
    out.push(['r₁ m', num(d.r1, 2), 'r₂ m', num(d.r2, 2), '衰减 dB', num(d.delta, 2), '距离加倍衰减 dB', num(d.perDouble, 2)]);
  }
  return out;
}

function downloadCsv() {
  const csv = '\ufeff' + csvRows()
    .map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '声压级叠加计算结果.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message.success('CSV 已导出');
}

function copySummary() {
  copy(summaryText(), '叠加摘要已复制');
}

/* ============================ 样式辅助 ============================ */
const panels: { key: 'sum' | 'method' | 'convert'; label: string }[] = [
  { key: 'sum', label: '多声源叠加' },
  { key: 'method', label: '叠加方法与相干' },
  { key: 'convert', label: '修正与换算' },
];
</script>

<template>
  <ToolPage
    title="🔊 声压级叠加计算"
    description="dB 不能直接相加 —— 能量叠加、增量速算、相干叠加、背景修正与常用换算"
  >
    <!-- 工具切换 -->
    <div class="mode-row">
      <span class="mode-label">工具</span>
      <button
        v-for="p in panels"
        :key="p.key"
        type="button"
        class="mode-btn"
        :class="{ active: panel === p.key }"
        @click="panel = p.key"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- ==================== 面板 1：多声源叠加 ==================== -->
    <div v-show="panel === 'sum'" class="panel">
      <div class="split">
        <div class="split-col">
          <section class="lvcard">
            <h3><span class="step">1</span> 声源列表 <span class="hint">(同类设备可填台数)</span></h3>
            <div class="src-head">
              <span>声源名称</span><span>声压级 dB</span><span>台数</span><span></span>
            </div>
            <div class="src-list">
              <div v-for="(row, i) in rows" :key="row.key" class="src-row">
                <n-input v-model:value="row.name" size="small" placeholder="声源名称" />
                <n-input-number v-model:value="row.level" size="small" :step="0.1" placeholder="dB" />
                <n-input-number v-model:value="row.count" size="small" :min="1" :step="1" placeholder="1" />
                <n-button size="tiny" quaternary title="删除该声源" @click="removeRow(i)">×</n-button>
              </div>
            </div>
            <div class="btn-row">
              <n-button size="small" @click="addRow">添加声源</n-button>
              <n-select
                class="preset-sel"
                size="small"
                placeholder="载入示例…"
                :options="presetOptions"
                :value="null"
                @update:value="loadPreset"
              />
              <n-button size="small" quaternary @click="clearRows">清空</n-button>
            </div>
            <n-alert v-if="!sumOk" type="warning" :bordered="false" class="mt">
              {{ sumResult.error }}
            </n-alert>
          </section>

          <section class="lvcard">
            <h3><span class="step">2</span> 等声级声源叠加 <span class="hint">(n 个相同声级)</span></h3>
            <div class="field-row">
              <label>单台声级 <em>dB</em>
                <n-input-number v-model:value="eqLevel" size="small" :step="0.1" />
              </label>
              <label>台数 n <em>个</em>
                <n-input-number v-model:value="eqCount" size="small" :min="1" :step="1" />
              </label>
            </div>
            <div v-if="eqResult.ok" class="kv-result">
              <div class="kv"><span>叠加后总声级</span><b>{{ num(eqResult.total, 2) }} dB</b></div>
              <div class="kv"><span>叠加增量 10·lg(n)</span><b>+{{ num(eqResult.increment, 2) }} dB</b></div>
              <div class="kv-note">{{ eqResult.n }} 台等声级声源，数量加倍只多 3 dB</div>
            </div>
          </section>

          <section class="lvcard">
            <h3><span class="step">3</span> 倍频带谱叠加 <span class="hint">(63–8000 Hz 共 8 带，逗号或空格分隔)</span></h3>
            <div class="field">
              <label>设备 A 频谱 <em>dB</em></label>
              <n-input v-model:value="specA" type="textarea" :rows="2" size="small" placeholder="72 75 78 80 82 79 74 68" />
            </div>
            <div class="field">
              <label>设备 B 频谱 <em>dB</em></label>
              <n-input v-model:value="specB" type="textarea" :rows="2" size="small" placeholder="68 70 73 76 78 76 72 66" />
            </div>
            <p v-if="!specResult.ok" class="aux-msg warn">{{ specResult.error }}</p>
            <div v-else class="table-wrap">
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>频率 Hz</th>
                    <th>设备 A dB</th>
                    <th>设备 B dB</th>
                    <th>叠加 dB</th>
                    <th>增量 dB</th>
                    <th>叠加 A 计权 dB(A)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in specRows" :key="r.f">
                    <td>{{ r.f }}</td>
                    <td>{{ r.a == null ? '—' : num(r.a, 1) }}</td>
                    <td>{{ r.b == null ? '—' : num(r.b, 1) }}</td>
                    <td class="strong">
                      {{ r.sum == null ? '—' : num(r.sum, 2) }}{{ r.missing ? '（仅 ' + r.missing + '）' : '' }}
                    </td>
                    <td>{{ r.inc == null ? '—' : num(r.inc, 2) }}</td>
                    <td>{{ r.sumA == null ? '—' : num(r.sumA, 2) }}</td>
                  </tr>
                  <tr class="total-row">
                    <td>合计</td>
                    <td>{{ num((specResult as any).totalALin, 1) }}</td>
                    <td>{{ num((specResult as any).totalBLin, 1) }}</td>
                    <td class="strong">{{ num((specResult as any).totalLin, 2) }}</td>
                    <td>+{{ num((specResult as any).totalInc, 2) }}</td>
                    <td>{{ num((specResult as any).totalALevel, 1) }}</td>
                  </tr>
                  <tr class="total-row">
                    <td>A 计权总级 (dBA)</td>
                    <td>{{ num((specResult as any).totalA, 1) }}</td>
                    <td>{{ num((specResult as any).totalB, 1) }}</td>
                    <td class="strong">{{ num((specResult as any).totalALevel, 1) }}</td>
                    <td>+{{ num((specResult as any).totalIncA, 2) }}</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="inline-note">
              总级为 8 个倍频带能量叠加；A 计权列按 GB/T 3785 的 A 计权修正值逐带修正后叠加。
            </p>
          </section>
        </div>

        <div class="split-col">
          <section v-if="sumOk && sumR" class="lvcard result-hero">
            <div class="rc-title">叠加后总声级</div>
            <div class="hero-rate"><span>{{ num(sumR.total, 1) }}</span><span class="unit">dB</span></div>
            <div class="sub">{{ sumVerdict }}</div>
            <div class="stat-grid">
              <div class="stat"><span>声源数</span><b>{{ sumR.count }}</b><em>个</em></div>
              <div class="stat"><span>总台数</span><b>{{ sumR.totalCount }}</b><em>台</em></div>
              <div class="stat"><span>比最强单源</span><b>+{{ num(sumR.incrementOverMax, 1) }}</b><em>dB</em></div>
              <div class="stat"><span>按台数平均</span><b>{{ num(sumR.average, 1) }}</b><em>dB</em></div>
            </div>
            <div class="btn-row">
              <n-button size="small" @click="copySummary">复制摘要</n-button>
              <n-button size="small" @click="downloadCsv">导出 CSV</n-button>
            </div>
          </section>

          <section class="lvcard">
            <h3>各声源贡献分析</h3>
            <div v-if="sumOk && sumR" class="table-wrap">
              <table class="detail-table">
                <thead>
                  <tr><th>声源</th><th>声级</th><th>台数</th><th>单独作用</th><th>能量占比</th><th>撤除后下降</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in sumR.rows" :key="i" :class="{ 'dom-row': r.dominant }">
                    <td>
                      {{ r.name || '未命名' }}
                      <n-tag v-if="r.dominant" size="tiny" type="warning" :bordered="false">最强</n-tag>
                    </td>
                    <td>{{ num(r.level, 1) }}</td>
                    <td>{{ r.count }}</td>
                    <td>{{ num(r.partial, 2) }}</td>
                    <td class="share-cell">
                      {{ pct(r.share) }}
                      <span class="share">
                        <span class="share-fill" :style="{ width: Math.min(100, Math.max(0, r.share * 100)) + '%' }"></span>
                      </span>
                    </td>
                    <td :class="{ 'muted-cell': r.removalDrop != null && r.removalDrop < 0.5 }">
                      {{ r.removalDrop == null ? '—' : num(r.removalDrop, 2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="inline-note">
              能量占比 &lt; 10%（撤除后总级下降不足 0.5 dB）的声源基本可忽略。
            </p>
          </section>

          <section class="lvcard">
            <h3>达标反算 <span class="hint">(总级降到目标值所需降噪量)</span></h3>
            <div class="field-row">
              <label>目标声级 <em>dB</em>
                <n-input-number v-model:value="target" size="small" :step="0.5" />
              </label>
            </div>
            <div v-if="reduceResult.ok" class="kv-result">
              <div v-if="reduceResult.already" class="kv">
                <span>当前总级 {{ num(reduceResult.total, 1) }} dB 已达标</span><b>无需降噪</b>
              </div>
              <template v-else>
                <div class="kv"><span>总降噪需求</span><b>{{ num(reduceResult.needed, 2) }} dB</b></div>
                <div v-if="reduceResult.minimal != null" class="kv">
                  <span>最小可行单源降噪量</span><b>{{ num(reduceResult.minimal, 2) }} dB</b>
                </div>
                <div v-else class="kv"><span>单靠降某一声源无法达标</span><b>需多源同时治理</b></div>
              </template>
            </div>
            <p class="inline-note">可判断「该先降哪台设备」：给出各声源分别需要降低的 dB，以及仅降某一声源能否达标。</p>
            <div v-if="reduceResult.ok && !reduceResult.already" class="table-wrap">
              <table class="detail-table">
                <thead>
                  <tr><th>声源</th><th>当前级</th><th>其余合计</th><th>需降低</th><th>降后级</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in reduceResult.rows" :key="i" :class="{ 'bad-row': !r.feasible }">
                    <td>{{ r.name || '未命名' }}</td>
                    <td>{{ num(r.level, 1) }}</td>
                    <td>{{ num(r.others, 2) }}</td>
                    <td class="strong">{{ r.need == null ? '无法' : num(r.need, 2) }}</td>
                    <td>{{ r.resultLevel == null ? '—' : num(r.resultLevel, 1) }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-for="(r, i) in reduceResult.rows.filter((x) => !x.feasible)" :key="'why' + i" class="aux-msg warn">
                {{ r.name }}：{{ r.reason }}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- ==================== 面板 2：叠加方法与相干 ==================== -->
    <div v-show="panel === 'method'" class="panel">
      <div class="split">
        <div class="split-col">
          <section class="lvcard">
            <h3><span class="step">1</span> 两声级叠加（增量法）</h3>
            <div class="field-row">
              <label>声级 L₁ <em>dB</em>
                <n-input-number v-model:value="pairL1" size="small" :step="0.1" />
              </label>
              <label>声级 L₂ <em>dB</em>
                <n-input-number v-model:value="pairL2" size="small" :step="0.1" />
              </label>
            </div>
            <div v-if="pairResult.ok" class="kv-result">
              <div class="kv"><span>两声级差值 Δ</span><b>{{ num(pairResult.diff, 2) }} dB</b></div>
              <div class="kv"><span>叠加增加量 ΔL</span><b>+{{ num(pairResult.increment, 2) }} dB</b></div>
              <div class="kv"><span>叠加后总声级</span><b>{{ num(pairResult.total, 2) }} dB</b></div>
              <div class="kv"><span>错误算法（直接相加）</span><b class="bad">{{ num(pairResult.naiveSum, 1) }} dB</b></div>
              <div class="kv-note">{{ pairResult.verdict }}</div>
            </div>
            <div class="chart-wrap">
              <AudioChart
                :x="incCurve.xs"
                :series="incCurve.series"
                :y-min="0"
                :y-max="3.4"
                :y-ticks="5"
                :y-digits="1"
                :height="230"
                :x-label-fmt="(v: number) => String(Math.round(v))"
              />
            </div>
            <div class="legend">
              <span><i style="background:#2563eb"></i>增加值 ΔL（dB）</span>
              <span><i style="background:#f97316"></i>当前差值位置</span>
            </div>
          </section>

          <section class="lvcard">
            <h3><span class="step">2</span> 相干叠加 <span class="hint">(同频、给定相位差)</span></h3>
            <div class="field-row">
              <label>声级 L₁ <em>dB</em>
                <n-input-number v-model:value="cohL1" size="small" :step="0.1" />
              </label>
              <label>声级 L₂ <em>dB</em>
                <n-input-number v-model:value="cohL2" size="small" :step="0.1" />
              </label>
              <label>相位差 φ <em>°</em>
                <n-input-number v-model:value="cohPhase" size="small" :step="5" />
              </label>
            </div>
            <div class="phase-range">
              <n-slider v-model:value="cohPhase" :min="0" :max="360" :step="5" />
            </div>
            <div class="btn-row">
              <n-button size="small" quaternary @click="applyPhase(0)">同相 0°</n-button>
              <n-button size="small" quaternary @click="applyPhase(90)">正交 90°</n-button>
              <n-button size="small" quaternary @click="applyPhase(180)">反相 180°</n-button>
            </div>
            <div v-if="cohResult.ok" class="kv-result">
              <div v-if="cohResult.canceled" class="kv"><span>相干合成声级</span><b>完全抵消</b></div>
              <div v-else class="kv"><span>相干合成声级</span><b>{{ num(cohResult.value, 2) }} dB</b></div>
              <div class="kv"><span>能量叠加对比</span><b>{{ num(cohResult.energySum, 2) }} dB</b></div>
              <div v-if="cohResult.vsEnergy != null" class="kv">
                <span>与能量叠加之差</span>
                <b>{{ cohResult.vsEnergy >= 0 ? '+' : '' }}{{ num(cohResult.vsEnergy, 2) }} dB</b>
              </div>
              <div class="kv-note">{{ cohResult.note }}</div>
            </div>
            <div class="chart-wrap">
              <AudioChart
                :x="cohChart.xs"
                :series="[{ values: cohChart.vals, color: '#c2410c', type: 'line', width: 2 }]"
                :y-digits="1"
                :height="210"
                :x-label-fmt="(v: number) => v + '°'"
              />
            </div>
            <div class="legend">
              <span><i style="background:#c2410c"></i>合成声级随相位差变化（0–360°）</span>
            </div>
          </section>
        </div>

        <div class="split-col">
          <section class="lvcard">
            <h3>两声级叠加增量速查表</h3>
            <div class="table-wrap">
              <table class="detail-table">
                <thead><tr><th>两声级差 Δ（dB）</th><th>叠加增加量 ΔL（dB）</th></tr></thead>
                <tbody>
                  <tr v-for="t in incrementTable" :key="t.diff">
                    <td>{{ t.diff }}</td>
                    <td>{{ t.diff >= 10 ? '≈ ' + num(t.increment, 2) : num(t.increment, 2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="lvcard">
            <h3>等声级声源叠加增量</h3>
            <div class="table-wrap">
              <table class="detail-table">
                <thead><tr><th>声源数量 n</th><th>总级增加量 10·lg(n)（dB）</th></tr></thead>
                <tbody>
                  <tr v-for="n in [1, 2, 3, 4, 5, 6, 8, 10, 20, 100]" :key="n">
                    <td>{{ n }}</td>
                    <td>{{ num(10 * Math.log10(n), 2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="lvcard notes">
            <h3>为什么 dB 不能直接相加</h3>
            <ul>
              <li><strong>能量叠加</strong>：声压级是对数量，叠加要先把各声级换算为声压平方（能量）再相加，L = 10·lg Σ10^(Li/10)。</li>
              <li><strong>两个等声级</strong>：叠加只增加 3 dB；<strong>三个</strong>增加 4.8 dB；<strong>四个</strong>增加 6 dB（即声级相同、数量加倍只多 3 dB）。</li>
              <li><strong>增量法</strong>：两声级相差越大，弱的一方贡献越小。相差 10 dB 时只增加 0.4 dB，相差 20 dB 时几乎可忽略。</li>
              <li><strong>相干叠加</strong>：同频且相位固定时声压按矢量相加，等强同相可增加 6 dB；反相则相互抵消，这是主动降噪的原理。</li>
              <li><strong>结论</strong>：治理噪声时，总是先降「最强的那个声源」最有效；当总级中有多个等强声源时，逐个降低的收益会明显变小。</li>
            </ul>
          </section>
        </div>
      </div>
    </div>

    <!-- ==================== 面板 3：修正与换算 ==================== -->
    <div v-show="panel === 'convert'" class="panel">
      <div class="split">
        <div class="split-col">
          <section class="lvcard">
            <h3>背景噪声修正 <span class="hint">(从实测总级中扣除背景)</span></h3>
            <div class="field-row">
              <label>实测总声级 <em>dB</em>
                <n-input-number v-model:value="bgTotal" size="small" :step="0.1" />
              </label>
              <label>背景声级 <em>dB</em>
                <n-input-number v-model:value="bgLevel" size="small" :step="0.1" />
              </label>
            </div>
            <div v-if="bgResult.ok" class="kv-result">
              <div class="kv"><span>差值（总 − 背景）</span><b>{{ num(bgResult.diff, 2) }} dB</b></div>
              <div class="kv"><span>被测声源级</span><b>{{ num(bgResult.value, 2) }} dB</b></div>
              <div class="kv"><span>修正量</span><b>−{{ num(bgResult.correction, 2) }} dB</b></div>
              <div v-if="bgResult.standardCorrection != null" class="kv">
                <span>取整修正表（差 {{ num(bgResult.diff, 1) }} dB → 扣 {{ bgResult.standardCorrection }} dB）</span>
                <b>{{ num(bgResult.rounded, 1) }} dB</b>
              </div>
              <div v-else class="kv">
                <span>取整修正表（差值不足 3 dB）</span><b class="bad">不宜修正</b>
              </div>
              <div class="kv-note" :class="{ warn: bgResult.verdict === 'unusable' }">{{ bgResult.note }}</div>
            </div>
            <n-alert v-else type="warning" :bordered="false" class="mt">{{ bgResult.error }}</n-alert>
            <div class="table-wrap mt">
              <table class="detail-table">
                <thead><tr><th>实测总级 − 背景级（dB）</th><th>从总级中扣减（dB）</th></tr></thead>
                <tbody>
                  <tr v-for="t in backgroundTable" :key="t.diff">
                    <td>{{ t.diff }}{{ t.diff === 3 ? '（下限，&lt;3 不可用）' : '' }}</td>
                    <td>{{ t.correction }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="lvcard">
            <h3>声压级 ↔ 声压</h3>
            <div class="field-row">
              <label>声压级 <em>dB</em>
                <n-input-number v-model:value="splIn" size="small" :step="0.1" />
              </label>
              <label>声压 <em>Pa</em>
                <n-input-number v-model:value="paIn" size="small" :step="0.0001" />
              </label>
            </div>
            <div v-if="splResult.ok" class="kv-result">
              <div class="kv"><span>声压 p（相对 20 µPa）</span><b>{{ fmtPa(splResult.pa) }}</b></div>
              <div class="kv"><span>换算 mPa</span><b>{{ num(splResult.mpa, 3) }} mPa</b></div>
              <div class="kv"><span>换算 µPa</span><b>{{ num(splResult.upa, 1) }} µPa</b></div>
              <div class="kv"><span>声压比 p/p₀（p₀ = 20 µPa）</span><b>{{ fmtSci(splResult.ratio) }}</b></div>
            </div>
            <div v-if="paResult.ok" class="kv-result">
              <div class="kv"><span>由声压 {{ num(paIn, 4) }} Pa 反算声压级</span><b>{{ num(paResult.value, 2) }} dB</b></div>
              <div class="kv"><span>声压比 p/p₀</span><b>{{ fmtSci(paResult.ratio) }}</b></div>
            </div>
            <n-alert v-if="paResult.error" type="warning" :bordered="false" class="mt">{{ paResult.error }}</n-alert>
          </section>
        </div>

        <div class="split-col">
          <section class="lvcard">
            <h3>距离衰减 <span class="hint">(自由场)</span></h3>
            <div class="field-row">
              <label>起始距离 r₁ <em>m</em>
                <n-input-number v-model:value="r1" size="small" :min="0.1" :step="0.5" />
              </label>
              <label>目标距离 r₂ <em>m</em>
                <n-input-number v-model:value="r2" size="small" :min="0.1" :step="0.5" />
              </label>
            </div>
            <div class="field">
              <label>声源类型</label>
              <n-select v-model:value="distType" size="small" :options="distanceTypeOptions" />
            </div>
            <div v-if="distResult.ok" class="kv-result">
              <div class="kv"><span>距离比 r₂ / r₁</span><b>{{ num(distResult.ratio, 2) }}</b></div>
              <div class="kv"><span>衰减量</span><b>{{ num(distResult.delta, 2) }} dB</b></div>
              <div class="kv"><span>距离加倍时衰减</span><b>{{ num(distResult.perDouble, 2) }} dB</b></div>
              <div class="kv-note">{{ distResult.note }}</div>
            </div>
            <n-alert v-else type="warning" :bordered="false" class="mt">{{ distResult.error }}</n-alert>
          </section>

          <section class="lvcard">
            <h3>声功率级 ↔ 声压级 <span class="hint">(点声源)</span></h3>
            <div class="field-row">
              <label>声功率级 L<sub>W</sub> <em>dB</em>
                <n-input-number v-model:value="lwIn" size="small" :step="0.5" />
              </label>
              <label>声压级 L<sub>p</sub> <em>dB</em>
                <n-input-number v-model:value="lpIn" size="small" :step="0.5" />
              </label>
            </div>
            <div class="field-row">
              <label>距离 r <em>m</em>
                <n-input-number v-model:value="r3" size="small" :min="0.1" :step="0.5" />
              </label>
              <div class="field">
                <label>指向性因数 Q</label>
                <n-select v-model:value="qFactor" size="small" :options="directivityOptions" />
              </div>
            </div>
            <div v-if="pwToSpl.ok" class="kv-result">
              <div class="kv"><span>10·lg(Q/4π) 修正项</span><b>{{ num(pwToSpl.factor, 2) }} dB</b></div>
              <div class="kv"><span>由 L<sub>W</sub> 求 L<sub>p</sub>（r 处）</span><b>{{ num(pwToSpl.lp, 2) }} dB</b></div>
              <div class="kv-note">{{ pwToSpl.note }}</div>
            </div>
            <div v-if="splToPw.ok" class="kv-result">
              <div class="kv"><span>由 L<sub>p</sub> 求 L<sub>W</sub>（r 处）</span><b>{{ num(splToPw.lw, 2) }} dB</b></div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- ==================== 计算方法说明 ==================== -->
    <section class="lvcard notes">
      <h3>计算方法</h3>
      <ul>
        <li><strong>能量叠加（不相干声源）</strong>：L = 10·lg Σ10^(Li/10)。两台互不相干的设备（不同频率成分、随机相位）按声压平方相加，不能把 dB 直接相加。</li>
        <li><strong>增量法</strong>：设两声级差 Δ = |L₁ − L₂|，则增加量 ΔL = 10·lg(1 + 10^(−Δ/10))。Δ = 0 → +3.0 dB，Δ = 3 → +1.8 dB，Δ = 10 → +0.4 dB，Δ ≥ 15 → 可忽略。</li>
        <li><strong>相干叠加</strong>：同频且有固定相位差 φ 时，L = 10·lg[10^(L₁/10) + 10^(L₂/10) + 2·10^((L₁+L₂)/20)·cos φ]。φ = 0 同相（等强时 +6 dB），φ = 90° 退化为能量叠加，φ = 180° 反相（等强时完全抵消）。</li>
        <li><strong>多声源叠加</strong>：各声源按能量相加；某声源的能量占比 = 10^(Li/10)·n / Σ，撤除该声源后总级的下降量反映其重要性 —— 占比小于 10%（即撤除后下降不足 0.5 dB）的声源基本可忽略。</li>
        <li><strong>达标反算</strong>：把目标值换算为能量后减去其余声源的能量，得到该声源允许的剩余能量，再反算需降低的 dB；若其余声源合计已超过目标，则仅降此声源无法达标。</li>
        <li><strong>背景噪声修正</strong>：L<sub>源</sub> = 10·lg(10^(L总/10) − 10^(L背景/10))。实测总级与背景级相差 &lt; 3 dB 时修正结果偏差过大，应避免；相差 ≥ 10 dB 时背景影响可忽略。工程上常用取整修正表（差 3 → 扣 3 dB，差 4–5 → 扣 2 dB，差 6–9 → 扣 1 dB，≥ 10 → 不修正）。</li>
        <li><strong>距离衰减</strong>：点声源（自由场）按 6 dB/倍距（ΔL = 20·lg(r₂/r₁)）；线声源（如长车流、管道）按 3 dB/倍距（ΔL = 10·lg(r₂/r₁)）。实测中因地面反射与空气吸收，衰减量通常介于两者之间。</li>
        <li><strong>声功率级换算</strong>：点声源 L<sub>p</sub> = L<sub>w</sub> + 10·lg(Q/4π) − 20·lg r，Q = 1（自由场，−11 dB）、2（半自由场，−8 dB）、4（墙角，−5 dB）、8（三面交角，−2 dB）。</li>
        <li><strong>注意</strong>：本模块为能量（功率）意义上的叠加，适用于稳态、互不相干的声源；若声源同频且相位关系稳定（如单一低频纯音、驻波场），应改用相干叠加。</li>
      </ul>
    </section>
  </ToolPage>
</template>

<style scoped>
/* ---------------- 工具切换 ---------------- */
.mode-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.mode-label {
  font-size: 13px;
  color: var(--n-text-color-3);
}
.mode-btn {
  padding: 5px 14px;
  font-size: 13px;
  border: 1px solid var(--n-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--n-text-color);
  cursor: pointer;
  transition: all 0.16s ease;
}
.mode-btn:hover {
  border-color: var(--n-primary-color);
  color: var(--n-primary-color);
}
.mode-btn.active {
  background: var(--n-primary-color);
  border-color: var(--n-primary-color);
  color: #fff;
}

/* ---------------- 布局 ---------------- */
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 900px) {
  .split {
    grid-template-columns: 1fr;
  }
}
.split-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.lvcard {
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  padding: 16px 18px;
  background: var(--n-card-color);
}
.lvcard h3 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 650;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.lvcard h3 .hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--n-text-color-3);
}
.step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--n-primary-color);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex: none;
}

/* ---------------- 声源列表 ---------------- */
.src-head,
.src-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr 0.8fr 34px;
  gap: 8px;
  align-items: center;
}
.src-row {
  margin-bottom: 8px;
}
.src-head {
  font-size: 12px;
  color: var(--n-text-color-3);
  padding: 0 0 6px;
}
.src-list {
  display: flex;
  flex-direction: column;
}

.btn-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 12px;
}
.preset-sel {
  width: 210px;
}

/* ---------------- 字段 ---------------- */
.field-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.field-row label,
.field label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--n-text-color-2, var(--n-text-color));
  flex: 1 1 130px;
  min-width: 0;
}
.field {
  margin-bottom: 10px;
}
.field-row em,
.field em {
  font-style: normal;
  font-size: 11px;
  color: var(--n-text-color-3);
}
.mt {
  margin-top: 10px;
}

/* ---------------- 结果展示 ---------------- */
.kv-result {
  margin-top: 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--n-color);
}
.kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 4px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--n-border-color);
}
.kv:last-child {
  border-bottom: none;
}
.kv span {
  color: var(--n-text-color-3);
}
.kv b {
  font-variant-numeric: tabular-nums;
  font-weight: 650;
}
.kv b.bad {
  color: #c62828;
}
.kv-note {
  margin-top: 8px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--n-text-color-3);
}
.kv-note.warn {
  color: #b45309;
}

.result-hero {
  background: linear-gradient(180deg, var(--n-primary-color) 0%, var(--n-color) 100%);
  background: var(--n-color);
  border-color: var(--n-primary-color);
}
.rc-title {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin-bottom: 4px;
}
.hero-rate {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.hero-rate span:first-child {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--n-primary-color);
}
.hero-rate .unit {
  font-size: 15px;
  color: var(--n-text-color-3);
}
.sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--n-text-color-3);
  line-height: 1.6;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.stat {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
}
.stat span {
  font-size: 12px;
  color: var(--n-text-color-3);
  width: 100%;
}
.stat b {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}
.stat em {
  font-style: normal;
  font-size: 11px;
  color: var(--n-text-color-3);
}

/* ---------------- 表格 ---------------- */
.table-wrap {
  overflow-x: auto;
  margin-top: 8px;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.detail-table th,
.detail-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--n-border-color);
  text-align: right;
  white-space: nowrap;
}
.detail-table th {
  color: var(--n-text-color-3);
  font-weight: 600;
  background: var(--n-color);
}
.detail-table th:first-child,
.detail-table td:first-child {
  text-align: left;
}
.detail-table tbody tr:hover {
  background: var(--n-action-color, rgba(128, 128, 128, 0.06));
}
.detail-table td.strong {
  font-weight: 650;
}
.total-row td {
  border-top: 2px solid var(--n-border-color);
  font-weight: 650;
}
.dom-row td:first-child {
  font-weight: 650;
}
.bad-row td {
  color: #c62828;
}
.detail-table td :deep(.n-tag) {
  margin-left: 4px;
}
.detail-table td.muted-cell {
  color: var(--n-text-color-3);
}
.share-cell {
  min-width: 108px;
}
.share {
  display: block;
  height: 5px;
  margin-top: 4px;
  border-radius: 3px;
  background: var(--n-color);
  overflow: hidden;
}
.share-fill {
  display: block;
  height: 100%;
  background: var(--n-primary-color);
}

/* ---------------- 相位滑块 ---------------- */
.phase-range {
  margin: 10px 4px 4px;
}

/* ---------------- 图表 ---------------- */
.chart-wrap {
  margin-top: 12px;
}
.legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
}
.legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 5px;
}

/* ---------------- 说明 ---------------- */
.notes ul {
  margin: 0;
  padding-left: 18px;
}
.notes li {
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--n-text-color-3);
  margin-bottom: 5px;
}
.notes li strong {
  color: var(--n-text-color);
}
.inline-note,
.aux-msg {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--n-text-color-3);
}
.aux-msg.warn {
  color: #b45309;
}
</style>
