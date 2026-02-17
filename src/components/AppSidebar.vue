<script setup>
import { RouterLink } from 'vue-router'
import logo from '@/assets/brand/WE-EDUCACION-PRINCIPAL-BLANCO.png'
import { sygnet } from '@/assets/brand/sygnet'
import { AppSidebarNav } from '@/components/AppSidebarNav.js'
import { useSidebarStore } from '@/stores/sidebar.js'

const sidebar = useSidebarStore()
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
    <AppSidebarNav />
    <CSidebarFooter class="border-top d-none d-lg-flex">
      <CSidebarToggler @click="sidebar.toggleUnfoldable()" />
    </CSidebarFooter>
  </CSidebar>
</template>

<style scoped>
/* ─── VARIABLES ─── */
.sidebar-we {
  --s-bg: #06101f;
  --s-surface: rgba(255,255,255,0.03);
  --s-hover: rgba(255,255,255,0.055);
  --s-active-bg: rgba(217,4,41,0.1);
  --s-active-bg-strong: rgba(217,4,41,0.14);
  --s-text-muted: rgba(255,255,255,0.38);
  --s-text: rgba(255,255,255,0.58);
  --s-text-hover: rgba(255,255,255,0.82);
  --s-text-active: #ffffff;
  --s-accent: #d90429;
  --s-accent-soft: rgba(217,4,41,0.5);
  --s-border: rgba(255,255,255,0.06);
  --s-border-light: rgba(255,255,255,0.04);
  --s-r: 8px;
  --s-ease: cubic-bezier(0.25, 0.1, 0.25, 1);

  font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}

/* ─── SIDEBAR BODY ─── */
.sidebar-we {
  background: var(--s-bg) !important;
  border-right: 1px solid var(--s-border) !important;
  box-shadow: 2px 0 24px rgba(0,0,0,0.25) !important;
}

:deep(.sidebar) {
  background: var(--s-bg) !important;
}

/* ─── HEADER / LOGO ─── */
:deep(.sidebar-header) {
  background: transparent !important;
  border-bottom: 1px solid var(--s-border) !important;
  padding: 0 !important;
  min-height: 64px !important;
}

:deep(.sidebar-brand) {
  padding: 14px 20px !important;
  min-height: 64px !important;
  background: transparent !important;
  transition: opacity 0.2s var(--s-ease) !important;
}

:deep(.sidebar-brand:hover) {
  opacity: 0.85 !important;
}

:deep(.sidebar-brand-full) {
  margin-left: 0 !important;
}

/* ─── NAV CONTAINER ─── */
:deep(.sidebar-nav) {
  background: transparent !important;
  padding: 12px !important;
  font-family: inherit !important;
}

/* ══════════════════════════════════════════
   SECTION TITLES (Áreas, General)
   ══════════════════════════════════════════ */
:deep(.nav-title) {
  font-size: 0.6rem !important;
  font-weight: 700 !important;
  letter-spacing: 2.5px !important;
  text-transform: uppercase !important;
  color: var(--s-text-muted) !important;
  padding: 24px 14px 8px !important;
  margin: 0 !important;
  border: none !important;
  background: none !important;
  position: relative !important;
}

:deep(.nav-title:first-child) {
  padding-top: 4px !important;
}

/* ══════════════════════════════════════════
   NAV GROUPS (Finanzas, Producto, etc.)
   Toggler = el botón que abre/cierra
   ══════════════════════════════════════════ */
:deep(.nav-group) {
  margin-bottom: 1px !important;
  border: none !important;
}

:deep(.nav-group-toggle) {
  font-size: 0.82rem !important;
  font-weight: 500 !important;
  color: var(--s-text) !important;
  padding: 9px 12px !important;
  border-radius: var(--s-r) !important;
  transition: all 0.18s var(--s-ease) !important;
  background: transparent !important;
  border: none !important;
  margin: 1px 0 !important;
  letter-spacing: 0.1px !important;
}

:deep(.nav-group-toggle:hover) {
  color: var(--s-text-hover) !important;
  background: var(--s-hover) !important;
}

/* Grupo abierto */
:deep(.nav-group.show > .nav-group-toggle) {
  color: var(--s-text-active) !important;
  background: var(--s-surface) !important;
  font-weight: 600 !important;
}

/* Chevron / flecha */
:deep(.nav-group-toggle::after) {
  opacity: 0.2 !important;
  transition: all 0.22s var(--s-ease) !important;
  transform: scale(0.7) !important;
}

:deep(.nav-group-toggle:hover::after) {
  opacity: 0.45 !important;
}

:deep(.nav-group.show > .nav-group-toggle::after) {
  opacity: 0.4 !important;
}

/* Items container dentro del grupo */
:deep(.nav-group-items) {
  padding: 2px 0 6px 0 !important;
  background: transparent !important;
  border: none !important;
}

/* ══════════════════════════════════════════
   NAV LINKS (items individuales)
   ══════════════════════════════════════════ */
:deep(.nav-link) {
  font-size: 0.79rem !important;
  font-weight: 400 !important;
  color: var(--s-text) !important;
  padding: 8px 12px !important;
  border-radius: var(--s-r) !important;
  transition: all 0.18s var(--s-ease) !important;
  margin: 1px 0 !important;
  border: none !important;
  background: transparent !important;
  position: relative !important;
  letter-spacing: 0.05px !important;
}

:deep(.nav-link:hover) {
  color: var(--s-text-hover) !important;
  background: var(--s-hover) !important;
}

/* ── ESTADO ACTIVO ── */
:deep(.nav-link.active) {
  color: var(--s-text-active) !important;
  background: var(--s-active-bg) !important;
  font-weight: 600 !important;
}

/* Barra roja izquierda */
:deep(.nav-link.active::before) {
  content: '' !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 3px !important;
  height: 18px !important;
  background: var(--s-accent) !important;
  border-radius: 0 4px 4px 0 !important;
  box-shadow: 0 0 8px var(--s-accent-soft) !important;
}

/* ══════════════════════════════════════════
   ICONS
   ══════════════════════════════════════════ */
:deep(.nav-icon) {
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  margin-right: 11px !important;
  font-size: 1rem !important;
  flex-shrink: 0 !important;
  color: var(--s-text-muted) !important;
  opacity: 1 !important;
  transition: all 0.18s var(--s-ease) !important;
}

/* Hover */
:deep(.nav-link:hover .nav-icon),
:deep(.nav-group-toggle:hover .nav-icon) {
  color: var(--s-text-hover) !important;
}

/* Activo */
:deep(.nav-link.active .nav-icon) {
  color: var(--s-accent) !important;
  filter: drop-shadow(0 0 4px var(--s-accent-soft)) !important;
}

/* Grupo abierto */
:deep(.nav-group.show > .nav-group-toggle .nav-icon) {
  color: var(--s-accent) !important;
}

/* ══════════════════════════════════════════
   BULLETS (sub-items sin icono)
   ══════════════════════════════════════════ */
:deep(.nav-icon-bullet) {
  width: 4px !important;
  height: 4px !important;
  border-radius: 50% !important;
  background: rgba(255,255,255,0.15) !important;
  transition: all 0.2s var(--s-ease) !important;
}

:deep(.nav-link:hover .nav-icon-bullet) {
  background: rgba(255,255,255,0.3) !important;
  transform: scale(1.3) !important;
}

:deep(.nav-link.active .nav-icon-bullet) {
  background: var(--s-accent) !important;
  width: 5px !important;
  height: 5px !important;
  box-shadow: 0 0 8px var(--s-accent-soft) !important;
}

/* ══════════════════════════════════════════
   BADGES
   ══════════════════════════════════════════ */
:deep(.badge) {
  font-size: 0.6rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.4px !important;
  padding: 2px 6px !important;
  border-radius: 5px !important;
}

/* ══════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════ */
:deep(.sidebar-footer) {
  background: transparent !important;
  border-top: 1px solid var(--s-border) !important;
  padding: 8px 12px !important;
  min-height: auto !important;
}

:deep(.sidebar-toggler) {
  background: transparent !important;
  border: none !important;
  border-radius: var(--s-r) !important;
  transition: all 0.18s var(--s-ease) !important;
  opacity: 0.25 !important;
  color: #fff !important;
  width: 100% !important;
  padding: 10px !important;
}

:deep(.sidebar-toggler:hover) {
  background: var(--s-hover) !important;
  opacity: 0.55 !important;
}

/* ══════════════════════════════════════════
   SCROLLBAR
   ══════════════════════════════════════════ */
:deep(.simplebar-scrollbar::before) {
  background: rgba(255,255,255,0.1) !important;
  border-radius: 10px !important;
  width: 3px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
}

:deep(.simplebar-track.simplebar-vertical) {
  width: 8px !important;
  right: 2px !important;
}

:deep(.simplebar-scrollbar.simplebar-visible::before) {
  opacity: 1 !important;
}

/* ══════════════════════════════════════════
   COLLAPSED / UNFOLDABLE
   ══════════════════════════════════════════ */
:deep(.sidebar-narrow-unfoldable:not(:hover)) {
  background: var(--s-bg) !important;
}

:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-link) {
  padding: 10px 0 !important;
  justify-content: center !important;
  border-radius: var(--s-r) !important;
}

:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-icon) {
  margin: 0 !important;
}

:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-link.active::before) {
  height: 22px !important;
  top: 50% !important;
}

:deep(.sidebar-narrow-unfoldable:not(:hover) .nav-title) {
  padding: 12px 0 4px !important;
}

/* ══════════════════════════════════════════
   CLOSE BUTTON (mobile)
   ══════════════════════════════════════════ */
:deep(.btn-close) {
  filter: invert(1) !important;
  opacity: 0.3 !important;
  transition: opacity 0.2s !important;
}

:deep(.btn-close:hover) {
  opacity: 0.7 !important;
}
</style>