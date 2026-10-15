<script setup lang="ts">
import { computed, ref } from 'vue';
import { NAlert, NButton, NInput, NInputNumber, NSelect, NSpace, NSwitch } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import AudioChart from '../../audio/AudioChart.vue';
import Room from '../../audio/kernel/room.js';

interface MaterialItem {
  id: string;
  name: string;
  alpha: number[];
}
interface RoomUse {
  id: string;
  name: string;
  rt: [number, number];
  note: string;
}
interface CalcRow {
  name: string;
  area: number;
  alpha: number[];
  filler?: boolean;
}
interface CalcResult {
  ok: boolean;
  error?: string;
  volume: number;
  dims: { length: number; width: number; height: number };
  geomArea: number | null;
  totalArea: number;
  rows: CalcRow[];
  absorption: number[];
  airTerm: number[];
  totalAbsorption: number[];
  avgAlpha: number[];
  rtSabine: (number | null)[];
  rtEyring: (number | null)[];
  rtMidSabine: number | null;
  rtMidEyring: number | null;
}
interface EvalResult {
  use: RoomUse;
  status: 'pass' | 'low' | 'high' | 'na';
  target: number[];
  margin?: number;
  text: string;
}
interface SuggestResult {
  needed: number;
  current: number;
  target: number;
  material?: { name: string } | null;
  alpha?: number;
  area?: number;
}
interface SurfaceRow {
  id: number;
  name: string;
  area: number | null;
  materialId: string;
  auto: string | null;
  alpha: number[];
}

const CUSTOM = '__custom__';
const BANDS = Room.BANDS as number[];
const MATERIALS = Room.MATERIALS as MaterialItem[];
const ROOM_USES = Room.ROOM_USES as RoomUse[];

/* ---------------- 状态 ---------------- */
const dims = ref({ length: 9, width: 6, height: 3.5 });
const air = ref(true);
const filler = ref('plaster');
const useId = ref('classroom');
let seed = 0;
const rows = ref<SurfaceRow[]>([
  {
    id: ++seed,
    name: '地面',
    area: 54,
    materialId: 'woodfloor',
    auto: 'floor',
    alpha: [0.15, 0.11, 0.1, 0.07, 0.06, 0.07],
  },
  {
    id: ++seed,
    name: '顶棚',
    area: 54,
    materialId: 'mineral-panel',
    auto: 'ceiling',
    alpha: [0.3, 0.6, 0.85, 0.9, 0.9, 0.9],
  },
]);

const copy = useCopy();

/* ---------------- 选项 ---------------- */
const materialOptions = computed(() => [
  ...MATERIALS.map((m) => ({ label: m.name, value: m.id })),
  { label: '自定义系数…', value: CUSTOM },
]);
const fillerOptions = computed(() => MATERIALS.map((m) => ({ label: m.name, value: m.id })));
const useOptions = computed(() =>
  ROOM_USES.map((u) => ({ label: u.name + '（' + u.rt[0] + '–' + u.rt[1] + ' s）', value: u.id }))
);
const autoOptions = [
  { label: '手动填写', value: '' },
  { label: '地面 l×w', value: 'floor' },
  { label: '顶棚 l×w', value: 'ceiling' },
  { label: '墙面 2h(l+w)', value: 'walls' },
];

/* ---------------- 工具函数 ---------------- */
function num(v: number | null | undefined, d = 2): string {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}
function autoArea(kind: string | null): number | null {
  const { length: l, width: w, height: h } = dims.value;
  if (!(l > 0) || !(w > 0) || !(h > 0)) return null;
  if (kind === 'floor' || kind === 'ceiling') return l * w;
  if (kind === 'walls') return 2 * h * (l + w);
  return null;
}
function rowArea(r: SurfaceRow): number | null {
  return r.auto ? autoArea(r.auto) : r.area;
}
function setRowArea(r: SurfaceRow, v: number | null) {
  r.area = v;
  r.auto = null;
}
function setAuto(r: SurfaceRow, v: string) {
  r.auto = v || null;
  if (r.auto) r.area = autoArea(r.auto);
}
function materialName(id: string): string {
  const m = MATERIALS.find((x) => x.id === id);
  return m ? m.name : '自定义系数';
}

function setMaterial(r: SurfaceRow, v: string) {
  if (v === CUSTOM && r.materialId !== CUSTOM) {
    const m = MATERIALS.find((x) => x.id === r.materialId);
    r.alpha = m ? m.alpha.slice() : [0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
  }
  r.materialId = v;
}

function addRow() {
  rows.value.push({
    id: ++seed,
    name: '新增表面',
    area: 0,
    materialId: 'glass',
    auto: null,
    alpha: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
  });
}
function removeRow(idx: number) {
  rows.value.splice(idx, 1);
}

/* ---------------- 计算 ---------------- */
const dimsOk = computed(() => dims.value.length > 0 && dims.value.width > 0 && dims.value.height > 0);

const listedArea = computed(() => {
  let s = 0;
  rows.value.forEach((r) => {
    const a = rowArea(r);
    if (a && a > 0) s += a;
  });
  return s;
});

const calc = computed<CalcResult | null>(() => {
  if (!dimsOk.value) return null;
  const res = Room.compute({
    length: dims.value.length,
    width: dims.value.width,
    height: dims.value.height,
    surfaces: rows.value.map((r) => ({
      name: r.name,
      area: rowArea(r),
      materialId: r.materialId,
      alpha: r.alpha.slice(),
    })),
    fillerMaterialId: filler.value,
    airAbsorption: air.value,
  }) as CalcResult;
  return res && res.ok ? res : null;
});

const mid = computed<number | null>(() => (calc.value ? calc.value.rtMidSabine : null));
const ev = computed<EvalResult | null>(() =>
  calc.value ? (Room.evaluate(useId.value, mid.value) as unknown as EvalResult) : null
);
const sug = computed<SuggestResult | null>(() =>
  calc.value ? (Room.suggest(calc.value, useId.value, 'mineral-panel') as unknown as SuggestResult) : null
);
const useInfo = computed<RoomUse>(() => ROOM_USES.find((u) => u.id === useId.value) || ROOM_USES[0]);

const geomText = computed(() => {
  const c = calc.value;
  if (!c) return '请输入有效的房间长、宽、高（均 > 0）。';
  const rest = c.geomArea != null ? Math.max(0, c.geomArea - listedArea.value) : 0;
  return (
    '体积 V = ' + num(c.volume, 1) + ' m³　·　总表面积 ' +
    (c.geomArea ? num(c.geomArea, 1) + ' m²' : '—') +
    '　·　已单独列出表面 ' + num(listedArea.value, 1) + ' m²' +
    (c.geomArea ? '，其余 ' + num(rest, 1) + ' m² 按所选材料计' : '')
  );
});

const stats = computed(() => {
  const c = calc.value;
  if (!c) return [];
  return [
    { label: '体积 V', value: num(c.volume, 1), unit: 'm³', sub: '' },
    { label: '总表面积 S', value: num(c.geomArea != null ? c.geomArea : c.totalArea, 1), unit: 'm²', sub: '' },
    { label: '平均吸声系数 ᾱ @500 Hz', value: num(c.avgAlpha[BANDS.indexOf(500)], 3), unit: '', sub: '' },
    { label: 'Eyring 中频 RT', value: num(c.rtMidEyring, 2), unit: 's', sub: '' },
  ];
});

/* 判定区间条 */
const rangeScale = computed(() => {
  const hi = useInfo.value.rt[1];
  const m = mid.value;
  return Math.max(hi * 2.2, (m != null ? m : hi) * 1.15, 1);
});
function pct(v: number): number {
  return Math.max(0, Math.min(100, (v / rangeScale.value) * 100));
}

/* 图表 */
const chartSeries = computed(() => {
  const c = calc.value;
  if (!c) return [];
  return [
    { name: 'Eyring', color: '#10b981', values: c.rtEyring, width: 1.8, radius: 2.6 },
    { name: 'Sabine', color: '#2563eb', values: c.rtSabine, width: 2.2, radius: 3.4 },
  ];
});
const chartBands = computed(() => [{ from: useInfo.value.rt[0], to: useInfo.value.rt[1], color: 'rgba(245, 158, 11, 0.14)' }]);

/* 明细表 */
const tableRows = computed(() => {
  const c = calc.value;
  if (!c) return [];
  return BANDS.map((f, i) => ({
    f,
    absorption: num(c.absorption[i], 1),
    air: num(c.airTerm[i], 1),
    avgAlpha: num(c.avgAlpha[i], 3),
    sabine: num(c.rtSabine[i], 2),
    eyring: num(c.rtEyring[i], 2),
  }));
});

const surfaceRows = computed(() => {
  const c = calc.value;
  if (!c) return [];
  return c.rows.map((r) => ({
    name: r.name,
    area: num(r.area, 1),
    alpha: num(r.alpha[BANDS.indexOf(500)], 3),
    filler: !!r.filler,
  }));
});

/* ---------------- 导出 ---------------- */
function summaryText(): string {
  const c = calc.value;
  if (!c) return '';
  const e = ev.value;
  const out: string[] = [];
  out.push('室内混响时间 RT60 · 结果摘要');
  out.push(
    '房间尺寸：' + num(dims.value.length, 2) + ' × ' + num(dims.value.width, 2) + ' × ' +
      num(dims.value.height, 2) + ' m（V = ' + num(c.volume, 1) + ' m³，S = ' + num(c.totalArea, 1) + ' m²）'
  );
  out.push('表面构造：' + c.rows.map((r) => r.name + ' ' + num(r.area, 1) + ' m²').join('；'));
  out.push('中频 RT（500 Hz–1 kHz）Sabine = ' + num(c.rtMidSabine, 2) + ' s，Eyring = ' + num(c.rtMidEyring, 2) + ' s');
  out.push('逐带 Sabine RT：' + BANDS.map((f, i) => f + 'Hz=' + num(c.rtSabine[i], 2)).join('，'));
  if (e) out.push('用途判定（' + e.use.name + '）：' + e.text + '，推荐 ' + e.target[0] + '–' + e.target[1] + ' s');
  out.push('空气吸收：' + (air.value ? '已计入（20 ℃ / 50 % RH）' : '未计入'));
  out.push('工具：声学计算工具箱 · 室内混响时间');
  return out.join('\n');
}

function copySummary() {
  const txt = summaryText();
  if (!txt) return;
  copy(txt, '已复制结果摘要');
}

function exportCsv() {
  const c = calc.value;
  if (!c) return;
  const rowsOut: (string | number)[][] = [];
  rowsOut.push(['室内混响时间 RT60', '', '']);
  rowsOut.push(['长 (m)', String(dims.value.length), '']);
  rowsOut.push(['宽 (m)', String(dims.value.width), '']);
  rowsOut.push(['高 (m)', String(dims.value.height), '']);
  rowsOut.push(['体积 (m³)', num(c.volume, 2), '']);
  rowsOut.push(['总表面积 (m²)', num(c.totalArea, 2), '']);
  rowsOut.push(['中频 RT Sabine (s)', num(c.rtMidSabine, 3), '']);
  rowsOut.push(['中频 RT Eyring (s)', num(c.rtMidEyring, 3), '']);
  rowsOut.push([]);
  rowsOut.push(['表面', '面积 (m²)', '500 Hz 吸声系数']);
  c.rows.forEach((r) => {
    rowsOut.push([r.name, num(r.area, 2), num(r.alpha[BANDS.indexOf(500)], 3)]);
  });
  rowsOut.push([]);
  rowsOut.push(['频率 (Hz)', 'ΣαᵢSᵢ', '4mV', '平均吸声系数', 'Sabine RT (s)', 'Eyring RT (s)']);
  BANDS.forEach((f, i) => {
    rowsOut.push([
      f,
      num(c.absorption[i], 2),
      num(c.airTerm[i], 2),
      num(c.avgAlpha[i], 3),
      num(c.rtSabine[i], 3),
      num(c.rtEyring[i], 3),
    ]);
  });
  const csv =
    '\ufeff' +
    rowsOut
      .map((r) => r.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rt60-result.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <ToolPage
    title="🏛️ 室内混响时间 RT60"
    description="Sabine / Eyring 逐频带计算，内置常用材料吸声系数库与空气吸收修正"
  >
    <div class="split">
      <div class="col">
        <div class="card">
          <h3 class="card-title"><span class="step">1</span> 房间尺寸 <span class="hint">(m)</span></h3>
          <div class="field-row">
            <div class="field">
              <label class="f-label">长</label>
              <n-input-number v-model:value="dims.length" :min="0.5" :step="0.1" size="small" />
            </div>
            <div class="field">
              <label class="f-label">宽</label>
              <n-input-number v-model:value="dims.width" :min="0.5" :step="0.1" size="small" />
            </div>
            <div class="field">
              <label class="f-label">高</label>
              <n-input-number v-model:value="dims.height" :min="0.5" :step="0.1" size="small" />
            </div>
            <div class="field field-switch">
              <label class="f-label">空气吸收</label>
              <n-switch v-model:value="air">
                <template #checked>计入（20 ℃ / 50 % RH）</template>
                <template #unchecked>不计入</template>
              </n-switch>
            </div>
          </div>
          <n-alert v-if="!dimsOk" type="error" :show-icon="false" class="mt">
            请输入有效的房间长、宽、高（均 &gt; 0）。
          </n-alert>
          <p v-else class="inline-note mt">{{ geomText }}</p>
        </div>

        <div class="card">
          <h3 class="card-title"><span class="step">2</span> 表面构造</h3>
          <div class="mat-head">
            <span>表面名称</span><span>面积 m²</span><span>材料 / 系数</span><span>自动</span><span></span>
          </div>
          <div v-for="(r, idx) in rows" :key="r.id" class="mat-row">
            <div class="mr-item">
              <n-input v-model:value="r.name" size="small" placeholder="表面名称" />
            </div>
            <div class="mr-item">
              <n-input-number
                :value="rowArea(r)"
                :min="0"
                :step="0.1"
                size="small"
                @update:value="(v: number | null) => setRowArea(r, v)"
              />
            </div>
            <div class="mr-item">
              <n-select
                :value="r.materialId"
                :options="materialOptions"
                size="small"
                @update:value="(v: string) => setMaterial(r, v)"
              />
            </div>
            <div class="mr-item">
              <n-select
                :value="r.auto || ''"
                :options="autoOptions"
                size="small"
                @update:value="(v: string) => setAuto(r, v)"
              />
            </div>
            <div class="mr-item mr-del">
              <n-button size="tiny" quaternary title="删除该表面" @click="removeRow(idx)">×</n-button>
            </div>
            <div v-if="r.materialId === CUSTOM" class="mr-alpha">
              <span class="alpha-label">自定义吸声系数 α：</span>
              <span v-for="(f, i) in BANDS" :key="f" class="alpha-cell">
                <span class="alpha-tag">{{ f }}</span>
                <n-input-number v-model:value="r.alpha[i]" :min="0" :max="1" :step="0.01" size="tiny" />
              </span>
            </div>
          </div>
          <div class="btn-row">
            <n-button size="small" @click="addRow">+ 添加表面</n-button>
            <div class="field filler-field">
              <label class="f-label">未列出表面的材料</label>
              <n-select v-model:value="filler" :options="fillerOptions" size="small" />
            </div>
          </div>
          <p class="inline-note">未单独列出的表面按左下所选材料计；面积可选择「自动」随房间尺寸联动。</p>

          <div v-if="surfaceRows.length" class="table-wrap mt">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>归集表面</th>
                  <th>面积 (m²)</th>
                  <th>α @500 Hz</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in surfaceRows" :key="i">
                  <td>{{ s.name }}</td>
                  <td>{{ s.area }}</td>
                  <td>{{ s.alpha }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card hero">
          <div class="rc-title">中频混响时间 RT（500 Hz–1 kHz）</div>
          <div class="hero-rate">
            <span>{{ mid == null ? '—' : mid.toFixed(2) }}</span>
            <span class="unit">s</span>
          </div>
          <div v-if="ev" class="sub">
            <span :class="ev.status === 'pass' ? 'ok' : 'warn'">{{ ev.text }}</span>
            （推荐 {{ ev.target[0] }}–{{ ev.target[1] }} s<template v-if="ev.margin">，超出 {{ num(ev.margin, 2) }} s</template>）
          </div>
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
          <h3 class="card-title">房间用途判定</h3>
          <div class="field-row">
            <div class="field">
              <label class="f-label">用途</label>
              <n-select v-model:value="useId" :options="useOptions" size="small" />
            </div>
          </div>
          <p class="inline-note">{{ useInfo.note }}</p>
          <div class="range-bar">
            <div
              class="band"
              :style="{ left: pct(useInfo.rt[0]) + '%', width: pct(useInfo.rt[1]) - pct(useInfo.rt[0]) + '%' }"
            ></div>
            <div v-if="mid != null" class="mark" :style="{ left: pct(mid) + '%' }"></div>
          </div>
          <div class="range-legend">
            <span>0 s</span>
            <span>推荐 {{ useInfo.rt[0] }}–{{ useInfo.rt[1] }} s（中频）</span>
            <span>{{ num(rangeScale, 1) }} s</span>
          </div>
          <n-alert v-if="sug && sug.needed > 0" type="warning" :show-icon="false" class="mt">
            吸声量不足，建议至少增加 {{ num(sug.needed, 1) }} m²·（吸声量）；若采用「{{ sug.material ? sug.material.name : '矿棉吸声板' }}」（500
            Hz–1 kHz α ≈ {{ num(sug.alpha, 2) }}），约需 {{ num(sug.area, 1) }} m² 该吸声面积。
          </n-alert>
          <n-alert v-else-if="sug" type="success" :show-icon="false" class="mt">
            中频混响时间已达推荐上限要求，无需再增加吸声量。
          </n-alert>
        </div>

        <div class="card">
          <h3 class="card-title">混响时间频率特性</h3>
          <div class="chart-wrap">
            <AudioChart
              :x="BANDS"
              :series="chartSeries"
              x-log
              :y-min="0"
              :y-ticks="5"
              :h-bands="chartBands"
              :height="300"
            />
          </div>
          <div class="legend">
            <span><i style="background: #2563eb"></i>Sabine</span>
            <span><i style="background: #10b981"></i>Eyring</span>
            <span><i style="background: #f59e0b"></i>推荐范围</span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">倍频带明细</h3>
          <div class="table-wrap">
            <table v-if="tableRows.length" class="detail-table">
              <thead>
                <tr>
                  <th>频带</th>
                  <th>ΣαᵢSᵢ</th>
                  <th>4mV</th>
                  <th>ᾱ</th>
                  <th>Sabine RT (s)</th>
                  <th>Eyring RT (s)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in tableRows" :key="r.f">
                  <td>{{ r.f }} Hz</td>
                  <td>{{ r.absorption }}</td>
                  <td>{{ r.air }}</td>
                  <td>{{ r.avgAlpha }}</td>
                  <td>{{ r.sabine }}</td>
                  <td>{{ r.eyring }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="inline-note">请输入有效参数后查看倍频带明细。</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card notes">
      <h3 class="card-title">计算方法</h3>
      <ul>
        <li><strong>Sabine</strong>：RT = 0.161V / A，A = ΣαᵢSᵢ + 4mV，适合平均吸声系数较小（ᾱ ≲ 0.2）的房间。</li>
        <li><strong>Eyring</strong>：RT = 0.161V / (−S·ln(1 − ᾱ) + 4mV)，在强吸声房间（ᾱ 较大）比 Sabine 更接近实测。</li>
        <li><strong>空气吸收</strong>：4mV 项按 ISO 9613-1 在 20 ℃、50 % RH 的典型衰减系数折算，仅在 2 kHz 以上明显；湿度过低时空吸收会显著增大。</li>
        <li><strong>表面归集</strong>：列表中的表面按各自面积与材料吸声系数计入；房间总表面积（2(lw+wh+lh)）中未被单独列出的部分，按所选「未列出表面材料」计。</li>
        <li><strong>自定义系数</strong>：材料选择「自定义系数…」时，可逐带填写 125–4000 Hz 六个倍频带的吸声系数（0–1），用于录入实测或厂商数据。</li>
        <li><strong>材料数据</strong>：内置 20 类常用构造的倍频带吸声系数，取自常用建筑声学手册量级值，用于方案比选；重要工程应以实测混响室数据为准。</li>
        <li><strong>推荐值</strong>：房间用途推荐范围以中频（500 Hz–1 kHz）混响时间为准，量级参考 GB/T 50121 与常用设计手册；大体积房间推荐值通常更长。</li>
        <li><strong>改进建议</strong>：按目标上限反算所需总吸声量与等效吸声面积（ΔA / α），用于初步确定吸声板用量。</li>
        <li><strong>注意</strong>：本式假设声场充分扩散；强耦合空间、狭长房间或存在大面积强吸声面时，结果偏差较大。</li>
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
  min-width: 140px;
  flex: 1 1 140px;
}
.field-switch {
  justify-content: center;
}
.f-label {
  font-size: 12.5px;
  color: var(--n-text-color-3);
}

.mat-head {
  display: grid;
  grid-template-columns: 1.1fr 0.8fr 1.6fr 1fr 40px;
  gap: 8px;
  padding-bottom: 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
}
.mat-row {
  display: grid;
  grid-template-columns: 1.1fr 0.8fr 1.6fr 1fr 40px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.mr-item {
  min-width: 0;
}
.mr-del {
  text-align: right;
}
.mr-alpha {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px dashed var(--n-border-color);
  border-radius: 8px;
}
.alpha-label {
  font-size: 12px;
  color: var(--n-text-color-3);
}
.alpha-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.alpha-tag {
  font-size: 11px;
  color: var(--n-text-color-3);
}
.btn-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.filler-field {
  min-width: 220px;
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
.sub .ok {
  color: #18a058;
}
.sub .warn {
  color: #f0a020;
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

.range-bar {
  position: relative;
  height: 14px;
  margin: 14px 0 4px;
  border-radius: 7px;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  overflow: hidden;
}
.range-bar .band {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(245, 158, 11, 0.35);
}
.range-bar .mark {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 3px;
  margin-left: -1px;
  background: var(--n-primary-color);
}
.range-legend {
  display: flex;
  justify-content: space-between;
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
  .mat-head,
  .mat-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
