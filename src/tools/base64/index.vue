<script setup lang="ts">
import { ref } from 'vue';
import { NInput, NButton, NSpace } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';

const input = ref('');
const output = ref('');
const msg = ref('');
const msgOk = ref(false);
const copy = useCopy();

function setMsg(t: string, ok = false) {
  msg.value = t;
  msgOk.value = ok;
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function base64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function encode() {
  if (!input.value) return setMsg('请输入文本');
  try {
    output.value = utf8ToBase64(input.value);
    setMsg('编码成功', true);
  } catch (e) {
    setMsg('编码失败：' + (e as Error).message);
  }
}
function decode() {
  if (!input.value) return setMsg('请输入 Base64');
  const clean = input.value.trim().replace(/\s+/g, '');
  try {
    output.value = base64ToUtf8(clean);
    setMsg('解码成功', true);
  } catch {
    setMsg('Base64 格式不正确，无法解码');
  }
}
function clearAll() {
  input.value = '';
  output.value = '';
  setMsg('');
}
</script>

<template>
  <ToolPage title="🔤 Base64 编解码" description="文本与 Base64 互转，支持中文 UTF-8，纯本地计算。">
    <n-space vertical>
      <label class="lbl">输入文本</label>
      <n-input
        v-model:value="input"
        type="textarea"
        placeholder="输入要编码或解码的内容…"
        :autosize="{ minRows: 4, maxRows: 16 }"
      />
      <n-space>
        <n-button type="primary" @click="encode">编码（文本→Base64）</n-button>
        <n-button type="primary" @click="decode">解码（Base64→文本）</n-button>
        <n-button @click="copy(output)">复制结果</n-button>
        <n-button @click="clearAll">清空</n-button>
      </n-space>
      <p v-if="msg" class="msg" :class="{ ok: msgOk }">{{ msg }}</p>
      <label class="lbl">结果</label>
      <n-input
        v-model:value="output"
        type="textarea"
        readonly
        placeholder="结果会显示在这里"
        :autosize="{ minRows: 4, maxRows: 16 }"
      />
    </n-space>
  </ToolPage>
</template>

<style scoped>
.lbl {
  font-size: 13px;
  color: var(--n-text-color-3);
}
</style>
