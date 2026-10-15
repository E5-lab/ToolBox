<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div class="tool-page">
    <router-link to="/" class="back">← 返回首页</router-link>
    <h1 class="title">{{ title }}</h1>
    <p v-if="description" class="sub">{{ description }}</p>
    <div class="tool-body">
      <slot />
    </div>
  </div>
</template>
