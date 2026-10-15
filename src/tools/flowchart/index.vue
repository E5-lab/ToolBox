<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NInput, NButton, NSpace, useMessage } from 'naive-ui';
import mermaid from 'mermaid';
import ToolPage from '../../components/ToolPage.vue';

const DEFAULT = `flowchart TD
    A[开始] --> B{是否登录?}
    B -- 是 --> C[进入首页]
    B -- 否 --> D[跳转登录]
    D --> C
    C --> E[结束]`;

const code = ref(DEFAULT);
const preview = ref<HTMLElement>();
const message = useMessage();
let seq = 0;
let ready = false;

function init() {
  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' });
  ready = true;
}

async function render() {
  if (!ready) init();
  const src = code.value.trim();
  if (!src) return message.error('请输入 Mermaid 代码');
  const id = 'm' + ++seq;
  try {
    const { svg } = await mermaid.render(id, src);
    if (preview.value) preview.value.innerHTML = svg;
    message.success('渲染成功');
  } catch (e) {
    message.error('渲染失败：' + (e instanceof Error ? e.message : '语法错误，请检查 Mermaid 语法'));
  }
}

function downloadSvg() {
  const svg = preview.value?.querySelector('svg');
  if (!svg) return message.error('请先渲染流程图');
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flowchart.svg';
  a.click();
  URL.revokeObjectURL(url);
}
function clearAll() {
  code.value = '';
  if (preview.value) preview.value.innerHTML = '';
}

onMounted(() => {
  init();
  render();
});
</script>

<template>
  <ToolPage title="📊 流程图绘制" description="用 Mermaid 语法写图，右侧实时渲染，可导出 SVG。本地渲染不上传。">
    <n-space>
      <n-button type="primary" @click="render">渲染</n-button>
      <n-button @click="downloadSvg">下载 SVG</n-button>
      <n-button @click="clearAll">清空</n-button>
    </n-space>
    <div class="fc-grid">
      <n-input v-model:value="code" type="textarea" spellcheck="false" class="fc-input" placeholder="输入 Mermaid 代码…" />
      <div ref="preview" class="fc-preview" />
    </div>
  </ToolPage>
</template>

<style scoped>
.fc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 14px;
}
.fc-input :deep(textarea) {
  min-height: 440px;
  font-family: ui-monospace, Menlo, monospace;
}
.fc-preview {
  min-height: 440px;
  padding: 16px;
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color);
}
.fc-preview :deep(svg) {
  max-width: 100%;
  height: auto;
}
@media (max-width: 720px) {
  .fc-grid { grid-template-columns: 1fr; }
  .fc-input :deep(textarea) { min-height: 220px; }
  .fc-preview { min-height: 220px; }
}
</style>
