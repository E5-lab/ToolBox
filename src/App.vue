<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  darkTheme,
  NConfigProvider,
  NMessageProvider,
  NGlobalStyle,
} from 'naive-ui';

const theme = ref<'light' | 'dark'>('dark');
const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : null));
const router = useRouter();

function toggle() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <n-config-provider :theme="naiveTheme">
    <n-message-provider>
      <n-global-style />
      <div class="app" :class="theme">
        <header class="topbar">
          <div class="brand" @click="router.push('/')">
            <img src="/favicon.svg" alt="" class="logo" />
            <span>我的工具箱</span>
          </div>
          <button class="theme-btn" :title="theme === 'dark' ? '切换到亮色' : '切换到暗色'" @click="toggle">
            {{ theme === 'dark' ? '🌙' : '☀️' }}
          </button>
        </header>
        <main class="container">
          <router-view />
        </main>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.theme-btn {
  background: transparent;
  border: 1px solid var(--n-border-color);
  color: var(--n-text-color);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  cursor: pointer;
  font-size: 16px;
}
.theme-btn:hover { border-color: var(--n-primary-color); }
</style>
