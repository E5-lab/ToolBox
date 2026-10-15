<script setup lang="ts">
import { computed, ref } from 'vue';
import { NInput, NGrid, NGi } from 'naive-ui';
import { tools, categories } from '../tools';
import ToolCard from '../components/ToolCard.vue';

const search = ref('');
const q = computed(() => search.value.trim().toLowerCase());

const filtered = computed(() => {
  if (!q.value) return tools;
  return tools.filter((t) =>
    (t.name + t.description + (t.keywords || '') + t.category)
      .toLowerCase()
      .includes(q.value)
  );
});

const visibleCats = computed(() =>
  categories.filter((c) => filtered.value.some((t) => t.category === c))
);
</script>

<template>
  <div>
    <section class="hero">
      <h1>我的工具箱</h1>
      <p>纯前端在线工具集合 · 数据不出浏览器 · 永久免费</p>
    </section>

    <n-input
      v-model:value="search"
      placeholder="搜索工具，如 json、二维码、PDF…"
      clearable
      style="margin: 16px 0 8px"
    />

    <section v-for="cat in visibleCats" :key="cat" class="cat">
      <h2 class="cat-title">{{ cat }}</h2>
      <n-grid x-gap="14" y-gap="14" cols="1 500:2 800:3 1100:4" responsive="screen">
        <n-gi v-for="t in filtered.filter((x) => x.category === cat)" :key="t.path">
          <ToolCard :tool="t" />
        </n-gi>
      </n-grid>
    </section>

    <p v-if="filtered.length === 0" class="empty">没有匹配的工具，换个关键词试试。</p>
  </div>
</template>
