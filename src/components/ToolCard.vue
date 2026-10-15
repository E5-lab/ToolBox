<script setup lang="ts">
import type { Tool } from '../tools/types';

defineProps<{ tool: Tool }>();
</script>

<template>
  <router-link :to="tool.path" class="card">
    <div class="icon-box">{{ tool.icon }}</div>
    <div class="info">
      <div class="name">{{ tool.name }}</div>
      <div class="desc">{{ tool.description }}</div>
    </div>
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
  /* 明确的边框，让卡片一眼看出是可点击的入口 */
  border: 1.5px solid color-mix(in srgb, var(--n-border-color) 100%, transparent);
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

/* 右下角箭头：显式提示"可点击进入" */
.go {
  position: absolute;
  right: 14px;
  bottom: 14px;
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
