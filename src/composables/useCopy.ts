import { useMessage } from 'naive-ui';

export function useCopy() {
  const message = useMessage();
  return async (text: string, label = '已复制到剪贴板') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success(label);
    } catch {
      message.error('复制失败，请手动选择文本复制');
    }
  };
}
