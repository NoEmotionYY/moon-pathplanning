import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import PlannerView from './views/PlannerView.vue'
import {
  MAZE_IMPORT_ANALYSIS_FACTORY,
  useMazeImportAnalysis,
} from './composables/useMazeImportAnalysis'
import './assets/styles/reset.css'
import './assets/styles/variables.css'
import './assets/styles/animations.css'
import './assets/styles/global.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', component: PlannerView }],
})

const app = createApp(App)
// 仅注册惰性工厂以保留 Worker 构建入口；此处不会创建 Worker 或启动分析。
app.provide(MAZE_IMPORT_ANALYSIS_FACTORY, useMazeImportAnalysis)
app.use(createPinia()).use(router).mount('#app')
