<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useColorModes } from '@coreui/vue'

import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import AppHeaderDropdownAccnt from '@/components/AppHeaderDropdownAccnt.vue'
import { useSidebarStore } from '@/stores/sidebar.js'
import { useNotifications } from '@/composables/useNotifications'

import UnattendedCallsModal from '@/components/UnattendedCallsModal.vue'
const headerClassNames = ref('mb-4 p-0')
const { colorMode, setColorMode } = useColorModes('coreui-free-vue-admin-template-theme')
const sidebar = useSidebarStore()
const router = useRouter()

const { notifications, unreadCount, onOpenBell, modal5pm } = useNotifications()

function goToNotification (notif) {
  if (notif.lead_id) {
    router.push({ name: 'ComercialLeadDetalle', params: { id: notif.lead_id } })
  }
}

// TODO (Learning Mode): implementar helper de tiempo relativo.
// Recibe un ISO string (notif.created_at) y devuelve un label corto y legible
// que se mostrara en el pie de cada notificacion.
//
// Trade-offs a considerar:
//   a) Relativo puro:  "hace 2 m", "hace 3 h", "ayer", "hace 5 d"
//      + humano, escaneable, ideal para notificaciones recientes
//      - pierde precision para eventos antiguos ("hace 2 meses" no dice cuando)
//   b) Absoluto puro:  "16/4/2026, 2:53 p. m."  (lo que hay hoy)
//      + preciso, auditable
//      - ruidoso, dificil de escanear, saturante cuando hay muchas
//   c) Hibrido:        < 24h -> relativo ("hace 45 m"),  >= 24h -> fecha corta ("16 abr")
//      + lo mejor de ambos mundos para un CRM comercial
//      - mas logica y mas tests mentales
//
// Restricciones:
//   - Locale es es-PE (Peru), usar Intl.RelativeTimeFormat('es-PE') o cadenas propias.
//   - Evita librerias nuevas (date-fns / dayjs) — el proyecto no las tiene instaladas.
//   - Maximo 10 lineas, debe ser puro (sin side effects).
function formatRelativeTime (iso) {
  // TODO: reemplazar por la estrategia elegida.
  return new Date(iso).toLocaleString('es-PE')
}

onMounted(() => {
  document.addEventListener('scroll', () => {
    headerClassNames.value = document.documentElement.scrollTop > 0
      ? 'mb-4 p-0 shadow-sm'
      : 'mb-4 p-0'
  })
})

</script>

<template>
  <CHeader position="sticky" :class="headerClassNames">
    <CContainer class="border-bottom px-4" fluid>
      <CHeaderToggler @click="sidebar.toggleVisible()" style="margin-inline-start: -14px">
        <CIcon icon="cil-menu" size="lg" />
      </CHeaderToggler>
      <AppBreadcrumb />

      <CHeaderNav class="ms-auto">
        <CDropdown variant="nav-item" placement="bottom-end" @show="onOpenBell">
          <CDropdownToggle :caret="false" class="notif-toggle">
            <CIcon icon="cil-bell" size="lg" />
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
                  <template v-else>Todo al dia</template>
                </div>
              </div>
              <span v-if="unreadCount > 0" class="notif-header__pill">{{ unreadCount }}</span>
            </div>

            <div v-if="notifications.length === 0" class="notif-empty">
              <CIcon icon="cil-bell" size="xl" class="notif-empty__icon" />
              <div class="notif-empty__title">Sin notificaciones</div>
              <div class="notif-empty__hint">Te avisaremos cuando algo requiera tu atencion.</div>
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
      </CHeaderNav>

      <CHeaderNav>
        <CDropdown variant="nav-item" placement="bottom-end">
          <CDropdownToggle :caret="false">
            <CIcon v-if="colorMode === 'dark'" icon="cil-moon" size="lg" />
            <CIcon v-else-if="colorMode === 'light'" icon="cil-sun" size="lg" />
            <CIcon v-else icon="cil-contrast" size="lg" />
          </CDropdownToggle>
          <CDropdownMenu>
            <CDropdownItem :active="colorMode === 'light'" class="d-flex align-items-center" component="button" type="button" @click="setColorMode('light')">
              <CIcon class="me-2" icon="cil-sun" size="lg" /> Light
            </CDropdownItem>
            <CDropdownItem :active="colorMode === 'dark'" class="d-flex align-items-center" component="button" type="button" @click="setColorMode('dark')">
              <CIcon class="me-2" icon="cil-moon" size="lg" /> Dark
            </CDropdownItem>
            <CDropdownItem :active="colorMode === 'auto'" class="d-flex align-items-center" component="button" type="button" @click="setColorMode('auto')">
              <CIcon class="me-2" icon="cil-contrast" size="lg" /> Auto
            </CDropdownItem>
          </CDropdownMenu>
        </CDropdown>
        <li class="nav-item py-1">
          <div class="vr h-100 mx-2 text-body text-opacity-75"></div>
        </li>
        <AppHeaderDropdownAccnt />
      </CHeaderNav>
    </CContainer>
    <UnattendedCallsModal
      v-model="modal5pm.show"
      :registros="modal5pm.registros"
    />
  </CHeader>
</template>

<style scoped>
.notif-toggle {
  position: relative;
  padding: 0.35rem 0.55rem;
}

.notif-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--cui-header-bg, #fff);
}

.notif-menu {
  min-width: 380px !important;
  width: 380px !important;
  max-width: 92vw !important;
  padding: 0 !important;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08) !important;
  border-radius: 14px !important;
  box-shadow: 0 12px 32px -12px rgba(15, 23, 42, 0.18) !important;
  background: #fff;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  background: linear-gradient(180deg, #fafbff 0%, #ffffff 100%);
}

.notif-header__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.notif-header__subtitle {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 2px;
}

.notif-header__pill {
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366F1;
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
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.notif-item:last-child { border-bottom: 0; }
.notif-item:hover { background: #f8fafc; }
.notif-item:focus-visible { outline: none; background: #f1f5f9; }

.notif-item__bar {
  width: 3px;
  margin-right: 13px;
  border-radius: 0 3px 3px 0;
  background: #6366F1;
  flex-shrink: 0;
}

.notif-item--read .notif-item__bar { background: transparent; }

.notif-item__body {
  flex: 1;
  min-width: 0;
}

.notif-item__title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
  margin-bottom: 4px;
}

.notif-item--read .notif-item__title {
  font-weight: 500;
  color: #475569;
}

.notif-item__message {
  font-size: 0.8rem;
  color: #475569;
  line-height: 1.45;
  word-break: break-word;
}

.notif-item--read .notif-item__message { color: #94a3b8; }

.notif-item__time {
  margin-top: 6px;
  font-size: 0.7rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.notif-empty {
  padding: 32px 20px;
  text-align: center;
}

.notif-empty__icon { color: #cbd5e1; margin-bottom: 8px; }
.notif-empty__title { font-size: 0.85rem; font-weight: 600; color: #334155; }
.notif-empty__hint  { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
</style>