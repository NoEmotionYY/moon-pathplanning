import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import PlannerView from './views/PlannerView.vue'
import './assets/styles/reset.css'
import './assets/styles/variables.css'
import './assets/styles/animations.css'
import './assets/styles/global.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', component: PlannerView }],
})

createApp(App).use(createPinia()).use(router).mount('#app')
