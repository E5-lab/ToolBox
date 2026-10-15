<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { categories, countByCategory, filterTools, tools } from '../tools';
import type { Tool } from '../tools/types';
import ToolCard from '../components/ToolCard.vue';
import { searchText } from '../composables/useSearch';

/** 当前选中的分类，'' 表示全部 */
const activeCat = ref<string>(categories[0]?.name ?? '');

const isSearching = computed(() => searchText.value.trim().length > 0);

/** 搜索时展示全部匹配结果；否则按选中分类过滤 */
const list = computed<Tool[]>(() => {
  const all = filterTools(searchText.value);
  if (isSearching.value) return all;
  return all.filter((t) => t.category === activeCat.value);
});

/** 每个分类在当前搜索下的命中数量 */
function countHit(name: string): number {
  return filterTools(searchText.value).filter((t) => t.category === name).length;
}

/** 只有在搜索时，分类侧栏才显示命中数，否则显示总数 */
function catCount(name: string): number {
  return isSearching.value ? countHit(name) : countByCategory(name);
}

const visibleCategories = computed(() =>
  categories.filter((c) => !isSearching.value || countHit(c.name) > 0)
);

// 搜索时如果当前分类没有命中，自动切到第一个有命中的分类（仅用于高亮）
watch(searchText, () => {
  if (!isSearching.value) return;
  const first = visibleCategories.value[0];
  if (first && countHit(activeCat.value) === 0) activeCat.value = first.name;
});

const currentTitle = computed(
  () => categories.find((c) => c.name === activeCat.value)?.name ?? '全部工具'
);
const currentIcon = computed(
  () => categories.find((c) => c.name === activeCat.value)?.icon ?? '📦'
);

function pickCat(name: string) {
  activeCat.value = name;
  if (isSearching.value) searchText.value = '';
}
</script>

<template>
  <div class="home">
    <!-- 顶部分类 Tab -->
    <nav class="cat-tabs">
      <button
        v-for="c in visibleCategories"
        :key="c.name"
        class="cat-tab"
        :class="{ active: !isSearching && c.name === activeCat }"
        @click="pickCat(c.name)"
      >
        <span class="tab-icon">{{ c.icon }}</span>
        <span class="tab-name">{{ c.name }}</span>
        <span class="tab-count">{{ catCount(c.name) }}</span>
      </button>
    </nav>

    <div class="body">
      <!-- 左侧分类侧栏 -->
      <aside class="side">
        <div class="side-head">
          <span class="side-icon">{{ currentIcon }}</span>
          <span class="side-name">{{ isSearching ? '搜索结果' : currentTitle }}</span>
        </div>
        <ul class="side-list">
          <li
            v-for="c in visibleCategories"
            :key="c.name"
            class="side-item"
            :class="{ active: !isSearching && c.name === activeCat }"
            @click="pickCat(c.name)"
          >
            <span class="si-icon">{{ c.icon }}</span>
            <span class="si-name">{{ c.name }}</span>
            <span class="si-count">{{ catCount(c.name) }}</span>
          </li>
        </ul>
      </aside>

      <!-- 右侧工具卡片区 -->
      <section class="main">
        <div class="main-head">
          <h2 class="main-title">
            <span class="mt-icon">{{ isSearching ? '🔍' : currentIcon }}</span>
            {{ isSearching ? `“${searchText}” 的搜索结果` : currentTitle }}
          </h2>
          <span class="main-count">共 {{ list.length }} 个工具</span>
        </div>

        <div v-if="list.length" class="grid">
          <ToolCard v-for="t in list" :key="t.path" :tool="t" />
        </div>
        <p v-else class="empty">没有匹配的工具，换个关键词试试。</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding-top: 18px;
}

/* 顶部分类 Tab */
.cat-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--n-border-color);
}
.cat-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--n-border-color);
  background: var(--n-color);
  color: var(--n-text-color);
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.15s ease;
}
.cat-tab:hover {
  border-color: var(--n-primary-color);
}
.cat-tab.active {
  background: var(--n-primary-color);
  border-color: var(--n-primary-color);
  color: #fff;
}
.tab-icon {
  font-size: 14px;
}
.tab-count {
  font-size: 11px;
  opacity: 0.7;
}

.body {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 24px;
  margin-top: 22px;
}

/* 左侧栏 */
.side {
  align-self: start;
  position: sticky;
  top: 76px;
  border: 1px solid var(--n-border-color);
  border-radius: 12px;
  background: var(--n-card-color);
  overflow: hidden;
}
.side-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  font-weight: 700;
  font-size: 15px;
  border-bottom: 1px solid var(--n-border-color);
}
.side-icon {
  font-size: 17px;
}
.side-list {
  list-style: none;
  margin: 6px;
  padding: 0;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--n-text-color-2, var(--n-text-color));
  transition: background 0.12s ease;
}
.side-item:hover {
  background: color-mix(in srgb, var(--n-primary-color) 10%, transparent);
}
.side-item.active {
  background: color-mix(in srgb, var(--n-primary-color) 16%, transparent);
  color: var(--n-primary-color);
  font-weight: 600;
}
.si-icon {
  font-size: 15px;
}
.si-name {
  flex: 1;
}
.si-count {
  font-size: 12px;
  opacity: 0.65;
}

/* 右侧主区 */
.main {
  min-width: 0;
}
.main-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}
.main-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  font-size: 20px;
}
.mt-icon {
  font-size: 20px;
}
.main-count {
  font-size: 13px;
  color: var(--n-text-color-3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(258px, 1fr));
  gap: 14px;
}

.empty {
  color: var(--n-text-color-3);
  padding: 40px 0;
  text-align: center;
}

@media (max-width: 860px) {
  .body {
    grid-template-columns: 1fr;
  }
  .side {
    position: static;
  }
  .side-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .side-item {
    flex: 0 0 auto;
  }
}
</style>
