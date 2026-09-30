<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useColorModes } from '@coreui/vue'
import { useToast } from 'vue-toastification'

import { useNotifications } from '@/composables/useNotifications'
import UnattendedCallsModal from '@/components/UnattendedCallsModal.vue'
import { useSidebarStore } from '@/stores/sidebar.js'
import { useFilteredNav } from '@/composables/useFilteredNav.js'
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
const configService = inject(ServiceKeys.Config)
const catalog = inject('catalog')

// Las opciones de este menú no modifican ninguna fila (o modifican un Sheet, no
// la BD), así que los triggers de auditoría no las ven: se reportan a mano para
// que aparezcan en Configuración → Auditoría.
function audit(action) {
  return configService.recordSystemAction(action)
}

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

const { navLinks } = useFilteredNav()

// La pantalla del sidebar que contiene la ruta actual (la de prefijo más largo:
// /fico/inscripciones/123 es Finanzas › Inscripciones). Si ninguna la contiene
// (detalle suelto, notificaciones) se arma con los segmentos de la URL.
const currentLink = computed(() => navLinks.value
  .filter((l) => route.path === l.to || route.path.startsWith(l.to + '/'))
  .sort((a, b) => b.to.length - a.to.length)[0])

const crumbs = computed(() => {
  const labels = currentLink.value
    ? [currentLink.value.group, currentLink.value.name].filter(Boolean)
    : route.path.split('/').filter(Boolean)
      .map((seg) => ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1))
  return labels.map((label, i) => ({ label, current: i === labels.length - 1 }))
})

// ── Buscador de pantallas (Ctrl K) ──
const query = ref('')
const searchOpen = ref(false)
const activeResult = ref(0)
const searchInput = ref(null)
const normalize = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const results = computed(() => {
  const q = normalize(query.value.trim())
  if (!q) return []
  return navLinks.value
    .filter((l) => normalize(`${l.name} ${l.group || ''}`).includes(q))
    .slice(0, 8)
})

function openResult(link) {
  if (!link) return
  router.push(link.to)
  query.value = ''
  searchOpen.value = false
  searchInput.value?.blur()
}

function onSearchKey(e) {
  const n = results.value.length
  if (e.key === 'ArrowDown' && n) { e.preventDefault(); activeResult.value = (activeResult.value + 1) % n }
  else if (e.key === 'ArrowUp' && n) { e.preventDefault(); activeResult.value = (activeResult.value - 1 + n) % n }
  else if (e.key === 'Enter') openResult(results.value[activeResult.value])
  else if (e.key === 'Escape') { query.value = ''; searchInput.value?.blur() }
}

function onGlobalKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
  }
}
onMounted(() => document.addEventListener('keydown', onGlobalKey))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKey))

const user = JSON.parse(localStorage.getItem('user') || '{}')
const userName = user.name || user.alias || user.username || 'Usuario'
const userAlias = user.alias
const ROLE_LABELS = {
  ADMIN: 'Administrador',
  COMERCIAL: 'Comercial',
  LIDER_COMERCIAL: 'Líder Comercial',
  LIDER_B2B: 'Líder B2B',
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
    await audit('CATALOG_REFRESH')
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
    await audit('UPDATE_BASE')
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
    await audit('SYNC_PROSPECTOS')
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
    await audit('SYNC_PLANEAMIENTO')
    const response = await integrationService.syncScheduleToSheet()
    if (response && response.ok) toast.success('GOOGLE SHEET PLANEAMIENTO SINCRONIZADO')
    else throw new Error(response?.message || 'Error desconocido')
  } catch (error) {
    console.error('Error al sincronizar el cronograma:', error)
    toast.error('Error al sincronizar el cronograma')
  }
}

// El registro va ANTES de borrar el token: sin token el endpoint responde 401 y
// el cierre de sesión no quedaría en la bitácora.
async function logout() {
  await audit('LOGOUT')
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
    <nav class="crumbs" aria-label="Ruta">
      <template v-for="(c, i) in crumbs" :key="i">
        <svg v-if="i > 0" class="crumbs__sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        <span :class="{ 'crumbs__current': c.current }">{{ c.label }}</span>
      </template>
    </nav>

    <div class="spacer"></div>

    <div class="search" :class="{ 'is-open': searchOpen && results.length }">
      <CIcon icon="cil-magnifying-glass" size="sm" class="search__icon" />
      <input
        ref="searchInput"
        v-model="query"
        type="search"
        class="search__input"
        placeholder="Buscar módulo…"
        aria-label="Buscar módulo"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="search-results"
        :aria-expanded="searchOpen && results.length > 0"
        @focus="searchOpen = true"
        @blur="searchOpen = false"
        @input="activeResult = 0"
        @keydown="onSearchKey"
      />
      <span class="kbd">Ctrl K</span>
      <ul v-if="searchOpen && results.length" id="search-results" class="search__results" role="listbox">
        <li
          v-for="(r, i) in results"
          :key="r.to"
          role="option"
          :aria-selected="i === activeResult"
          :class="{ 'is-active': i === activeResult }"
          @mousedown.prevent="openResult(r)"
          @mouseenter="activeResult = i"
        >
          <span class="search__name">{{ r.name }}</span>
          <span v-if="r.group" class="search__group">{{ r.group }}</span>
        </li>
      </ul>
    </div>

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

    <span class="topbar-divider" aria-hidden="true"></span>

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
  height: var(--layout-header-h);
  background: var(--ds-surface);
  border-bottom: 1px solid var(--ds-border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px 0 16px;
  position: sticky;
  top: 0;
  z-index: 30;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  color: var(--ds-ink);
  -webkit-font-smoothing: antialiased;
  transition: box-shadow 0.18s;
}
.topbar.is-sticky { box-shadow: 0 1px 2px rgba(20,20,15,0.06); }

.spacer { flex: 1; }

.crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13.5px;
  color: var(--ds-ink-2);
  white-space: nowrap;
}
.crumbs__sep { width: 11px; height: 11px; transform: rotate(-90deg); opacity: 0.7; }
.crumbs__current { color: var(--ds-ink); font-weight: 700; overflow: hidden; text-overflow: ellipsis; }

.search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 300px;
  height: 36px;
  padding: 0 10px;
  box-sizing: border-box;
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border);
  border-radius: 8px;
  color: var(--ds-ink-2);
  transition: border-color 0.15s, background 0.15s;
}
.search:focus-within { background: var(--ds-surface); border-color: var(--ds-border-strong); }
.search__icon { flex-shrink: 0; }
/* !important: los estilos globales de input (CoreUI) le ponían borde y caja. */
.search__input {
  flex: 1;
  min-width: 0;
  height: auto !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  appearance: none;
  background: transparent !important;
  font-family: inherit;
  font-size: 13px;
  color: var(--ds-ink);
}
.search__input::placeholder { color: var(--ds-ink-2); }
.search__input::-webkit-search-cancel-button { display: none; }
.search__results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 5px;
  list-style: none;
  background: var(--ds-surface);
  border: 1px solid var(--ds-border);
  border-radius: 12px;
  box-shadow: 0 12px 32px -12px rgba(20,20,15,0.22);
  z-index: 40;
}
.search__results li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.search__results li.is-active { background: var(--ds-soft-info); }
.search__name { font-size: 13.5px; font-weight: 600; color: var(--ds-ink); }
.search__group { margin-left: auto; font-size: 12px; color: var(--ds-ink-2); }
.kbd {
  font-family: var(--ds-font-mono);
  font-size: 10.5px;
  line-height: 1.4;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid var(--ds-border);
  background: var(--ds-surface);
  color: var(--ds-ink-2);
  flex-shrink: 0;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid var(--ds-border);
  background: var(--ds-surface);
  display: grid;
  place-items: center;
  color: var(--ds-ink-2);
  padding: 0;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: var(--ds-surface-3); color: var(--ds-ink); }

.notif-toggle .notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--ds-bad);
  color: var(--ds-on-brand);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--ds-surface);
}

.topbar-divider { width: 1px; height: 28px; background: var(--ds-border); margin: 0 2px; }

.user-pill {
  display: flex !important;
  align-items: center;
  gap: 10px;
  background: transparent !important;
  border: 0 !important;
  border-radius: 12px;
  padding: 4px 8px 4px 4px !important;
  cursor: pointer;
  transition: background 0.15s;
}
.user-pill:hover { background: var(--ds-surface-3) !important; }
.user-pill__avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: var(--ds-brand);
  display: grid;
  place-items: center;
  color: var(--ds-on-brand);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.user-pill__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  line-height: 1.15;
  text-align: left;
}
.user-pill__name { font-size: 14px; font-weight: 700; color: var(--ds-ink); white-space: nowrap; }
.user-pill__role { font-size: 12.5px; color: var(--ds-ink-2); white-space: nowrap; }
.user-pill__chev { color: var(--ds-ink-2); width: 12px; height: 12px; margin-left: 4px; }

@media (max-width: 991px) {
  .crumbs { display: none; }
}
@media (max-width: 767px) {
  .search { width: auto; flex: 1; }
  .kbd { display: none; }
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
