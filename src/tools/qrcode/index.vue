<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NInput, NButton, NSpace, useMessage } from 'naive-ui';
import QRCode from 'qrcode';
import ToolPage from '../../components/ToolPage.vue';

const text = ref('https://example.com');
const size = ref(256);
const canvas = ref<HTMLCanvasElement>();
const svgWrap = ref<HTMLElement>();
const message = useMessage();

async function generate() {
  const content = text.value;
  if (!content) return message.error('请输入内容');
  const px = Math.min(1024, Math.max(64, parseInt(size.value as unknown as string, 10) || 256));
  try {
    if (canvas.value) {
      await QRCode.toCanvas(canvas.value, content, { width: px, margin: 2, errorCorrectionLevel: 'M' });
    }
    const svg = await QRCode.toString(content, { type: 'svg', errorCorrectionLevel: 'M' });
    if (svgWrap.value) svgWrap.value.innerHTML = svg;
    message.success('生成成功，可下载');
  } catch (e) {
    message.error('生成失败：' + (e as Error).message);
  }
}

function downloadPng() {
  if (!canvas.value) return;
  const url = canvas.value.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qrcode.png';
  a.click();
}
function downloadSvg() {
  const svg = svgWrap.value?.querySelector('svg');
  if (!svg) return message.error('请先生成二维码');
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'qrcode.svg';
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(generate);
</script>

<template>
  <ToolPage title="🔳 二维码生成器" description="把文本或链接生成二维码，可下载 PNG / SVG，本地生成不上传。">
    <n-space vertical>
      <label class="lbl">内容（文本或链接）</label>
      <n-input v-model:value="text" type="textarea" placeholder="https://example.com 或任意文本" :autosize="{ minRows: 2 }" />
      <label class="lbl">尺寸（像素 64–1024）</label>
      <n-input v-model:value="size" type="number" style="max-width: 180px" />
      <n-space>
        <n-button type="primary" @click="generate">生成</n-button>
        <n-button @click="downloadPng">下载 PNG</n-button>
        <n-button @click="downloadSvg">下载 SVG</n-button>
      </n-space>
      <div class="qr-box">
        <canvas ref="canvas" />
        <div ref="svgWrap" class="svg-wrap" />
      </div>
    </n-space>
  </ToolPage>
</template>

<style scoped>
.lbl { font-size: 13px; color: var(--n-text-color-3); }
.qr-box { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 12px; align-items: flex-start; }
.qr-box canvas {
  background: #fff;
  padding: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
}
.svg-wrap :deep(svg) {
  background: #fff;
  padding: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  max-width: 100%;
}
</style>
