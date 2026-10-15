# 声学模块移植规范（子任务必读）

## 目标
把 `C:/Users/Administrator/WorkBuddy/2026-10-14-15-56-49/acoustic-calc-repo/public/js/` 下的
原始视图（原生 JS + 命令式 DOM 操作）重写为 Vue 3 SFC，接入 ToolBox 工具站。

## 参考来源（只读，不要改）
- **内核**：已移植到 `my-toolbox/src/audio/kernel/*.js`（ESM，`export default API`），**直接用 import 引用，不要重新写计算逻辑**。
- **原视图 DOM**：`acoustic-calc-repo/public/index.html`（搜索 `id="view-xxx"`）
- **原视图逻辑**：`acoustic-calc-repo/public/js/view-*.js`、`app.js`、`perforation-view.js`
- **原样式**：`acoustic-calc-repo/public/css/styles.css`（仅参考视觉意图，不要直接拷贝 CSS）

## 内核 API 对照
| 文件 | 导出 | 主要方法 |
|---|---|---|
| `levels.js` | Levels | energySum, energyAverage, increment, incrementCurve, pair, coherent, subtract, sources, requiredReduction, sumSpectra, levelToPressure, pressureToLevel, distanceAttenuation, directivityFactor, powerToSpl, splToPower, round1 |
| `acoustics.js` | Acoustics | BANDS, THIRD_BANDS, aWeightAt, aWeighted, ncRating, ncLowFrequencyCheck, ncBand16Check, nrRating, rcRating, rcCurve, thirdToOctave, evaluateTarget, findTarget, energyAverage, ROOM_TARGETS |
| `vibration.js` | Vibration | staticDeflection, naturalFrequency, frequencyRatio, transmissibility, transmissibilityUndamped, efficiency, insertionLoss, analyze, byRatio, requiredRatio, reverse, efficiencyTable, verifySheet, curve, STIFFNESS_UNITS, DYNAMIC_FACTORS, RATIO_GUIDE, EFFICIENCY_GRADES |
| `perforation.js` | Perforation | PATTERNS, perforationRate, holeArea, unitCellArea, solvePitch, mppResonance, classify |
| `absorber.js` | Absorber | RHO, C0, BANDS, PRESETS, point, spectrum, nrc, recommendThickness |
| `room.js` | Room | BANDS, MATERIALS, ROOM_USES, geometry, compute, evaluate, suggest |
| `insulation.js` | Insulation | MATERIALS, GB_REQUIREMENTS, faceMass, massLaw, coincidence, stc, gbRw, checkRequirement, fromMass, fromLevels, doubleLeaf, GRID_HZ, GB_HZ |
| `barrier.js` | Barrier | C0, BANDS, SOURCES, aWeight, geometry, fresnel, attenuation, point, spectrum, requiredHeight |
| `muffler.js` | Muffler | C0, MATERIALS, GB_PHI, channel, expansion, pressureLoss, sourceById, aWeight |

## 每个模块的文件结构（必须遵守）
```
src/tools/<slug>/index.ts    # Tool 元数据
src/tools/<slug>/index.vue   # Vue 组件
```

### index.ts 模板
```ts
import type { Tool } from '../types';
import Component from './index.vue';

const tool: Tool = {
  path: '/<slug>',
  name: '<中文名>',
  description: '<一句话描述>',
  group: '声学计算',
  category: '<二级分类>',
  icon: '<emoji>',
  keywords: '<中英文关键词，空格分隔>',
  component: Component,
};

export default tool;
```

二级分类可选值（必须严格用这几个）：
`基础计算` | `材料与构件` | `房间声学` | `环境与振动`

## index.vue 规范

### 必须使用的外壳
```vue
<script setup lang="ts">
import ToolPage from '../../components/ToolPage.vue';
</script>

<template>
  <ToolPage title="<带 emoji 的标题>" description="<说明>">
    <!-- 内容 -->
  </ToolPage>
</template>
```

### 可用资源
- **Naive UI 组件**：`NInput`, `NInputNumber`, `NButton`, `NSpace`, `NSelect`, `NRadioGroup`, `NRadio`,
  `NCheckbox`, `NSwitch`, `NCard`, `NDataTable`, `NTag`, `NAlert`, `NDivider`, `NStatistic`, `NSlider`,
  `NTabs`, `NTabPane`, `NTooltip`
  - 注意：`NSpace` 用 `:size="6"`，`NButton` 用 `size="small"` / `type="primary"` / `quaternary`
- **图表**：`import AudioChart from '../../audio/AudioChart.vue'`
  ```vue
  <AudioChart :x="bands" :series="series" x-log :h-bands="hBands" :height="300" />
  ```
  props: `x:number[]`, `series:{values:(number|null)[],color:string,type?:'line'|'bar',dash?:number[],points?:boolean}[]`,
  `xLog?:boolean`, `yMin?`, `yMax?`, `yTicks?`, `yDigits?`, `hBands?:{from,to,color?}[]`, `height?`, `xLabelFmt?`
- **复制**：`import { useCopy } from '../../composables/useCopy'` → `const copy = useCopy()`（返回函数本身，不要解构！）
- **消息**：`import { useMessage } from 'naive-ui'` → `const message = useMessage()`

### 状态管理
- 用 `ref` / `reactive` 代替原 `state` 对象
- 原「渲染函数」改为 `computed`
- 原 `addEventListener` 改为模板 `@click` / `@input` / `v-model`
- **不要用** `document.getElementById` / `innerHTML` / `querySelector`

### 样式
- 用 `<style scoped>`，CSS 变量沿用 ToolBox 的：`var(--n-primary-color)`、`var(--n-border-color)`、
  `var(--n-text-color)`、`var(--n-text-color-3)`、`var(--n-card-color)`、`var(--n-color)`。
- 布局用 flex / grid，卡片用 `border: 1px solid var(--n-border-color); border-radius: 12px;`
- **亮色主题优先**（ToolBox 默认亮色）

## 质量要求
1. **计算逻辑 100% 复用内核**，不要自己重写公式。
2. 保留原有的**全部功能点**（子面板、预设、导出、告警、说明文字等），不要删减。
3. 中文文案、单位、精度与原版一致。
4. 代码要能通过 `vite build`（TypeScript 语法正确、无未定义变量）。
5. 不要引入新的 npm 依赖。

## 交付
写完后用 Node 做一次语法自检（如 `node --check` 对 .ts 无效，可用正则粗查标签配对），然后报告：
- 创建的文件清单
- 从原版保留了哪些功能点
- 有无功能删减或未实现项
