<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NSpace, useMessage } from 'naive-ui';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/ToolPage.vue';

const fileInput = ref<HTMLInputElement>();
const info = ref('');
const result = ref<Uint8Array | null>(null);
const message = useMessage();

function fmt(n: number): string {
  return (n / 1024).toFixed(1) + ' KB';
}
function download(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function compress() {
  const file = fileInput.value?.files?.[0];
  if (!file) return message.error('请先选择 PDF 文件');
  message.info('压缩中（重新序列化）…');
  const before = file.size;
  try {
    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes);
    result.value = await src.save({ useObjectStreams: false });
    const after = result.value.length;
    const diff = ((after - before) / before * 100).toFixed(1);
    info.value = `原大小：${fmt(before)} → 压缩后：${fmt(after)}（${diff >= 0 ? '+' : ''}${diff}%）`;
    message.success(after < before ? '压缩完成' : '已完成（体积变化不明显）');
  } catch (e) {
    message.error('压缩失败：' + (e as Error).message);
  }
}
</script>

<template>
  <ToolPage title="🗜️ PDF 压缩" description="通过重新序列化（无损）尝试减小体积。纯浏览器本地处理，不上传。">
    <n-space vertical>
      <p class="warn">提示：浏览器端无法压缩图片内容，若原文件已高度压缩，可能几乎无变化甚至略增。</p>
      <input ref="fileInput" type="file" accept="application/pdf" />
      <p v-if="info" class="hint">{{ info }}</p>
      <n-space>
        <n-button type="primary" @click="compress">压缩</n-button>
        <n-button :disabled="!result" @click="result && download(result, 'compressed.pdf')">下载结果</n-button>
      </n-space>
    </n-space>
  </ToolPage>
</template>

<style scoped>
.warn { font-size: 13px; color: #e88080; margin: 0 0 4px; }
.hint { font-size: 13px; color: var(--n-text-color-3); }
</style>
