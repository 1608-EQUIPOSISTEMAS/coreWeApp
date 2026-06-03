<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import weLogo from '@/assets/brand/WE-EDUCACION-PRINCIPAL.png'
import { useSidebarStore } from '@/stores/sidebar.js'
import { useFilteredNav } from '@/composables/useFilteredNav.js'

const sidebar = useSidebarStore()
const { filteredNav } = useFilteredNav()
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

function goTo(navigate) {
  navigate()
  sidebar.toggleVisible(false)
}

function badgeText(b) {
  if (b == null) return null
  if (typeof b === 'object') return b.text
  return b
}

onMounted(() => {
  filteredNav.value.forEach((item, idx) => {
    if (item.component === 'CNavGroup' && hasActiveChild(item)) {
      expandedGroups.value.add(idx)
    }
  })
  expandedGroups.value = new Set(expandedGroups.value)
})
</script>

<template>
  <aside class="sidebar-shell" :class="{ 'is-hidden': !sidebar.visible }">
    <div class="brand">
      <RouterLink to="/" class="brand-box">
        <span class="brand-mark">
          <img :src="weLogo" alt="W|E" class="brand-mark-img" />
        </span>
        <span class="brand-words">
          <span class="brand-words__main">W<span class="brand-words__bar">|</span>E</span>
          <span class="brand-words__sub">EDUCACIÓN EJECUTIVA</span>
        </span>
      </RouterLink>
    </div>

    <nav class="sidebar-nav">
      <template v-for="(item, idx) in filteredNav" :key="idx">
        <div
          v-if="item.component === 'CNavTitle'"
          class="nav-section-label"
        >
          <span class="nav-section-label__text">{{ item.name }}</span>
        </div>

        <template v-else-if="item.component === 'CNavGroup'">
          <button
            class="nav-item nav-group-toggle"
            :class="{
              expanded: isExpanded(idx),
              'has-active': hasActiveChild(item),
            }"
            type="button"
            @click="toggleGroup(idx)"
          >
            <CIcon v-if="item.icon" :icon="item.icon" class="icon" />
            <span class="label">{{ item.name }}</span>
          </button>
          <div v-show="isExpanded(idx)" class="nav-children">
            <RouterLink
              v-for="child in item.items"
              :key="child.to"
              :to="child.to"
              custom
              v-slot="{ navigate, isActive }"
            >
              <button
                class="nav-item nav-child"
                :class="{ active: isActive }"
                type="button"
                @click="goTo(navigate)"
              >
                <CIcon v-if="item.icon" :icon="item.icon" class="icon" />
                <span class="label">{{ child.name }}</span>
                <span v-if="badgeText(child.badge) != null" class="badge">
                  {{ badgeText(child.badge) }}
                </span>
              </button>
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
            @click="goTo(navigate)"
          >
            <CIcon v-if="item.icon" :icon="item.icon" class="icon" />
            <span class="label">{{ item.name }}</span>
            <span v-if="badgeText(item.badge) != null" class="badge">
              {{ badgeText(item.badge) }}
            </span>
            <span v-else-if="isActive" class="active-dot" aria-hidden="true"></span>
          </button>
        </RouterLink>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar-shell {
  --bg-elev: #FFFFFF;
  --bg-soft: #FAFAF8;
  --line: #E8E8E3;
  --line-soft: #EFEFEA;
  --ink: #14140F;
  --ink-2: #3A3A33;
  --ink-3: #6F6F66;
  --ink-4: #A0A099;
  --green: #10B981;
  --active-bg: #F0EFEB;

  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 212px;
  background: var(--bg-elev);
  border-right: 1px solid var(--line);
  padding: 12px 7px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  color: var(--ink-2);
  z-index: 1000;
  -webkit-font-smoothing: antialiased;
  transform: translateX(0);
  transition: transform 0.22s ease, background 0.18s, border-color 0.18s;
}
.sidebar-shell.is-hidden {
  transform: translateX(-100%);
  box-shadow: none;
}

.brand {
  padding: 2px 2px 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--line-soft);
}
.brand-box {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  padding: 4px 6px;
  transition: opacity 0.15s;
}
.brand-box:hover { opacity: 0.8; }
.brand-mark {
  width: 33px;
  height: 33px;
  border-radius: 8px;
  background: #0E1B3D;
  border: 1px solid #1E2E57;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  overflow: hidden;
}
.brand-mark-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 5px;
}
.brand-words {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.brand-words__main {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink);
}
.brand-words__bar {
  color: var(--ink-4);
  font-weight: 400;
  margin: 0 1px;
}
.brand-words__sub {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--ink-3);
  margin-top: 1px;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-right: 2px;
  margin-right: -2px;
}
.sidebar-nav::-webkit-scrollbar { width: 6px; }
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(20,20,15,0.15);
  border-radius: 10px;
}
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }

.nav-section-label {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 8px 5px;
}
.nav-section-label__text {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  flex-shrink: 0;
}
.nav-section-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: 7px;
  color: var(--ink-2);
  font-size: 12.5px;
  cursor: pointer;
  user-select: none;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: var(--bg-soft); color: var(--ink); }
.nav-item.active {
  background: var(--active-bg);
  color: var(--ink);
  font-weight: 500;
}
.nav-item .icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  opacity: 0.8;
  color: var(--ink-3);
}
.nav-item.active .icon { opacity: 1; color: var(--ink); }
.nav-item .label { flex: 1; }
.nav-item .badge {
  font-size: 10px;
  font-weight: 600;
  background: var(--ink);
  color: white;
  padding: 1px 6px;
  border-radius: 999px;
}
.nav-item.active .badge { background: var(--green); }
.nav-item .active-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--green);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 18%, transparent);
  flex-shrink: 0;
}

.nav-group-toggle.expanded::after { transform: rotate(180deg) !important; }
.nav-group-toggle::after { transition: transform 0.2s ease !important; }
.nav-group-toggle.has-active:not(.expanded) .label { font-weight: 500; color: var(--ink); }
.nav-group-toggle.has-active:not(.expanded) .icon { color: var(--ink); opacity: 1; }

.nav-children {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 8px;
  margin-left: 9px;
  border-left: 1px solid var(--line-soft);
  margin-top: 2px;
  margin-bottom: 5px;
}
.nav-children .nav-child { font-size: 12px; padding: 5px 8px; }
.nav-children .nav-child .icon { opacity: 0.7; width: 13px; height: 13px; }

@media (max-width: 991px) {
  .sidebar-shell:not(.is-hidden) {
    box-shadow: 4px 0 24px rgba(20,20,15,0.18);
  }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .sidebar-shell {
  --bg-elev: #14140F;
  --bg-soft: #1F1F1A;
  --line: #2A2A22;
  --line-soft: #1F1F1A;
  --ink: #F4F4F0;
  --ink-2: #D4D4CC;
  --ink-3: #A0A099;
  --ink-4: #6F6F66;
  --active-bg: #2A2A22;
}
[data-coreui-theme="dark"] .sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
}
[data-coreui-theme="dark"] .sidebar-shell .nav-item .badge { color: #14140F; background: #F4F4F0; }
[data-coreui-theme="dark"] .sidebar-shell .nav-item.active .badge { background: var(--green); color: #fff; }
</style>
