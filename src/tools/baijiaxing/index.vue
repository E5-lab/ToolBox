<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NInput, NRadioGroup, NRadio, NSpace, useMessage } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';
import { BAI_JIA_XING, decode, encode, type Separator } from './codec';

const message = useMessage();
const copy = useCopy();

const plain = ref('你好，世界！Hello 123');
const cipher = ref('');
const sep = ref<Separator>('none');

/** 实时联动：明文 → 密文 */
const encoded = computed(() => {
  try {
    return encode(plain.value, sep.value);
  } catch {
    return '';
  }
});

/** 实时联动：密文 → 明文 */
const decoded = computed(() => {
  try {
    return decode(cipher.value);
  } catch {
    return '⚠️ 解码失败：内容不是有效的百家姓密文';
  }
});

const hitCount = computed(() => {
  if (!cipher.value) return 0;
  let n = 0;
  for (const ch of cipher.value) if (BAI_JIA_XING.includes(ch)) n++;
  return n;
});

function useEncoded() {
  cipher.value = encoded.value;
  message.success('已填入解码框');
}

function useDecoded() {
  plain.value = decoded.value;
  message.success('已填入编码框');
}

function clearAll() {
  plain.value = '';
  cipher.value = '';
}
</script>

<template>
  <ToolPage
    title="📜 百家姓编解码"
    description="以《百家姓》前 256 个姓氏为码表，把文本编成一串姓氏暗语。全部本地计算，内容不上传。"
  >
    <div class="sep-row">
      <span class="sep-label">分隔符：</span>
      <n-radio-group v-model:value="sep" size="small">
        <n-radio value="none">无</n-radio>
        <n-radio value="space">空格</n-radio>
        <n-radio value="comma">逗号</n-radio>
      </n-radio-group>
    </div>

    <div class="panes">
      <!-- 编码 -->
      <div class="pane">
        <div class="pane-head">
          <span class="ph-title">明文 → 百家姓</span>
          <n-space :size="6">
            <n-button size="tiny" quaternary @click="copy(encoded)">复制</n-button>
            <n-button size="tiny" quaternary @click="useEncoded">↓ 填入解码</n-button>
          </n-space>
        </div>
        <n-input
          v-model:value="plain"
          type="textarea"
          class="ta"
          placeholder="输入要编码的文本…"
          :autosize="false"
          rows="7"
        />
        <div class="pane-head sub">
          <span class="ph-title">编码结果</span>
          <span class="ph-meta">{{ encoded.length }} 字</span>
        </div>
        <div class="out">{{ encoded || '（等待输入）' }}</div>
      </div>

      <!-- 解码 -->
      <div class="pane">
        <div class="pane-head">
          <span class="ph-title">百家姓 → 明文</span>
          <n-space :size="6">
            <n-button size="tiny" quaternary @click="copy(decoded)">复制</n-button>
            <n-button size="tiny" quaternary @click="useDecoded">↑ 填入编码</n-button>
          </n-space>
        </div>
        <n-input
          v-model:value="cipher"
          type="textarea"
          class="ta"
          placeholder="粘贴百家姓密文，如：赵钱孙李周…（自动忽略标点与空格）"
          :autosize="false"
          rows="7"
        />
        <div class="pane-head sub">
          <span class="ph-title">解码结果</span>
          <span class="ph-meta">识别 {{ hitCount }} 个姓氏</span>
        </div>
        <div class="out">{{ decoded || '（等待输入）' }}</div>
      </div>
    </div>

    <n-space style="margin-top: 16px">
      <n-button @click="clearAll">清空全部</n-button>
    </n-space>

    <p class="hint">
      原理：文本按 UTF-8 编为字节序列，每个字节（0-255）映射到《百家姓》对应位置的姓氏。
      因此中文、英文、emoji 都能编码，且可完整还原。解码时会自动跳过空格、标点等无关字符。
    </p>
  </ToolPage>
</template>

<style scoped>
.sep-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.sep-label {
  font-size: 13px;
  color: var(--n-text-color-3);
}

.panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.pane {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  background: var(--n-color);
}

.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.pane-head.sub {
  margin-top: 12px;
}
.ph-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color-2, var(--n-text-color));
}
.ph-meta {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.ta {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.out {
  min-height: 96px;
  max-height: 200px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
  background: var(--n-card-color);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.75;
  word-break: break-all;
  white-space: pre-wrap;
}

.hint {
  margin-top: 16px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--n-text-color-3);
}

@media (max-width: 820px) {
  .panes { grid-template-columns: 1fr; }
}
</style>
