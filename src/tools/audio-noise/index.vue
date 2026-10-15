<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NInputNumber, NRadio, NRadioGroup, NSelect } from 'naive-ui';
import { useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import AudioChart from '../../audio/AudioChart.vue';
import Acoustics from '../../audio/kernel/acoustics.js';

interface DevItem {
  band: number;
  ref: number;
  dev: number;
}
interface ARating {
  LA: number | null;
  Llin: number | null;
  sil: number | null;
  contributions: (number | null)[];
}
interface CurveRating {
  value: number | null;
  designation: number | null;
  controllingBand: number | null;
}
interface RcDetail {
  band: number;
  excess: number;
  limit: number;
}
interface RcResult {
  rc: number | null;
  lmf: number | null;
  classification: string;
  ref: (number | null)[];
  details: RcDetail[];
  rv: boolean;
  rvLevel: string;
  rvBands: number[];
  sdl: number | null;
  sdm: number | null;
  sdh: number | null;
  qai: number | null;
  qaiComplete: boolean;
}
interface LowCheck {
  base: number | null;
  curveIndex: number | null;
  devs: DevItem[];
  worst: number | null;
  verdict: 'ok' | 'possible' | 'likely' | 'na';
}
interface Band16 {
  band: number;
  ref: number;
  dev: number;
}
interface CalcResult {
  raw: (number | null)[];
  levels: (number | null)[];
  a: ARating;
  nc: CurveRating;
  nr: CurveRating;
  rc: RcResult;
  lowCheck: LowCheck;
  b16: Band16 | null;
  missing: number;
}
interface RoomTarget {
  id: string;
  name: string;
  nc: number[];
  rc: number[];
  note: string;
}
interface JudgeItem {
  value: number | null;
  target: number[];
  status: 'pass' | 'fail' | 'na';
  margin: number | null;
}
interface EvalResult {
  nc: JudgeItem;
  rc: JudgeItem;
  overall: 'pass' | 'fail' | 'na';
  basedOn: string;
}

const BANDS = Acoustics.BANDS as number[];
const THIRD_BANDS = Acoustics.THIRD_BANDS as number[];
const NC_BANDS = Acoustics.NC_BANDS as number[];
const NR_BANDS = Acoustics.NR_BANDS as number[];
const ROOM_TARGETS = Acoustics.ROOM_TARGETS as RoomTarget[];
const RC_CLASS_LABEL = Acoustics.RC_CLASS_LABEL as Record<string, string>;

// 示例倍频程频谱（16, 31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000）
const SAMPLES = [
  { name: '典型办公室实测', levels: [null, 58, 52, 45, 40, 36, 33, 30, 28, 26] },
  { name: '安静卧室', levels: [52, 55, 46, 38, 31, 27, 24, 22, 20, 18] },
  { name: '会议室', levels: [55, 57, 48, 41, 35, 31, 29, 28, 27, 25] },
  { name: '中性频谱（N 判定示例）', levels: [55, 55, 50, 45, 40, 35, 30, 25, 20, 15] },
  { name: '低频隆隆（R / RV 示例）', levels: [72, 70, 62, 55, 52, 36, 30, 25, 20, 15] },
  { name: '高频嘶声（H 示例）', levels: [55, 50, 45, 40, 35, 35, 35, 30, 28, 26] },
];
const DEFAULT_ROOM = 'private';
const RC_ORDER = [500, 250, 125, 63, 31.5, 16, 1000, 2000, 4000];

/* ---------------- 状态 ---------------- */
const mode = ref<'octave' | 'third'>('octave');
const levels = ref<(number | null)[]>(SAMPLES[0].levels.slice());
const roomId = ref(DEFAULT_ROOM);
const samplePick = ref('');
const avgInput = ref('');
const avgMsg = ref('');

const message = useMessage();
const copy = useCopy();

/* ---------------- 格式化 ---------------- */
function num(v: number | null | undefined, d = 1): string {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}
function signed(v: number | null | undefined, d = 1): string {
  return v == null || Number.isNaN(v) ? '—' : (v >= 0 ? '+' : '') + Number(v).toFixed(d);
}
function finite(v: number | null | undefined): number | null {
  return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
}
function bandLabel(f: number): string {
  return f >= 1000 ? f / 1000 + 'k' : String(f);
}

/* ---------------- 频带 ---------------- */
const bands = computed<number[]>(() => (mode.value === 'third' ? THIRD_BANDS : BANDS));
const bandHint = computed(() =>
  mode.value === 'third'
    ? '(dB，1/3 倍频程 16 Hz–10 kHz 共 29 带)'
    : '(dB，1/1 倍频程 16 Hz–8 kHz 共 10 带)'
);

// 由倍频程频谱估算 1/3 倍频程频谱（能量均分，便于演示与自检）
function octaveToThird(oct: (number | null)[]): (number | null)[] {
  return THIRD_BANDS.map(function (f3: number) {
    let fo: number | null = null;
    for (let i = 0; i < BANDS.length; i++) {
      const f = BANDS[i];
      if (f3 >= f / Math.SQRT2 && f3 <= f * Math.SQRT2) {
        fo = f;
        break;
      }
    }
    if (fo == null) return null;
    const v = oct[BANDS.indexOf(fo)];
    if (v == null) return null;
    const cnt = THIRD_BANDS.filter(function (x: number) {
      return x >= fo! / Math.SQRT2 && x <= fo! * Math.SQRT2;
    }).length;
    return v - 10 * Math.log10(cnt);
  });
}

function setMode(next: 'octave' | 'third') {
  if (next === mode.value) return;
  const cur = levels.value.slice();
  mode.value = next;
  // 切换时尽量保留已填数据：1/1 → 1/3 按能量均分展开；1/3 → 1/1 按内核合成
  levels.value = next === 'third' ? octaveToThird(cur) : Acoustics.thirdToOctave(cur).octave;
}

/* ---------------- 选项 ---------------- */
const sampleOptions = computed(() => [
  { label: '载入示例…', value: '' },
  ...SAMPLES.map((s, i) => ({ label: s.name, value: String(i) })),
]);
const roomOptions = computed(() =>
  ROOM_TARGETS.map((t) => ({ label: t.name + '（目标 NC ' + t.nc[0] + '–' + t.nc[1] + '）', value: t.id }))
);

function applySample(v: string) {
  samplePick.value = '';
  const i = parseInt(v, 10);
  if (!v || Number.isNaN(i)) return;
  levels.value =
    mode.value === 'third' ? octaveToThird(SAMPLES[i].levels) : SAMPLES[i].levels.slice();
}

function clearAll() {
  levels.value = bands.value.map(() => null);
  avgMsg.value = '';
}

/* ---------------- 计算 ---------------- */
const hasData = computed(() =>
  levels.value.some((v) => v != null && !Number.isNaN(Number(v)))
);
const synth = computed(() =>
  mode.value === 'third' ? Acoustics.thirdToOctave(levels.value) : null
);
const octLevels = computed<(number | null)[]>(() => {
  if (mode.value !== 'third') return levels.value;
  return synth.value ? (synth.value.octave as (number | null)[]) : BANDS.map(() => null);
});
const missing = computed(() => (synth.value ? (synth.value.missingBands as number) : 0));
const modeNote = computed(() => {
  if (!hasData.value || mode.value !== 'third') return '';
  return missing.value
    ? '1/3 倍频程已合成倍频程；其中 ' + missing.value + ' 个倍频带因数据缺失未参与评价。'
    : '1/3 倍频程已按各带能量合成为倍频程，再按 S12.2 评价（该标准各评价量本身为倍频程量）。';
});

const result = computed<CalcResult | null>(() => {
  if (!hasData.value) return null;
  const raw = levels.value.slice();
  const lo = octLevels.value.slice();
  // LA 用实际输入频谱（1/3 模式用 1/3 谱更准确）；SIL 按定义用倍频带值
  const aRaw = Acoustics.aWeighted(raw, bands.value) as ARating;
  const aOct = Acoustics.aWeighted(lo, BANDS) as ARating;
  const a: ARating = {
    LA: aRaw.LA,
    Llin: aRaw.Llin,
    sil: aOct.sil,
    contributions: aRaw.contributions,
  };
  const nc = Acoustics.ncRating(lo) as CurveRating;
  const nr = Acoustics.nrRating(lo) as CurveRating;
  const rc = Acoustics.rcRating(lo) as RcResult;
  const lowCheck = Acoustics.ncLowFrequencyCheck(lo, a.sil, nc.value) as LowCheck;
  const b16 = Acoustics.ncBand16Check(lo, a.sil, nc.value) as Band16 | null;
  return { raw, levels: lo, a, nc, nr, rc, lowCheck, b16, missing: missing.value };
});

/* NC 低频一致性文案 */
const lowText: Record<string, string> = {
  ok: '低频与 NC(SIL) 曲线一致',
  possible: '低频可能引起严重不满',
  likely: '低频很可能引起严重不满',
};
const lowInfo = computed(() => {
  const r = result.value;
  if (!r || !r.lowCheck || r.lowCheck.verdict === 'na') return null;
  let worst: DevItem | null = null;
  r.lowCheck.devs.forEach((d) => {
    if (worst == null || d.dev > worst.dev) worst = d;
  });
  const extra =
    r.lowCheck.verdict !== 'ok' && worst
      ? '（' + worst.band + ' Hz 超出 ' + num(worst.dev) + ' dB）'
      : '';
  return {
    cls: r.lowCheck.verdict === 'ok' ? 'ok' : 'warn',
    text: lowText[r.lowCheck.verdict] + extra,
    b16: r.b16
      ? '16 Hz：实测 ' + num(r.b16.dev + r.b16.ref) + ' dB，曲线参考 ' + num(r.b16.ref) +
        ' dB，偏差 ' + signed(r.b16.dev) + ' dB'
      : '',
  };
});

/* QAI / RV */
const rcValue = computed<number | null>(() => (result.value ? finite(result.value.rc.rc) : null));
const qaiInfo = computed(() => {
  const r = result.value;
  if (!r || r.rc.qai == null) return null;
  const q = r.rc.qai as number;
  const balance = q <= 5 ? '频谱均衡' : q <= 10 ? '略有失衡' : '明显失衡';
  const rvText: Record<string, string> = {
    none: '未见振动/颤振风险',
    moderate: '存在中等振动/颤振风险',
    clear: '明确振动/颤振风险',
  };
  return {
    qai: num(q),
    balance,
    incomplete: !r.rc.qaiComplete,
    sd: 'SD 低 ' + num(r.rc.sdl) + ' / 中 ' + num(r.rc.sdm) + ' / 高 ' + num(r.rc.sdh) + ' dB',
    rvText: rvText[r.rc.rvLevel] || rvText.none,
    rvWarn: r.rc.rvLevel !== 'none',
    rvBands: (r.rc.rvBands || []).join(' / '),
  };
});

const rcRows = computed(() => {
  const r = result.value;
  if (!r) return [];
  const out: { f: number; excess: string; limit: number; over: boolean }[] = [];
  RC_ORDER.forEach((f) => {
    let d: RcDetail | null = null;
    r.rc.details.forEach((x) => {
      if (x.band === f) d = x;
    });
    if (!d) return;
    out.push({ f, excess: signed(d.excess), limit: d.limit, over: d.excess > d.limit });
  });
  return out;
});

/* 房间目标值对照 */
const target = computed<RoomTarget>(
  () => (Acoustics.findTarget(roomId.value) as RoomTarget) || ROOM_TARGETS[0]
);
const ev = computed<EvalResult | null>(() =>
  result.value
    ? (Acoustics.evaluateTarget(target.value, {
        nc: result.value.nc.value,
        rc: rcValue.value,
      }) as EvalResult)
    : null
);
const verdictText: Record<string, string> = { pass: '✔ 达标', fail: '✘ 超标', na: '数据不足' };

/* ---------------- 多测点能量平均 ---------------- */
function applyAverage() {
  const rowsIn = (avgInput.value || '')
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .split(/[\s,;\t]+/)
        .filter((s) => s !== '')
        .map((s) => parseFloat(s))
        .filter((v) => !Number.isNaN(v))
    )
    .filter((r) => r.length > 0);

  if (!rowsIn.length) {
    avgMsg.value = '请先粘贴频谱数据';
    return;
  }
  const n = bands.value.length;
  const bad = rowsIn.some((r) => r.length !== n);
  if (bad) {
    avgMsg.value = '每行需 ' + n + ' 个数（当前为 ' + (mode.value === 'third' ? '1/3' : '1/1') + ' 倍频程模式）';
    return;
  }
  levels.value = Acoustics.energyAverage(rowsIn, n) as (number | null)[];
  avgMsg.value = '已按 ' + rowsIn.length + ' 个测点能量平均';
}

/* ---------------- 图表 ---------------- */
// 绘图用：相邻倍频带之间按对数频率线性插值（仅影响曲线显示，不改变评价结果）
function curveAt(table: unknown[], tableBands: number[], n: number | null, f: number): number | null {
  if (n == null) return null;
  const vals = tableBands.map((bf) => Acoustics.curveValue(table, tableBands.indexOf(bf), n) as number);
  const i = tableBands.indexOf(f);
  if (i >= 0) return vals[i];
  for (let j = 0; j < tableBands.length - 1; j++) {
    if (f > tableBands[j] && f < tableBands[j + 1]) {
      const t =
        (Math.log(f) - Math.log(tableBands[j])) /
        (Math.log(tableBands[j + 1]) - Math.log(tableBands[j]));
      return vals[j] + (vals[j + 1] - vals[j]) * t;
    }
  }
  return f < tableBands[0] ? vals[0] : vals[vals.length - 1];
}

const chartX = computed<number[]>(() => bands.value.slice());

const chartSeries = computed<any[]>(() => {
  const r = result.value;
  if (!r) return [];
  const fs = chartX.value;
  const out: any[] = [];
  const nc = r.nc.value;
  const nr = r.nr.value;
  const c = rcValue.value;
  if (c != null) {
    out.push({
      name: 'RC 曲线',
      color: '#8b5cf6',
      values: fs.map((f) => Acoustics.rcCurve(c, f)),
      dash: [6, 4],
      width: 1.6,
    });
  }
  if (nc != null && Number.isFinite(nc)) {
    out.push({
      name: 'NC 曲线',
      color: '#f59e0b',
      values: fs.map((f) => curveAt(Acoustics.NC_TABLE, NC_BANDS, nc, f)),
      dash: [6, 4],
      width: 1.6,
    });
  }
  if (nr != null && Number.isFinite(nr)) {
    out.push({
      name: 'NR 曲线',
      color: '#10b981',
      values: fs.map((f) => curveAt(Acoustics.NR_TABLE, NR_BANDS, nr, f)),
      dash: [6, 4],
      width: 1.6,
    });
  }
  out.push({
    name: mode.value === 'third' ? '实测 1/3 谱' : '实测频谱',
    color: '#2563eb',
    values: r.raw.slice(),
    width: 2.2,
    radius: mode.value === 'third' ? 2 : 3.2,
    points: true,
  });
  return out;
});

const chartMax = computed(() => {
  let mx = 80;
  chartSeries.value.forEach((s) => {
    (s.values as (number | null)[]).forEach((v) => {
      if (v != null && Number.isFinite(v) && v > mx) mx = v;
    });
  });
  return Math.max(100, Math.ceil((mx + 5) / 10) * 10);
});

/* ---------------- 导出 ---------------- */
function summaryText(): string {
  const r = result.value;
  if (!r) return '';
  const out: string[] = [];
  out.push('声学计算器 · 结果摘要');
  out.push('输入模式：' + (mode.value === 'third' ? '1/3 倍频程' : '1/1 倍频程'));
  out.push(
    '测量频谱 (dB)：' +
      bands.value
        .map((f, i) => f + 'Hz=' + (r.raw[i] == null ? '—' : r.raw[i]))
        .join(', ')
  );
  if (mode.value === 'third') {
    out.push(
      '合成倍频程 (dB)：' +
        BANDS.map((f, i) => f + 'Hz=' + (r.levels[i] == null ? '—' : num(r.levels[i]))).join(', ')
    );
  }
  out.push(
    'A 声级：' + num(r.a.LA) + ' dBA（线性 ' + num(r.a.Llin) + ' dB，SIL ' + num(r.a.sil) + ' dB）'
  );
  out.push(
    'NC：' + num(r.nc.value) + '（NC-' + r.nc.designation + '，控制带 ' +
      (r.nc.controllingBand != null ? r.nc.controllingBand + 'Hz' : '—') + '）'
  );
  if (r.lowCheck && r.lowCheck.verdict !== 'na') {
    out.push(
      'NC 低频一致性：' + r.lowCheck.verdict + '（最大超出 ' + num(r.lowCheck.worst) + ' dB）'
    );
  }
  out.push(
    'NR：' + num(r.nr.value) + '（NR-' + r.nr.designation + '，控制带 ' +
      (r.nr.controllingBand != null ? r.nr.controllingBand + 'Hz' : '—') + '）'
  );
  out.push('RC：' + r.rc.rc + ' (' + r.rc.classification + ')，LMF ' + num(r.rc.lmf) + ' dB');
  out.push(
    'QAI：' + num(r.rc.qai) + ' dB' + (r.rc.qaiComplete ? '' : '（频带不完整）') +
      '；SD 低/中/高 ' + num(r.rc.sdl) + '/' + num(r.rc.sdm) + '/' + num(r.rc.sdh) + ' dB'
  );
  out.push(
    'RV：' + r.rc.rvLevel + (r.rc.rvBands.length ? '（' + r.rc.rvBands.join('/') + 'Hz）' : '')
  );
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

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv() {
  const r = result.value;
  if (!r) {
    message.warning('暂无可导出结果');
    return;
  }
  const rows: (string | number)[][] = [];
  rows.push(['声学计算器结果', '', '']);
  rows.push(['输入模式', mode.value === 'third' ? '1/3 倍频程' : '1/1 倍频程', '']);
  rows.push(['项目', '值', '单位/备注']);
  rows.push(['A 声级', num(r.a.LA, 2), 'dBA']);
  rows.push(['线性声级', num(r.a.Llin, 2), 'dB']);
  rows.push(['SIL', num(r.a.sil, 2), 'dB']);
  rows.push([
    'NC',
    num(r.nc.value, 2),
    'NC-' + r.nc.designation + '，控制带 ' + (r.nc.controllingBand || '') + ' Hz',
  ]);
  rows.push([
    'NC 低频一致性',
    (r.lowCheck && r.lowCheck.verdict) || '',
    '最大超出 ' + num(r.lowCheck && r.lowCheck.worst, 2) + ' dB',
  ]);
  rows.push(['NR', num(r.nr.value, 2), 'NR-' + r.nr.designation]);
  rows.push(['RC', r.rc.rc == null ? '' : r.rc.rc, 'RC ' + r.rc.classification + '，LMF ' + num(r.rc.lmf, 2)]);
  rows.push([
    'QAI',
    num(r.rc.qai, 2),
    'SD 低/中/高 ' + num(r.rc.sdl, 2) + '/' + num(r.rc.sdm, 2) + '/' + num(r.rc.sdh, 2),
  ]);
  rows.push(['RV', r.rc.rvLevel, (r.rc.rvBands || []).join('/') + ' Hz']);
  rows.push([]);
  if (mode.value === 'third') {
    rows.push(['1/3 倍频程输入 (Hz)', '实测 (dB)', '']);
    THIRD_BANDS.forEach((f, i) => {
      rows.push([f, r.raw[i] == null ? '' : String(r.raw[i]), '']);
    });
    rows.push([]);
  }
  rows.push(['倍频程频率 (Hz)', '实测 (dB)', 'RC 参考 (dB)', '超出 (dB)']);
  BANDS.forEach((f, i) => {
    const v = r.levels[i];
    rows.push([f, v == null ? '' : v, num(r.rc.ref[i], 2), v == null ? '' : num(v - r.rc.ref[i], 2)]);
  });
  const csv =
    '\ufeff' +
    rows
      .map((row) => row.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
  download('noise-result.csv', csv);
}
</script>

<template>
  <ToolPage
    title="📊 背景噪声评价"
    description="输入倍频带声压级，得到 A 声级、NC、NR、RC Mark II 评价结果与房间目标值对照"
  >
    <div class="card">
      <div class="mode-row">
        <span class="mode-label">输入模式</span>
        <n-radio-group
          :value="mode"
          size="small"
          @update:value="(v: string) => setMode(v as 'octave' | 'third')"
        >
          <n-radio value="octave">1/1 倍频程</n-radio>
          <n-radio value="third">1/3 倍频程</n-radio>
        </n-radio-group>
      </div>
      <h3 class="card-title">倍频带声压级输入 <span class="hint">{{ bandHint }}</span></h3>
      <div class="band-grid" :class="{ third: mode === 'third' }">
        <div v-for="(f, i) in bands" :key="f" class="band-cell" :class="{ 'low-band': f === 16 }">
          <label class="b-label" :title="f + ' Hz'">{{ bandLabel(f) }}</label>
          <n-input-number v-model:value="levels[i]" :step="0.1" size="tiny" placeholder="dB" />
        </div>
      </div>
      <div class="btn-row">
        <span class="sample-wrap">
          <n-select
            :value="samplePick"
            :options="sampleOptions"
            size="small"
            class="sample-select"
            @update:value="(v: string) => applySample(v)"
          />
        </span>
        <n-button size="small" quaternary @click="clearAll">清空</n-button>
      </div>
      <p v-if="modeNote" class="mode-note">{{ modeNote }}</p>

      <details class="aux">
        <summary>多测点能量平均</summary>
        <p class="aux-hint">
          每行粘贴一条完整频谱的数值（当前模式对应 10 个倍频带或 29 个 1/3 倍频带，空格或逗号分隔），求各带能量平均后填入上方输入框。
        </p>
        <textarea
          v-model="avgInput"
          rows="4"
          class="avg-input"
          placeholder="例（1/1 倍频程，16–8000 Hz）：
54 58 52 45 40 36 33 30 28 26
53 57 51 44 39 35 32 29 27 25"
        ></textarea>
        <div class="btn-row">
          <n-button size="small" @click="applyAverage">平均并填入</n-button>
          <span class="aux-msg">{{ avgMsg }}</span>
        </div>
      </details>
    </div>

    <div v-if="result" class="results">
      <div class="result-card">
        <div class="rc-title">A 声级</div>
        <div class="big">{{ num(result.a.LA) }}<span class="unit">dBA</span></div>
        <div class="sub">
          线性(未计权) {{ num(result.a.Llin) }} dB · SIL {{ num(result.a.sil) }} dB
        </div>
      </div>

      <div class="result-card">
        <div class="rc-title">NC 噪声标准曲线</div>
        <div class="big">NC {{ num(result.nc.value) }}</div>
        <div class="sub">
          标准标号 NC-{{ result.nc.designation != null ? result.nc.designation : '—' }} · 控制带
          {{ result.nc.controllingBand != null ? result.nc.controllingBand + ' Hz' : '—' }}
        </div>
        <div v-if="lowInfo" class="sub" :class="lowInfo.cls">低频一致性：{{ lowInfo.text }}</div>
        <div v-if="lowInfo && lowInfo.b16" class="mini">{{ lowInfo.b16 }}</div>
      </div>

      <div class="result-card">
        <div class="rc-title">NR 噪声评价曲线</div>
        <div class="big">NR {{ num(result.nr.value) }}</div>
        <div class="sub">
          标准标号 NR-{{ result.nr.designation != null ? result.nr.designation : '—' }} · 控制带
          {{ result.nr.controllingBand != null ? result.nr.controllingBand + ' Hz' : '—' }}
        </div>
      </div>

      <div class="result-card">
        <div class="rc-title">RC 房间标准曲线</div>
        <div class="big">
          RC {{ rcValue != null ? rcValue : '—' }} ({{ result.rc.classification }})
        </div>
        <div class="sub">
          {{ RC_CLASS_LABEL[result.rc.classification] || '' }} · LMF
          {{ num(result.rc.lmf) }} dB
        </div>
        <div v-if="qaiInfo" class="sub">
          QAI {{ qaiInfo.qai }}（{{ qaiInfo.balance }}）<template v-if="qaiInfo.incomplete"> · 频带不完整</template>
          <div class="mini">{{ qaiInfo.sd }}</div>
        </div>
        <div v-if="qaiInfo" class="sub" :class="qaiInfo.rvWarn ? 'warn' : ''">
          RV：{{ qaiInfo.rvText
          }}<template v-if="qaiInfo.rvWarn && qaiInfo.rvBands">（{{ qaiInfo.rvBands }} Hz）</template>
        </div>
        <table v-if="rcRows.length" class="detail-table">
          <thead>
            <tr>
              <th>频带</th>
              <th>超出参考</th>
              <th>限值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in rcRows" :key="d.f">
              <td>{{ d.f }} Hz</td>
              <td :class="{ over: d.over }">{{ d.excess }}</td>
              <td>{{ d.limit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else class="card">
      <p class="inline-note">请输入至少一个频带的声压级（dB），结果将自动计算。</p>
    </div>

    <div v-if="result" class="btn-row plain">
      <n-button size="small" @click="copySummary">复制结果摘要</n-button>
      <n-button size="small" @click="exportCsv">导出 CSV</n-button>
    </div>

    <div class="card">
      <h3 class="card-title">房间目标值对照 <span class="hint">(选用途，自动判定达标)</span></h3>
      <div class="field-row">
        <div class="field">
          <label class="f-label">房间用途</label>
          <n-select v-model:value="roomId" :options="roomOptions" size="small" />
        </div>
      </div>
      <div v-if="ev" class="target-result">
        <div class="verdict" :class="ev.overall">
          {{ verdictText[ev.overall] }}（以 {{ ev.basedOn }} 判定）
        </div>
        <div class="target-item" :class="ev.nc.status">
          <div class="t-label">NC 目标（目标 {{ ev.nc.target[0] }}–{{ ev.nc.target[1] }}）</div>
          <div class="t-value">{{ ev.nc.value == null ? '—' : num(ev.nc.value, 1) }}</div>
          <div class="t-sub">
            {{
              ev.nc.status === 'na'
                ? '未测得该指标'
                : ev.nc.status === 'pass'
                  ? '目标 ≤ ' + ev.nc.target[1]
                  : '超出 ' + num(ev.nc.margin) + '（目标 ≤ ' + ev.nc.target[1] + '）'
            }}
          </div>
        </div>
        <div class="target-item" :class="ev.rc.status">
          <div class="t-label">RC 目标（目标 {{ ev.rc.target[0] }}–{{ ev.rc.target[1] }}）</div>
          <div class="t-value">{{ ev.rc.value == null ? '—' : num(ev.rc.value, 0) }}</div>
          <div class="t-sub">
            {{
              ev.rc.status === 'na'
                ? '未测得该指标'
                : ev.rc.status === 'pass'
                  ? '目标 ≤ ' + ev.rc.target[1]
                  : '超出 ' + num(ev.rc.margin) + '（目标 ≤ ' + ev.rc.target[1] + '）'
            }}
          </div>
        </div>
        <div class="target-note">
          判定标准：实测值 ≤ 目标上限即达标。<template v-if="target.note">该用途备注：{{ target.note }}。</template>目标值仅供工程参考，正式验收以合同/规范要求为准。
        </div>
      </div>
      <p v-else class="inline-note">请输入频谱后查看目标值对照结果。</p>
    </div>

    <div class="card">
      <h3 class="card-title">频谱与标准曲线对比</h3>
      <div class="chart-wrap">
        <AudioChart
          :x="chartX"
          :series="chartSeries"
          x-log
          :y-min="0"
          :y-max="chartMax"
          :y-ticks="5"
          :height="360"
          :x-label-fmt="bandLabel"
        />
      </div>
      <div class="legend">
        <span><i style="background: #2563eb"></i>{{ mode === 'third' ? '实测 1/3 谱' : '实测频谱' }}</span>
        <span><i style="background: #f59e0b"></i>NC 曲线</span>
        <span><i style="background: #10b981"></i>NR 曲线</span>
        <span><i style="background: #8b5cf6"></i>RC 曲线</span>
      </div>
    </div>

    <div class="card notes">
      <h3 class="card-title">计算方法</h3>
      <ul>
        <li><strong>A 声级</strong>：L<sub>A</sub> = 10·log₁₀ Σ 10<sup>(Lᵢ + Aᵢ)/10</sup>，Aᵢ 由 IEC 61672 解析式计算，支持任意 1/3 倍频带中心频率。</li>
        <li><strong>NC</strong>：ANSI/ASA S12.2-2019 切线插值法，逐带插值曲线指数取最大值（31.5–8000 Hz 共 9 带），控制带标出起决定作用的频带。</li>
        <li><strong>NC 低频一致性</strong>：以 NC(SIL) 曲线为基准比较 31.5/63/125/250 Hz，超出 6–9 dB 提示可能引起严重不满，&gt;9 dB 提示很可能引起（S12.2 频谱不平衡法）。</li>
        <li><strong>NR</strong>：ISO/R 1996 切线插值法，同理取各带最大 NR 指数。</li>
        <li><strong>RC Mark II</strong>：RC = round(均值(L₅₀₀, L₁₀₀₀, L₂₀₀₀))，参考曲线为以 1 kHz 为锚点、−5 dB/倍频程的直线，16/31.5 Hz 取 max(RC+25, 55)；≤500 Hz 超 5 dB 判 R，1000–4000 Hz 超 3 dB 判 H，否则 N。</li>
        <li><strong>QAI（品质评价指数）</strong>：SD<sub>低</sub>/SD<sub>中</sub>/SD<sub>高</sub> 分别为 16–63、125–500、1000–4000 Hz 三组偏差的能量平均，QAI = max(SD) − min(SD)，数值越小频谱越均衡（≤5 dB 通常视为均衡，为经验参考）。</li>
        <li><strong>RV（振动/颤振风险）</strong>：16/31.5 Hz ≥ 65 dB 或 63 Hz ≥ 70 dB 判中等风险，≥ 75/75/80 dB 判明确风险（ANSI/ASA S12.2-2019）。</li>
        <li><strong>1/3 倍频程</strong>：1/3 倍频程输入先按各带能量合成倍频程（每带取上下限 f/√2 ~ f·√2 内的 1/3 带求和），再按上述倍频程方法评价。</li>
        <li><strong>多测点能量平均</strong>：逐带 L̄ = 10·log₁₀( Σ10<sup>Lᵢ/10</sup> / n )，即功率平均（非算术平均）。</li>
        <li><strong>目标值对照</strong>：房间目标范围引自 ASHRAE Handbook HVAC Applications 常用 NC 推荐值，RC 取等价目标，判定以 NC 为主、RC 交叉参考。</li>
      </ul>
    </div>
  </ToolPage>
</template>

<style scoped>
.card {
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  background: var(--n-card-color);
  padding: 16px;
  margin-bottom: 16px;
}
.card:last-child {
  margin-bottom: 0;
}
.card-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
}
.hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--n-text-color-3);
}

.mode-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.mode-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}

.band-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(56px, 1fr));
  gap: 8px;
}
.band-grid.third {
  grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
}
.band-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.band-cell.low-band .b-label {
  color: var(--n-primary-color);
  font-weight: 600;
}
.b-label {
  font-size: 11px;
  color: var(--n-text-color-3);
  text-align: center;
}

.btn-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.btn-row.plain {
  margin-bottom: 16px;
}
.sample-wrap {
  min-width: 220px;
}
.mode-note {
  margin: 10px 0 0;
  font-size: 12.5px;
  color: var(--n-text-color-3);
}

.aux {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--n-border-color);
}
.aux summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.aux-hint {
  margin: 8px 0;
  font-size: 12.5px;
  color: var(--n-text-color-3);
}
.avg-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
  color: var(--n-text-color);
  font-family: inherit;
  font-size: 12.5px;
  resize: vertical;
}
.aux-msg {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.results {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.result-card {
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  background: var(--n-card-color);
  padding: 14px;
}
.rc-title {
  font-size: 12.5px;
  color: var(--n-text-color-3);
  margin-bottom: 6px;
}
.big {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--n-primary-color);
}
.big .unit {
  margin-left: 5px;
  font-size: 14px;
  font-weight: 500;
}
.sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--n-text-color-3);
}
.sub.ok {
  color: #18a058;
}
.sub.warn {
  color: #f0a020;
}
.mini {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--n-text-color-3);
}

.detail-table {
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;
  font-size: 12px;
}
.detail-table th,
.detail-table td {
  padding: 5px 7px;
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
.detail-table td.over {
  color: #f0a020;
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
  min-width: 220px;
  flex: 1 1 220px;
}
.f-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}

.target-result {
  margin-top: 12px;
}
.verdict {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
.verdict.pass {
  color: #18a058;
}
.verdict.fail {
  color: #d03050;
}
.verdict.na {
  color: var(--n-text-color-3);
}
.target-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
}
.target-item.pass {
  border-color: rgba(24, 160, 88, 0.5);
}
.target-item.fail {
  border-color: rgba(208, 48, 80, 0.5);
}
.t-label {
  font-size: 12px;
  color: var(--n-text-color-3);
}
.t-value {
  font-size: 19px;
  font-weight: 600;
}
.t-sub {
  font-size: 11.5px;
  color: var(--n-text-color-3);
}
.target-note {
  margin-top: 8px;
  font-size: 12px;
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

.inline-note {
  margin: 0;
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
  .band-grid {
    grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
  }
}
</style>
