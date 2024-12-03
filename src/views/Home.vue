<template>
  <div ref="mapContainer" class="map-container"></div>

  <img src="../assets/layers-2x.png" class="logo"  @mouseenter="handleChange">

  <div class='formData' v-if="isVisible.showDiv" @mouseleave="handleLeaf">
    <el-form :model="formData">
      <el-form-item>
        <el-radio-group v-model="formData.selectedOption" class="radio-group">
          <el-radio label="wind" style="margin-left: 30px; font-weight: 700;" >风场图层</el-radio>
          <el-radio label="heat" style="margin-left: 30px; font-weight: 700;">热力图层</el-radio>
          <el-radio label="typhoon" style="font-weight: 700;">台风路径</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
  </div>
  

</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, onUnmounted, watch } from 'vue';
import L from 'leaflet'; // 导入Leaflet库，用于地图功能
import 'leaflet/dist/leaflet.css'; // Leaflet样式
import { useQLeafletStore } from '../util/leafeltStore'; // 引入自定义仓库
import { TianDiTu } from '../util/tiandituConstants'; // 引入天地图常量
import '../components/leaflet-velocity/leaflet-velocity.css';
import '../components/leaflet-velocity/leaflet-velocity';  
import windJson from '../json/wind-global.json'; // 风场数据
// import windJson from '/public/new-wind-global3.json';  // 风场数据
// @ts-ignore
import dataJson from '/public/data.json';  // 热力图数据
// @ts-ignore
import typhoonGeoJson from '/public/typhoon_path/2012.json'; // 导入 GeoJSON 数据
import 'leaflet.heat';         // 引入热力图插件
import axios from 'axios';


// 定义DOM引用
const mapContainer = ref(null); // 地图容器DOM引用
const map = ref(null); // 地图实例引用
const center = ref([39.26, 115.25]); // 地图初始中心点坐标:经纬度
const leafletStore = useQLeafletStore(); // 使用自定义仓库
// @ts-ignore
let velocityLayer = null; // 风场图层
// @ts-ignore
let heatmapLayer = null; // 热力图图层
// @ts-ignore
let geoJsonLayer  = null;
const formData = reactive({
    selectedOption: 'wind1', // 默认选项
});
const isVisible = reactive({
  showDiv: false, // 默认显示
});
const zoomLevel = ref(3); // 地图缩放级别

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
  // @ts-ignore
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
  // 监听 zoomend 事件来更新 zoomLevel
  // @ts-ignore
  map.value.on('zoomend', () => {
    // @ts-ignore
    zoomLevel.value = map.value.getZoom();
  });
};

/*** 初始化风场图层:见leaflet的代码 */
const initVelocity = () => {
  // @ts-ignore
  if (velocityLayer) {
    // @ts-ignore
    map.value.removeLayer(velocityLayer);  // 如果已存在，先移除旧的风场图层
  }
  // @ts-ignore
  velocityLayer = L.velocityLayer(options).addTo(map.value);
};
// 移除风场图层
const removeVelocityLayer = () => {
  // @ts-ignore
if (velocityLayer) {
  // @ts-ignore
  map.value.removeLayer(velocityLayer);  // 从地图上移除风场图层
  velocityLayer = null;  // 清空图层引用
}
};
//  ############################ 绘制热力图 ########################################
// 初始化热力图图层
const initHeatmap = () => {
  // 如果已有热力图层，先移除它
  // @ts-ignore
  if (heatmapLayer) {
    // @ts-ignore
    map.value.removeLayer(heatmapLayer);  // 从地图上移除热力图图层
  }
  // 创建热力图数据，温度值作为权重传入
  // @ts-ignore
  const formattedData = dataJson.map(([lng, lat, temp]) => {
    return [lat, lng, temp];  // 经度和纬度位置，温度作为权重
  });

  // console.log(formattedData);
  // 创建热力图
  // @ts-ignore
  heatmapLayer = L.heatLayer(formattedData, {
    radius: 12,      // 热力图点的半径
    blur: 25,         // 模糊度
    maxZoom: 8,      // 最大缩放级别
    minZoom: 3,      // 最小缩放级别
    zoom: 3,
    gradient: {      // 可选的渐变颜色
      '0.0': 'blue',   // 温度最低点
      '0.1': 'lightblue',
      '0.2': 'cyan',
      '0.3': 'green',
      '0.4': 'yellow',
      '0.5': 'orange',
      '0.6': 'red',
      '0.7': 'darkred',
      '0.8': 'purple',
      '0.9': 'maroon',
      '1.0': 'black'    // 温度最高点
    }
  }).addTo(map.value);  // 将热力图添加到地图
};
// 移除热力图图层的函数
const removeHeatmap = () => {
  // @ts-ignore
if (heatmapLayer) {
  // @ts-ignore
  map.value.removeLayer(heatmapLayer);  // 移除热力图
  heatmapLayer = null;  // 清空热力图图层变量
}
};

const handleChange = () => {
isVisible.showDiv = true
}

const handleLeaf = () => {
isVisible.showDiv = false
}
// ##################### 台风路径 #####################

// 设置每次展示的间隔时间
const updateInterval = 100; // 每秒更新一次


let currentIndex = 0; // 当前显示的点的索引
// @ts-ignore
let currentTyphoonEyeLayer = null; // 当前台风眼的图层
let fadeOutTimeout = null; // 用于渐变消失的定时器

const initializeJsonLayer = () => {
  // 创建一个空的 GeoJSON 图层
  geoJsonLayer = L.geoJSON(null, {
    style: function (feature) {
      return {
        color: 'lightblue',
        weight: 2,
        opacity: 1,
        fillColor: "#ffff00",
        fillOpacity: 0.3
      };
    }
    // @ts-ignore
  }).addTo(map.value);
  // 设置一个函数逐步显示路径
  const animateTyphoon = () => {
    if (currentIndex < typhoonGeoJson.features[1].geometry.coordinates.length) {
      const currentCoordinates = typhoonGeoJson.features[1].geometry.coordinates.slice(0, currentIndex + 1);

      // 更新路径
      // @ts-ignore
      geoJsonLayer.clearLayers(); // 清除上次的路径
      // @ts-ignore
      geoJsonLayer.addData({
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": currentCoordinates
        },
        "properties": {}
      });

      // 删除之前的台风眼
      // @ts-ignore
      if (currentTyphoonEyeLayer) {
        // @ts-ignore
        map.value.removeLayer(currentTyphoonEyeLayer);
      }

      // 在当前台风眼的位置显示一个大圆，添加模糊效果
      const currentEye = typhoonGeoJson.features[1].geometry.coordinates[currentIndex];
      currentTyphoonEyeLayer = L.circleMarker([currentEye[1], currentEye[0]], {
        radius: 10,   // 设置为较大的半径
        fillOpacity: 0.4,  // 填充透明度
        weight: 1,    // 边框宽度
        opacity: 0.6, // 边框透明度
        // 添加模糊效果
        className: 'typhoon-eye' // 通过 CSS 来添加模糊效果
        // @ts-ignore
      }).addTo(map.value);

      // 增加索引，显示下一个点
      currentIndex++;

      // 继续动画
      setTimeout(animateTyphoon, updateInterval);
    } else {
      // 动画结束时，台风眼慢慢消失
      fadeOutTyphoonEye();
    }
  };

  // 让台风眼慢慢消失
  const fadeOutTyphoonEye = () => {
    let opacity = 0.6;
    const fadeOutStep = () => {
      if (opacity > 0) {
        opacity -= 0.05; // 每次减少一点透明度
        // @ts-ignore
        currentTyphoonEyeLayer.setStyle({
          fillOpacity: opacity,
          opacity: opacity
        });
        fadeOutTimeout = setTimeout(fadeOutStep, 100); // 每100ms更新一次
      } else {
        // 完全消失时移除台风眼图层
        // @ts-ignore
        if (currentTyphoonEyeLayer) {
          // @ts-ignore
          map.value.removeLayer(currentTyphoonEyeLayer);
        }
      }
    };
    fadeOutStep();
  };

  // 启动动画
  animateTyphoon();
};
const removeTyphoonmap = () => {
  // @ts-ignore
  if (geoJsonLayer) {
    // @ts-ignore
    map.value.removeLayer(geoJsonLayer);  
    geoJsonLayer = null;
  }
};

// 组件挂载完成后初始化地图
onMounted(async () => {
  // 初始化地图
  initMap();
  await new Promise(resolve => setTimeout(resolve, 300)); // 延迟加载风场图层

});
// 监听 selectedOption 的变化，动态调用初始化函数
watch(() => formData.selectedOption, (newValue) => {
      // console.log(newValue);
      initializeLayer(newValue);
});
// 使用 watch 监听 zoomLevel 变化，可以在此做其他操作，比如发送请求等
watch(zoomLevel, (newZoom) => {
  // console.log('当前缩放级别:', newZoom);
  // @ts-ignore
  if (selectedOption === 'wind') {
    initVelocity();
    // @ts-ignore
  } else if(selectedOption === 'heat') {
    initHeatmap();
    // @ts-ignore
  } else if(selectedOption === 'typhoon') {
    initializeJsonLayer();
    // 当前情况下不需要处理其他选项
  }
});

// 根据选中的选项执行相应的初始化函数
// @ts-ignore
const initializeLayer = (selectedOption) => {
  if (selectedOption === 'wind') {
    removeTyphoonmap();
    removeHeatmap();
    initVelocity();
  } else if(selectedOption === 'heat') {
    removeTyphoonmap();
    removeVelocityLayer();
    initHeatmap();
  } else if(selectedOption === 'typhoon') {
    removeVelocityLayer();
    removeHeatmap();
    initializeJsonLayer();
  }
};

// 组件卸载前清理地图和图表资源，防止内存泄漏
onUnmounted(() => {
  // @ts-ignore
  map.value?.remove();
});


</script>

<style lang="scss" scoped>
.map-container {
// position: relative;
width: 2500px;
height: 100vh;
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

.radio-group {
margin-top: 10px;
display: flex;
flex-direction: column;
}

.el-radio {
margin-bottom: 10px; /* 每个选项之间的间距 */
}
.el-form-item {
margin-bottom: 20px; /* 调整表单项的间距 */
}
.formData {
background-color: #ffffff;
width: 150px;
height: 150px;
position: absolute;
top: 40px;
right: 20px;
z-index: 12;
border-width: 2px;
border-color: #2e2e2e;
}
.logo {
position: absolute;
top: 20px;
right: 20px;
z-index: 12;
}
.typhoon-eye {
  position: relative;
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, #87CEEB 10%, #1E90FF 50%, #00008B 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5); /* 给台风眼加上阴影，增加立体感 */
  border: 4px solid #ffffff; /* 外环边框 */
}
</style>