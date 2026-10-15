import type { Component } from 'vue';

export interface Tool {
  path: string;
  name: string;
  description: string;
  /** 一级分类（顶部菜单） */
  group: string;
  /** 二级分类（左侧菜单） */
  category: string;
  icon: string;
  keywords?: string;
  component: Component;
}

/** 一级分类元信息 */
export interface GroupMeta {
  name: string;
  icon: string;
}

/** 二级分类元信息 */
export interface CategoryMeta {
  name: string;
  icon: string;
  /** 所属一级分类 */
  group: string;
}
