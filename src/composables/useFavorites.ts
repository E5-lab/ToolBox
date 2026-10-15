import { ref, watch } from 'vue';

const FAV_KEY = 'toolbox:favorites';
const RECENT_KEY = 'toolbox:recents';
const MAX_RECENT = 12;

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式等场景下静默失败 */
  }
}

/** 收藏的工具 path 列表 */
export const favorites = ref<string[]>(read(FAV_KEY));
/** 最近使用的工具 path 列表（最近的在前） */
export const recents = ref<string[]>(read(RECENT_KEY));

watch(favorites, (v) => write(FAV_KEY, v), { deep: true });
watch(recents, (v) => write(RECENT_KEY, v), { deep: true });

export function isFavorite(path: string): boolean {
  return favorites.value.includes(path);
}

export function toggleFavorite(path: string) {
  const idx = favorites.value.indexOf(path);
  if (idx >= 0) favorites.value.splice(idx, 1);
  else favorites.value.unshift(path);
}

/** 记录一次使用（去重并置顶） */
export function pushRecent(path: string) {
  const idx = recents.value.indexOf(path);
  if (idx >= 0) recents.value.splice(idx, 1);
  recents.value.unshift(path);
  if (recents.value.length > MAX_RECENT) recents.value.length = MAX_RECENT;
}
