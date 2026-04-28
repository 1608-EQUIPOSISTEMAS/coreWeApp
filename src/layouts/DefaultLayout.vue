<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useSidebarStore } from '@/stores/sidebar.js'

const sidebar = useSidebarStore()
</script>

<template>
  <div class="layout-shell">
    <AppSidebar />
    <div
      v-if="sidebar.visible"
      class="sidebar-backdrop d-lg-none"
      @click="sidebar.toggleVisible(false)"
    ></div>
    <div class="main-shell" :class="{ 'is-shifted': sidebar.visible }">
      <AppHeader />
      <main class="page-body">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-shell {
  min-height: 100vh;
  background: #F7F7F5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background 0.18s;
}

.main-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: padding-left 0.22s ease;
}

@media (min-width: 992px) {
  .main-shell.is-shifted {
    padding-left: 232px;
  }
}

.page-body {
  flex: 1;
  padding: 22px 28px 60px;
  max-width: 100%;
  overflow-x: hidden;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20,20,15,0.32);
  z-index: 999;
  animation: fade 0.18s ease;
}
@keyframes fade { from { opacity: 0; } }

[data-coreui-theme="dark"] .layout-shell {
  background: #0E0E0A;
}
[data-coreui-theme="dark"] .sidebar-backdrop {
  background: rgba(0,0,0,0.55);
}
</style>
