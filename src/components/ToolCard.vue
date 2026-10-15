<script setup lang="ts">
import type { Tool } from '../tools/types';

defineProps<{ tool: Tool }>();
</script>

<template>
  <router-link :to="tool.path" class="card">
    <div class="icon">{{ tool.icon }}</div>
    <div class="name">{{ tool.name }}</div>
    <div class="desc">{{ tool.description }}</div>
  </router-link>
</template>

<style scoped>
.card {
  display: block;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--n-border-color);
  background: var(--n-card-color);
  transition: transform 0.15s ease, border-color 0.15s ease;
  height: 100%;
}
.card:hover {
  transform: translateY(-2px);
  border-color: var(--n-primary-color);
}
.icon { font-size: 22px; }
.name { font-weight: 600; margin: 6px 0 4px; }
.desc { font-size: 13px; color: var(--n-text-color-3); }
</style>
