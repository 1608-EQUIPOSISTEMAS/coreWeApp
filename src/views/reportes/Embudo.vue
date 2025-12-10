<template>
  <div class="page">
    <h2 class="page-title">Reportes comerciales</h2>
    <p class="page-sub">Leads por mes, por asesor y por estado (demo)</p>

    <!-- FILTROS SIMPLES -->
    <div class="filters">
      <div class="filters-group">
        <label>Rango:</label>
        <select v-model="filtroRango">
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
          <option value="2025">Año 2025</option>
        </select>
      </div>
      <div class="filters-group">
        <label>Unidad:</label>
        <select v-model="filtroUnidad">
          <option value="">(Todas)</option>
          <option value="IV27">IV27</option>
          <option value="B2B">B2B</option>
          <option value="ZO">ZO</option>
        </select>
      </div>
    </div>

    <!-- ROW CHARTS -->
    <div class="charts-row">
      <div class="chart-card big">
        <div class="chart-title">Leads por mes</div>
        <div class="chart-body">
          <Line :data="chartMeses" :options="lineOptions" />
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-title">Leads por asesor</div>
        <div class="chart-body">
          <Bar :data="chartAsesores" :options="barOptions" />
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-title">Estado pipeline</div>
        <div class="chart-body">
          <Doughnut :data="chartEstados" :options="doughnutOptions" />
        </div>
      </div>
    </div>

    <!-- TABLA -->
    <div class="table-card">
      <div class="table-head">
        <span>Top leads recientes (demo)</span>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Nombre</th>
            <th>Canal</th>
            <th>Programa</th>
            <th>Asesor</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in leadsTabla" :key="l.id">
            <td>{{ l.fecha }}</td>
            <td>{{ l.nombre }}</td>
            <td>{{ l.canal }}</td>
            <td>{{ l.programa }}</td>
            <td>{{ l.asesor }}</td>
            <td>
              <span class="badge" :class="badgeForStatus(l.estado)">
                {{ l.estado }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup>
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import { ref, computed } from 'vue'

ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

const filtroRango = ref('30d')
const filtroUnidad = ref('')

// leads por mes (demo)
const chartMeses = computed(() => {
  // si quisieras variar por filtroRango, aquí lo haces
  return {
    labels: ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'],
    datasets: [
      {
        label: 'Leads',
        data: [180, 210, 230, 255, 290, 320],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  }
})

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: { beginAtZero: true },
  },
}

// leads por asesor
const chartAsesores = {
  labels: ['Isabel', 'Diego', 'Arleth', 'María', 'Jr. B2B'],
  datasets: [
    {
      label: 'Leads',
      data: [85, 72, 66, 54, 39],
      backgroundColor: '#0ea5e9',
      borderRadius: 6,
    },
  ],
}
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  indexAxis: 'y',
  scales: {
    x: { beginAtZero: true },
  },
}

// estados pipeline
const chartEstados = {
  labels: ['Nuevo', 'Contactado', 'En seguimiento', 'Cerrado - Vendido', 'No interesado'],
  datasets: [
    {
      data: [32, 48, 21, 14, 9],
      backgroundColor: [
        '#f97316',
        '#0ea5e9',
        '#facc15',
        '#22c55e',
        '#94a3b8',
      ],
    },
  ],
}
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 12 }
    },
  },
}

// tabla demo
const leadsTabla = ref([
  { id: 1, fecha: '30/10/2025', nombre: 'Luis Castillo', canal: 'Meta Ads → WSP', programa: 'Power BI', asesor: 'Isabel', estado: 'Contactado' },
  { id: 2, fecha: '30/10/2025', nombre: 'María López', canal: 'Landing orgánica', programa: 'SAP HANA', asesor: 'Diego', estado: 'En seguimiento' },
  { id: 3, fecha: '29/10/2025', nombre: 'Carlos Pérez', canal: 'Evento / Webinar', programa: 'Excel Avanzado', asesor: 'Arleth', estado: 'Cerrado - Vendido' },
  { id: 4, fecha: '29/10/2025', nombre: 'Ana Torres', canal: 'Referido', programa: 'Diplomado RRHH', asesor: 'María', estado: 'Nuevo' },
  { id: 5, fecha: '28/10/2025', nombre: 'Jorge Ramos', canal: 'Orgánico', programa: 'Membresía', asesor: 'Jr. B2B', estado: 'No interesado' },
])

function badgeForStatus(s) {
  const base = 'badge'
  if (s?.includes('Vendido')) return base + ' badge-success'
  if (s?.includes('seguimiento')) return base + ' badge-warning'
  if (s?.includes('No interesado')) return base + ' badge-muted'
  if (s?.includes('Nuevo')) return base + ' badge-primary'
  return base
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
}
.page-title {
  font-weight: 600;
  font-size: 1.25rem;
  color: #0f172a;
}
.page-sub {
  font-size: .8rem;
  color: #6b7280;
  margin-top: -.4rem;
}

.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.filters-group {
  display: flex;
  gap: .5rem;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: .6rem;
  padding: .4rem .6rem;
}
.filters-group label {
  font-size: .7rem;
  color: #6b7280;
}
.filters-group select {
  border: none;
  background: transparent;
  font-size: .78rem;
  outline: none;
}

.charts-row {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.1fr;
  gap: 1rem;
}
.chart-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: .75rem;
  display: flex;
  flex-direction: column;
}
.chart-card.big .chart-body {
  height: 260px;
}
.chart-title {
  padding: .5rem .75rem;
  border-bottom: 1px solid #e5e7eb;
  font-size: .75rem;
  font-weight: 600;
  color: #0f172a;
}
.chart-body {
  padding: .75rem;
  height: 220px;
}

.table-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: .75rem;
  overflow: hidden;
}
.table-head {
  padding: .6rem .75rem;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: .75rem;
  color: #0f172a;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: .78rem;
}
.table th,
.table td {
  padding: .5rem .75rem;
  border-bottom: 1px solid #f3f4f6;
  text-align: left;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: .1rem .45rem .15rem;
  border-radius: 9999px;
  font-size: .65rem;
  background: #e2e8f0;
  color: #0f172a;
}
.badge-success { background: #dcfce7; color: #166534; }
.badge-warning { background: #fef9c3; color: #854d0e; }
.badge-muted { background: #e2e8f0; color: #475569; }
.badge-primary { background: #dbeafe; color: #1d4ed8; }

@media (max-width: 1080px) {
  .charts-row {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
  .chart-card.big .chart-body {
    height: 220px;
  }
}
</style>
