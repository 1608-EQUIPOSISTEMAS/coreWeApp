<template>
  <div v-if="loading" class="text-center p-4 text-muted"><i class="fa-solid fa-spinner fa-spin"></i></div>
  <div v-else-if="!items || items.length === 0" class="text-center text-muted p-3 small">Sin datos.</div>
  <div v-else class="table-responsive" style="max-height:280px;overflow-y:auto;">
    <table class="table table-borderless mb-0 align-middle w-100 clean-table">
      <thead class="sticky-top">
        <tr><th class="text-center" style="width:40px;">#</th><th>FECHA</th><th class="text-end pe-3">ESTADO</th></tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in items" :key="idx" :class="item.type === 'current' ? 'row-highlight' : 'row-normal'">
          <td class="text-center fw-bold text-muted small">
            <div v-if="item.type === 'current'" class="text-primary"><i class="fa-solid fa-caret-right"></i></div>
            <div v-else>{{ idx + 1 }}</div>
          </td>
          <td>
            <div class="d-flex flex-column lh-sm py-1">
              <span class="fw-bold text-dark" style="font-size:0.85rem;">{{ formatDate(item.start_date_eff) + ' [' + item.global_code + ']' }}</span>
              <div class="d-flex justify-content-between">
                <span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.hoursLabel }}</span>
                <span class="text-muted text-uppercase" style="font-size:0.7rem;">{{ item.daysLabel }}</span>
              </div>
            </div>
          </td>
          <td class="text-end pe-3">
            <div v-if="item.type === 'current'"><span class="badge bg-primary-subtle text-primary border border-primary-subtle px-3 rounded-pill">SELECCIÓN</span></div>
            <div v-else-if="item.gapInfo"><span class="badge rounded-pill px-3" :class="gapBadgeClass(item.gapInfo)">{{ item.gapInfo.label }}</span></div>
            <div v-else><span class="badge bg-success-subtle text-success border border-success-subtle px-3 rounded-pill">OK</span></div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
// Tabla del popover "Analisis de Tiempos": el historial de ediciones del programa
// con la fila en edicion intercalada, para ver de un vistazo cuantos dias la
// separan de la anterior y de la siguiente.
//
// Solo dibuja: el historial y los gaps los calcula quien la usa (Editions.vue).
// formatDate se inyecta, igual que en utils/childEdition.js, para no atar esta
// tabla al formateador de una vista.
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  formatDate: { type: Function, required: true }
})

function gapBadgeClass (gapInfo) {
  if (gapInfo.color.includes('danger')) return 'bg-danger-subtle text-danger border border-danger-subtle'
  if (gapInfo.color.includes('warning')) return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
  return 'bg-info-subtle text-info-emphasis border border-info-subtle'
}
</script>

<style scoped>
.clean-table thead th {
  background-color: #f8fafc; color: #64748b; font-weight: 700;
  font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 10px; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 2;
}
.clean-table tbody td { padding: 10px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }
.clean-table tbody tr:last-child td { border-bottom: none; }

.row-highlight { background-color: #eff6ff !important; }
.row-highlight td:first-child { border-left: 3px solid #3b82f6; }

[data-coreui-theme="dark"] .clean-table thead th { background-color: #24241E; color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .clean-table tbody td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .row-highlight { background-color: rgba(59,130,246,.18) !important; }
[data-coreui-theme="dark"] .row-highlight td:first-child { border-left-color: #60A5FA; }
</style>
