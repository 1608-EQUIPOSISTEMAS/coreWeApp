<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useColorModes } from '@coreui/vue'
import { useToast } from 'vue-toastification'

import { useNotifications } from '@/composables/useNotifications'
import UnattendedCallsModal from '@/components/UnattendedCallsModal.vue'
import { useSidebarStore } from '@/stores/sidebar.js'
import { leadRouteForUser } from '@/utils/leadRouteForUser.js'
import { ServiceKeys } from '@/services'
import { inject } from 'vue'

const { colorMode, setColorMode } = useColorModes('coreui-free-vue-admin-template-theme')

// Un clic alterna directamente entre claro y oscuro (sin menú).
// Si el modo es 'auto', el primer clic lo fija en 'dark'.
function toggleTheme() {
  setColorMode(colorMode.value === 'dark' ? 'light' : 'dark')
}
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
  overview: 'Reporte Completo',
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
const ROLE_LABELS = {
  ADMIN: 'Administrador',
  COMERCIAL: 'Comercial',
  LIDER_COMERCIAL: 'Líder Comercial',
  PRODUCTO: 'Producto',
  'LIDER GERENCIA': 'Líder Gerencia',
}
const rawRole = (user.roles && user.roles[0]) || ''
const userRole = ROLE_LABELS[rawRole] || rawRole || 'Usuario'
const userInitials = computed(() => {
  const parts = String(userName).trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'US'
})

function goToNotification(notif) {
  if (notif.lead_id) {
    // El destino depende del area del usuario: Fundacion/B2B tienen su propia
    // vista de leads y el guard bloquea la de Comercial (ver leadRouteForUser).
    router.push({ name: leadRouteForUser(user), params: { id: notif.lead_id } })
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
    <button type="button" class="search" disabled>
      <CIcon icon="cil-magnifying-glass" size="sm" />
      <span>Buscar en el sistema...</span>
      <span class="kbd">⌘K</span>
    </button>

    <div class="spacer"></div>

    <button
      type="button"
      class="icon-btn"
      :aria-label="colorMode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      :title="colorMode === 'dark' ? 'Modo claro' : 'Modo oscuro'"
      @click="toggleTheme"
    >
      <CIcon v-if="colorMode === 'dark'" icon="cil-moon" size="sm" />
      <CIcon v-else icon="cil-sun" size="sm" />
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

    <CDropdown placement="bottom-end" variant="nav-item">
      <CDropdownToggle :caret="false" class="user-pill">
        <span class="user-pill__avatar">{{ userInitials }}</span>
        <span class="user-pill__info">
          <span class="user-pill__name">{{ userName }}</span>
          <span class="user-pill__role">{{ userRole }}</span>
        </span>
        <CIcon icon="cil-chevron-bottom" class="user-pill__chev" />
      </CDropdownToggle>
      <CDropdownMenu class="user-menu">
        <CDropdownItem
          v-if="$hasRole(['COMERCIAL'])"
          class="um-item"
          component="button"
          type="button"
          @click="updateBase()"
        >
          <CIcon icon="cil-cloud-download" class="um-ic" />
          <span class="um-txt">Actualizar {{ userAlias }}</span>
        </CDropdownItem>
        <CDropdownItem
          v-if="$hasRole(['LIDER_COMERCIAL','ADMIN'])"
          class="um-item"
          component="button"
          type="button"
          @click="syncRprospectosToSheet()"
        >
          <CIcon icon="cil-spreadsheet" class="um-ic" />
          <span class="um-txt">Prospectos</span>
        </CDropdownItem>
        <CDropdownItem
          v-if="$hasRole(['ADMIN','PRODUCTO','LIDER GERENCIA'])"
          class="um-item"
          component="button"
          type="button"
          @click="syncScheduleToSheet()"
        >
          <CIcon icon="cil-calendar" class="um-ic" />
          <span class="um-txt">Planeamiento</span>
        </CDropdownItem>
        <CDropdownItem class="um-item" component="button" type="button" @click="syncCatalog">
          <CIcon icon="cil-reload" class="um-ic" />
          <span class="um-txt">Actualizar sistema</span>
        </CDropdownItem>

        <div class="um-divider"></div>

        <CDropdownItem class="um-item um-item--danger" component="button" type="button" @click="logout()">
          <CIcon icon="cil-account-logout" class="um-ic" />
          <span class="um-txt">Cerrar sesión</span>
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
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  transition: box-shadow 0.18s;
}
.topbar.is-sticky { box-shadow: 0 1px 2px rgba(20,20,15,0.06); }

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

.user-pill {
  display: flex !important;
  align-items: center;
  gap: 9px;
  background: transparent !important;
  border: 1px solid transparent !important;
  border-radius: 10px;
  padding: 4px 8px 4px 4px !important;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.user-pill:hover {
  background: var(--bg-soft) !important;
  border-color: var(--line) !important;
}
.user-pill__avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: linear-gradient(140deg, #2a52a0 0%, var(--we-navy, #002060) 55%, var(--we-navy-dark, #001540) 100%);
  display: grid;
  place-items: center;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  box-shadow: 0 2px 8px -2px rgba(0,32,96,0.5), inset 0 1px 0 rgba(255,255,255,0.25);
}
.user-pill__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
  text-align: left;
}
.user-pill__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}
.user-pill__role {
  font-size: 11px;
  color: var(--ink-3);
  white-space: nowrap;
}
.user-pill__chev {
  color: var(--ink-4);
  width: 11px;
  height: 11px;
  margin-left: 1px;
}
@media (max-width: 575px) {
  .user-pill__info { display: none; }
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

/* NOTE: estilos de .user-menu movidos al bloque <style> global de abajo,
   porque CoreUI puede renderizar el dropdown por teleport fuera de este
   componente y los selectores scoped ([data-v]) no lo alcanzarían. */

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

<!-- Estilos GLOBALES del menú de usuario (no scoped): el dropdown de CoreUI
     puede teletransportarse fuera del componente, así que usamos selectores
     planos y valores literales para garantizar que siempre apliquen. -->
<style>
.user-menu {
  min-width: 200px !important;
  width: 200px !important;
  padding: 5px !important;
  border: 1px solid rgba(20,20,15,0.08) !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 30px -12px rgba(20,20,15,0.22), 0 2px 6px -3px rgba(20,20,15,0.08) !important;
  background: #fff !important;
  /* Solo opacity: NO animar transform, lo usa Popper para posicionar el menú
     (animarlo provoca que el menú "salte" desde otra posición). */
  animation: um-fade 0.13s ease;
}
@keyframes um-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.user-menu .um-item {
  display: flex !important;
  align-items: center;
  width: 100%;
  padding: 8px 12px !important;
  border: 0;
  border-radius: 8px;
  background: transparent !important;
  color: #3A3A33 !important;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.user-menu .um-item:hover,
.user-menu .um-item:focus {
  background: #FAFAF8 !important;
  color: #14140F !important;
}
.user-menu .um-item .um-ic {
  width: 16px !important;
  height: 16px !important;
  margin-right: 12px !important;
  color: #6F6F66;
  flex-shrink: 0;
}
.user-menu .um-item:hover .um-ic { color: #14140F; }
.user-menu .um-txt { flex: 1; text-align: left; white-space: nowrap; }
.user-menu .um-divider { height: 1px; background: rgba(20,20,15,0.08); margin: 4px 6px; }
.user-menu .um-item--danger,
.user-menu .um-item--danger .um-ic { color: #DC2626 !important; }
.user-menu .um-item--danger:hover { background: rgba(220,38,38,0.08) !important; color: #B91C1C !important; }
.user-menu .um-item--danger:hover .um-ic { color: #B91C1C !important; }

/* Dark — usa el mismo negro cálido #1A1A14 del resto de la app */
[data-coreui-theme="dark"] .user-menu {
  --cui-dropdown-bg: #1A1A14;
  --cui-dropdown-border-color: #2A2A22;
  --cui-dropdown-link-color: #D4D4CC;
  --cui-dropdown-link-hover-color: #F4F4F0;
  --cui-dropdown-link-hover-bg: #2A2A22;
  background: #1A1A14 !important;
  border-color: #2A2A22 !important;
  box-shadow: 0 10px 30px -12px rgba(0,0,0,0.7) !important;
}
[data-coreui-theme="dark"] .user-menu .um-item { color: #D4D4CC !important; }
[data-coreui-theme="dark"] .user-menu .um-item:hover,
[data-coreui-theme="dark"] .user-menu .um-item:focus {
  background: #2A2A22 !important;
  color: #F4F4F0 !important;
}
[data-coreui-theme="dark"] .user-menu .um-item .um-ic { color: #A0A099; }
[data-coreui-theme="dark"] .user-menu .um-item:hover .um-ic { color: #F4F4F0; }
[data-coreui-theme="dark"] .user-menu .um-divider { background: rgba(255,255,255,0.08); }
[data-coreui-theme="dark"] .user-menu .um-item--danger,
[data-coreui-theme="dark"] .user-menu .um-item--danger .um-ic { color: #F87171 !important; }
[data-coreui-theme="dark"] .user-menu .um-item--danger:hover {
  background: rgba(220,38,38,0.16) !important;
  color: #FCA5A5 !important;
}
[data-coreui-theme="dark"] .user-menu .um-item--danger:hover .um-ic { color: #FCA5A5 !important; }
</style>
