<script setup lang="ts">
import { computed } from 'vue';
import type { Tool } from '../tools/types';
import { favorites, toggleFavorite } from '../composables/useFavorites';

const props = defineProps<{ tool: Tool }>();

const fav = computed(() => favorites.value.includes(props.tool.path));

function onStar(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  toggleFavorite(props.tool.path);
}
</script>

<template>
  <router-link :to="tool.path" class="card">
    <div class="icon-box">{{ tool.icon }}</div>
    <div class="info">
      <div class="name">{{ tool.name }}</div>
      <div class="desc">{{ tool.description }}</div>
    </div>

    <button class="star" :class="{ on: fav }" :title="fav ? '取消收藏' : '加入收藏'" @click="onStar">
      {{ fav ? '★' : '☆' }}
    </button>

    <div class="go" aria-hidden="true">→</div>
  </router-link>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 17px 38px 17px 17px;
  border-radius: 12px;
  border: 1.5px solid var(--n-border-color);
  background: var(--n-card-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.18s ease;
  height: 100%;
  cursor: pointer;
}
.card:hover {
  transform: translateY(-3px);
  border-color: var(--n-primary-color);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--n-primary-color) 22%, transparent);
}
.card:active {
  transform: translateY(-1px);
}

.icon-box {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--n-primary-color) 25%, transparent);
  background: color-mix(in srgb, var(--n-primary-color) 13%, transparent);
  transition: all 0.18s ease;
}
.card:hover .icon-box {
  background: var(--n-primary-color);
  border-color: var(--n-primary-color);
}

.info {
  min-width: 0;
  flex: 1;
}
.name {
  font-weight: 600;
  font-size: 14.5px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.desc {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--n-text-color-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 收藏星标 */
.star {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--n-text-color-3);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.55;
  transition: all 0.15s ease;
}
.star:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--n-primary-color) 14%, transparent);
  color: var(--n-primary-color);
}
.star.on {
  opacity: 1;
  color: #f0a020;
}

/* 右下角箭头：提示可点击进入 */
.go {
  position: absolute;
  right: 14px;
  bottom: 12px;
  font-size: 15px;
  color: var(--n-text-color-3);
  opacity: 0.5;
  transition: all 0.18s ease;
}
.card:hover .go {
  color: var(--n-primary-color);
  opacity: 1;
  transform: translateX(3px);
}
</style>
