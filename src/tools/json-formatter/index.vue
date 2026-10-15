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

function setMsg(text: string, ok = false) {
  msg.value = text;
  msgOk.value = ok;
}

function fmt() {
  try {
    const data = JSON.parse(input.value);
    output.value = JSON.stringify(data, null, 2);
    setMsg('格式化成功', true);
  } catch (e) {
    setMsg('JSON 解析失败：' + (e as Error).message);
  }
}
function minify() {
  try {
    const data = JSON.parse(input.value);
    output.value = JSON.stringify(data);
    setMsg('已压缩', true);
  } catch (e) {
    setMsg('JSON 解析失败：' + (e as Error).message);
  }
}
function validate() {
  try {
    JSON.parse(input.value);
    setMsg('✓ JSON 合法', true);
  } catch (e) {
    setMsg('JSON 解析失败：' + (e as Error).message);
  }
}
function clearAll() {
  input.value = '';
  output.value = '';
  setMsg('');
}
</script>

<template>
  <ToolPage title="🧩 JSON 格式化" description="在浏览器本地完成格式化与校验，内容不会上传。">
    <n-space vertical>
      <n-input
        v-model:value="input"
        type="textarea"
        placeholder='{"hello":"world", "n": 1}'
        :autosize="{ minRows: 6, maxRows: 20 }"
      />
      <n-space>
        <n-button type="primary" @click="fmt">格式化</n-button>
        <n-button @click="minify">压缩</n-button>
        <n-button @click="validate">校验</n-button>
        <n-button @click="copy(output)">复制结果</n-button>
        <n-button @click="clearAll">清空</n-button>
      </n-space>
      <p v-if="msg" class="msg" :class="{ ok: msgOk }">{{ msg }}</p>
      <n-input
        v-model:value="output"
        type="textarea"
        readonly
        placeholder="结果会显示在这里"
        :autosize="{ minRows: 6, maxRows: 20 }"
      />
    </n-space>
  </ToolPage>
</template>
