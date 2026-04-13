<template>
  <div class="exec-shell list-shell">
    <header class="exec-masthead pb-0">
      <div class="masthead-inner pb-2">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gestión Académica</span>
            <h1 class="brand-title">Panel del Bot WhatsApp</h1>
          </div>
        </div>
      </div>

      <div class="exec-tabs-container">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="exec-tab"
          :class="{ 'exec-tab-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i class="fa-solid me-2" :class="tab.icon"></i>
          {{ tab.name }}
        </button>
      </div>
    </header>

    <div class="exec-tab-content">
      <KeepAlive>
        <component :is="activeComponent" />
      </KeepAlive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Importamos los componentes hijos
import BotDashboard from './BotDashboard.vue'
import BotTickets from './BotTickets.vue'
import BotAlumnos from './BotAlumnos.vue'
import BotCsat from './BotCsat.vue'

// Estado de la pestaña activa
const activeTab = ref('tickets') // Por defecto abrimos los tickets

// Configuración de las pestañas
const tabs = [
  { id: 'dashboard', name: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'tickets', name: 'Solicitudes / Tickets', icon: 'fa-ticket' },
  { id: 'alumnos', name: 'Base ODS Alumnos', icon: 'fa-users' },
  { id: 'csat', name: 'Calidad CSAT', icon: 'fa-star' }
]

// Computado para resolver qué componente renderizar
const activeComponent = computed(() => {
  const map = {
    'dashboard': BotDashboard,
    'tickets': BotTickets,
    'alumnos': BotAlumnos,
    'csat': BotCsat
  }
  return map[activeTab.value]
})
</script>

<style scoped>
.exec-shell {
  background: var(--slate-50, #f8fafc);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.exec-masthead {
  background: var(--navy-900, #0f172a);
  color: #fff;
  border-bottom: 1px solid var(--navy-700, #334155);
}
.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 28px;
}
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }

/* Estilos de las pestañas */
.exec-tabs-container {
  display: flex;
  padding: 0 28px;
  gap: 20px;
}
.exec-tab {
  background: transparent;
  border: none;
  color: var(--slate-400, #94a3b8);
  padding: 12px 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
}
.exec-tab:hover {
  color: var(--slate-200, #e2e8f0);
}
.exec-tab-active {
  color: var(--teal-400, #2dd4bf);
  border-bottom-color: var(--teal-400, #2dd4bf);
}
.exec-tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>