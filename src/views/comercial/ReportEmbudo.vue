<template>
  <div class="page-dashboard">
    <div class="header-flex">
      <div>
        <h2 class="page-title">Marketing & Producto</h2>
        <p class="page-sub">Rendimiento por canal de adquisición y popularidad de programas</p>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card flex-2">
        <div class="chart-header">
          <span class="chart-title">Leads por Canal (Origen)</span>
        </div>
        <div class="chart-body">
          <Doughnut :data="channelData" :options="pieOptions" />
        </div>
      </div>

      <div class="chart-card flex-3">
        <div class="chart-header">
          <span class="chart-title">Ventas vs Leads por Categoría</span>
        </div>
        <div class="chart-body">
          <Bar :data="categoryPerformanceData" :options="barGroupedOptions" />
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="chart-header">
        <span class="chart-title">🏆 Top Programas / Cursos (Ranking por Ingresos)</span>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Programa</th>
              <th class="text-center">Leads Totales</th>
              <th class="text-center">Inscritos</th>
              <th class="text-center">Conversión</th>
              <th class="text-end">Ingresos Totales</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(prog, idx) in topPrograms" :key="prog.name">
              <td class="text-muted fw-600">{{ idx + 1 }}</td>
              <td class="fw-600 text-dark">{{ prog.name }}</td>
              <td class="text-center">{{ prog.leads }}</td>
              <td class="text-center">{{ prog.sales }}</td>
              <td class="text-center">
                <div class="progress-wrapper">
                  <div class="progress-bar" :style="{ width: prog.conversion + '%' }"></div>
                  <span class="progress-text">{{ prog.conversion }}%</span>
                </div>
              </td>
              <td class="text-end fw-600 text-success">S/ {{ prog.revenue.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale
} from 'chart.js'
import { Doughnut, Bar } from 'vue-chartjs'
import { isDark } from '@/utils/chartTheme'

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// --- MOCK DATA ---
const topPrograms = [
  { name: 'Diplomado en Gestión Pública', leads: 450, sales: 45, conversion: 10, revenue: 56000 },
  { name: 'Curso Especializado Excel',    leads: 800, sales: 120, conversion: 15, revenue: 24000 },
  { name: 'PEE Finanzas Corporativas',    leads: 150, sales: 10,  conversion: 6.6, revenue: 18500 },
  { name: 'Taller Habilidades Blandas',   leads: 200, sales: 15,  conversion: 7.5, revenue: 4500 },
  { name: 'Membresía Anual 2025',         leads: 90,  sales: 5,   conversion: 5.5, revenue: 2500 },
]

// --- CHART 1: CANALES ---
const channelData = computed(() => ({
  labels: ['Facebook Ads', 'TikTok (Orgánico)', 'Google Search', 'Referidos', 'Base de Datos'],
  datasets: [{
    data: [40, 25, 15, 10, 10],
    backgroundColor: ['#1877F2', isDark.value ? '#E5E7EB' : '#000000', '#EA4335', '#34A853', '#FBBC05'],
    borderWidth: 0
  }]
}))
const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right' } }
}

// --- CHART 2: CATEGORIA (Leads vs Ventas) ---
const categoryPerformanceData = {
  labels: ['Diplomados', 'Cursos', 'PEE', 'Talleres'],
  datasets: [
    {
      label: 'Leads Generados',
      data: [800, 1200, 300, 400],
      backgroundColor: '#cbd5e1',
      borderRadius: 4
    },
    {
      label: 'Ventas Cerradas',
      data: [80, 150, 20, 35],
      backgroundColor: '#3b82f6',
      borderRadius: 4
    }
  ]
}
const barGroupedOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true } }
}
</script>

<style scoped>
/* Reutilizar estilos base */
.page-dashboard { padding: 1.5rem; background-color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; gap: 1.5rem; color: #1e293b; font-family: 'Hanken Grotesk', sans-serif;}
.header-flex { display: flex; justify-content: space-between; align-items: flex-end; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; color: #0f172a; }
.page-sub { font-size: 0.875rem; color: #64748b; margin: 0; }
.charts-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.chart-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem; min-height: 320px; display: flex; flex-direction: column; }
.flex-2 { flex: 2; min-width: 300px; }
.flex-3 { flex: 3; min-width: 400px; }
.chart-header { border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
.chart-title { font-weight: 600; color: #334155; font-size: 0.95rem; }
.chart-body { flex: 1; position: relative; }
.table-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; color: #64748b; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
.fw-600 { font-weight: 600; }
.text-center { text-align: center; }
.text-end { text-align: right; }
.text-success { color: #166534; }
.text-muted { color: #94a3b8; }

/* Custom Progress Bar para Conversion */
.progress-wrapper { display: flex; align-items: center; gap: 8px; }
.progress-bar { height: 6px; background-color: #3b82f6; border-radius: 4px; min-width: 2px; }
.progress-text { font-size: 0.7rem; color: #64748b; min-width: 35px; }

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .page-dashboard { background-color: #14140F; color: #F4F4F0; }
[data-coreui-theme="dark"] .page-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .page-sub { color: #A0A099; }
[data-coreui-theme="dark"] .chart-card, [data-coreui-theme="dark"] .table-card { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .chart-header { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .chart-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .table th { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .table td { border-bottom-color: #24241E; color: #A0A099; }
[data-coreui-theme="dark"] .text-success { color: #34D399; }
[data-coreui-theme="dark"] .text-muted { color: #8A8A80; }
[data-coreui-theme="dark"] .text-dark { color: #F4F4F0 !important; }
[data-coreui-theme="dark"] .progress-text { color: #A0A099; }
</style>