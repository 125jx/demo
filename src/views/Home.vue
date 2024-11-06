<template>
    <div ref="mapContainer" class="map-container"></div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, onUnmounted } from 'vue';
import L from 'leaflet'; // 导入Leaflet库，用于地图功能
import 'leaflet/dist/leaflet.css'; // Leaflet样式
import { useQLeafletStore } from '../util/leafeltStore'; // 引入自定义仓库
import { TianDiTu } from '../util/tiandituConstants'; // 引入天地图常量
import '../components/leaflet-velocity/leaflet-velocity.css';
import '../components/leaflet-velocity/leaflet-velocity';  
import windJson from '../json/wind-global.json';
// 定义DOM引用
const mapContainer = ref(null); // 地图容器DOM引用
const map = ref(null); // 地图实例引用
const center = ref([39.26, 115.25]); // 地图初始中心点坐标:经纬度
const leafletStore = useQLeafletStore(); // 使用自定义仓库
let velocityLayer = null; // 风场图层
// 风场参数
const options = reactive({
  displayValues: true, // 是否显示速度值
  displayOptions: {
    velocityType: '风向/风速', // 显示的类型名称
    displayPosition: 'bottomleft', // 显示位置
    displayEmptyString: 'No wind data', // 没有数据时显示的文字
    speedUnit: 'm/s', // 速度单位
    speedString: 'Speed', // 速度标签
  },
  data: windJson, // 风场数据
  minVelocity: 0, // 最小速率
  maxVelocity: 16, // 最大速率
  velocityScale: 0.1, // 风速比例 (粒子的小尾巴长度)
  particleAge: 90, // 粒子在再生之前绘制的最大帧数
  particleMultiplier: 1 / 2000, // 粒子的数量
  lineWidth: 2, // 粒子的粗细
  frameRate: 10, // 定义每秒执行的次数
  // 定义颜色渐变，用于根据速度值映射不同的颜色
  colorScale: ['#11999e', '#32CD32'],
});
  // 初始化地图
const initMap = () => {
    // 设置天地图图层加载参数
  const options = {
  subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
  };
    // 通过 QXStore 获取天地图矢量图层和注记图层
    // const mapVec = leafletStore.setChinaProvider(TianDiTu.Normal.Map, options);
    // const mapCva = leafletStore.setChinaProvider(TianDiTu.Normal.Annotion, options);
    const mapVec = leafletStore.setChinaProvider(TianDiTu.Satellite.Map, options);
    const mapCva = leafletStore.setChinaProvider(TianDiTu.Satellite.Annotion, options);
    // 将两个图层组合成一个Layer Group
    const layers = L.layerGroup([mapVec, mapCva]);
    // 实例化地图对象，设置中心点、缩放级别、最小最大缩放限制等配置
    map.value = L.map(mapContainer.value, {
      center: center.value, // 中心点坐标
      zoom: 3, // 初始缩放级别
      minZoom: 3, // 最小缩放级别
      maxZoom: 8, // 最大缩放级别
      noWrap: true, // 禁止地图水平滚动
      layers: [layers], // 加载图层组
      zoomControl: true, // 显示缩放控制
      attributionControl: false, // 隐藏版权信息
    });
  };
  /*** 初始化风场图层:见leAaflet的代码 */
  const initVelocity = () => {
    velocityLayer = L.velocityLayer(options).addTo(map.value);
  };
  // 组件挂载完成后初始化地图
  onMounted(async () => {
    // 初始化地图
    initMap();
    await new Promise(resolve => setTimeout(resolve, 500)); // 延迟加载风场图层
    // 初始化风场图
    initVelocity();

    });
  // 组件卸载前清理地图和图表资源，防止内存泄漏
  onUnmounted(() => {
    map.value?.remove();
  });

  
  </script>
  <style lang="scss" scoped>
  .map-container {
    position: relative;
    width: 1300px;
    height: 700px;
    z-index: 1;
  }
  ::v-deep {
    .leaflet-bottom {
      margin-bottom: 100px;
      bottom: 1ch;
    }
    .leaflet-right {
      margin-right: 100px;
      right: 1ch;
    }
  }
  </style>