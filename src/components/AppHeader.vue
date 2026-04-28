<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useColorModes } from '@coreui/vue'
import { useToast } from 'vue-toastification'

import { useNotifications } from '@/composables/useNotifications'
import UnattendedCallsModal from '@/components/UnattendedCallsModal.vue'
import { useSidebarStore } from '@/stores/sidebar.js'
import { ServiceKeys } from '@/services'
import { inject } from 'vue'

const { colorMode, setColorMode } = useColorModes('coreui-free-vue-admin-template-theme')
const route = useRoute()
const router = useRouter()
const toast = useToast()
const sidebar = useSidebarStore()
const integrationService = inject(ServiceKeys.Integration)
const catalog = inject('catalog')

const { notifications, unreadCount, onOpenBell, modal5pm } = useNotifications()

const stickyShadow = ref(false)
function handleScroll() {
  stickyShadow.value = document.documentElement.scrollTop > 0
}
onMounted(() => document.addEventListener('scroll', handleScroll))
onUnmounted(() => document.removeEventListener('scroll', handleScroll))

const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  fico: 'Finanzas',
  inscripciones: 'Inscripciones',
  tokens: 'Tokens',
  producto: 'Producto',
  programas: 'Programas',
  docentes: 'Docentes',
  cronograma: 'Cronograma',
  precios: 'Precios',
  links: 'Carga de Links',
  comercial: 'Comercial',
  leads: 'Leads',
  fundacion: 'Fundación',
  business: 'B2B',
  b2b: 'B2B',
  companies: 'Empresas',
  contracts: 'Contratos',
  agreements: 'Convenios',
  'company-leads': 'Leads Empresas',
  academica: 'Académica',
  aulas: 'Aulas',
  bot: 'Bot Académico',
  marketing: 'Marketing',
  overview: 'Overview',
  general: 'General',
  cliente: 'Cliente',
  notificaciones: 'Notificaciones',
  new: 'Nuevo',
}

const crumbs = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  return segments.map((seg, i) => {
    const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1)
    const path = '/' + segments.slice(0, i + 1).join('/')
    return { label, path, current: i === segments.length - 1 }
  })
})

const user = JSON.parse(localStorage.getItem('user') || '{}')
const userName = user.name || user.alias || user.username || 'Usuario'
const userAlias = user.alias
const userInitials = computed(() => {
  const parts = String(userName).trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'US'
})

function goToNotification(notif) {
  if (notif.lead_id) {
    router.push({ name: 'ComercialLeadDetalle', params: { id: notif.lead_id } })
  }
}

function formatRelativeTime(iso) {
  return new Date(iso).toLocaleString('es-PE')
}

const syncChannel = new BroadcastChannel('catalog_sync')
onMounted(() => {
  syncChannel.onmessage = (event) => {
    if (event.data === 'reload') window.location.reload()
  }
})
onUnmounted(() => syncChannel.close())

async function syncCatalog() {
  try {
    toast.info('Sincronizando catálogo...')
    await catalog.refresh()
    localStorage.removeItem('membershipList')
    await catalog.membershipList({ active: true })
    toast.success('Catálogo sincronizado correctamente')
    syncChannel.postMessage('reload')
    setTimeout(() => window.location.reload(), 1000)
  } catch (error) {
    console.error('Error al sincronizar catálogo:', error)
    toast.error('Error al sincronizar el catálogo')
  }
}

async function updateBase() {
  try {
    const response = await integrationService.updateLeadBase()
    if (response && response.ok) {
      toast.success(`Base actualizada. Registros generados: ${response.data.rows_generated}`)
    } else {
      throw new Error(response?.message || 'Error desconocido al actualizar la base')
    }
  } catch (error) {
    console.error('Error al actualizar la base:', error)
    toast.error('Error al actualizar la base de Asesor')
  }
}

async function syncRprospectosToSheet() {
  try {
    const response = await integrationService.syncRprospectos()
    if (response && response.ok) toast.success('GOOGLE SHEET PROSPECTOS SINCRONIZADOS')
    else throw new Error(response?.message || 'Error desconocido')
  } catch (error) {
    console.error('Error al sincronizar prospectos:', error)
    toast.error('Error al sincronizar prospectos')
  }
}

async function syncScheduleToSheet() {
  try {
    const response = await integrationService.syncScheduleToSheet()
    if (response && response.ok) toast.success('GOOGLE SHEET PLANEAMIENTO SINCRONIZADO')
    else throw new Error(response?.message || 'Error desconocido')
  } catch (error) {
    console.error('Error al sincronizar el cronograma:', error)
    toast.error('Error al sincronizar el cronograma')
  }
}

function logout() {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  window.location.reload()
}

function $hasRole(roles) {
  const u = JSON.parse(localStorage.getItem('user') || '{}')
  const userRoles = u.roles || []
  return roles.some((r) => userRoles.includes(r))
}
</script>

<template>
  <div class="topbar" :class="{ 'is-sticky': stickyShadow }">
    <button
      type="button"
      class="icon-btn menu-toggler"
      aria-label="Abrir menú"
      @click="sidebar.toggleVisible()"
    >
      <CIcon icon="cil-menu" size="sm" />
    </button>
    <div class="crumbs">
      <RouterLink to="/" class="c home">
        <i class="fa-solid fa-house"></i>
      </RouterLink>
      <template v-for="(c, i) in crumbs" :key="c.path">
        <span class="sep"><CIcon icon="cil-chevron-right" size="sm" /></span>
        <RouterLink
          v-if="!c.current"
          :to="c.path"
          class="c"
        >{{ c.label }}</RouterLink>
        <span v-else class="c current">{{ c.label }}</span>
      </template>
    </div>

    <div class="spacer"></div>

    <button type="button" class="search" disabled>
      <CIcon icon="cil-magnifying-glass" size="sm" />
      <span>Buscar en todo el sistema...</span>
      <span class="kbd">⌘K</span>
    </button>

    <CDropdown variant="nav-item" placement="bottom-end" @show="onOpenBell">
      <CDropdownToggle :caret="false" class="icon-btn notif-toggle">
        <CIcon icon="cil-bell" size="sm" />
        <span v-if="unreadCount > 0" class="notif-badge">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </CDropdownToggle>
      <CDropdownMenu
        class="notif-menu"
        style="min-width: 380px; width: 380px; max-width: 92vw; padding: 0;"
      >
        <div class="notif-header">
          <div class="notif-header__titles">
            <div class="notif-header__title">Notificaciones</div>
            <div class="notif-header__subtitle">
              <template v-if="unreadCount > 0">{{ unreadCount }} sin leer</template>
              <template v-else>Todo al día</template>
            </div>
          </div>
          <span v-if="unreadCount > 0" class="notif-header__pill">{{ unreadCount }}</span>
        </div>
        <div v-if="notifications.length === 0" class="notif-empty">
          <CIcon icon="cil-bell" size="xl" class="notif-empty__icon" />
          <div class="notif-empty__title">Sin notificaciones</div>
          <div class="notif-empty__hint">Te avisaremos cuando algo requiera tu atención.</div>
        </div>
        <div v-else class="notif-list">
          <button
            v-for="notif in notifications"
            :key="notif.notification_id"
            type="button"
            :class="['notif-item', { 'notif-item--read': notif.is_read }]"
            @click="goToNotification(notif)"
          >
            <span class="notif-item__bar" aria-hidden="true" />
            <div class="notif-item__body">
              <div class="notif-item__title">{{ notif.title }}</div>
              <div class="notif-item__message">{{ notif.message }}</div>
              <div class="notif-item__time">{{ formatRelativeTime(notif.created_at) }}</div>
            </div>
          </button>
        </div>
      </CDropdownMenu>
    </CDropdown>

    <CDropdown variant="nav-item" placement="bottom-end">
      <CDropdownToggle :caret="false" class="icon-btn">
        <CIcon v-if="colorMode === 'dark'" icon="cil-moon" size="sm" />
        <CIcon v-else-if="colorMode === 'light'" icon="cil-sun" size="sm" />
        <CIcon v-else icon="cil-contrast" size="sm" />
      </CDropdownToggle>
      <CDropdownMenu>
        <CDropdownItem
          :active="colorMode === 'light'"
          class="d-flex align-items-center"
          component="button"
          type="button"
          @click="setColorMode('light')"
        >
          <CIcon class="me-2" icon="cil-sun" size="lg" /> Light
        </CDropdownItem>
        <CDropdownItem
          :active="colorMode === 'dark'"
          class="d-flex align-items-center"
          component="button"
          type="button"
          @click="setColorMode('dark')"
        >
          <CIcon class="me-2" icon="cil-moon" size="lg" /> Dark
        </CDropdownItem>
        <CDropdownItem
          :active="colorMode === 'auto'"
          class="d-flex align-items-center"
          component="button"
          type="button"
          @click="setColorMode('auto')"
        >
          <CIcon class="me-2" icon="cil-contrast" size="lg" /> Auto
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>

    <CDropdown placement="bottom-end" variant="nav-item">
      <CDropdownToggle :caret="false" class="topbar-avatar-btn">
        <span class="topbar-avatar">{{ userInitials }}</span>
      </CDropdownToggle>
      <CDropdownMenu class="pt-0 user-menu">
        <CDropdownHeader
          component="h6"
          class="bg-body-secondary text-body-secondary fw-semibold mb-2 rounded-top"
        >
          Cuenta
        </CDropdownHeader>
        <CDropdownItem v-if="$hasRole(['COMERCIAL'])" @click="updateBase()">
          <CIcon icon="cil-cloud-download" /> Actualizar {{ userAlias }}
        </CDropdownItem>
        <CDropdownItem v-if="$hasRole(['LIDER_COMERCIAL','ADMIN'])" @click="syncRprospectosToSheet()">
          <CIcon icon="cil-cloud-download" /> Prospectos
        </CDropdownItem>
        <CDropdownItem v-if="$hasRole(['ADMIN','PRODUCTO','LIDER GERENCIA'])" @click="syncScheduleToSheet()">
          <CIcon icon="cil-cloud-download" /> Planeamiento
        </CDropdownItem>
        <CDropdownHeader
          component="h6"
          class="bg-body-secondary text-body-secondary fw-semibold my-2"
        >
          Configuración
        </CDropdownHeader>
        <CDropdownItem @click="syncCatalog">
          <CIcon icon="cil-cloud-download" /> Actualizar Sistema
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem @click="logout()">
          <CIcon icon="cil-lock-locked" /> Cerrar Sesión
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>

    <UnattendedCallsModal
      v-model="modal5pm.show"
      :registros="modal5pm.registros"
    />
  </div>
</template>

<style scoped>
.topbar {
  --bg-elev: #FFFFFF;
  --bg-soft: #FAFAF8;
  --line: #E8E8E3;
  --ink: #14140F;
  --ink-2: #3A3A33;
  --ink-3: #6F6F66;
  --ink-4: #A0A099;

  height: 56px;
  background: var(--bg-elev);
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 30;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  transition: box-shadow 0.18s;
}
.topbar.is-sticky { box-shadow: 0 1px 2px rgba(20,20,15,0.06); }

.crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-3);
}
.crumbs .c {
  color: var(--ink-3);
  cursor: pointer;
  text-decoration: none;
  transition: color 0.15s;
}
.crumbs .c:hover { color: var(--ink); }
.crumbs .c.current {
  color: var(--ink);
  font-weight: 500;
  cursor: default;
}
.crumbs .c.home {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
}
.crumbs .sep { color: var(--ink-4); display: inline-flex; }

.spacer { flex: 1; }

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 10px;
  width: 280px;
  font-size: 13px;
  color: var(--ink-3);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.search:hover:not(:disabled) {
  background: white;
  border-color: #DDD;
}
.search:disabled { cursor: not-allowed; opacity: 0.85; }
.search > span:first-of-type {
  flex: 1;
  text-align: left;
}
.kbd {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10.5px;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--line);
  background: white;
  color: var(--ink-3);
  margin-left: auto;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: white;
  display: grid;
  place-items: center;
  color: var(--ink-2);
  padding: 0;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.icon-btn:hover {
  background: var(--bg-soft);
  color: var(--ink);
  border-color: #DDD;
}

.notif-toggle .notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #EF4444;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--bg-elev);
}

.topbar-avatar-btn {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}
.topbar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: linear-gradient(135deg, #FCD9B6, #F59E0B);
  display: grid;
  place-items: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
}

/* Dropdowns shared styling */
.notif-menu {
  min-width: 380px !important;
  width: 380px !important;
  max-width: 92vw !important;
  padding: 0 !important;
  overflow: hidden;
  border: 1px solid rgba(20,20,15,0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 12px 32px -12px rgba(20,20,15,0.18) !important;
  background: #fff;
}
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(20,20,15,0.06);
  background: linear-gradient(180deg, #fafaf8 0%, #ffffff 100%);
}
.notif-header__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #14140F;
  letter-spacing: -0.01em;
}
.notif-header__subtitle {
  font-size: 0.75rem;
  color: #6F6F66;
  margin-top: 2px;
}
.notif-header__pill {
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16,185,129,0.14);
  color: #047857;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
}
.notif-list {
  max-height: 420px;
  overflow-y: auto;
}
.notif-item {
  display: flex;
  width: 100%;
  padding: 12px 16px 12px 0;
  border: 0;
  border-bottom: 1px solid rgba(20,20,15,0.05);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease;
}
.notif-item:last-child { border-bottom: 0; }
.notif-item:hover { background: #FAFAF8; }
.notif-item:focus-visible { outline: none; background: #F1F0EC; }
.notif-item__bar {
  width: 3px;
  margin-right: 13px;
  border-radius: 0 3px 3px 0;
  background: #10B981;
  flex-shrink: 0;
}
.notif-item--read .notif-item__bar { background: transparent; }
.notif-item__body { flex: 1; min-width: 0; }
.notif-item__title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #14140F;
  line-height: 1.3;
  margin-bottom: 4px;
}
.notif-item--read .notif-item__title {
  font-weight: 500;
  color: #6F6F66;
}
.notif-item__message {
  font-size: 0.8rem;
  color: #3A3A33;
  line-height: 1.45;
  word-break: break-word;
}
.notif-item--read .notif-item__message { color: #A0A099; }
.notif-item__time {
  margin-top: 6px;
  font-size: 0.7rem;
  color: #A0A099;
  font-variant-numeric: tabular-nums;
}
.notif-empty { padding: 32px 20px; text-align: center; }
.notif-empty__icon { color: #D4D4CC; margin-bottom: 8px; }
.notif-empty__title { font-size: 0.85rem; font-weight: 600; color: #3A3A33; }
.notif-empty__hint { font-size: 0.75rem; color: #A0A099; margin-top: 2px; }

.user-menu { min-width: 220px; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .topbar {
  --bg-elev: #14140F;
  --bg-soft: #1F1F1A;
  --line: #2A2A22;
  --ink: #F4F4F0;
  --ink-2: #D4D4CC;
  --ink-3: #A0A099;
  --ink-4: #6F6F66;
}
[data-coreui-theme="dark"] .topbar .icon-btn {
  background: #1F1F1A;
  border-color: #2A2A22;
  color: #D4D4CC;
}
[data-coreui-theme="dark"] .topbar .icon-btn:hover {
  background: #2A2A22;
  color: #F4F4F0;
  border-color: #3A3A33;
}
[data-coreui-theme="dark"] .topbar .search {
  background: #1F1F1A;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .topbar .kbd {
  background: #14140F;
  border-color: #2A2A22;
  color: #A0A099;
}
[data-coreui-theme="dark"] .notif-menu {
  background: #1A1A14 !important;
  border-color: #2A2A22 !important;
  box-shadow: 0 12px 32px -12px rgba(0,0,0,0.6) !important;
}
[data-coreui-theme="dark"] .notif-header {
  background: linear-gradient(180deg, #1F1F1A 0%, #1A1A14 100%);
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .notif-header__title { color: #F4F4F0; }
[data-coreui-theme="dark"] .notif-header__subtitle { color: #A0A099; }
[data-coreui-theme="dark"] .notif-item {
  background: #1A1A14;
  border-bottom-color: #2A2A22;
}
[data-coreui-theme="dark"] .notif-item:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .notif-item__title { color: #F4F4F0; }
[data-coreui-theme="dark"] .notif-item__message { color: #A0A099; }
[data-coreui-theme="dark"] .notif-item__time { color: #6F6F66; }
[data-coreui-theme="dark"] .notif-empty__icon { color: #3A3A33; }
[data-coreui-theme="dark"] .notif-empty__title { color: #D4D4CC; }
[data-coreui-theme="dark"] .notif-empty__hint { color: #6F6F66; }
</style>
