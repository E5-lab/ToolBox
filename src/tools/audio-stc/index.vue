<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NAlert, NButton, NInputNumber, NSelect, NSpace } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import AudioChart from '../../audio/AudioChart.vue';
import Insulation from '../../audio/kernel/insulation.js';

interface MaterialItem {
  id: string;
  name: string;
  density: number;
  cL: number;
}
interface GbReq {
  id: string;
  group: string;
  name: string;
  metric: 'C' | 'Ctr';
  limit: number;
}
interface GbResult {
  ok: boolean;
  error?: string;
  standard: string;
  octave: boolean;
  value: number;
  designation: string;
  bands: number[];
  levels: number[];
  contour: number[];
  deficiencies: number[];
  sumDeficiency: number;
  maxDeviation: number;
  limit: number;
  C: number;
  Ctr: number;
  c: number;
  ctr: number;
  rwPlusC: number;
  rwPlusCtr: number;
  notation: string;
}
interface StcResult {
  ok: boolean;
  error?: string;
  standard: string;
  value: number;
  designation: string;
  rounded: number;
  contour: number[];
  deficiencies: number[];
  sumDeficiency: number;
  maxDeficiency: number;
  limit: number;
  maxLimit: number;
  bands: number[];
  levels: number[];
}
interface Res {
  ok: boolean;
  error?: string;
  bands: number[];
  levels: (number | null)[];
  rw: GbResult;
  stc: StcResult;
  stcValue: number | null;
  rwValue: number | null;
  mass: number | null;
  cavityBonus: number | null;
  coincidence: number | null;
}
interface CheckResult {
  req: GbReq;
  metric: string;
  limit: number;
  value: number;
  exact: number;
  pass: boolean;
  margin: number;
  needRw: number;
}

const GRID_HZ = Insulation.GRID_HZ as number[];
const MATERIALS = Insulation.MATERIALS as MaterialItem[];
const GB_REQUIREMENTS = Insulation.GB_REQUIREMENTS as GbReq[];
const DEFAULT_MEASURED: (number | null)[] = [32, 34, 36, 38, 40, 42, 44, 46, 47, 48, 50, 52, 53, 54, 54, 53, 52];

/* ---------------- 状态 ---------------- */
const mode = ref<'mass' | 'double' | 'measured'>('mass');
const mat = ref('gypsum');
const thick = ref(12);
const massVal = ref(9.6);
const m1 = ref('gypsum');
const t1 = ref(12);
const m2 = ref('gypsum');
const t2 = ref(12);
const cavity = ref(75);
const reqId = ref('dwell-partition');
const refLine = ref<'gb' | 'stc' | 'both' | 'none'>('gb');
const levels = ref<(number | null)[]>(DEFAULT_MEASURED.slice());

const copy = useCopy();

/* ---------------- 选项 ---------------- */
const materialOptions = computed(() => MATERIALS.map((m) => ({ label: m.name, value: m.id })));

const reqOptions = computed(() => {
  const groups: string[] = [];
  GB_REQUIREMENTS.forEach((r) => {
    if (groups.indexOf(r.group) < 0) groups.push(r.group);
  });
  return groups.map((g, i) => ({
    type: 'group' as const,
    label: g,
    key: 'g' + i,
    children: GB_REQUIREMENTS.filter((r) => r.group === g).map((r) => ({
      label: r.name + '（' + r.metric + ' ≥ ' + r.limit + ' dB）',
      value: r.id,
    })),
  }));
});

const refOptions = [
  { label: '国标基准（GB）', value: 'gb' },
  { label: '美标轮廓（ASTM）', value: 'stc' },
  { label: '两条都显示', value: 'both' },
  { label: '不显示', value: 'none' },
];
const modeButtons: { key: 'mass' | 'double' | 'measured'; label: string }[] = [
  { key: 'mass', label: '单层板质量定律' },
  { key: 'double', label: '双层构件估算' },
  { key: 'measured', label: '输入实测隔声量' },
];

/* 材料或厚度变化时，自动同步面密度（可手改） */
watch([mat, thick], () => {
  const m = Insulation.faceMass(mat.value, thick.value) as number | null;
  if (m != null) massVal.value = Number(m.toFixed(2));
});

/* ---------------- 工具函数 ---------------- */
function num(v: number | null | undefined, d = 2): string {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}
function signed(v: number | null | undefined, d = 0): string {
  if (v == null || Number.isNaN(v)) return '—';
  const n = Number(v).toFixed(d);
  return (Number(v) > 0 ? '+' : '') + n;
}
function fLabel(f: number): string {
  return f >= 1000 ? f / 1000 + 'k' : String(f);
}
function materialName(id: string): string {
  const m = MATERIALS.find((x) => x.id === id);
  return m ? m.name : id;
}
function rwMeaning(v: number): string {
  if (v <= 25) return '可听清隔壁正常说话声，仅适用于私密性要求很低的隔断';
  if (v < 35) return '大声说话可听清，普通轻质隔墙水平';
  if (v < 40) return '一般说话可听见但内容不清晰，低于住宅分户墙要求';
  if (v < 45) return '大声说话勉强可闻，接近住宅分户墙限值';
  if (v < 50) return '大声说话难以听清内容，砌体分户墙常见水平';
  if (v < 55) return '大声说话基本听不到，办公与高要求分户墙水平';
  return '隔声优良，接近重墙或专业隔声构造';
}
function stcMeaning(v: number): string {
  if (v <= 25) return '可听清隔壁正常说话声';
  if (v < 35) return '大声说话可听清，轻质隔墙水平';
  if (v < 40) return '一般说话可听见但内容不清晰';
  if (v < 45) return '大声说话勉强可闻，常用砌体分户墙水平';
  if (v < 50) return '大声说话难以听清内容';
  if (v < 55) return '大声说话基本听不到，高要求隔墙';
  return '隔声优良，接近双层重墙或专业隔声构造';
}

/* ---------------- 计算 ---------------- */
const rawResult = computed<Res>(() => {
  let r: Res;
  if (mode.value === 'mass') {
    r = Insulation.fromMass({
      mass: massVal.value,
      materialId: mat.value,
      thickness: thick.value,
    }) as Res;
  } else if (mode.value === 'double') {
    r = Insulation.doubleLeaf({
      mass1: Insulation.faceMass(m1.value, t1.value),
      mass2: Insulation.faceMass(m2.value, t2.value),
      cavity: cavity.value,
    }) as Res;
  } else {
    r = Insulation.fromLevels(levels.value) as Res;
  }
  return r;
});

const result = computed<Res | null>(() => (rawResult.value && rawResult.value.ok ? rawResult.value : null));
const errMsg = computed(() => {
  const r = rawResult.value;
  if (r && !r.ok) return r.error || '参数不完整，请检查输入。';
  return '';
});
const rw = computed<GbResult | null>(() => {
  const r = result.value;
  return r && r.rw && r.rw.ok ? r.rw : null;
});
const st = computed<StcResult | null>(() => {
  const r = result.value;
  return r && r.stc && r.stc.ok ? r.stc : null;
});

const verdict = computed(() => {
  const a = rw.value;
  const b = st.value;
  const out: string[] = [];
  if (a) out.push('国标 Rw ' + a.value + ' dB：' + rwMeaning(a.value));
  if (b) out.push('美标 STC-' + b.value + '：' + stcMeaning(b.value));
  if (a && b) {
    if (a.value !== b.value) out.push('两标准相差 ' + signed(a.value - b.value) + ' dB（评价频段与单带限值不同）。');
    else out.push('两标准结果一致。');
  }
  return out.join(' ');
});

const stats = computed(() => {
  const r = result.value;
  if (!r) return [];
  const a = rw.value;
  const b = st.value;
  const out: { label: string; value: string; unit: string; sub: string }[] = [];
  if (r.mass != null) out.push({ label: '面密度 m', value: num(r.mass, 1), unit: 'kg/m²', sub: '' });
  if (r.coincidence != null)
    out.push({ label: '吻合频率 f_c', value: num(r.coincidence, 0), unit: 'Hz', sub: '质量定律失效区' });
  if (a) {
    out.push({ label: 'C 粉红噪声', value: num(a.C, 1), unit: 'dB', sub: '修约 ' + signed(a.c) + ' dB' });
    out.push({ label: 'Ctr 交通噪声', value: num(a.Ctr, 1), unit: 'dB', sub: '修约 ' + signed(a.ctr) + ' dB' });
    out.push({ label: 'Rw + C', value: String(a.rwPlusC), unit: 'dB', sub: '社会/生活噪声' });
    out.push({ label: 'Rw + Ctr', value: String(a.rwPlusCtr), unit: 'dB', sub: '交通噪声' });
    out.push({ label: 'GB 不利偏差之和', value: num(a.sumDeficiency, 1), unit: 'dB', sub: '限值 ≤ ' + a.limit });
  }
  if (b)
    out.push({
      label: 'STC 缺量之和 / 单带',
      value: num(b.sumDeficiency, 1) + ' / ' + num(b.maxDeficiency, 1),
      unit: 'dB',
      sub: '≤ 32 且单带 ≤ 8',
    });
  return out;
});

/* 提示 */
const showMassTip = computed(() => mode.value === 'mass' && !!result.value);
const massTipText = computed(() => {
  const fc = result.value ? result.value.coincidence : null;
  return (
    '质量定律为扩散场估算，精度约 ±3 dB；' +
    (fc != null && fc <= 4000
      ? '该构件吻合频率约 ' + num(fc, 0) + ' Hz 落在评价范围内，实际隔声量在此附近会明显下降，实测值往往低于本估算。'
      : '吻合频率高于评价范围，中高频可按质量定律估算。')
  );
});
const showDoubleTip = computed(() => mode.value === 'double' && !!result.value && result.value.cavityBonus != null);
const doubleTipText = computed(() => {
  const r = result.value;
  const bonus = r ? r.cavityBonus : null;
  return (
    '双层构件按经验式估算（总面密度质量定律 + 3 dB + 空腔增益 ' + num(bonus, 1) +
    ' dB）。实际须保证两层之间无刚性声桥、板缝密封，否则隔声量会大幅低于估算。'
  );
});
const showGbDevWarn = computed(() => !!rw.value && (rw.value as GbResult).sumDeficiency > 24);
const gbDevText = computed(() => {
  const a = rw.value;
  if (!a) return '';
  return (
    '国标不利偏差之和已达 ' + num(a.sumDeficiency, 1) + ' dB（限值 ' + a.limit +
    ' dB），说明频谱起伏较大，构造可能存在薄弱频段。'
  );
});
const showStcDevWarn = computed(() => !!st.value && (st.value as StcResult).maxDeficiency > 8);

/* 限值对照 */
const check = computed<CheckResult | null>(() => {
  const a = rw.value;
  if (!a) return null;
  return Insulation.checkRequirement(a, reqId.value) as unknown as CheckResult | null;
});
const checkText = computed(() => {
  const c = check.value;
  if (!c) return '';
  const head =
    (c.pass ? '满足' : '不满足') + '　' + c.req.group + ' · ' + c.req.name + '：要求 ' + c.metric + ' ≥ ' + c.limit +
    ' dB；本构件 ' + c.metric + ' = ' + c.value + ' dB，';
  return head + (c.pass ? '余量 ' + c.margin + ' dB。' : '尚差 ' + -c.margin + ' dB（需 Rw ≥ ' + c.needRw + ' dB 才能满足）。');
});

/* 逐带明细 */
const tableRows = computed(() => {
  const r = result.value;
  if (!r) return [];
  const a = rw.value;
  const b = st.value;
  const gbC = a ? (Insulation.align(a.contour, a.bands, r.bands) as (number | null)[]) : null;
  const gbD = a ? (Insulation.align(a.deficiencies, a.bands, r.bands) as (number | null)[]) : null;
  const stC = b ? (Insulation.align(b.contour, b.bands, r.bands) as (number | null)[]) : null;
  const stD = b ? (Insulation.align(b.deficiencies, b.bands, r.bands) as (number | null)[]) : null;
  return r.bands.map((f, i) => ({
    f,
    label: fLabel(f) + ' Hz',
    level: num(r.levels[i], 1),
    gbC: gbC ? num(gbC[i], 0) : '—',
    gbDText: gbD == null || gbD[i] == null ? '—' : gbD[i]! <= 0 ? '—' : num(gbD[i], 1),
    gbDClass: gbD == null || gbD[i] == null ? 'mut' : gbD[i]! <= 0 ? 'ok' : 'warn',
    stC: stC ? num(stC[i], 0) : '—',
    stDText: stD == null || stD[i] == null ? '—' : stD[i]! <= 0 ? '—' : num(stD[i], 1),
    stDClass: stD == null || stD[i] == null ? 'mut' : stD[i]! <= 0 ? 'ok' : stD[i]! > 8 ? 'bad' : 'warn',
  }));
});

/* 图表 */
const chartSeries = computed(() => {
  const r = result.value;
  if (!r) return [];
  const a = rw.value;
  const b = st.value;
  const out: any[] = [{ name: '隔声量 R', color: '#2563eb', values: r.levels, width: 2.2, radius: 2.6 }];
  if (a && (refLine.value === 'gb' || refLine.value === 'both')) {
    out.push({
      name: 'GB 基准',
      color: '#f59e0b',
      values: Insulation.align(a.contour, a.bands, r.bands),
      dash: [6, 4],
      width: 1.6,
      points: false,
    });
  }
  if (b && (refLine.value === 'stc' || refLine.value === 'both')) {
    out.push({
      name: 'ASTM 轮廓',
      color: '#10b981',
      values: Insulation.align(b.contour, b.bands, r.bands),
      dash: [4, 3],
      width: 1.6,
      points: false,
    });
  }
  return out;
});

/* ---------------- 文案 / 导出 ---------------- */
function sourceText(): string {
  const r = result.value;
  if (!r) return '';
  if (mode.value === 'mass')
    return (
      '单层板质量定律：' + materialName(mat.value) + ' ' + num(thick.value, 0) + ' mm，面密度 ' + num(r.mass, 1) + ' kg/m²'
    );
  if (mode.value === 'double')
    return (
      '双层构件：' + materialName(m1.value) + ' ' + num(t1.value, 0) + ' mm + ' + materialName(m2.value) + ' ' +
      num(t2.value, 0) + ' mm，空腔 ' + num(cavity.value, 0) + ' mm，总面密度 ' + num(r.mass, 1) + ' kg/m²'
    );
  return '输入方式：实测隔声量（100–4000 Hz，17 个 1/3 倍频带）';
}

function summaryText(): string {
  const r = result.value;
  if (!r) return '';
  const a = rw.value;
  const b = st.value;
  const out: string[] = [];
  out.push('墙体隔声量 Rw / STC · 结果摘要');
  out.push(sourceText());
  if (a) {
    out.push(
      '国标 GB/T 50121-2005：' + a.notation + '；Rw+C = ' + a.rwPlusC + ' dB，Rw+Ctr = ' + a.rwPlusCtr +
        ' dB，不利偏差之和 ' + num(a.sumDeficiency, 1) + ' dB（限值 ' + a.limit + '）'
    );
    const c = check.value;
    if (c) {
      out.push(
        '限值对照：' + c.req.group + ' · ' + c.req.name + '（' + c.metric + ' ≥ ' + c.limit + ' dB）→ ' +
          (c.pass ? '满足，余量 ' + c.margin + ' dB' : '不满足，尚差 ' + -c.margin + ' dB')
      );
    }
  } else {
    out.push('国标 Rw：' + (r.rw && r.rw.error ? r.rw.error : '无法计算'));
  }
  if (b)
    out.push('美标 ASTM E413：STC-' + b.value + '（缺量之和 ' + num(b.sumDeficiency, 1) + ' dB，单带最大 ' + num(b.maxDeficiency, 1) + ' dB）');
  if (r.coincidence) out.push('吻合频率 f_c ≈ ' + num(r.coincidence, 0) + ' Hz');
  out.push('逐带隔声量：' + r.bands.map((f, i) => f + 'Hz=' + num(r.levels[i], 1)).join('，'));
  out.push('工具：声学计算工具箱 · 墙体隔声量 Rw / STC');
  return out.join('\n');
}

function copySummary() {
  const txt = summaryText();
  if (!txt) return;
  copy(txt, '已复制结果摘要');
}

function exportCsv() {
  const r = result.value;
  if (!r) return;
  const a = rw.value;
  const b = st.value;
  const rowsOut: (string | number)[][] = [];
  rowsOut.push(['墙体隔声量计算结果（GB/T 50121-2005 与 ASTM E413）', '', '', '', '', '']);
  rowsOut.push(['Rw (dB)', a ? String(a.value) : '', '', '', '', '']);
  rowsOut.push(['C (dB)', a ? num(a.C, 2) : '', '修约', a ? a.c : '', '', '']);
  rowsOut.push(['Ctr (dB)', a ? num(a.Ctr, 2) : '', '修约', a ? a.ctr : '', '', '']);
  rowsOut.push(['Rw + C (dB)', a ? String(a.rwPlusC) : '', '', '', '', '']);
  rowsOut.push(['Rw + Ctr (dB)', a ? String(a.rwPlusCtr) : '', '', '', '', '']);
  rowsOut.push(['STC', b ? String(b.value) : '', '', '', '', '']);
  rowsOut.push(['面密度 (kg/m²)', r.mass != null ? num(r.mass, 2) : '', '', '', '', '']);
  rowsOut.push(['吻合频率 (Hz)', r.coincidence ? num(r.coincidence, 0) : '', '', '', '', '']);
  rowsOut.push(['GB 不利偏差之和 (dB)', a ? num(a.sumDeficiency, 2) : '', '限值', a ? a.limit : '', '', '']);
  rowsOut.push(['STC 缺量之和 (dB)', b ? num(b.sumDeficiency, 2) : '', '限值 32，单带 8', '', '', '']);
  const c = a ? (Insulation.checkRequirement(a, reqId.value) as unknown as CheckResult | null) : null;
  if (c) {
    rowsOut.push([
      '限值对照',
      c.req.group + ' ' + c.req.name,
      c.metric + ' ≥ ' + c.limit,
      c.value,
      c.pass ? '满足' : '不满足',
      '余量 ' + c.margin,
    ]);
  }
  rowsOut.push([]);
  rowsOut.push(['1/3 倍频带 (Hz)', 'R (dB)', 'GB 基准 (dB)', 'GB 不利偏差 (dB)', 'ASTM 轮廓 (dB)', 'STC 缺量 (dB)']);
  const gbC = a ? (Insulation.align(a.contour, a.bands, r.bands) as (number | null)[]) : [];
  const gbD = a ? (Insulation.align(a.deficiencies, a.bands, r.bands) as (number | null)[]) : [];
  const stC = b ? (Insulation.align(b.contour, b.bands, r.bands) as (number | null)[]) : [];
  const stD = b ? (Insulation.align(b.deficiencies, b.bands, r.bands) as (number | null)[]) : [];
  r.bands.forEach((f, i) => {
    rowsOut.push([
      f,
      num(r.levels[i], 2),
      gbC[i] == null ? '' : num(gbC[i], 0),
      gbD[i] == null ? '' : num(gbD[i], 2),
      stC[i] == null ? '' : num(stC[i], 0),
      stD[i] == null ? '' : num(stD[i], 2),
    ]);
  });
  const csv =
    '\ufeff' +
    rowsOut
      .map((row) => row.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = 'rw-stc-result.csv';
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <ToolPage
    title="🧱 墙体隔声量 Rw / STC"
    description="质量定律估算或输入实测隔声量，同时按国标 GB/T 50121-2005 给出计权隔声量 Rw（含频谱修正量 C、Ctr）与美标 ASTM E413 的 STC"
  >
    <div class="split">
      <div class="col">
        <div class="card">
          <div class="mode-row">
            <span class="mode-label">输入方式</span>
            <n-button
              v-for="b in modeButtons"
              :key="b.key"
              size="small"
              :type="mode === b.key ? 'primary' : 'default'"
              :secondary="mode !== b.key"
              @click="mode = b.key"
            >
              {{ b.label }}
            </n-button>
          </div>

          <div v-if="mode === 'mass'" class="stc-panel">
            <div class="field-row">
              <div class="field">
                <label class="f-label">材料</label>
                <n-select v-model:value="mat" :options="materialOptions" size="small" />
              </div>
              <div class="field">
                <label class="f-label">厚度 <span class="unit-tag">mm</span></label>
                <n-input-number v-model:value="thick" :min="1" :step="1" size="small" />
              </div>
              <div class="field">
                <label class="f-label">面密度 <span class="unit-tag">kg/m²（可手改）</span></label>
                <n-input-number v-model:value="massVal" :min="0.5" :step="0.1" size="small" />
              </div>
            </div>
          </div>

          <div v-if="mode === 'double'" class="stc-panel">
            <div class="field-row">
              <div class="field">
                <label class="f-label">第 1 层材料</label>
                <n-select v-model:value="m1" :options="materialOptions" size="small" />
              </div>
              <div class="field">
                <label class="f-label">第 1 层厚度 <span class="unit-tag">mm</span></label>
                <n-input-number v-model:value="t1" :min="1" :step="1" size="small" />
              </div>
              <div class="field">
                <label class="f-label">第 2 层材料</label>
                <n-select v-model:value="m2" :options="materialOptions" size="small" />
              </div>
              <div class="field">
                <label class="f-label">第 2 层厚度 <span class="unit-tag">mm</span></label>
                <n-input-number v-model:value="t2" :min="1" :step="1" size="small" />
              </div>
              <div class="field">
                <label class="f-label">空腔深度 <span class="unit-tag">mm</span></label>
                <n-input-number v-model:value="cavity" :min="0" :step="5" size="small" />
              </div>
            </div>
          </div>

          <div v-if="mode === 'measured'" class="stc-panel">
            <p class="inline-note">
              按 100–4000 Hz 共 17 个 1/3 倍频带填入实测隔声量（dB）：国标 Rw 用 100–3150 Hz 共 16 带，美标 STC 用 125–4000 Hz 共
              16 带，故一并提供 17 带。
            </p>
            <div class="band-grid">
              <div v-for="(f, i) in GRID_HZ" :key="f" class="band-cell">
                <span class="bc-label">{{ fLabel(f) }}</span>
                <n-input-number v-model:value="levels[i]" :step="0.5" size="tiny" placeholder="dB" />
              </div>
            </div>
          </div>

          <n-alert v-if="errMsg" type="error" :show-icon="false" class="mt">{{ errMsg }}</n-alert>
          <n-alert v-if="showMassTip" type="info" :show-icon="false" class="mt">{{ massTipText }}</n-alert>
          <n-alert v-if="showDoubleTip" type="info" :show-icon="false" class="mt">{{ doubleTipText }}</n-alert>
          <n-alert v-if="showGbDevWarn" type="warning" :show-icon="false" class="mt">{{ gbDevText }}</n-alert>
          <n-alert v-if="showStcDevWarn" type="warning" :show-icon="false" class="mt">
            存在单带缺量超过 8 dB 的频带，STC 评级受该频带限制。
          </n-alert>
        </div>

        <div class="card">
          <div class="card-head">
            <h3 class="card-title inline">隔声量频率特性</h3>
            <div class="field inline-field">
              <label class="f-label">参考曲线</label>
              <n-select v-model:value="refLine" :options="refOptions" size="small" />
            </div>
          </div>
          <div class="chart-wrap">
            <AudioChart
              v-if="result"
              :x="result.bands"
              :series="chartSeries"
              x-log
              :y-min="0"
              :y-ticks="5"
              :y-digits="0"
              :height="300"
            />
          </div>
          <div class="legend">
            <span><i style="background: #2563eb"></i>隔声量 R（dB）</span>
            <span><i style="background: #f59e0b"></i>GB 基准曲线（100–3150 Hz）</span>
            <span><i style="background: #10b981"></i>ASTM 轮廓线（125–4000 Hz）</span>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card hero">
          <div class="rc-title">隔声单值评价量（双标准对照）</div>
          <div class="dual-hero">
            <div class="hero-box">
              <div class="hb-label">GB/T 50121-2005</div>
              <div class="hero-rate">{{ rw ? rw.value : '—' }}</div>
              <div class="hb-sub">计权隔声量 Rw (dB)</div>
            </div>
            <div class="hero-box">
              <div class="hb-label">ASTM E413</div>
              <div class="hero-rate">{{ st ? st.value : '—' }}</div>
              <div class="hb-sub">隔声等级 STC</div>
            </div>
          </div>
          <div v-if="rw" class="sub mono">
            {{ rw.notation }}　·　Rw+C = {{ rw.rwPlusC }} dB　·　Rw+Ctr = {{ rw.rwPlusCtr }} dB
          </div>
          <div v-else-if="result && result.rw && result.rw.error" class="sub">{{ result.rw.error }}</div>
          <div class="sub">{{ verdict }}</div>
          <div class="stat-grid">
            <div v-for="s in stats" :key="s.label" class="stat">
              <div class="s-label">{{ s.label }}</div>
              <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
              <div v-if="s.sub" class="s-sub">{{ s.sub }}</div>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="f-label">对照国标限值 <span class="unit-tag">GB 50118-2010 / GB 55038-2025</span></label>
              <n-select v-model:value="reqId" :options="reqOptions" size="small" />
            </div>
          </div>
          <n-alert v-if="check" :type="check.pass ? 'success' : 'error'" :show-icon="false" class="mt">{{ checkText }}</n-alert>
          <n-alert v-else-if="result" type="warning" :show-icon="false" class="mt">
            缺少 100–3150 Hz 完整频带数据，无法按国标限值对照。
          </n-alert>

          <n-space :size="6" class="mt">
            <n-button size="small" @click="copySummary">复制摘要</n-button>
            <n-button size="small" @click="exportCsv">导出 CSV</n-button>
          </n-space>
        </div>

        <div class="card">
          <h3 class="card-title">逐带明细 <span class="hint">(两标准轮廓线与偏差)</span></h3>
          <div class="table-wrap">
            <table v-if="tableRows.length" class="detail-table">
              <caption>
                偏差判读：国标不利偏差之和须 ≤ {{ rw ? rw.limit : 32 }} dB；美标缺量之和 ≤ 32 dB 且单带 ≤ 8 dB
              </caption>
              <thead>
                <tr>
                  <th>1/3 倍频带</th>
                  <th>R (dB)</th>
                  <th>GB 基准 (Rw)</th>
                  <th>GB 不利偏差</th>
                  <th>ASTM 轮廓</th>
                  <th>STC 缺量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in tableRows" :key="r.f">
                  <td>{{ r.label }}</td>
                  <td>{{ r.level }}</td>
                  <td>{{ r.gbC }}</td>
                  <td :class="r.gbDClass">{{ r.gbDText }}</td>
                  <td>{{ r.stC }}</td>
                  <td :class="r.stDClass">{{ r.stDText }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="inline-note">请输入有效参数后查看逐带明细。</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card notes">
      <h3 class="card-title">计算方法</h3>
      <ul>
        <li><strong>质量定律</strong>：R = 20·lg(m·f) − 48（m 为面密度 kg/m²，f 为频率 Hz），适用于单层密实匀质构件在吻合频率以下的扩散场隔声估算，精度约 ±3 dB。</li>
        <li><strong>面密度</strong>：由材料密度与厚度换算（m = ρ·t）；也可直接在界面上手改，用于已知面密度的复合构件。</li>
        <li><strong>吻合频率</strong>：f_c = c₀²/(1.8·c_L·t)，c_L 为材料纵波声速。在 f_c 附近隔声量会出现明显谷值，质量定律不再适用，实测值往往显著低于质量定律预测值。</li>
        <li><strong>计权隔声量 Rw（GB/T 50121-2005）</strong>：在 100–3150 Hz 共 16 个 1/3 倍频带（或 125–2000 Hz 共 5 个倍频带）上，把表 3.1.2 的空气声隔声基准曲线 K<sub>i</sub>（500 Hz 处为 0 dB）逐 dB 平移，取满足「不利偏差之和 ≤ 32.0 dB（1/3 倍频程）／≤ 10.0 dB（倍频程）」的最大值，即为 Rw；国标采用 ISO 717-1:1996 方法，<em>不设</em> 8 dB 单带限值。</li>
        <li><strong>频谱修正量 C / C<sub>tr</sub>（GB/T 50121-2005 式 3.4.1）</strong>：C<sub>j</sub> = −10·lg Σ10^((L<sub>ij</sub> − X<sub>i</sub>)/10) − X<sub>w</sub>，其中 L<sub>ij</sub> 为表 3.1.3 的 A 计权频谱（总级归一化到 0 dB）。C 对应频谱 1（粉红噪声，以社会生活噪声为代表，中高频为主），C<sub>tr</sub> 对应频谱 2（交通噪声，中低频为主）。结果按 GB 表述为 Rw(C; C<sub>tr</sub>) = 45(−1; −5) dB，并给出 Rw+C、Rw+C<sub>tr</sub>。</li>
        <li><strong>隔声等级 STC（ASTM E413）</strong>：以 500 Hz 处为 0 dB、向低频每倍频程 −5 dB 的标准轮廓线，在 125–4000 Hz 共 16 个 1/3 倍频带上逐 dB 平移，取满足「缺量之和 ≤ 32 dB <em>且</em>任一频带缺量 ≤ 8 dB」的最大轮廓值。</li>
        <li><strong>两标准差异</strong>：频带范围不同（GB 100–3150 Hz，ASTM 125–4000 Hz），且 ASTM 多一条 8 dB 单带限值，因此同一构件常有 1–2 dB 差别；对低频敏感的构件（轻质墙、玻璃），国标因含 100 Hz 频带而更严格。工程上国内设计验收应以 Rw+C / Rw+C<sub>tr</sub> 表述。</li>
        <li><strong>国标限值对照</strong>：内置 GB 50118-2010《民用建筑隔声设计规范》与 GB 55038-2025《住宅项目规范》中构件类的空气声隔声要求，可直接判定是否达标并给出余量。注意：GB 55038-2025 对住宅分户构件的强制性指标为现场「计权标准化声压级差 D<sub>nT,w</sub>+C」（卧室分户墙/楼板 ≥ 50 dB），属房间之间的现场量，受侧向传声影响，一般比构件实验室 Rw+C 低 2–5 dB，不能直接等同。</li>
        <li><strong>双层构件</strong>：在总面密度质量定律基础上加 3 dB（两层解耦）并叠加空气层增益 12·lg(1 + D/50)，为常用经验估算式，用于方案比较；实际双层墙还需考虑层间声桥、空腔填充与板缝密封。</li>
        <li><strong>注意</strong>：本模块评价空气声隔声，对结构传声与撞击声（楼板 L<sub>n,w</sub>）不作评价；轨道交通、风机等以低频为主的噪声源，建议结合噪声评价与声屏障模块一并分析。</li>
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
.card-title.inline {
  margin: 0;
}
.hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--n-text-color-3);
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.inline-field {
  min-width: 180px;
  flex: 0 0 auto;
}

.mode-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.mode-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}
.stc-panel {
  margin-top: 4px;
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
  min-width: 140px;
  flex: 1 1 140px;
}
.f-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}
.unit-tag {
  font-size: 11px;
  opacity: 0.8;
}

.band-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(78px, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.band-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bc-label {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}

.inline-note {
  margin: 0;
  font-size: 12.5px;
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

.hero {
  border-color: color-mix(in srgb, var(--n-primary-color) 40%, var(--n-border-color));
}
.rc-title {
  font-size: 13px;
  color: var(--n-text-color-3);
}
.dual-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 8px 0;
}
.hero-box {
  padding: 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
}
.hb-label {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}
.hero-rate {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--n-primary-color);
}
.hb-sub {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}
.sub {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  margin-bottom: 8px;
}
.sub.mono {
  font-variant-numeric: tabular-nums;
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
  font-size: 17px;
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
.detail-table caption {
  margin-bottom: 8px;
  font-size: 11.5px;
  color: var(--n-text-color-3);
  text-align: left;
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
.detail-table td.bad {
  color: #d03050;
}
.detail-table td.mut {
  color: var(--n-text-color-3);
}

.mt {
  margin-top: 12px;
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
