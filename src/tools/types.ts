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
