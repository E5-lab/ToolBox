<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { darkTheme, NConfigProvider, NMessageProvider, NGlobalStyle } from 'naive-ui';
import { searchText } from './composables/useSearch';

const theme = ref<'light' | 'dark'>('light');
const naiveTheme = computed(() => (theme.value === 'dark' ? darkTheme : null));
const router = useRouter();
const route = useRoute();

function toggle() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

function onSearchInput(v: string) {
  searchText.value = v;
  // 在工具详情页搜索时，跳回首页展示结果
  if (route.path !== '/') router.push('/');
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
            <div class="brand-text">
              <span class="brand-name">ToolBox</span>
              <span class="brand-sub">工具百科</span>
            </div>
          </div>

          <div class="search-wrap">
            <span class="search-icon">🔍</span>
            <input
              class="search-input"
              :value="searchText"
              placeholder="搜索工具、分类或功能…"
              @input="onSearchInput(($event.target as HTMLInputElement).value)"
            />
            <button
              v-if="searchText"
              class="search-clear"
              title="清空"
              @click="onSearchInput('')"
            >
              ✕
            </button>
          </div>

          <div class="actions">
            <button class="act-btn" title="切换主题" @click="toggle">
              {{ theme === 'dark' ? '🌙' : '☀️' }}
              <span class="act-label">切换主题</span>
            </button>
          </div>
        </header>

        <main class="container">
          <router-view />
        </main>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.brand-name {
  font-weight: 800;
  font-size: 17px;
  letter-spacing: 0.02em;
}
.brand-sub {
  font-size: 11px;
  color: var(--n-text-color-3);
}

.search-wrap {
  flex: 1;
  max-width: 560px;
  margin: 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--n-border-color);
  background: var(--n-color);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.search-wrap:focus-within {
  border-color: var(--n-primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--n-primary-color) 16%, transparent);
}
.search-icon {
  font-size: 14px;
  opacity: 0.6;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--n-text-color);
  font-size: 14px;
  font-family: inherit;
}
.search-input::placeholder {
  color: var(--n-text-color-3);
}
.search-clear {
  border: none;
  background: transparent;
  color: var(--n-text-color-3);
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 4px;
}
.search-clear:hover {
  color: var(--n-text-color);
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.act-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--n-border-color);
  background: transparent;
  color: var(--n-text-color);
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
}
.act-btn:hover {
  border-color: var(--n-primary-color);
}
.act-label {
  white-space: nowrap;
}

@media (max-width: 720px) {
  .brand-sub,
  .act-label {
    display: none;
  }
  .search-wrap {
    margin: 0 10px;
  }
}
</style>
