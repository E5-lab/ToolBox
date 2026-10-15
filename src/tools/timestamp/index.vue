<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { NInput, NButton, NSpace } from 'naive-ui';
import ToolPage from '../../components/ToolPage.vue';

const now = ref('');
const ts = ref('');
const tsResult = ref('');
const dt = ref('');
const dtSec = ref('');
const dtMs = ref('');
const msg = ref('');
const msgOk = ref(false);

function setMsg(t: string, ok = false) {
  msg.value = t;
  msgOk.value = ok;
}

let timer: number | undefined;
function tick() {
  now.value = String(Math.floor(Date.now() / 1000)) + '  (秒)';
}
onMounted(() => {
  tick();
  timer = window.setInterval(tick, 1000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});

function tsToDate() {
  const raw = ts.value.trim();
  if (!raw) return setMsg('请输入时间戳');
  const n = Number(raw);
  if (!Number.isFinite(n)) return setMsg('时间戳必须是数字');
  const ms = raw.length <= 10 ? n * 1000 : n;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return setMsg('无效时间戳');
  tsResult.value = d.toLocaleString('zh-CN') + '  /  ' + d.toISOString();
  setMsg('转换成功', true);
}

function dateToTs() {
  const raw = dt.value.trim();
  if (!raw) return setMsg('请输入日期');
  const d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d.getTime())) return setMsg('无效日期，建议格式：2026-10-15 14:20:00');
  dtSec.value = String(Math.floor(d.getTime() / 1000));
  dtMs.value = String(d.getTime());
  setMsg('转换成功', true);
}
</script>

<template>
  <ToolPage title="⏱️ 时间戳转换" description="本地计算，支持秒 / 毫秒时间戳。">
    <n-space vertical>
      <div>
        <label class="lbl">当前时间戳（秒）</label>
        <n-input :value="now" readonly />
      </div>
      <div>
        <label class="lbl">时间戳 → 日期</label>
        <n-space>
          <n-input v-model:value="ts" placeholder="例如 1700000000 或 1700000000000" />
          <n-button type="primary" @click="tsToDate">转换</n-button>
        </n-space>
        <n-input v-model:value="tsResult" readonly placeholder="转换结果" style="margin-top: 8px" />
      </div>
      <div>
        <label class="lbl">日期 → 时间戳</label>
        <n-space>
          <n-input v-model:value="dt" placeholder="例如 2026-10-15 14:20:00" />
          <n-button type="primary" @click="dateToTs">转换</n-button>
        </n-space>
        <n-space style="margin-top: 8px">
          <n-input v-model:value="dtSec" readonly placeholder="秒级时间戳" />
          <n-input v-model:value="dtMs" readonly placeholder="毫秒级时间戳" />
        </n-space>
      </div>
      <p v-if="msg" class="msg" :class="{ ok: msgOk }">{{ msg }}</p>
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
