<script setup>
import { onMounted, ref } from 'vue'
import { useColorModes } from '@coreui/vue'

import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import AppHeaderDropdownAccnt from '@/components/AppHeaderDropdownAccnt.vue'
import { useSidebarStore } from '@/stores/sidebar.js'
import { useNotifications } from '@/composables/useNotifications'

import UnattendedCallsModal from '@/components/UnattendedCallsModal.vue' 
const headerClassNames = ref('mb-4 p-0')
const { colorMode, setColorMode } = useColorModes('coreui-free-vue-admin-template-theme')
const sidebar = useSidebarStore()

const { notifications, unreadCount, onOpenBell, modal5pm } = useNotifications()

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
        <!-- 🔔 CAMPANITA -->
        <CDropdown variant="nav-item" placement="bottom-end" @show="onOpenBell">
          <CDropdownToggle :caret="false" class="position-relative px-2">
            <CIcon icon="cil-bell" size="lg" />
            <span
              v-if="unreadCount > 0"
              class="position-absolute badge rounded-pill bg-danger"
              style="font-size: 0.6rem; min-width: 16px; height: 16px; line-height: 16px; padding: 0 4px; top: 2px; right: 2px;"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </CDropdownToggle>

          <CDropdownMenu style="min-width: 340px; max-height: 420px; overflow-y: auto;">
            <CDropdownHeader class="bg-body-secondary fw-semibold rounded-top d-flex justify-content-between align-items-center">
              <span>🔔 Notificaciones</span>
              <span v-if="unreadCount > 0" class="badge bg-danger">{{ unreadCount }} nuevas</span>
            </CDropdownHeader>

            <div v-if="notifications.length === 0" class="px-3 py-3 text-muted text-center small">
              Sin notificaciones
            </div>

            <template v-for="notif in notifications" :key="notif.notification_id">
              <CDropdownItem
                class="d-flex flex-column align-items-start py-2 border-bottom"
                :style="notif.is_read ? 'opacity: 0.55;' : 'background-color: rgba(var(--cui-primary-rgb), 0.05);'"
              >
                <!-- Punto azul para no leídas -->
                <div class="d-flex align-items-center gap-2 w-100">
                  <span
                    v-if="!notif.is_read"
                    style="width:8px; height:8px; border-radius:50%; background:#0d6efd; flex-shrink:0;"
                  />
                  <span v-else style="width:8px; flex-shrink:0;" />
                  <div class="fw-semibold small flex-grow-1">{{ notif.title }}</div>
                </div>
                <div class="text-muted ms-3 mt-1" style="font-size: 0.78rem; white-space: normal;">
                  {{ notif.message }}
                </div>
                <div class="text-muted ms-3 mt-1" style="font-size: 0.7rem;">
                  {{ new Date(notif.created_at).toLocaleString('es-PE') }}
                </div>
              </CDropdownItem>
            </template>
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