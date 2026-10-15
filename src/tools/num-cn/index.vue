<script setup lang="ts">
import { ref } from 'vue';
import { NInput, NButton, NSpace } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';
import { useCopy } from '../../composables/useCopy';

const input = ref('');
const outRmb = ref('');
const outCn = ref('');
const msg = ref('');
const msgOk = ref(false);
const copy = useCopy();

function setMsg(t: string, ok = false) {
  msg.value = t;
  msgOk.value = ok;
}

const CN_NUM = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CN_RADICE = ['', '拾', '佰', '仟'];
const CN_UNITS = ['', '万', '亿', '兆'];

function intToChinese(intStr: string): string {
  if (intStr === '' || intStr === '0') return '零';
  const len = intStr.length;
  let out = '';
  let zeroCount = 0;
  for (let i = 0; i < len; i++) {
    const n = intStr.substr(i, 1);
    const p = len - i - 1;
    const q = Math.floor(p / 4);
    const m = p % 4;
    if (n === '0') {
      zeroCount++;
    } else {
      if (zeroCount > 0) out += CN_NUM[0];
      zeroCount = 0;
      out += CN_NUM[parseInt(n, 10)] + CN_RADICE[m];
    }
    if (m === 0 && zeroCount < 4) {
      out += CN_UNITS[q];
      zeroCount = 0;
    }
  }
  return out;
}

function toRMB(value: number): string {
  const neg = value < 0;
  const abs = Math.abs(value);
  const intPart = Math.floor(abs);
  const intCN = intToChinese(String(intPart));
  const cents = Math.round((abs - intPart) * 100);
  const jiao = Math.floor(cents / 10);
  const fen = cents % 10;
  let result = '';
  if (intPart > 0) result += intCN + '元';
  if (jiao > 0) result += CN_NUM[jiao] + '角';
  if (jiao === 0 && fen > 0) result += CN_NUM[0] + CN_NUM[fen] + '分';
  else if (fen > 0) result += CN_NUM[fen] + '分';
  if (result === '') result = CN_NUM[0] + '元整';
  else if (jiao === 0 && fen === 0) result += '整';
  return (neg ? '负' : '') + result;
}

const PLAIN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const PLAIN_UNIT = ['', '十', '百', '千'];
function plainChinese(intStr: string): string {
  if (intStr === '' || intStr === '0') return '零';
  const len = intStr.length;
  let out = '';
  for (let i = 0; i < len; i++) {
    const n = intStr.substr(i, 1);
    const pos = len - i - 1;
    if (n === '0') {
      if (i < len - 1 && out[out.length - 1] !== '零') out += '零';
    } else {
      out += PLAIN[parseInt(n, 10)] + PLAIN_UNIT[pos];
    }
  }
  return out.replace(/零+$/, '');
}

function convert() {
  const raw = input.value.trim();
  if (!raw) return setMsg('请输入数字');
  const value = Number(raw);
  if (!Number.isFinite(value)) return setMsg('请输入有效的数字');
  if (Math.abs(value) >= 1e16) return setMsg('数字过大，超出转换范围');
  outRmb.value = toRMB(value);
  outCn.value = (value < 0 ? '负' : '') + plainChinese(String(Math.floor(Math.abs(value))));
  setMsg('转换成功', true);
}
function clearAll() {
  input.value = '';
  outRmb.value = '';
  outCn.value = '';
  setMsg('');
}
</script>

<template>
  <ToolPage title="💴 数字大写转换" description="数字转人民币大写 / 中文大写，纯本地计算，支持小数与负数。">
    <n-space vertical>
      <label class="lbl">输入数字</label>
      <n-input v-model:value="input" placeholder="例如 1234.56 或 -10200" @keyup.enter="convert" />
      <n-space>
        <n-button type="primary" @click="convert">转换</n-button>
        <n-button @click="copy(outRmb, '已复制人民币大写')">复制人民币大写</n-button>
        <n-button @click="copy(outCn, '已复制中文大写')">复制中文大写</n-button>
        <n-button @click="clearAll">清空</n-button>
      </n-space>
      <p v-if="msg" class="msg" :class="{ ok: msgOk }">{{ msg }}</p>
      <label class="lbl">人民币大写</label>
      <n-input v-model:value="outRmb" type="textarea" readonly placeholder="壹仟贰佰叁拾肆元伍角陆分" :autosize="{ minRows: 2 }" />
      <label class="lbl">中文大写（普通）</label>
      <n-input v-model:value="outCn" type="textarea" readonly placeholder="一千二百三十四" :autosize="{ minRows: 2 }" />
    </n-space>
  </ToolPage>
</template>

<style scoped>
.lbl {
  font-size: 13px;
  color: var(--n-text-color-3);
}
</style>
