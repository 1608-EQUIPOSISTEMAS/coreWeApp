<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import weLogo from '@/assets/brand/WE-EDUCACION-PRINCIPAL.png'
import { useSidebarStore } from '@/stores/sidebar.js'
import { useFilteredNav } from '@/composables/useFilteredNav.js'

const sidebar = useSidebarStore()
const { filteredNav, navLinks, refreshModules } = useFilteredNav()
const route = useRoute()

const expandedGroups = ref(new Set())

function isExpanded(idx) {
  return expandedGroups.value.has(idx)
}

function toggleGroup(idx) {
  const next = new Set(expandedGroups.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  expandedGroups.value = next
}

function hasActiveChild(group) {
  if (!group.items) return false
  return group.items.some(
    (child) =>
      child.to && (route.path === child.to || route.path.startsWith(child.to + '/')),
  )
}

function goTo(navigate, to) {
  navigate()
  // El Dashboard es el único módulo donde la sidebar permanece visible.
  if (to !== '/dashboard') sidebar.toggleVisible(false)
}

// Al entrar al Dashboard por cualquier vía (login, logo, URL) la sidebar se muestra.
watch(
  () => route.path,
  (p) => { if (p === '/dashboard') sidebar.toggleVisible(true) },
)

function badgeText(b) {
  if (b == null) return null
  if (typeof b === 'object') return b.text
  return b
}

// Fijados: preferencia de cada navegador, no de la cuenta. Se cruzan con
// navLinks para que un permiso retirado saque también el acceso fijado.
const PINS_KEY = 'we_nav_pins_v1'
function readPins() {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]') } catch { return [] }
}
const pins = ref(readPins())
const pinnedLinks = computed(() => navLinks.value.filter((l) => pins.value.includes(l.to)))
const isPinned = (to) => pins.value.includes(to)
function togglePin(to) {
  pins.value = isPinned(to) ? pins.value.filter((p) => p !== to) : [...pins.value, to]
  try { localStorage.setItem(PINS_KEY, JSON.stringify(pins.value)) } catch { /* modo privado: queda en memoria */ }
}

onMounted(() => {
  // Trae los módulos vigentes de la matriz de permisos (sin re-login).
  refreshModules()
  filteredNav.value.forEach((item, idx) => {
    if (item.component === 'CNavGroup' && hasActiveChild(item)) {
      expandedGroups.value.add(idx)
    }
  })
  expandedGroups.value = new Set(expandedGroups.value)
})
</script>

<template>
  <aside
    class="sidebar-shell"
    :class="{ 'is-hidden': !sidebar.visible }"
    aria-label="Menú principal"
  >
    <div class="brand">
      <RouterLink to="/" class="brand-box">
        <span class="brand-mark">
          <img :src="weLogo" alt="W|E" class="brand-mark-img" />
        </span>
        <span class="brand-words">
          <span class="brand-words__main">WE Educación</span>
          <span class="brand-words__sub">System ERP</span>
        </span>
      </RouterLink>
    </div>

    <nav class="sidebar-nav">
      <template v-if="pinnedLinks.length">
        <div class="nav-section-label">Fijados</div>
        <RouterLink
          v-for="link in pinnedLinks"
          :key="'pin-' + link.to"
          :to="link.to"
          custom
          v-slot="{ navigate, isActive }"
        >
          <button
            class="nav-pin"
            :class="{ active: isActive }"
            type="button"
            :title="link.group ? `${link.group} › ${link.name}` : link.name"
            @click="goTo(navigate, link.to)"
          >
            <span class="nav-pin__dot" aria-hidden="true"></span>
            <span class="label">{{ link.name }}</span>
          </button>
        </RouterLink>
      </template>

      <template v-for="(item, idx) in filteredNav" :key="idx">
        <!-- Los accesos sueltos del inicio (Dashboard, Cronograma...) no traen
             título en _nav.js; sin él se confunden con los Fijados. -->
        <div v-if="idx === 0 && item.component !== 'CNavTitle'" class="nav-section-label">General</div>
        <div v-if="item.component === 'CNavTitle'" class="nav-section-label">
          {{ item.name }}
        </div>

        <template v-else-if="item.component === 'CNavGroup'">
          <button
            class="nav-item menu-group"
            :class="{
              expanded: isExpanded(idx),
              'has-active': hasActiveChild(item),
            }"
            type="button"
            :title="item.name"
            :aria-expanded="isExpanded(idx)"
            @click="toggleGroup(idx)"
          >
            <CIcon v-if="item.icon" :icon="item.icon" class="icon" />
            <span class="label">{{ item.name }}</span>
            <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <div v-show="isExpanded(idx)" class="nav-children">
            <RouterLink
              v-for="child in item.items"
              :key="child.to"
              :to="child.to"
              custom
              v-slot="{ navigate, isActive }"
            >
              <div class="nav-child-row">
                <button
                  class="nav-child"
                  :class="{ active: isActive }"
                  type="button"
                  :aria-current="isActive ? 'page' : undefined"
                  @click="goTo(navigate, child.to)"
                >
                  <span class="label">{{ child.name }}</span>
                  <span v-if="badgeText(child.badge) != null" class="badge">
                    {{ badgeText(child.badge) }}
                  </span>
                </button>
                <button
                  class="pin-btn"
                  :class="{ 'is-on': isPinned(child.to) }"
                  type="button"
                  :aria-label="isPinned(child.to) ? `Quitar ${child.name} de fijados` : `Fijar ${child.name}`"
                  :aria-pressed="isPinned(child.to)"
                  @click="togglePin(child.to)"
                >
                  <CIcon icon="cil-star" />
                </button>
              </div>
            </RouterLink>
          </div>
        </template>

        <RouterLink
          v-else-if="item.component === 'CNavItem'"
          :to="item.to"
          custom
          v-slot="{ navigate, isActive }"
        >
          <button
            class="nav-item"
            :class="{ active: isActive }"
            type="button"
            :title="item.name"
            :aria-current="isActive ? 'page' : undefined"
            @click="goTo(navigate, item.to)"
          >
            <CIcon v-if="item.icon" :icon="item.icon" class="icon" />
            <span class="label">{{ item.name }}</span>
            <span v-if="badgeText(item.badge) != null" class="badge">
              {{ badgeText(item.badge) }}
            </span>
          </button>
        </RouterLink>
      </template>
    </nav>

  </aside>
</template>

<style scoped>
/* Ancho y alto del header compartidos con DefaultLayout y AppHeader
   (--layout-*): la línea bajo el logo continúa la del header. */
.sidebar-shell {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: var(--layout-sidebar-w);
  background: var(--ds-surface);
  border-right: 1px solid var(--ds-border);
  display: flex;
  flex-direction: column;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13.5px;
  color: var(--ds-ink-2);
  z-index: 1000;
  -webkit-font-smoothing: antialiased;
  transform: translateX(0);
  transition: transform 0.22s ease;
}
.sidebar-shell.is-hidden { transform: translateX(-100%); }

.brand {
  height: var(--layout-header-h);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--ds-border);
}
.brand-box {
  display: flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  min-width: 0;
}
.brand-box:hover { opacity: 0.85; }
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--ds-brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
}
.brand-mark-img { width: 100%; height: 100%; object-fit: contain; padding: 5px; }
.brand-words { display: flex; flex-direction: column; line-height: 1.2; white-space: nowrap; }
.brand-words__main { font-size: 14.5px; font-weight: 700; color: var(--ds-ink); }
.brand-words__sub { font-size: 11.5px; color: var(--ds-ink-2); }

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px 10px;
}
.sidebar-nav::-webkit-scrollbar { width: 6px; }
.sidebar-nav::-webkit-scrollbar-thumb { background: var(--ds-border); border-radius: 10px; }

.nav-section-label {
  padding: 16px 12px 6px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ds-ink-2);
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 38px;
  padding: 0 12px;
  border-radius: 9px;
  color: var(--ds-ink-2);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: var(--ds-surface-3); color: var(--ds-ink); }
.nav-item.active { background: var(--ds-soft-info); color: var(--ds-info-ink); font-weight: 700; }
.nav-item .icon { width: 17px; height: 17px; flex-shrink: 0; }
.nav-item .label { flex: 1; overflow: hidden; text-overflow: ellipsis; }

.menu-group.expanded,
.menu-group.has-active { color: var(--ds-ink); font-weight: 700; }
.chev {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  opacity: 0.6;
  transform: rotate(-90deg);
  transition: transform 0.15s ease;
}
.menu-group.expanded .chev { transform: rotate(0deg); }

.nav-children { display: flex; flex-direction: column; gap: 1px; padding: 2px 0 6px; }
.nav-child-row { position: relative; display: flex; align-items: center; }
.nav-child {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  height: 34px;
  padding: 0 34px 0 41px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ds-ink-2);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  min-width: 0;
}
.nav-child .label { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.nav-child:hover { background: var(--ds-surface-3); color: var(--ds-ink); }
.nav-child.active { background: var(--ds-soft-info); color: var(--ds-info-ink); font-weight: 700; }
.nav-child.active::before {
  content: "";
  position: absolute;
  left: 26px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--ds-accent);
}
.badge {
  font-size: 10.5px;
  font-weight: 700;
  background: var(--ds-bad);
  color: var(--ds-on-brand);
  padding: 1px 7px;
  border-radius: 999px;
}

/* La estrella aparece al pasar por la fila; fijada queda siempre visible. */
.pin-btn {
  position: absolute;
  right: 4px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ds-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s;
}
.pin-btn svg { width: 13px; height: 13px; }
.nav-child-row:hover .pin-btn,
.pin-btn:focus-visible,
.pin-btn.is-on { opacity: 1; }
.pin-btn.is-on { color: var(--ds-warn); }
.pin-btn:hover { background: var(--ds-surface); color: var(--ds-ink); }

.nav-pin {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 34px;
  padding: 0 12px 0 17px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ds-ink-2);
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.nav-pin:hover { background: var(--ds-surface-3); color: var(--ds-ink); }
.nav-pin.active { color: var(--ds-info-ink); font-weight: 700; }
.nav-pin__dot { width: 7px; height: 7px; border-radius: 2px; background: var(--ds-accent); flex-shrink: 0; }
.nav-pin .label { overflow: hidden; text-overflow: ellipsis; }


@media (max-width: 991px) {
  .sidebar-shell:not(.is-hidden) { box-shadow: 4px 0 24px rgba(20, 20, 15, 0.18); }
}
</style>
