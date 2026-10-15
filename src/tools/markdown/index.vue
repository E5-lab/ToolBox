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
  const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
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
  <ToolPage
    title="📝 Markdown 编辑器"
    description="左侧编辑、右侧实时预览，本地渲染（marked），内容不上传。"
  >
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
        placeholder="在此输入 Markdown…"
        :autosize="false"
        :resizable="false"
        rows="18"
      />
      <div class="md-preview" v-html="preview" />
    </div>
  </ToolPage>
</template>

<style scoped>
.md-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 14px;
  align-items: stretch;
}

/* 关键：给 textarea 一个确定高度，否则网格中会塌陷 */
.md-input :deep(.n-input__textarea-el),
.md-input :deep(textarea) {
  height: 520px !important;
  min-height: 520px !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13.5px;
  line-height: 1.7;
  resize: vertical;
}

.md-preview {
  height: 520px;
  min-height: 520px;
  padding: 18px;
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color);
}

/* 预览区基础排版 */
.md-preview :deep(h1),
.md-preview :deep(h2) {
  margin: 0.6em 0 0.4em;
  padding-bottom: 0.25em;
  border-bottom: 1px solid var(--n-border-color);
}
.md-preview :deep(h1) { font-size: 1.7em; }
.md-preview :deep(h2) { font-size: 1.4em; }
.md-preview :deep(h3) { font-size: 1.15em; margin: 0.8em 0 0.4em; }
.md-preview :deep(p) { margin: 0.6em 0; }
.md-preview :deep(ul),
.md-preview :deep(ol) { padding-left: 1.6em; margin: 0.5em 0; }
.md-preview :deep(li) { margin: 0.25em 0; }
.md-preview :deep(a) { color: var(--n-primary-color); }
.md-preview :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 5px;
  background: color-mix(in srgb, var(--n-text-color) 10%, transparent);
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.md-preview :deep(pre) {
  padding: 12px 14px;
  overflow: auto;
  border-radius: 8px;
  background: color-mix(in srgb, var(--n-text-color) 8%, transparent);
}
.md-preview :deep(pre code) {
  padding: 0;
  background: transparent;
}
.md-preview :deep(blockquote) {
  margin: 0.6em 0;
  padding: 0.1em 0 0.1em 0.9em;
  border-left: 3px solid var(--n-primary-color);
  color: var(--n-text-color-3);
}
.md-preview :deep(table) {
  border-collapse: collapse;
  margin: 0.6em 0;
}
.md-preview :deep(th),
.md-preview :deep(td) {
  border: 1px solid var(--n-border-color);
  padding: 6px 10px;
}
.md-preview :deep(img) { max-width: 100%; }

@media (max-width: 820px) {
  .md-grid { grid-template-columns: 1fr; }
  .md-input :deep(.n-input__textarea-el),
  .md-input :deep(textarea),
  .md-preview {
    height: 300px;
    min-height: 300px;
  }
}
</style>
