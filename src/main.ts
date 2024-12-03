import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia';
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

const app = createApp(App)
const pinia = createPinia();

app.use(pinia); // 确保在这里调用 app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')
