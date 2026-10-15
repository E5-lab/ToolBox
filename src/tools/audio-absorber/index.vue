<script setup lang="ts">
import { computed, ref } from 'vue';
import { NAlert, NButton, NInputNumber, NSelect, NSpace } from 'naive-ui';
import { useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import AudioChart from '../../audio/AudioChart.vue';
import Absorber from '../../audio/kernel/absorber.js';

interface PointItem {
  ok?: boolean;
  f: number;
  X: number;
  valid: boolean;
  zcRatio: number;
  zcReal: number;
  zcImag: number;
  kRatio: number;
  attenuation: number;
  zsRatio: { re: number; im: number };
  zsAbs: number;
  alpha: number;
}
interface SpectrumResult {
  ok: boolean;
  error?: string;
  bands?: number[];
  points?: PointItem[];
  alphas?: number[];
  nrc?: number | null;
  invalidCount?: number;
  avg?: number;
  alpha500?: number | null;
}
interface ThicknessResult {
  thickness: number;
  X: number;
  valid: boolean;
}
interface Preset {
  id: string;
  name: string;
  sigma: number;
  note: string;
}

const BANDS = Absorber.BANDS as number[];
const PRESETS = Absorber.PRESETS as Preset[];

/* ---------------- 状态 ---------------- */
const preset = ref('glasswool-24');
const sigma = ref(9000);
const thickness = ref(50);
const airGap = ref(0);
const targetF = ref(500);
const recOut = ref<ThicknessResult | null>(null);

const message = useMessage();
const copy = useCopy();

const presetOptions = computed(() => [
  { label: '自定义流阻率…', value: '' },
  ...PRESETS.map((p) => ({ label: p.name + '（σ ≈ ' + p.sigma + '）', value: p.id })),
]);

function onPreset(v: string) {
  const found = PRESETS.find((p) => p.id === v);
  if (found) {
    sigma.value = found.sigma;
    recOut.value = null;
  }
}

/* ---------------- 格式化 ---------------- */
function num(v: number | null | undefined, d = 2): string {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}
function grouped(n: number, d: number): string {
  return Number(n).toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/* ---------------- 计算 ---------------- */
const inputOk = computed(() => sigma.value > 0 && thickness.value > 0 && airGap.value >= 0);

const spec = computed<SpectrumResult>(() => {
  if (!inputOk.value) return { ok: false };
  return Absorber.spectrum({
    sigma: sigma.value,
    thickness: thickness.value,
    airGap: airGap.value,
  }) as unknown as SpectrumResult;
});

const result = computed<SpectrumResult | null>(() => (spec.value.ok ? spec.value : null));

const nrcVal = computed(() => {
  const n = result.value ? result.value.nrc : null;
  return n == null ? 0 : n;
});

const grade = computed(() => {
  const n = nrcVal.value;
  if (n >= 0.8) return '强吸声';
  if (n >= 0.6) return '较好吸声';
  if (n >= 0.4) return '中等吸声';
  if (n >= 0.2) return '弱吸声';
  return '几乎不吸声';
});

const verdict = computed(() => {
  const s = result.value;
  if (!s) return '';
  return (
    grade.value +
    '（NRC ' +
    (s.nrc == null ? '—' : (s.nrc as number).toFixed(2)) +
    '）　材料：σ = ' +
    grouped(sigma.value, 0) +
    ' Pa·s/m²，d = ' +
    num(thickness.value, 0) +
    ' mm' +
    (airGap.value > 0 ? '，空腔 ' + num(airGap.value, 0) + ' mm' : '，贴刚性壁')
  );
});

const stats = computed(() => {
  const s = result.value;
  if (!s || !s.points) return [];
  const p500 = s.points[BANDS.indexOf(500)];
  const p1k = s.points[BANDS.indexOf(1000)];
  return [
    { label: 'α @500 Hz', value: num(p500.alpha, 2), unit: '', sub: '' },
    { label: 'α @1 kHz', value: num(p1k.alpha, 2), unit: '', sub: '' },
    { label: '全频平均 α', value: num(s.avg, 2), unit: '', sub: '' },
    { label: '特征阻抗 @500 Hz', value: num(p500.zcRatio, 2), unit: '× ρ₀c₀', sub: '|Zc|' },
  ];
});

const tableRows = computed(() => {
  const s = result.value;
  if (!s || !s.points || !s.bands) return [];
  return s.bands.map((f, i) => {
    const p = s.points![i];
    return {
      f,
      alpha: num(p.alpha, 3),
      X: num(p.X, 3),
      zc: num(p.zcRatio, 2),
      zs: num(p.zsAbs, 2),
      att: num(p.attenuation, 1),
      valid: p.valid,
    };
  });
});

const chartSeries = computed<any[]>(() => {
  const s = result.value;
  if (!s || !s.bands || !s.alphas) return [];
  return [
    {
      name: 'NRC',
      color: '#f97316',
      values: s.bands.map(() => s.nrc == null ? null : s.nrc),
      dash: [6, 4],
      width: 1.4,
      points: false,
    },
    { name: 'α', color: '#2563eb', values: s.alphas, width: 2.2, radius: 3.4, points: true },
  ];
});

/* ---------------- 适用性提示 ---------------- */
const showInvalidWarn = computed(() => {
  const s = result.value;
  return !!s && (s.invalidCount as number) > 0;
});
const showGood = computed(() => nrcVal.value >= 0.8);
const showThinTip = computed(() => {
  const s = result.value;
  return !!s && nrcVal.value < 0.4 && airGap.value === 0 && BANDS.indexOf(500) >= 0;
});

/* ---------------- 厚度建议 ---------------- */
function recommend() {
  const r = Absorber.recommendThickness(sigma.value, targetF.value, airGap.value) as unknown as
    | ThicknessResult
    | null;
  if (!r) {
    message.error('请输入有效的目标频率。');
    return;
  }
  recOut.value = r;
}

/* ---------------- 导出 ---------------- */
function summaryText(): string {
  const s = result.value;
  if (!s || !s.bands || !s.alphas || !s.points) return '';
  const out: string[] = [];
  out.push('多孔吸声材料阻抗 · 结果摘要');
  out.push(
    '流阻率 σ = ' +
      grouped(sigma.value, 0) +
      ' Pa·s/m²；厚度 d = ' +
      num(thickness.value, 0) +
      ' mm；空腔 D = ' +
      num(airGap.value, 0) +
      ' mm'
  );
  out.push('NRC = ' + (s.nrc == null ? '—' : (s.nrc as number).toFixed(2)) + '（250/500/1k/2k 平均）');
  out.push(
    '倍频带法向吸声系数：' +
      s.bands
        .map(function (f, i) {
          return f + 'Hz=' + (s.alphas as number[])[i].toFixed(2);
        })
        .join('，')
  );
  const p = s.points[3];
  out.push(
    '500 Hz：α = ' +
      p.alpha.toFixed(3) +
      '，|Zc|/ρ₀c₀ = ' +
      p.zcRatio.toFixed(2) +
      '，|Zs|/ρ₀c₀ = ' +
      p.zsAbs.toFixed(2)
  );
  out.push('工具：声学计算工具箱 · 多孔吸声材料阻抗');
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
  const s = result.value;
  if (!s || !s.bands || !s.points) {
    message.warning('暂无可导出结果');
    return;
  }
  const rows: (string | number)[][] = [];
  rows.push(['多孔吸声材料阻抗计算结果', '', '']);
  rows.push(['流阻率 σ (Pa·s/m²)', String(sigma.value), '']);
  rows.push(['厚度 (mm)', String(thickness.value), '']);
  rows.push(['空腔 (mm)', String(airGap.value), '']);
  rows.push(['NRC', s.nrc == null ? '' : (s.nrc as number).toFixed(2), '']);
  rows.push([]);
  rows.push(['频率 (Hz)', '吸声系数 α', 'X', '|Zc|/ρ0c0', '|Zs|/ρ0c0', '衰减 (Np/m)', '适用性']);
  s.bands.forEach(function (f, i) {
    const p = s.points![i];
    rows.push([
      f,
      p.alpha.toFixed(4),
      p.X.toFixed(4),
      p.zcRatio.toFixed(3),
      p.zsAbs.toFixed(3),
      p.attenuation.toFixed(2),
      p.valid ? '适用' : '超范围',
    ]);
  });
  const csv =
    '\ufeff' +
    rows
      .map(function (r) {
        return r
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
  a.download = 'absorber-result.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 1000);
}
</script>

<template>
  <ToolPage
    title="🧽 多孔吸声材料阻抗"
    description="由流阻率推算特征阻抗与表面阻抗，得到倍频带法向吸声系数（Delany–Bazley 模型）"
  >
    <div class="split">
      <div class="col">
        <div class="card">
          <h3 class="card-title"><span class="step">1</span> 材料参数</h3>
          <div class="field-row">
            <div class="field">
              <label class="f-label">材料预设</label>
              <n-select
                :value="preset"
                :options="presetOptions"
                size="small"
                @update:value="(v: string) => { preset = v; onPreset(v); }"
              />
            </div>
            <div class="field">
              <label class="f-label">流阻率 σ <span class="unit-tag">Pa·s/m²（rayl/m）</span></label>
              <n-input-number v-model:value="sigma" :min="200" :step="500" size="small" />
            </div>
            <div class="field">
              <label class="f-label">材料厚度 d <span class="unit-tag">mm</span></label>
              <n-input-number v-model:value="thickness" :min="1" :step="5" size="small" />
            </div>
            <div class="field">
              <label class="f-label">背后空腔 D <span class="unit-tag">mm（0 = 贴刚性壁）</span></label>
              <n-input-number v-model:value="airGap" :min="0" :step="10" size="small" />
            </div>
          </div>
          <n-alert v-if="!inputOk" type="error" :show-icon="false" class="mt">
            请输入有效的流阻率（> 0）与材料厚度（> 0）。
          </n-alert>
          <template v-else>
            <n-alert v-if="showInvalidWarn" type="warning" :show-icon="false" class="mt">
              有 {{ result.invalidCount }} 个频带的 X = ρ₀f/σ 超出 Delany–Bazley 适用范围（0.01–1），这些频带结果仅供数量级参考。
            </n-alert>
            <n-alert v-if="showGood" type="success" :show-icon="false" class="mt">
              该构造吸声性能良好，可用于控制中高频混响与噪声。
            </n-alert>
            <n-alert v-if="showThinTip" type="info" :show-icon="false" class="mt">
              贴刚性壁且较薄时中低频吸声偏弱，可尝试增加厚度或预留空腔（空腔等效于增加厚度）。
            </n-alert>
          </template>
        </div>

        <div class="card">
          <h3 class="card-title">吸声系数频率特性</h3>
          <div class="chart-wrap">
            <AudioChart
              :x="BANDS"
              :series="chartSeries"
              x-log
              :y-min="0"
              :y-max="1"
              :y-ticks="5"
              :y-digits="1"
              :height="300"
            />
          </div>
          <div class="legend">
            <span><i style="background: #2563eb"></i>法向入射吸声系数 α</span>
            <span><i style="background: #f97316"></i>NRC 中频均值</span>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card hero">
          <div class="rc-title">降噪系数 NRC</div>
          <div class="hero-rate">
            <span>{{ result && result.nrc != null ? result.nrc.toFixed(2) : '—' }}</span>
            <span class="unit">NRC</span>
          </div>
          <div class="sub">{{ verdict }}</div>
          <div class="stat-grid">
            <div v-for="s in stats" :key="s.label" class="stat">
              <div class="s-label">{{ s.label }}</div>
              <div class="s-value">{{ s.value }}<small>{{ s.unit }}</small></div>
              <div v-if="s.sub" class="s-sub">{{ s.sub }}</div>
            </div>
          </div>
          <n-space :size="6">
            <n-button size="small" @click="copySummary">复制摘要</n-button>
            <n-button size="small" @click="exportCsv">导出 CSV</n-button>
          </n-space>
        </div>

        <div class="card">
          <h3 class="card-title">倍频带明细 <span class="hint">(阻抗已对 ρ₀c₀ 归一化)</span></h3>
          <div class="table-wrap">
            <table v-if="tableRows.length" class="detail-table">
              <thead>
                <tr>
                  <th>频带</th>
                  <th>α（法向）</th>
                  <th>X = ρ₀f/σ</th>
                  <th>|Zc|/ρ₀c₀</th>
                  <th>|Zs|/ρ₀c₀</th>
                  <th>衰减 Np/m</th>
                  <th>模型适用性</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in tableRows" :key="r.f">
                  <td>{{ r.f }} Hz</td>
                  <td>{{ r.alpha }}</td>
                  <td>{{ r.X }}</td>
                  <td>{{ r.zc }}</td>
                  <td>{{ r.zs }}</td>
                  <td>{{ r.att }}</td>
                  <td :class="r.valid ? 'ok' : 'warn'">{{ r.valid ? '适用' : '超范围' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="inline-note">请输入有效参数后查看倍频带明细。</p>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">厚度建议 <span class="hint">(按目标频率的 1/4 波长)</span></h3>
          <div class="field-row">
            <div class="field">
              <label class="f-label">目标吸声频率 <span class="unit-tag">Hz</span></label>
              <n-input-number v-model:value="targetF" :min="50" :step="10" size="small" />
            </div>
            <div class="field field-auto">
              <n-button size="small" @click="recommend">给出建议厚度</n-button>
            </div>
          </div>
          <div v-if="recOut" class="kv-result">
            <div class="kv">
              <div class="k">建议材料厚度</div>
              <div class="v">{{ num(recOut.thickness, 0) }}<small>mm</small></div>
              <div class="s-sub mini">目标 {{ num(targetF, 0) }} Hz 附近形成吸声峰</div>
            </div>
            <div class="kv">
              <div class="k">该频率 X 值</div>
              <div class="v">{{ num(recOut.X, 3) }}</div>
              <div class="s-sub mini">{{ recOut.valid ? '在适用范围内' : '超出适用范围，仅供参考' }}</div>
            </div>
            <n-alert type="info" :show-icon="false" class="full">
              估算按 1/4 波长共振条件给出：厚度越接近目标频率的 λ/4（含空腔等效深度），该频段吸声越强。实际以阻抗管或混响室实测为准。
            </n-alert>
          </div>
        </div>
      </div>
    </div>

    <div class="card notes">
      <h3 class="card-title">计算方法</h3>
      <ul>
        <li><strong>参数</strong>：X = ρ₀f / σ，σ 为流阻率（Pa·s/m²），空气密度 ρ₀ = 1.2 kg/m³、声速 c₀ = 343 m/s。</li>
        <li>
          <strong>特征阻抗</strong>：Zc/(ρ₀c₀) = 1 + 0.0571X<sup>−0.754</sup> − j0.087X<sup>−0.732</sup>；<strong>复波数</strong>：k/k₀
          = 1 + 0.0978X<sup>−0.700</sup> − j0.189X<sup>−0.595</sup>（Delany–Bazley 经验模型，Bies &amp; Hansen 系数）。
        </li>
        <li>
          <strong>表面阻抗</strong>：刚性背衬 Zs = Zc·coth(γd)；带空腔时按空气层阻抗 Z<sub>gap</sub> = −jρ₀c₀cot(k₀D)
          做层状介质传递，γ = jk。
        </li>
        <li>
          <strong>吸声系数</strong>：法向入射 α = 1 − |(Zs − ρ₀c₀)/(Zs + ρ₀c₀)|²，即阻抗管（驻波管）测得的量；扩散场（混响室）吸声系数通常高于此值。
        </li>
        <li><strong>NRC</strong>：250 / 500 / 1000 / 2000 Hz 四个倍频带吸声系数的算术平均，按 0.05 取整。</li>
        <li><strong>适用范围</strong>：0.01 ≤ X ≤ 1。超出范围时结果仅供数量级参考（本页会给出提示）。</li>
        <li>
          <strong>厚度建议</strong>：由 βd + k₀D ≈ π/2 的条件反解层厚 d，即让目标频率大致落在 1/4 波长共振点附近。实际构造还需考虑护面层、流阻与安装方式。
        </li>
        <li>
          <strong>注意</strong>：本模型只描述多孔材料本身，未计入护面（穿孔板/薄膜）与龙骨的影响；带护面层的复合构造请结合穿孔率模块一起评估。
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

.field-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 160px;
  flex: 1 1 160px;
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
  .split {
    grid-template-columns: 1fr;
  }
}
</style>
