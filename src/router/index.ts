import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import { tools } from '../tools';
import { pushRecent } from '../composables/useFavorites';

const routes = [
  { path: '/', name: 'home', component: Home },
  ...tools.map((t) => ({
    path: t.path,
    name: t.path,
    component: t.component,
  })),
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// 进入工具页时记录「最近使用」
router.afterEach((to) => {
  if (to.path !== '/') pushRecent(to.path);
});

export default router;
