<script setup lang="ts">
import { ref } from 'vue';
import { NInput, NButton, NSpace } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';

const count = ref(5);
const output = ref('');
const msg = ref('');
const msgOk = ref(false);
const copy = useCopy();

function setMsg(t: string, ok = false) {
  msg.value = t;
  msgOk.value = ok;
}

function genOne(): string {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b).map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}

function generate() {
  const n = Math.min(500, Math.max(1, parseInt(count.value as unknown as string, 10) || 1));
  const list = [];
  for (let i = 0; i < n; i++) list.push(genOne());
  output.value = list.join('\n');
  setMsg(`已生成 ${n} 个 UUID`, true);
}
function clearAll() {
  output.value = '';
  setMsg('');
}
</script>

<template>
  <ToolPage title="🆔 UUID 生成器" description="基于浏览器 crypto 生成 UUID v4，纯本地、随机、唯一。">
    <n-space vertical>
      <div>
        <label class="lbl">生成数量（1–500）</label>
        <n-space>
          <n-input v-model:value="count" type="number" min="1" max="500" style="max-width: 160px" />
          <n-button type="primary" @click="generate">生成</n-button>
          <n-button @click="copy(output)">复制全部</n-button>
          <n-button @click="clearAll">清空</n-button>
        </n-space>
      </div>
      <p v-if="msg" class="msg" :class="{ ok: msgOk }">{{ msg }}</p>
      <label class="lbl">结果（每行一个）</label>
      <n-input
        v-model:value="output"
        type="textarea"
        readonly
        placeholder="点击「生成」后显示 UUID 列表"
        :autosize="{ minRows: 6, maxRows: 24 }"
      />
    </n-space>
  </ToolPage>
</template>

<style scoped>
.lbl {
  display: block;
  font-size: 13px;
  color: var(--n-text-color-3);
  margin-bottom: 6px;
}
</style>
