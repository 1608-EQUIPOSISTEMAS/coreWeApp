<template>
  <div class="card border-0 shadow-sm mb-4">

    <div class="card-header bg-white p-4 border-bottom">

      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-1 fw-bold text-primary">
            <i class="fa-solid fa-calendar-check me-2"></i>Tablero de Cronograma Objetivos
          </h4>
          <span class="text-muted small">
            Gestión comercial y financiera por programas — {{ filters.year }}
          </span>
        </div>

        <div class="d-flex gap-2 align-items-center">
          <button @click="toggleCompactView" class="btn btn-outline-secondary px-3 py-2 shadow-sm">
             <i class="fa-solid" :class="compactView ? 'fa-expand' : 'fa-compress'"></i>
             {{ compactView ? 'Expandir' : 'Compactar' }}
          </button>
          
          <button @click="exportData" class="btn btn-outline-success px-3 py-2 shadow-sm">
            <i class="fa-solid fa-file-excel me-2"></i>Exportar
          </button>

          <button
            class="btn btn-primary px-4 py-2 shadow-sm btn-hover-effect"
            @click="loadData"
            :disabled="isLoading"
          >
            <i class="fa-solid fa-sync me-2" :class="{ 'fa-spin': isLoading }"></i>
            {{ isLoading ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>
      </div>

      <div class="filter-bar bg-light rounded-3 p-3 border">
        <div class="row g-3 align-items-end">

          <div class="col-md-2">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-regular fa-calendar me-1"></i> Año
            </label>
            <select v-model="filters.year" class="form-select bg-white">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div class="col-md-2">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-solid fa-calendar-days me-1"></i> Mes
            </label>
            <select v-model="filters.month" class="form-select bg-white">
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              </select>
          </div>

          <div class="col-md-4">
            <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
              <i class="fa-solid fa-layer-group me-1"></i> Vista de Métricas
            </label>
            <select v-model="selectedMetricGroup" class="form-select bg-white">
              <option value="clientes"> CLIENTES </option>
              <option value="origen"> ORIGEN</option>
              <option value="asesores"> ASESORES</option>
              <option value="comercial"> ESTADO COMERCIAL</option>
            </select>
          </div>

          <div class="col-md-4">
             <div class="d-flex gap-3 justify-content-end h-100 align-items-end">
                <div class="kpi-inline text-end">
                    <div class="x-small fw-bold text-uppercase text-secondary ls-1">Meta Total</div>
                    <div class="fw-bold text-dark fs-6">{{ formatMoney(totalObjetivo) }}</div>
                </div>
                <div class="kpi-inline text-end">
                    <div class="x-small fw-bold text-uppercase text-secondary ls-1">Venta Total</div>
                    <div class="fw-bold text-primary fs-6">{{ formatMoney(totalVenta) }}</div>
                </div>
                <div class="kpi-inline text-end">
                    <div class="x-small fw-bold text-uppercase text-secondary ls-1">% Logro</div>
                    <div class="fw-bold text-success fs-6">{{ calcPct(totalVenta, totalObjetivo) }}%</div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>

    <div class="card-body bg-body-tertiary" style="min-height: 500px;">

      <div v-if="isLoading" class="d-flex flex-column align-items-center justify-content-center h-100 py-5 fade-in">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
        <h5 class="text-muted fw-bold">Calculando objetivos...</h5>
      </div>

      <div v-else class="animate__animated animate__fadeIn p-2">
        
        <div class="card border-0 shadow-sm mb-4 widget-card">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0 small align-middle">
                <thead class="table-light sticky-top">
                  <tr>
                    <th class="ps-3 py-2 border-0" rowspan="2" style="vertical-align:middle">CATEGORÍA</th>
                    <th colspan="5" class="text-center py-2 border-0 border-start group-header-blue">DATOS DEL PROGRAMA</th>
                    <th colspan="3" class="text-center py-2 border-0 border-start group-header-green">OBJETIVOS Y LOGROS</th>
                    <th :colspan="currentMetrics.length" class="text-center py-2 border-0 border-start group-header-gray text-uppercase">
                      {{ currentGroupTitle }}
                    </th>
                  </tr>
                  <tr class="table-light">
                    <th class="text-center py-2 border-0 border-start sub-blue">LÍNEA</th>
                    <th class="text-start py-2 border-0 sub-blue">PROGRAMA</th>
                    <th class="text-center py-2 border-0 sub-blue">TIPO</th>
                    <th class="text-center py-2 border-0 sub-blue">INICIO</th>
                    <th class="text-center py-2 border-0 sub-blue">EDICIÓN</th>

                    <th class="text-end py-2 border-0 border-start sub-green">META S/.</th>
                    <th class="text-end py-2 border-0 sub-green">VENTA S/.</th>
                    <th class="text-center py-2 border-0 sub-green">%</th>

                    <th 
                      v-for="metric in currentMetrics" 
                      :key="metric.key"
                      class="text-center py-2 border-0 border-start sub-gray"
                    >
                      <div class="d-flex flex-column">
                        <span>{{ metric.name }}</span>
                        <div class="d-flex justify-content-center gap-2 x-small text-muted fw-normal mt-1">
                           <span>#</span> <span class="border-start ps-2">%</span>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in filteredData" :key="index" class="cursor-pointer row-hover">
                    
                    <td class="ps-3 py-2 border-0 fw-bold">
                       <span class="badge rounded-pill" :class="getBadgeClass(row.catg)">{{ row.catg }}</span>
                    </td>

                    <td class="text-center py-2 border-0 border-start bg-blue-subtle text-muted">{{ row.linea }}</td>
                    <td class="py-2 border-0 bg-blue-subtle fw-bold text-dark text-truncate" style="max-width: 200px;" :title="row.programa">
                        {{ row.programa }}
                    </td>
                    <td class="text-center py-2 border-0 bg-blue-subtle">
                         <span class="badge border text-dark bg-white" style="font-size: 0.7rem;">{{ row.tipo }}</span>
                    </td>
                    <td class="text-center py-2 border-0 bg-blue-subtle text-muted x-small">{{ row.fecha }}</td>
                    <td class="text-center py-2 border-0 bg-blue-subtle text-muted x-small">{{ row.edicion }}</td>

                    <td class="text-end py-2 border-0 border-start bg-success-subtle text-muted x-small">
                        {{ formatMoney(row.objetivo) }}
                    </td>
                    <td class="text-end py-2 border-0 bg-success-subtle fw-bold text-dark">
                        {{ formatMoney(row.venta) }}
                    </td>
                    <td class="text-center py-2 border-0 bg-success-subtle">
                         <span :class="getPctColorClass(calcPct(row.venta, row.objetivo))">
                            {{ calcPct(row.venta, row.objetivo) }}%
                         </span>
                    </td>

                    <td 
                      v-for="metric in currentMetrics" 
                      :key="metric.key"
                      class="text-center py-2 border-0 border-start"
                    >
                      <div class="d-flex justify-content-center gap-2">
                         <span class="fw-bold text-dark">{{ getMetricValue(row, metric.key, 'cant') }}</span>
                         <span class="text-muted border-start ps-2 x-small" style="min-width: 30px;">
                            {{ getMetricValue(row, metric.key, 'pct') }}%
                         </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                    <tr class="table-secondary fw-bold border-top">
                        <td class="ps-3 py-2" colspan="6">TOTALES GENERALES</td>
                        <td class="text-end py-2">{{ formatMoney(totalObjetivo) }}</td>
                        <td class="text-end py-2 text-primary">{{ formatMoney(totalVenta) }}</td>
                        <td class="text-center py-2">
                             <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2">
                                {{ calcPct(totalVenta, totalObjetivo) }}%
                             </span>
                        </td>
                        <td 
                          v-for="metric in currentMetrics" 
                          :key="`t-${metric.key}`"
                          class="text-center py-2 border-start"
                        >
                            {{ getTotalForMetric(metric.key, 'cant') }}
                        </td>
                    </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const isLoading = ref(false)
const selectedMetricGroup = ref('origen')
const compactView = ref(false)
const filters = ref({ year: '2026', month: '1' })

// Configuración de métricas (Igual que tu original)
const metricGroups = {
  clientes: { 
    title: 'CLIENTES', 
    metrics: [
      { key: 'nuevos', name: 'NUEVOS' }, 
      { key: 'leads', name: 'LEADS' }, 
      { key: 'comunidad', name: 'COMUNIDAD' }
    ] 
  },
  origen: { 
    title: 'ORIGEN - VÍAS', 
    metrics: [
      { key: 'facebook', name: 'FACEBOOK' }, 
      { key: 'whatsapp', name: 'WHATSAPP' }, 
      { key: 'web', name: 'WEB' }, 
      { key: 'b2b', name: 'B2B' }, 
      { key: 'instagram', name: 'INSTAGRAM' }
    ] 
  },
  asesores: { 
    title: 'ASESORES', 
    metrics: [
      { key: 'arleth', name: 'ARLETH' }, 
      { key: 'grecia', name: 'GRECIA' }, 
      { key: 'camilo', name: 'CAMILO' }, 
      { key: 'gerard', name: 'GERARD' }
    ] 
  },
  comercial: { 
    title: 'ESTADO COMERCIAL', 
    metrics: [
      { key: 'atendido', name: 'Atendido' }, 
      { key: 'pago', name: 'Pagó' }, 
      { key: 'cerrado', name: 'Cerrado' },
      { key: 'interesado', name: 'Interesado' }, 
      { key: 'inscrito', name: 'Inscrito' }
    ] 
  }
}

// Data Hardcoded (Igual que tu original)
const tableData = ref([
  { 
    catg: 'CURSO', linea: 'SAP', programa: 'SAP HANA MM', tipo: 'B', fecha: '22/01/2026', edicion: 'E2-26',
    objetivo: 25000, venta: 28500,
    nuevos: { cant: 2, pct: 20 }, leads: { cant: 3, pct: 30 }, comunidad: { cant: 5, pct: 50 },
    facebook: { cant: 4, pct: 40 }, whatsapp: { cant: 3, pct: 30 }, web: { cant: 2, pct: 20 }, b2b: { cant: 1, pct: 10 }, instagram: { cant: 0, pct: 0 },
    arleth: { cant: 5, pct: 50 }, grecia: { cant: 2, pct: 20 }, camilo: { cant: 2, pct: 20 }, gerard: { cant: 1, pct: 10 },
    atendido: { cant: 15, pct: 15 }, pago: { cant: 10, pct: 10 }, cerrado: { cant: 8, pct: 8 }, interesado: { cant: 12, pct: 12 }, inscrito: { cant: 10, pct: 10 }
  },
  { 
    catg: 'DIPLOMADO', linea: 'BI', programa: 'DIP INTELIG. Y ANALIST.', tipo: 'A', fecha: '22/01/2026', edicion: 'E1-26',
    objetivo: 45000, venta: 48000,
    nuevos: { cant: 5, pct: 25 }, leads: { cant: 8, pct: 40 }, comunidad: { cant: 7, pct: 35 },
    facebook: { cant: 6, pct: 30 }, whatsapp: { cant: 5, pct: 25 }, web: { cant: 5, pct: 25 }, b2b: { cant: 4, pct: 20 }, instagram: { cant: 0, pct: 0 },
    arleth: { cant: 8, pct: 40 }, grecia: { cant: 5, pct: 25 }, camilo: { cant: 4, pct: 20 }, gerard: { cant: 3, pct: 15 },
    atendido: { cant: 25, pct: 12.5 }, pago: { cant: 20, pct: 10 }, cerrado: { cant: 15, pct: 7.5 }, interesado: { cant: 22, pct: 11 }, inscrito: { cant: 20, pct: 10 }
  },
  { 
    catg: 'PEE', linea: 'PROCESOS', programa: 'PEE ANALIST PROC', tipo: 'B', fecha: '24/01/2026', edicion: 'E1-26',
    objetivo: 8000, venta: 6500,
    nuevos: { cant: 1, pct: 33 }, leads: { cant: 1, pct: 33 }, comunidad: { cant: 1, pct: 34 },
    facebook: { cant: 1, pct: 33 }, whatsapp: { cant: 1, pct: 33 }, web: { cant: 1, pct: 34 }, b2b: { cant: 0, pct: 0 }, instagram: { cant: 0, pct: 0 },
    arleth: { cant: 2, pct: 67 }, grecia: { cant: 1, pct: 33 }, camilo: { cant: 0, pct: 0 }, gerard: { cant: 0, pct: 0 },
    atendido: { cant: 5, pct: 16.7 }, pago: { cant: 3, pct: 10 }, cerrado: { cant: 2, pct: 6.7 }, interesado: { cant: 4, pct: 13.3 }, inscrito: { cant: 3, pct: 10 }
  },
  { 
    catg: 'ESP.', linea: 'EXCEL', programa: 'ESP. MACROS', tipo: 'C', fecha: '31/01/2026', edicion: 'E1-26',
    objetivo: 20000, venta: 21500,
    nuevos: { cant: 4, pct: 28.6 }, leads: { cant: 5, pct: 35.7 }, comunidad: { cant: 5, pct: 35.7 },
    facebook: { cant: 5, pct: 35.7 }, whatsapp: { cant: 4, pct: 28.6 }, web: { cant: 3, pct: 21.4 }, b2b: { cant: 2, pct: 14.3 }, instagram: { cant: 0, pct: 0 },
    arleth: { cant: 6, pct: 42.9 }, grecia: { cant: 4, pct: 28.6 }, camilo: { cant: 3, pct: 21.4 }, gerard: { cant: 1, pct: 7.1 },
    atendido: { cant: 17, pct: 12.1 }, pago: { cant: 14, pct: 10 }, cerrado: { cant: 11, pct: 7.9 }, interesado: { cant: 15, pct: 10.7 }, inscrito: { cant: 14, pct: 10 }
  }
])

const currentGroupTitle = computed(() => metricGroups[selectedMetricGroup.value].title)
const currentMetrics = computed(() => metricGroups[selectedMetricGroup.value].metrics)
const filteredData = computed(() => tableData.value)

const totalObjetivo = computed(() => filteredData.value.reduce((acc, row) => acc + (row.objetivo || 0), 0))
const totalVenta = computed(() => filteredData.value.reduce((acc, row) => acc + (row.venta || 0), 0))

function loadData() {
  isLoading.value = true
  setTimeout(() => isLoading.value = false, 1000)
}

function toggleCompactView() {
  compactView.value = !compactView.value
}

function getMetricValue(row, metricKey, type) {
  if (!row[metricKey]) return 0
  return row[metricKey][type] || 0
}

function getTotalForMetric(metricKey, type) {
  return filteredData.value.reduce((sum, row) => sum + getMetricValue(row, metricKey, type), 0)
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(value)
}

function calcPct(venta, objetivo) {
  if (!objetivo) return 0
  return Math.round((venta / objetivo) * 100)
}

// === ESTILOS ACTUALIZADOS (Bootstrap Utility Classes) ===

// Colores de texto para porcentaje (igual al dashboard anterior)
function getPctColorClass(pct) {
  if (pct >= 100) return 'text-success fw-bold'
  if (pct >= 80) return 'text-primary fw-bold'
  return 'text-danger fw-bold'
}

// Badges estilo "Pill" sutiles (igual al dashboard anterior)
function getBadgeClass(catg) {
  const map = {
    'CURSO': 'bg-primary-subtle text-primary border border-primary-subtle',
    'DIPLOMADO': 'bg-purple-subtle text-purple border border-purple-subtle', // Requiere CSS helper abajo
    'PEE': 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
    'ESP.': 'bg-info-subtle text-info-emphasis border border-info-subtle'
  }
  return map[catg] || 'bg-light text-secondary border'
}

function showMetricSelector() { 
  // Lógica opcional
}

function exportData() { 
  alert('Exportando...')
}
</script>

<style scoped>
/* ESTILOS COPIADOS Y ADAPTADOS DE TABLERO DE ASESOR 
   Se eliminaron los degradados oscuros para una estética limpia.
*/

.widget-card { border-radius: 0.5rem; overflow: hidden; }
.row-hover:hover { background-color: #f1f5f9; }
.cursor-pointer { cursor: pointer; }
.ls-1 { letter-spacing: 0.05em; }
.x-small { font-size: 0.7rem; }
.sticky-top { position: sticky; top: 0; z-index: 5; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.fade-in { animation: fadeIn 0.5s ease-in-out; }

/* KPIs inline en la barra de filtros */
.kpi-inline { min-width: 80px; }

/* Columnas de tabla con color agrupado (PASTELES) */
.group-header-blue { background: #eff6ff; color: #1e40af; }
.group-header-green { background: #ecfdf5; color: #047857; }
.group-header-gray { background: #f8fafc; color: #475569; }

/* Subcabeceras */
.sub-blue { background: #eff6ff; color: #1d4ed8; }
.sub-green { background: #ecfdf5; color: #059669; }
.sub-gray { background: #f8fafc; color: #64748b; }

/* Fondos sutiles de celdas */
.bg-blue-subtle { background-color: #eff6ff !important; }
.bg-success-subtle { background-color: #ecfdf5 !important; }

/* Helpers para colores personalizados no incluidos en Bootstrap standard */
.bg-purple-subtle { background-color: #f3e8ff !important; }
.text-purple { color: #7e22ce !important; }
.border-purple-subtle { border-color: #d8b4fe !important; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>