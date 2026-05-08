<template>
  <div class="bot-academica-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">Gestión Académica</span>
        <h1 class="ep-title">Panel del Bot WhatsApp</h1>
        <span class="ep-subtitle">Métricas, tickets, alumnos y calidad de la atención automatizada</span>
      </div>
      <div class="ep-masthead-actions">
        <span class="ep-bot-badge" title="Conexión activa">
          <i class="fa-brands fa-whatsapp"></i>
          Bot online
        </span>
      </div>
    </header>

    <section class="ep-section ep-tabs-section">
      <nav class="ep-tabs" aria-label="Vistas del bot">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="ep-tab"
          :class="{ 'is-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <i class="fa-solid" :class="tab.icon"></i> {{ tab.name }}
        </button>
      </nav>
    </section>

    <main class="ep-body">
      <KeepAlive>
        <component :is="activeComponent" />
      </KeepAlive>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

import BotDashboard from './BotDashboard.vue'
import BotTickets from './BotTickets.vue'
import BotAlumnos from './BotAlumnos.vue'
import BotCsat from './BotCsat.vue'

const activeTab = ref('tickets')

const tabs = [
  { id: 'dashboard', name: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'tickets',   name: 'Solicitudes / Tickets', icon: 'fa-ticket' },
  { id: 'alumnos',   name: 'Base ODS Alumnos', icon: 'fa-users' },
  { id: 'csat',      name: 'Calidad CSAT', icon: 'fa-star' }
]

const activeComponent = computed(() => {
  const map = {
    dashboard: BotDashboard,
    tickets:   BotTickets,
    alumnos:   BotAlumnos,
    csat:      BotCsat
  }
  return map[activeTab.value]
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════
   LAYOUT — diseño basado en comercial/Leads.vue
   ═══════════════════════════════════════════════════ */
.bot-academica-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px 28px;
  font-size: 13px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* === Masthead === */
.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}
.ep-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ep-breadcrumb {
  font-size: 11px;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.ep-title {
  font-size: 26px;
  font-weight: 600;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle {
  font-size: 13.5px;
  color: var(--e-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}
.ep-masthead-actions { display: flex; align-items: center; gap: 10px; }
.ep-bot-badge {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px; font-size: 12px; font-weight: 600;
  color: #047857; background: var(--e-accent-soft);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 999px;
}
.ep-bot-badge i { font-size: 13px; }

/* === Tabs (estilo ep-tabs de Leads) === */
.ep-section {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
}
.ep-tabs-section {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  padding: 10px 14px;
}
.ep-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ep-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px;
  font-size: 12.5px; font-weight: 500;
  color: var(--e-text-secondary);
  background: var(--e-bg-subtle);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s ease;
  font-family: inherit;
  white-space: nowrap;
}
.ep-tab i { font-size: 11px; opacity: 0.7; }
.ep-tab:hover {
  color: var(--e-text);
  background: #F5F5F5;
}
.ep-tab.is-active {
  color: var(--e-accent);
  background: var(--e-accent-soft);
  border-color: rgba(16, 185, 129, 0.25);
  font-weight: 600;
}
.ep-tab.is-active i { opacity: 1; }

/* === Body === */
.ep-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* === Dark mode === */
[data-coreui-theme="dark"] .bot-academica-page {
  --e-bg: #1A1A14;
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16, 185, 129, 0.16);
}
[data-coreui-theme="dark"] .bot-academica-page .ep-tabs-section { background: #1A1A14; }
[data-coreui-theme="dark"] .bot-academica-page .ep-tab { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .bot-academica-page .ep-tab:hover { background: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .bot-academica-page .ep-tab.is-active {
  background: rgba(16, 185, 129, 0.16);
  color: #34D399;
  border-color: rgba(52, 211, 153, 0.32);
}
[data-coreui-theme="dark"] .bot-academica-page .ep-bot-badge {
  color: #34D399;
  background: rgba(16, 185, 129, 0.16);
  border-color: rgba(52, 211, 153, 0.32);
}
</style>
