<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NSpace, useMessage } from 'naive-ui';
import { PDFDocument } from 'pdf-lib';
import ToolPage from '../../components/ToolPage.vue';

const fileInput = ref<HTMLInputElement>();
const names = ref<string[]>([]);
const merged = ref<Uint8Array | null>(null);
const message = useMessage();

function onChange(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  names.value = files ? Array.from(files).map((f) => f.name) : [];
  merged.value = null;
}

async function merge() {
  const files = fileInput.value?.files;
  if (!files || files.length < 2) return message.error('请至少选择 2 份 PDF');
  try {
    const out = await PDFDocument.create();
    for (const f of Array.from(files)) {
      const bytes = await f.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    merged.value = await out.save();
    message.success(`合并完成，共 ${out.getPageCount()} 页`);
  } catch (e) {
    message.error('合并失败：' + (e as Error).message);
  }
}

function download() {
  if (!merged.value) return;
  const blob = new Blob([merged.value], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'merged.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <ToolPage title="🗂️ PDF 合并" description="选择多份 PDF，按选择顺序合并为一份。文件本地处理，不上传。">
    <n-space vertical>
      <input ref="fileInput" type="file" accept="application/pdf" multiple @change="onChange" />
      <p v-if="names.length" class="hint">已选择：{{ names.join('、') }}</p>
      <n-space>
        <n-button type="primary" :disabled="!fileInput?.files || fileInput.files.length < 2" @click="merge">合并</n-button>
        <n-button :disabled="!merged" @click="download">下载合并结果</n-button>
      </n-space>
    </n-space>
  </ToolPage>
</template>
