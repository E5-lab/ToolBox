<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  categoriesOf,
  countOfGroup,
  filterTools,
  groups,
  tools,
} from '../tools';
import type { Tool } from '../tools/types';
import ToolCard from '../components/ToolCard.vue';
import { searchText } from '../composables/useSearch';

/** 当前一级分类 */
const activeGroup = ref<string>(groups[0]?.name ?? '');
/** 当前二级分类 */
const activeCat = ref<string>('');

const isSearching = computed(() => searchText.value.trim().length > 0);

/** 当前一级分类下的二级分类 */
const subCats = computed(() => categoriesOf(activeGroup.value));

/** 右侧要展示的工具 */
const list = computed<Tool[]>(() => {
  if (isSearching.value) return filterTools(searchText.value);
  const cats = subCats.value;
  if (!cats.length) return [];
  const cat = cats.some((c) => c.name === activeCat.value)
    ? activeCat.value
    : cats[0].name;
  return tools.filter((t) => t.group === activeGroup.value && t.category === cat);
});

/** 当前选中的二级分类（处理默认值） */
const currentCat = computed(() => {
  const cats = subCats.value;
  if (!cats.length) return '';
  return cats.some((c) => c.name === activeCat.value) ? activeCat.value : cats[0].name;
});

const currentCatIcon = computed(
  () => subCats.value.find((c) => c.name === currentCat.value)?.icon ?? '📦'
);

/** 一级菜单上要显示的计数：搜索时显示匹配数，否则显示总数 */
function groupCount(g: string) {
  if (!isSearching.value) return countOfGroup(g);
  const hits = filterTools(searchText.value).filter((t) => t.group === g).length;
  return hits;
}

const visibleGroups = computed(() =>
  groups.filter((g) => !isSearching.value || groupCount(g.name) > 0)
);

function pickGroup(name: string) {
  activeGroup.value = name;
  activeCat.value = '';
  if (isSearching.value) searchText.value = '';
}

function pickCat(name: string) {
  activeCat.value = name;
}

// 搜索时跳转到第一个有命中的一级分类，便于高亮
watch(searchText, () => {
  if (!isSearching.value) return;
  const first = visibleGroups.value[0];
  if (first && groupCount(activeGroup.value) === 0) {
    activeGroup.value = first.name;
    activeCat.value = '';
  }
});

// 一级分类切换后，保证二级分类有默认选中
watch(activeGroup, () => {
  const cats = subCats.value;
  if (cats.length && !cats.some((c) => c.name === activeCat.value)) {
    activeCat.value = cats[0].name;
  }
});

const breadcrumb = computed(() => {
  if (isSearching.value) return [{ label: '搜索结果' }];
  return [
    { label: activeGroup.value },
    { label: currentCat.value, icon: currentCatIcon.value },
  ];
});
</script>

<template>
  <div class="home">
    <!-- 一级菜单（顶部） -->
    <nav class="tabs">
      <button
        v-for="g in visibleGroups"
        :key="g.name"
        class="tab"
        :class="{ active: !isSearching && g.name === activeGroup }"
        @click="pickGroup(g.name)"
      >
        <span class="tab-icon">{{ g.icon }}</span>
        <span class="tab-name">{{ g.name }}</span>
        <span class="tab-count">{{ groupCount(g.name) }}</span>
      </button>
    </nav>

    <div class="body">
      <!-- 二级菜单（左侧） -->
      <aside class="side">
        <div class="side-head">
          <span class="sh-icon">📂</span>
          <span class="sh-name">{{ isSearching ? '搜索结果' : activeGroup }}</span>
        </div>
        <ul class="side-list">
          <li
            v-for="c in subCats"
            :key="c.name"
            class="side-item"
            :class="{ active: !isSearching && c.name === currentCat }"
            @click="pickCat(c.name)"
          >
            <span class="bar" />
            <span class="si-icon">{{ c.icon }}</span>
            <span class="si-name">{{ c.name }}</span>
            <span class="si-count">{{ c.count }}</span>
          </li>
          <li v-if="!subCats.length" class="side-empty">暂无子分类</li>
        </ul>
      </aside>

      <!-- 功能选择（右侧） -->
      <section class="main">
        <div class="crumb">
          <template v-for="(b, i) in breadcrumb" :key="i">
            <span v-if="i > 0" class="sep">/</span>
            <span class="crumb-item">
              <span v-if="b.icon" class="ci-icon">{{ b.icon }}</span>
              {{ b.label }}
            </span>
          </template>
          <span class="crumb-count">共 {{ list.length }} 个功能</span>
        </div>

        <div v-if="list.length" class="grid">
          <ToolCard v-for="t in list" :key="t.path" :tool="t" />
        </div>
        <div v-else class="empty">
          <div class="empty-icon">🔍</div>
          <p>没有匹配的功能，换个关键词试试。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding-top: 18px;
}

/* ---------- 一级菜单 ---------- */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--n-border-color);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--n-text-color);
  cursor: pointer;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.15s ease;
}
.tab:hover {
  background: color-mix(in srgb, var(--n-primary-color) 10%, transparent);
  color: var(--n-primary-color);
}
.tab.active {
  background: var(--n-primary-color);
  border-color: var(--n-primary-color);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--n-primary-color) 30%, transparent);
}
.tab-icon {
  font-size: 16px;
}
.tab-count {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 16%, transparent);
}

/* ---------- 布局 ---------- */
.body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  margin-top: 22px;
}

/* ---------- 二级菜单 ---------- */
.side {
  align-self: start;
  position: sticky;
  top: 78px;
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
  font-size: 14.5px;
  border-bottom: 1px solid var(--n-border-color);
  background: color-mix(in srgb, var(--n-primary-color) 6%, transparent);
}
.sh-icon {
  font-size: 16px;
}
.side-list {
  list-style: none;
  margin: 8px;
  padding: 0;
}
.side-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px 10px 15px;
  border-radius: 9px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--n-text-color-2, var(--n-text-color));
  transition: background 0.12s ease, color 0.12s ease;
}
.side-item .bar {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 17px;
  border-radius: 2px;
  background: var(--n-primary-color);
  transition: transform 0.15s ease;
}
.side-item:hover {
  background: color-mix(in srgb, var(--n-primary-color) 9%, transparent);
}
.side-item.active {
  background: color-mix(in srgb, var(--n-primary-color) 15%, transparent);
  color: var(--n-primary-color);
  font-weight: 600;
}
.side-item.active .bar {
  transform: translateY(-50%) scaleY(1);
}
.si-icon {
  font-size: 15px;
}
.si-name {
  flex: 1;
}
.si-count {
  font-size: 11.5px;
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 14%, transparent);
}
.side-empty {
  padding: 14px;
  font-size: 13px;
  color: var(--n-text-color-3);
  text-align: center;
}

/* ---------- 右侧功能区 ---------- */
.main {
  min-width: 0;
}
.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--n-text-color-3);
}
.crumb-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--n-text-color);
  font-weight: 600;
}
.crumb-item:last-of-type {
  color: var(--n-primary-color);
}
.ci-icon {
  font-size: 15px;
}
.sep {
  opacity: 0.45;
}
.crumb-count {
  margin-left: auto;
  font-size: 13px;
  font-weight: 400;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: 16px;
}

.empty {
  padding: 60px 0;
  text-align: center;
  color: var(--n-text-color-3);
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 10px;
  opacity: 0.6;
}

@media (max-width: 860px) {
  .body {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .side {
    position: static;
  }
  .side-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .side-item {
    flex: 0 0 auto;
    padding-left: 12px;
  }
  .side-item .bar {
    display: none;
  }
}
</style>
