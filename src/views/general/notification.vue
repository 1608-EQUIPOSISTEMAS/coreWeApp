<script setup>
import { ref, inject, onMounted, computed } from 'vue'
import { ServiceKeys } from '@/services'

const notificationService = inject(ServiceKeys.Notification)

// Estado
const rows        = ref([])
const totalCount  = ref(0)
const loading     = ref(false)
const page        = ref(1)
const size        = ref(20)
const filterRead  = ref(null) // null=todas | false=no leídas | true=leídas

const totalPages = computed(() => Math.ceil(totalCount.value / size.value))

async function load() {
  loading.value = true
  try {
    const payload = {
      page: page.value,
      size: size.value,
      ...(filterRead.value !== null && { is_read: String(filterRead.value) })
    }
    const data = await notificationService.list(payload)
    rows.value       = data.rows       ?? []
    totalCount.value = Number(data.rows?.[0]?.total_count ?? 0)
  } catch (err) {
    console.error('[Notificaciones] Error al cargar:', err)
  } finally {
    loading.value = false
  }
}

function setFilter(val) {
  filterRead.value = val
  page.value = 1
  load()
}

function prevPage() {
  if (page.value > 1) { page.value--; load() }
}

function nextPage() {
  if (page.value < totalPages.value) { page.value++; load() }
}

onMounted(load)
</script>

<template>
  <CRow>
    <CCol :xs="12">

      <!-- Encabezado -->
      <CCard class="mb-4 border-0 shadow-sm">
        <CCardHeader class="d-flex align-items-center justify-content-between bg-white border-bottom py-3">
          <div class="d-flex align-items-center gap-2">
            <CIcon icon="cil-bell" size="lg" class="text-primary" />
            <h5 class="mb-0 fw-semibold">Notificaciones</h5>
            <CBadge color="primary" shape="rounded-pill">{{ totalCount }}</CBadge>
          </div>

          <!-- Filtros rápidos -->
          <div class="d-flex gap-2">
            <CButton
              size="sm"
              :color="filterRead === null ? 'primary' : 'light'"
              @click="setFilter(null)"
            >
              Todas
            </CButton>
            <CButton
              size="sm"
              :color="filterRead === false ? 'primary' : 'light'"
              @click="setFilter(false)"
            >
              Sin leer
            </CButton>
            <CButton
              size="sm"
              :color="filterRead === true ? 'primary' : 'light'"
              @click="setFilter(true)"
            >
              Leídas
            </CButton>
            <CButton size="sm" color="light" @click="load" title="Actualizar">
              <i class="fa-solid fa-rotate-right"></i>
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody class="p-0">

          <!-- Skeleton loading -->
          <div v-if="loading" class="p-4">
            <div v-for="i in 5" :key="i" class="mb-3">
              <div class="placeholder-glow">
                <span class="placeholder col-4 mb-1 d-block rounded" style="height:14px"/>
                <span class="placeholder col-8 d-block rounded" style="height:12px"/>
              </div>
              <hr class="my-2" />
            </div>
          </div>

          <!-- Sin resultados -->
          <div v-else-if="rows.length === 0" class="text-center py-5 text-muted">
            <CIcon icon="cil-bell" size="3xl" class="mb-3 opacity-25" />
            <p class="mb-0">No hay notificaciones</p>
          </div>

          <!-- Lista -->
          <div v-else>
            <div
              v-for="notif in rows"
              :key="notif.notification_id"
              class="d-flex align-items-start gap-3 px-4 py-3 border-bottom notification-row"
              :class="{ 'unread': !notif.is_read }"
            >
              <!-- Indicador de estado -->
              <div class="pt-1 flex-shrink-0">
                <span
                  v-if="!notif.is_read"
                  class="dot-unread"
                />
                <CIcon v-else icon="cil-check-circle" class="text-muted opacity-50" size="sm" />
              </div>

              <!-- Contenido -->
              <div class="flex-grow-1 min-w-0">
                <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                  <span class="fw-semibold small" :class="notif.is_read ? 'text-muted' : 'text-body'">
                    {{ notif.title }}
                  </span>
                  <span class="text-muted" style="font-size:0.7rem; white-space:nowrap;">
                    {{ notif.created_at }}
                  </span>
                </div>
                <p class="mb-0 text-muted mt-1" style="font-size:0.82rem;">
                  {{ notif.message }}
                </p>

                <!-- Lead relacionado -->
                <div v-if="notif.lead_name || notif.lead_phone" class="mt-1 d-flex gap-3 flex-wrap">
                  <span v-if="notif.lead_name" class="badge bg-light text-dark border" style="font-size:0.72rem;">
                    👤 {{ notif.lead_name }}
                  </span>
                  <span v-if="notif.lead_phone" class="badge bg-light text-dark border" style="font-size:0.72rem;">
                    📞 {{ notif.lead_phone }}
                  </span>
                </div>
                <!-- Después del bloque de lead_name / lead_phone, agregar: -->
                <div v-if="notif.is_read && notif.read_at" class="mt-1">
                <span class="text-muted" style="font-size: 0.7rem;">
                    ✓ Leída el {{ notif.read_at }}
                </span>
                </div>
              </div>
            </div>
          </div>
        </CCardBody>

        <!-- Paginación -->
        <CCardFooter v-if="totalPages > 1" class="bg-white border-top d-flex justify-content-between align-items-center py-2 px-4">
          <span class="text-muted small">
            Página {{ page }} de {{ totalPages }} — {{ totalCount }} total
          </span>
          <div class="d-flex gap-2">
            <CButton size="sm" color="light" :disabled="page <= 1" @click="prevPage">
              ‹ Anterior
            </CButton>
            <CButton size="sm" color="light" :disabled="page >= totalPages" @click="nextPage">
              Siguiente ›
            </CButton>
          </div>
        </CCardFooter>
      </CCard>

    </CCol>
  </CRow>
</template>

<style scoped>
.notification-row {
  transition: background-color 0.15s;
}
.notification-row:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
.notification-row.unread {
  background-color: rgba(13, 110, 253, 0.04);
}
.dot-unread {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: #0d6efd;
  margin-top: 3px;
}
</style>