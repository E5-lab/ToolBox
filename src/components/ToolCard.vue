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
  </router-link>
</template>

<style scoped>
.card {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 15px;
  border-radius: 12px;
  border: 1px solid var(--n-border-color);
  background: var(--n-card-color);
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  height: 100%;
}
.card:hover {
  transform: translateY(-2px);
  border-color: var(--n-primary-color);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--n-primary-color) 12%, transparent);
}
.icon-box {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--n-primary-color) 12%, transparent);
}
.info {
  min-width: 0;
}
.name {
  font-weight: 600;
  font-size: 14.5px;
  margin-bottom: 3px;
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
</style>
