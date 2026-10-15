import type { Component } from 'vue';

export interface Tool {
  path: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  keywords?: string;
  component: Component;
}

/** 分类元信息：用于侧栏展示 */
export interface CategoryMeta {
  name: string;
  icon: string;
}
