<script setup lang="ts">
import { ref } from 'vue';
import { NInput, NButton, NSpace, useMessage } from 'naive-ui';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/ToolPage.vue';

const fileInput = ref<HTMLInputElement>();
const range = ref('');
const info = ref('');
const message = useMessage();
let doc: Awaited<ReturnType<typeof PDFDocument.load>> | null = null;

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

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const bytes = await file.arrayBuffer();
    doc = await PDFDocument.load(bytes);
    info.value = `已读取：${file.name}，共 ${doc.getPageCount()} 页`;
    message.success('读取成功');
  } catch (err) {
    message.error('读取失败：' + (err as Error).message);
  }
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

async function extract() {
  if (!doc) return message.error('请先选择 PDF 文件');
  const total = doc.getPageCount();
  const pages = range.value.trim() ? parseRange(range.value, total) : doc.getPageIndices().map((i) => i + 1);
  if (pages.length === 0) return message.error('没有匹配的页码');
  try {
    const out = await PDFDocument.create();
    for (const p of pages) {
      const [copied] = await out.copyPages(doc, [p - 1]);
      out.addPage(copied);
    }
    download(await out.save(), 'extracted.pdf');
    message.success(`已提取 ${pages.length} 页`);
  } catch (err) {
    message.error('提取失败：' + (err as Error).message);
  }
}

async function perPage() {
  if (!doc) return message.error('请先选择 PDF 文件');
  const total = doc.getPageCount();
  for (let i = 0; i < total; i++) {
    const out = await PDFDocument.create();
    const [copied] = await out.copyPages(doc, [i]);
    out.addPage(copied);
    download(await out.save(), `page-${i + 1}.pdf`);
    await new Promise((r) => setTimeout(r, 300));
  }
  message.success(`已生成 ${total} 个单页 PDF`);
}
</script>

<template>
  <ToolPage title="✂️ PDF 拆分 / 提取" description="上传一份 PDF，按页码范围提取页面。文件本地处理，不上传。">
    <n-space vertical>
      <input ref="fileInput" type="file" accept="application/pdf" @change="onPick" />
      <label class="lbl">提取页码（例如：1-3,5,7-9；留空表示全部，基于 1 起始）</label>
      <n-input v-model:value="range" placeholder="1-3,5,7-9" />
      <p v-if="info" class="hint">{{ info }}</p>
      <n-space>
        <n-button type="primary" @click="extract">提取为单份 PDF</n-button>
        <n-button :disabled="!doc" @click="perPage">每页单独下载</n-button>
      </n-space>
    </n-space>
  </ToolPage>
</template>

<style scoped>
.lbl { font-size: 13px; color: var(--n-text-color-3); }
.hint { font-size: 13px; color: var(--n-text-color-3); }
</style>
