import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import { tools } from '../tools';

const routes = [
  { path: '/', name: 'home', component: Home },
  ...tools.map((t) => ({
    path: t.path,
    name: t.path,
    component: t.component,
  })),
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
