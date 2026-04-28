<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import weLogo from '@/assets/brand/WE-EDUCACION-PRINCIPAL.png'
import { useSidebarStore } from '@/stores/sidebar.js'
import { useFilteredNav } from '@/composables/useFilteredNav.js'

const sidebar = useSidebarStore()
const { filteredNav } = useFilteredNav()
const route = useRoute()

const user = JSON.parse(localStorage.getItem('user') || '{}')
const userName = user.name || user.alias || user.username || 'Usuario'
const userRole = (user.roles && user.roles[0]) || 'Sistema'
const userInitials = computed(() => {
  const parts = String(userName).trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'US'
})

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
      <RouterLink to="/" class="brand-link">
        <img :src="weLogo" alt="W|E" class="brand-logo-img" />
      </RouterLink>
    </div>

    <nav class="sidebar-nav">
      <template v-for="(item, idx) in filteredNav" :key="idx">
        <div
          v-if="item.component === 'CNavTitle' && item.name !== 'Áreas'"
          class="nav-section-label"
        >
          {{ item.name }}
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
            <CIcon icon="cil-chevron-bottom" size="sm" class="chevron" />
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
          </button>
        </RouterLink>
      </template>
    </nav>

    <div class="sidebar-foot">
      <div class="avatar">{{ userInitials }}</div>
      <div class="who">
        <div class="n">{{ userName }}</div>
        <div class="r">{{ userRole }}</div>
      </div>
    </div>
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
  width: 232px;
  background: var(--bg-elev);
  border-right: 1px solid var(--line);
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
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
  display: flex;
  align-items: center;
  padding: 8px 10px 16px;
  border-bottom: 1px solid var(--line-soft);
  margin-bottom: 8px;
}
.brand-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  transition: opacity 0.15s;
}
.brand-link:hover { opacity: 0.75; }
.brand-logo-img {
  height: 32px;
  width: auto;
  display: block;
  object-fit: contain;
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
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 14px 10px 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--ink-2);
  font-size: 13.5px;
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
  width: 16px;
  height: 16px;
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

.nav-group-toggle .chevron {
  width: 12px; height: 12px;
  color: var(--ink-4);
  transition: transform 0.2s ease;
}
.nav-group-toggle.expanded .chevron { transform: rotate(180deg); }
.nav-group-toggle.has-active:not(.expanded) .label { font-weight: 500; color: var(--ink); }
.nav-group-toggle.has-active:not(.expanded) .icon { color: var(--ink); opacity: 1; }

.nav-children {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 10px;
  margin-left: 12px;
  border-left: 1px solid var(--line-soft);
  margin-top: 2px;
  margin-bottom: 6px;
}
.nav-children .nav-child { font-size: 13px; padding: 6px 10px; }
.nav-children .nav-child .icon { opacity: 0.7; width: 14px; height: 14px; }

.sidebar-foot {
  margin-top: auto;
  padding: 10px;
  border-top: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-foot .avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: linear-gradient(135deg, #FCD9B6, #F59E0B);
  display: grid;
  place-items: center;
  color: white;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}
.sidebar-foot .who {
  line-height: 1.2;
  flex: 1;
  min-width: 0;
}
.sidebar-foot .who .n {
  font-weight: 600;
  font-size: 12.5px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-foot .who .r { font-size: 11px; color: var(--ink-3); }
.sidebar-foot .chev { color: var(--ink-3); }

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
