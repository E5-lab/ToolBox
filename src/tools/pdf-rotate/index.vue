<script setup lang="ts">
import { ref } from 'vue';
import { NInput, NButton, NSelect, NSpace, useMessage } from 'naive-ui';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/ToolPage.vue';

const fileInput = ref<HTMLInputElement>();
const angle = ref('90');
const range = ref('');
const info = ref('');
const message = useMessage();

const angleOptions = [
  { label: '顺时针 90°', value: '90' },
  { label: '180°', value: '180' },
  { label: '顺时针 270°（逆时针 90°）', value: '270' },
];

function parseRange(str: string, total: number): number[] {
  const set = new Set<number>();
  str.split(',').forEach((part) => {
    part = part.trim();
    if (!part) return;
    if (part.includes('-')) {
      let [a, b] = part.split('-').map((x) => parseInt(x, 10));
      if (isNaN(a)) a = 1;
      if (isNaN(b)) b = total;
      for (let i = a; i <= b; i++) if (i >= 1 && i <= total) set.add(i);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= total) set.add(n);
    }
  });
  return Array.from(set).sort((x, y) => x - y);
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

async function rotate() {
  const file = fileInput.value?.files?.[0];
  if (!file) return message.error('请先选择 PDF 文件');
  try {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const total = doc.getPageCount();
    const targets = range.value.trim() ? parseRange(range.value, total) : doc.getPageIndices().map((i) => i + 1);
    const pages = doc.getPages();
    const ang = parseInt(angle.value, 10);
    for (const p of targets) {
      const page = pages[p - 1];
      page.setRotation(page.getRotation().angle + ang);
    }
    const out = await doc.save();
    download(out, 'rotated.pdf');
    info.value = `已旋转 ${targets.length} 页（共 ${total} 页）`;
    message.success('旋转完成，已开始下载');
  } catch (e) {
    message.error('旋转失败：' + (e as Error).message);
  }
}
</script>

<template>
  <ToolPage title="🔄 PDF 旋转" description="按角度旋转全部或指定页。文件本地处理，不上传。">
    <n-space vertical>
      <input ref="fileInput" type="file" accept="application/pdf" />
      <label class="lbl">旋转角度</label>
      <n-select v-model:value="angle" :options="angleOptions" style="max-width: 320px" />
      <label class="lbl">旋转指定页（例如 1,3-5；留空=全部，基于 1 起始）</label>
      <n-input v-model:value="range" placeholder="1,3-5" />
      <p v-if="info" class="hint">{{ info }}</p>
      <n-space>
        <n-button type="primary" @click="rotate">旋转并下载</n-button>
      </n-space>
    </n-space>
  </ToolPage>
</template>

<style scoped>
.lbl { font-size: 13px; color: var(--n-text-color-3); }
.hint { font-size: 13px; color: var(--n-text-color-3); }
</style>
