<script setup>
import { RouterLink } from 'vue-router'
import logo from '@/assets/brand/WE-EDUCACION-PRINCIPAL-BLANCO.png'
import { sygnet } from '@/assets/brand/sygnet'
import { AppSidebarNav } from '@/components/AppSidebarNav.js'
import { useSidebarStore } from '@/stores/sidebar.js'

import { useFilteredNav } from '@/composables/useFilteredNav.js'
const sidebar = useSidebarStore()
const { filteredNav } = useFilteredNav()
</script>

<template>
  <CSidebar
    class="border-end sidebar-we"
    colorScheme="dark"
    position="fixed"
    :unfoldable="sidebar.unfoldable"
    :visible="sidebar.visible"
    @visible-change="(value) => sidebar.toggleVisible(value)"
  >
    <CSidebarHeader class="border-bottom">
      <RouterLink custom to="/" v-slot="{ href, navigate }">
        <CSidebarBrand v-bind="$attrs" as="a" :href="href" @click="navigate">
          <img :src="logo" alt="Logo" class="sidebar-brand-full" height="60" width="150" />
          <CIcon 
            custom-class-name="sidebar-brand-narrow" 
            :icon="sygnet" 
            :height="32" 
          />
        </CSidebarBrand>
      </RouterLink>
      <CCloseButton class="d-lg-none" dark @click="sidebar.toggleVisible()" />
    </CSidebarHeader>
    <AppSidebarNav :items="filteredNav" />
    <CSidebarFooter class="border-top d-none d-lg-flex">
      <CSidebarToggler @click="sidebar.toggleUnfoldable()" />
    </CSidebarFooter>
  </CSidebar>
</template>

<style scoped>
/* ══════════════════════════════════════════
   VARIABLES
   ══════════════════════════════════════════ */
.sidebar-we {
  --s-bg:           #0d1b2a;
  --s-bg-header:    #0a1520;
  --s-surface:      rgba(255,255,255,0.04);
  --s-hover:        rgba(255,255,255,0.06);
  --s-active-bg:    rgba(20,184,166,0.12);
  --s-text-muted:   rgba(255,255,255,0.28);
  --s-text:         rgba(255,255,255,0.52);
  --s-text-hover:   rgba(255,255,255,0.85);
  --s-text-active:  #ffffff;
  --s-accent:       #14b8a6;
  --s-accent-soft:  rgba(20,184,166,0.35);
  --s-accent-dim:   rgba(20,184,166,0.15);
  --s-border:       rgba(255,255,255,0.07);
  --s-r:            6px;
  --s-ease:         cubic-bezier(0.25, 0.1, 0.25, 1);

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
}

/* ══════════════════════════════════════════
   BODY
   ══════════════════════════════════════════ */
.sidebar-we {
  background: var(--s-bg) !important;
  border-right: 1px solid var(--s-border) !important;
  box-shadow: 4px 0 20px rgba(0,0,0,0.3) !important;
}
:deep(.sidebar) { background: var(--s-bg) !important; }

/* ══════════════════════════════════════════
   HEADER / LOGO
   ══════════════════════════════════════════ */
:deep(.sidebar-header) {
  background: var(--s-bg-header) !important;
  border-bottom: 1px solid var(--s-border) !important;
  padding: 0 !important;
  min-height: 68px !important;
}
:deep(.sidebar-brand) {
  padding: 16px 20px !important;
  min-height: 68px !important;
  background: transparent !important;
  transition: opacity 0.2s !important;
}
:deep(.sidebar-brand:hover) { opacity: 0.8 !important; }
:deep(.sidebar-brand-full) { margin-left: 0 !important; }

/* ══════════════════════════════════════════
   NAV CONTAINER
   ══════════════════════════════════════════ */
:deep(.sidebar-nav) {
  background: transparent !important;
  padding: 8px 10px 16px !important;
  font-family: inherit !important;
}

/* ══════════════════════════════════════════
   SECTION TITLES  (ÁREAS, GENERAL)
   ══════════════════════════════════════════ */
:deep(.nav-title) {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  font-size: 0.58rem !important;
  font-weight: 700 !important;
  letter-spacing: 2px !important;
  text-transform: uppercase !important;
  color: var(--s-text-muted) !important;
  padding: 20px 8px 6px !important;
  margin: 0 !important;
  border: none !important;
  background: none !important;
}
:deep(.nav-title::before) {
  content: '' !important;
  display: block !important;
  width: 14px !important;
  height: 1px !important;
  background: var(--s-text-muted) !important;
  flex-shrink: 0 !important;
}
:deep(.nav-title:first-child) { padding-top: 8px !important; }

/* ══════════════════════════════════════════
   NAV GROUPS
   ══════════════════════════════════════════ */
:deep(.nav-group) {
  margin-bottom: 2px !important;
  border: none !important;
  border-radius: var(--s-r) !important;
  overflow: hidden !important;
}

:deep(.nav-group-toggle) {
  font-size: 0.8rem !important;
  font-weight: 500 !important;
  color: var(--s-text) !important;
  padding: 8px 10px !important;
  border-radius: var(--s-r) !important;
  transition: all 0.16s var(--s-ease) !important;
  background: transparent !important;
  border: none !important;
  letter-spacing: 0.1px !important;
}
:deep(.nav-group-toggle:hover) {
  color: var(--s-text-hover) !important;
  background: var(--s-hover) !important;
}

/* Grupo abierto — borde izquierdo teal sutil */
:deep(.nav-group.show) {
  background: rgba(255,255,255,0.02) !important;
  border-radius: var(--s-r) !important;
}
:deep(.nav-group.show > .nav-group-toggle) {
  color: var(--s-text-active) !important;
  background: transparent !important;
  font-weight: 600 !important;
  border-left: 2px solid var(--s-accent) !important;
  padding-left: 8px !important;
  border-radius: 0 var(--s-r) var(--s-r) 0 !important;
}

/* Chevron */
:deep(.nav-group-toggle::after) {
  opacity: 0.25 !important;
  transition: transform 0.22s var(--s-ease), opacity 0.22s !important;
  transform: scale(0.75) !important;
}
:deep(.nav-group-toggle:hover::after) { opacity: 0.5 !important; }
:deep(.nav-group.show > .nav-group-toggle::after) {
  opacity: 0.6 !important;
  transform: scale(0.75) rotate(180deg) !important;
}

/* Sub-items container — línea vertical conectora */
:deep(.nav-group-items) {
  position: relative !important;
  padding: 2px 0 6px 18px !important;
  background: transparent !important;
  border: none !important;
}
:deep(.nav-group-items::before) {
  content: '' !important;
  position: absolute !important;
  left: 20px !important;
  top: 4px !important;
  bottom: 10px !important;
  width: 1px !important;
  background: var(--s-border) !important;
  border-radius: 1px !important;
}

/* ══════════════════════════════════════════
   NAV LINKS
   ══════════════════════════════════════════ */
:deep(.nav-link) {
  font-size: 0.78rem !important;
  font-weight: 400 !important;
  color: var(--s-text) !important;
  padding: 7px 10px !important;
  border-radius: var(--s-r) !important;
  transition: all 0.16s var(--s-ease) !important;
  margin: 1px 0 !important;
  border: none !important;
  background: transparent !important;
  position: relative !important;
}
:deep(.nav-link:hover) {
  color: var(--s-text-hover) !important;
  background: var(--s-hover) !important;
}

/* ACTIVO */
:deep(.nav-link.active) {
  color: var(--s-text-active) !important;
  background: var(--s-active-bg) !important;
  font-weight: 600 !important;
}
:deep(.nav-link.active::before) {
  content: '' !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 3px !important;
  height: 16px !important;
  background: var(--s-accent) !important;
  border-radius: 0 3px 3px 0 !important;
  box-shadow: 0 0 8px var(--s-accent-soft) !important;
}

/* ══════════════════════════════════════════
   ICONS
   ══════════════════════════════════════════ */
:deep(.nav-icon) {
  width: 16px !important;
  height: 16px !important;
  min-width: 16px !important;
  margin-right: 10px !important;
  font-size: 0.9rem !important;
  flex-shrink: 0 !important;
  color: var(--s-text-muted) !important;
  opacity: 1 !important;
  transition: color 0.16s !important;
}
:deep(.nav-link:hover .nav-icon),
:deep(.nav-group-toggle:hover .nav-icon) { color: var(--s-text-hover) !important; }
:deep(.nav-link.active .nav-icon) {
  color: var(--s-accent) !important;
  filter: drop-shadow(0 0 5px var(--s-accent-soft)) !important;
}
:deep(.nav-group.show > .nav-group-toggle .nav-icon) { color: var(--s-accent) !important; }

/* ══════════════════════════════════════════
   BULLETS (sub-items sin icono)
   ══════════════════════════════════════════ */
:deep(.nav-icon-bullet) {
  width: 5px !important;
  height: 5px !important;
  border-radius: 50% !important;
  background: rgba(255,255,255,0.2) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  transition: all 0.16s !important;
  margin-right: 10px !important;
}
:deep(.nav-link:hover .nav-icon-bullet) {
  background: rgba(255,255,255,0.4) !important;
  transform: scale(1.2) !important;
}
:deep(.nav-link.active .nav-icon-bullet) {
  background: var(--s-accent) !important;
  border-color: var(--s-accent) !important;
  box-shadow: 0 0 6px var(--s-accent-soft) !important;
}

/* ══════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════ */
:deep(.sidebar-footer) {
  background: var(--s-bg-header) !important;
  border-top: 1px solid var(--s-border) !important;
  padding: 8px 10px !important;
  min-height: auto !important;
}
:deep(.sidebar-toggler) {
  background: transparent !important;
  border: none !important;
  border-radius: var(--s-r) !important;
  transition: all 0.16s !important;
  opacity: 0.3 !important;
  color: #fff !important;
  width: 100% !important;
  padding: 8px !important;
}
:deep(.sidebar-toggler:hover) {
  background: var(--s-hover) !important;
  opacity: 0.6 !important;
}

/* ══════════════════════════════════════════
   SCROLLBAR
   ══════════════════════════════════════════ */
:deep(.simplebar-scrollbar::before) {
  background: rgba(255,255,255,0.12) !important;
  border-radius: 10px !important;
}
:deep(.simplebar-track.simplebar-vertical) {
  width: 6px !important;
  right: 2px !important;
}
:deep(.simplebar-scrollbar.simplebar-visible::before) { opacity: 1 !important; }

/* ══════════════════════════════════════════
   COLLAPSED / UNFOLDABLE
   ══════════════════════════════════════════ */
:deep(.sidebar-narrow-unfoldable:not(:hover)) { background: var(--s-bg) !important; }
:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-link) {
  padding: 10px 0 !important;
  justify-content: center !important;
}
:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-icon) { margin: 0 !important; }
:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-link.active::before) { height: 20px !important; }
:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-title) { padding: 12px 0 4px !important; }
:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-group-items) { padding: 0 !important; }
:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-group-items::before) { display: none !important; }

/* ══════════════════════════════════════════
   MOBILE CLOSE
   ══════════════════════════════════════════ */
:deep(.btn-close) {
  filter: invert(1) !important;
  opacity: 0.3 !important;
  transition: opacity 0.2s !important;
}
:deep(.btn-close:hover) { opacity: 0.7 !important; }
</style>