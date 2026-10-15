<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NSpace, useMessage } from 'naive-ui';
import { marked } from 'marked';
import ToolPage from '../../components/ToolPage.vue';

const DEFAULT = `# 欢迎使用 Markdown 编辑器

这是一个**实时预览**的编辑器。

- 支持列表
- 支持 *斜体* 与 **加粗**
- [链接](https://example.com)

\`\`\`js
console.log('hello');
\`\`\`
`;

const editor = ref(DEFAULT);
const message = useMessage();

const preview = computed(() => marked.parse(editor.value));

function downloadMd() {
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.md';
  a.click();
  URL.revokeObjectURL(url);
}
async function copyMd() {
  if (!editor.value) return;
  try {
    await navigator.clipboard.writeText(editor.value);
    message.success('已复制 Markdown');
  } catch {
    message.error('复制失败，请手动选择');
  }
}
function clearAll() {
  editor.value = '';
}
</script>

<template>
  <ToolPage title="📝 Markdown 编辑器" description="左侧编辑、右侧实时预览，本地渲染（marked），内容不上传。">
    <n-space>
      <n-button @click="copyMd">复制 Markdown</n-button>
      <n-button @click="downloadMd">下载 .md</n-button>
      <n-button @click="clearAll">清空</n-button>
    </n-space>
    <div class="md-grid">
      <n-input
        v-model:value="editor"
        type="textarea"
        class="md-input"
        placeholder="输入 Markdown…"
      />
      <div class="md-preview markdown-body" v-html="preview" />
    </div>
  </ToolPage>
</template>

<style scoped>
.md-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 14px;
}
.md-input :deep(textarea) {
  min-height: 440px;
  font-family: ui-monospace, Menlo, monospace;
}
.md-preview {
  min-height: 440px;
  padding: 18px;
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color);
}
@media (max-width: 720px) {
  .md-grid { grid-template-columns: 1fr; }
  .md-input :deep(textarea) { min-height: 240px; }
  .md-preview { min-height: 240px; }
}
</style>
