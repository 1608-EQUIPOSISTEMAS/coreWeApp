<template>
  <div class="px-4 py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="fw-700 text-dark mb-1">Métricas de Atención Automatizada</h4>
        <p class="text-muted small mb-0">Rendimiento del bot y volumen de solicitudes</p>
      </div>
      <div style="width: 250px;">
        <BaseDatePicker 
          v-model="dateRange" 
          :config="{ mode: 'range', dateFormat: 'Y-m-d' }" 
          class="exec-input-light w-100" 
          placeholder="Filtrar por fechas..." 
          @on-change="handleDateChange" 
        />
      </div>
    </div>

    <div v-if="isLoading" class="exec-loader py-5">
      <div class="loader-ring"></div>
      <p class="text-muted small mt-2 fw-600">Calculando métricas...</p>
    </div>

    <div v-else-if="metrics">
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="kpi-card shadow-sm">
            <div class="kpi-icon bg-blue-light text-blue"><i class="fa-solid fa-ticket"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Total Solicitudes</span>
              <span class="kpi-value">{{ metrics.total_tickets }}</span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card shadow-sm">
            <div class="kpi-icon bg-amber-light text-amber"><i class="fa-solid fa-clock"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Pendientes de Acción</span>
              <span class="kpi-value">{{ metrics.tickets_pendientes }}</span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card shadow-sm">
            <div class="kpi-icon bg-teal-light text-teal"><i class="fa-solid fa-check-double"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Tickets Solucionados</span>
              <span class="kpi-value">{{ metrics.tickets_solucionados }}</span>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="kpi-card shadow-sm">
            <div class="kpi-icon bg-yellow-light text-yellow"><i class="fa-solid fa-star"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">CSAT Promedio</span>
              <span class="kpi-value">{{ metrics.csat_avg_score || 'N/A' }} <span class="small fw-500 text-muted">/ 5.0</span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-md-8">
          <div class="chart-card shadow-sm h-100">
            <h6 class="fieldset-title mb-3">Volumen de Solicitudes por Día</h6>
            <apexchart type="area" height="300" :options="chartEvolucionOptions" :series="chartEvolucionSeries"></apexchart>
          </div>
        </div>

        <div class="col-md-4">
          <div class="chart-card shadow-sm h-100">
            <h6 class="fieldset-title mb-3">Distribución por Tipo</h6>
            <apexchart type="donut" height="300" :options="chartTiposOptions" :series="chartTiposSeries"></apexchart>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onActivated, inject, computed } from 'vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import { ServiceKeys } from '@/services'
import apexchart from 'vue3-apexcharts'
const botService = inject(ServiceKeys.Bot)
const isLoading = ref(true)
const metrics = ref(null)
const dateRange = ref(null)
const filters = ref({ from_date: null, to_date: null })

// === FETCH DATA ===
async function fetchMetrics() {
  isLoading.value = true
  try {
    const response = await botService.botDashboardMetricsGet(filters.value)
    metrics.value = response.data
  } catch (error) {
    console.error("Error obteniendo métricas del bot", error)
  } finally {
    isLoading.value = false
  }
}

function handleDateChange(dates, dateStr) {
  if (dateStr && dateStr.includes(' a ')) {
    const [start, end] = dateStr.split(' a ')
    filters.value.from_date = start
    filters.value.to_date = end
  } else if (dateStr) {
    filters.value.from_date = dateStr
    filters.value.to_date = dateStr
  } else {
    filters.value.from_date = null
    filters.value.to_date = null
  }
  fetchMetrics()
}

// === CONFIGURACIÓN DE GRÁFICOS (APEXCHARTS) ===

// 1. Gráfico de Evolución (Líneas/Área)
const chartEvolucionSeries = computed(() => {
  if (!metrics.value || !metrics.value.tickets_por_fecha) return []
  return [{
    name: 'Solicitudes',
    data: metrics.value.tickets_por_fecha.map(item => item.cantidad)
  }]
})

const chartEvolucionOptions = computed(() => {
  const categories = metrics.value?.tickets_por_fecha?.map(item => item.fecha) || []
  return {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#0ea5e9'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: categories, tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val) => Math.round(val) } }
  }
})

// 2. Gráfico de Tipos (Donut)
const chartTiposSeries = computed(() => {
  if (!metrics.value || !metrics.value.tickets_por_tipo) return []
  return metrics.value.tickets_por_tipo.map(item => item.cantidad)
})

const chartTiposOptions = computed(() => {
  const labels = metrics.value?.tickets_por_tipo?.map(item => item.tipo.replace(/_/g, ' ')) || []
  return {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: labels,
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
    plotOptions: {
      pie: { donut: { size: '70%', labels: { show: true, name: { show: true }, value: { show: true } } } }
    },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  }
})

onActivated(() => {
  fetchMetrics()
})
</script>

<style scoped>
.kpi-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--slate-200, #e2e8f0);
}
.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.bg-blue-light { background: #eff6ff; } .text-blue { color: #2563eb; }
.bg-amber-light { background: #fffbeb; } .text-amber { color: #d97706; }
.bg-teal-light { background: #f0fdf4; } .text-teal { color: #15803d; }
.bg-yellow-light { background: #fefce8; } .text-yellow { color: #eab308; }

.kpi-info { display: flex; flex-direction: column; }
.kpi-label { font-size: 12px; color: var(--slate-500, #64748b); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.kpi-value { font-size: 24px; font-weight: 700; color: var(--navy-900, #0f172a); line-height: 1.2; margin-top: 4px; }

.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--slate-200, #e2e8f0);
}
.fieldset-title {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--text-secondary, #475569);
  font-weight: 700;
}

.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid var(--border, #e2e8f0); border-top-color: #0d9488; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>