<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { tools } from '../tools';
import type { Tool } from '../tools/types';
import { favorites, recents, toggleFavorite } from '../composables/useFavorites';

const router = useRouter();
const open = ref<'' | 'fav' | 'recent'>('');
const root = ref<HTMLElement | null>(null);

function resolve(paths: string[]): Tool[] {
  return paths
    .map((p) => tools.find((t) => t.path === p))
    .filter((t): t is Tool => Boolean(t));
}

const favTools = computed(() => resolve(favorites.value));
const recentTools = computed(() => resolve(recents.value));

const list = computed(() => (open.value === 'fav' ? favTools.value : recentTools.value));
const title = computed(() => (open.value === 'fav' ? '我的收藏' : '最近使用'));

function switchTo(which: 'fav' | 'recent') {
  open.value = open.value === which ? '' : which;
}

function goto(path: string) {
  open.value = '';
  router.push(path as string);
}

function removeFav(e: MouseEvent, path: string) {
  e.stopPropagation();
  toggleFavorite(path);
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = '';
}
onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>

<template>
  <div ref="root" class="quick">
    <button
      class="act-btn"
      :class="{ active: open === 'fav' }"
      title="我的收藏"
      @click="switchTo('fav')"
    >
      <span class="ico">⭐</span>
      <span class="act-label">我的收藏</span>
      <span v-if="favorites.length" class="badge">{{ favorites.length }}</span>
    </button>

    <button
      class="act-btn"
      :class="{ active: open === 'recent' }"
      title="最近使用"
      @click="switchTo('recent')"
    >
      <span class="ico">🕐</span>
      <span class="act-label">最近使用</span>
      <span v-if="recents.length" class="badge">{{ recents.length }}</span>
    </button>

    <transition name="fade">
      <div v-if="open" class="panel">
        <div class="panel-head">
          <span class="ph-title">{{ title }}</span>
          <span class="ph-count">{{ list.length }}</span>
        </div>

        <ul v-if="list.length" class="panel-list">
          <li v-for="t in list" :key="t.path" class="panel-item" @click="goto(t.path)">
            <span class="pi-icon">{{ t.icon }}</span>
            <span class="pi-name">{{ t.name }}</span>
            <span
              v-if="open === 'fav'"
              class="pi-star on"
              title="取消收藏"
              @click="removeFav($event, t.path)"
              >★</span
            >
          </li>
        </ul>

        <div v-else class="panel-empty">
          {{ open === 'fav' ? '还没有收藏，点击工具卡右上角的 ☆ 即可收藏' : '暂无最近使用记录' }}
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.quick {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}
.act-btn {
  position: relative;
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
  transition: all 0.15s ease;
}
.act-btn:hover {
  border-color: var(--n-primary-color);
  color: var(--n-primary-color);
}
.act-btn.active {
  border-color: var(--n-primary-color);
  color: var(--n-primary-color);
  background: color-mix(in srgb, var(--n-primary-color) 12%, transparent);
}
.ico {
  font-size: 14px;
}
.badge {
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--n-primary-color);
  color: #fff;
  font-size: 10.5px;
  line-height: 17px;
  text-align: center;
}

.panel {
  position: absolute;
  top: 46px;
  right: 0;
  z-index: 50;
  width: 290px;
  max-height: 400px;
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  background: var(--n-card-color);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--n-border-color);
  position: sticky;
  top: 0;
  background: var(--n-card-color);
}
.ph-title {
  font-weight: 700;
  font-size: 13.5px;
}
.ph-count {
  font-size: 12px;
  color: var(--n-text-color-3);
}
.panel-list {
  list-style: none;
  margin: 6px;
  padding: 0;
}
.panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13.5px;
  transition: background 0.12s ease;
}
.panel-item:hover {
  background: color-mix(in srgb, var(--n-primary-color) 11%, transparent);
}
.pi-icon {
  font-size: 16px;
}
.pi-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pi-star {
  color: #f0a020;
  font-size: 15px;
  padding: 0 3px;
  border-radius: 4px;
}
.pi-star:hover {
  background: color-mix(in srgb, #f0a020 18%, transparent);
}
.panel-empty {
  padding: 22px 16px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--n-text-color-3);
  text-align: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 860px) {
  .act-label { display: none; }
}
</style>
