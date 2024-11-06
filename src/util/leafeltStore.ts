import L from 'leaflet'; // 导入 Leaflet 库
import { defineStore } from 'pinia'; // 导入 Pinia 的 defineStore 方法用于定义 store

// 定义一个 store
export const useQLeafletStore = defineStore('qx', () => {
  // 设置获取底层地图图层方法
  const setChinaProvider = (type: string, options: any) => {
    // 使用 Leaflet 的 tileLayer 方法创建并返回一个图层实例
    return L.tileLayer(type, options);
  };

  // 返回所有方法和状态，以便在组件中使用
  return {
    setChinaProvider,
  };
});
