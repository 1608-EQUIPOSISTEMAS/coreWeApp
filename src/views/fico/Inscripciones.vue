<template>
  <div class="card">
    <div class="card-header">
      <span>Inscripciones</span>

      <div class="actions-bar">
        <button class="btn btn-outline" @click="openFilterModal">
          Filtros
        </button>
        <button class="btn btn-primary" @click="goNew">
          + Nueva inscripción
        </button>
      </div>
    </div>

    <div class="card-body">
      <!-- Tabla -->
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Alumno</th>
            <th>Programa</th>
            <th>Estado de Pago</th>
            <th>Fecha Inscripción</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pagedRows" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.alumno }}</td>
            <td>{{ row.programa }}</td>
            <td>{{ row.estadoPago }}</td>
            <td>{{ row.fecha }}</td>
            <td class="nowrap">
              <button class="btn btn-outline btn-sm">Ver</button>
              <button class="btn btn-outline btn-sm">Editar</button>
            </td>
          </tr>

          <tr v-if="pagedRows.length === 0">
            <td colspan="6" class="empty-state">
              No hay resultados con los filtros actuales.
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginación -->
      <div class="pagination-bar">
        <button
          class="btn btn-outline btn-sm"
          :disabled="currentPage === 1"
          @click="prevPage"
        >
          ‹ Anterior
        </button>

        <span class="page-info">
          Página {{ currentPage }} de {{ totalPages }}
        </span>

        <button
          class="btn btn-outline btn-sm"
          :disabled="currentPage === totalPages"
          @click="nextPage"
        >
          Siguiente ›
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL FILTROS -->
  <div v-if="showFilterModal" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header">
        <span>Filtros</span>
        <button class="btn-close" @click="closeFilterModal">×</button>
      </div>

      <div class="modal-body">
        <div class="form-grid">
          <div class="form-field">
            <label for="f-alumno">Alumno</label>
            <input
              id="f-alumno"
              v-model="filters.alumno"
              type="text"
              placeholder="Nombre del alumno"
            />
          </div>

          <div class="form-field">
            <label for="f-programa">Programa</label>
            <input
              id="f-programa"
              v-model="filters.programa"
              type="text"
              placeholder="Ej. Power BI"
            />
          </div>

          <div class="form-field">
            <label for="f-estado">Estado de Pago</label>
            <select id="f-estado" v-model="filters.estadoPago">
              <option value="">(Todos)</option>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Observado">Observado</option>
            </select>
          </div>

          <div class="form-field">
            <label for="f-desde">Fecha desde</label>
            <input
              id="f-desde"
              v-model="filters.fechaDesde"
              type="date"
            />
          </div>

          <div class="form-field">
            <label for="f-hasta">Fecha hasta</label>
            <input
              id="f-hasta"
              v-model="filters.fechaHasta"
              type="date"
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline btn-sm" @click="clearFilters">
          Limpiar
        </button>
        <button class="btn btn-primary btn-sm" @click="applyFilters">
          Aplicar filtros
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Datos mock
const inscripcionesRaw = ref([
  {
    id: 101,
    alumno: 'Juan Pérez',
    programa: 'Power BI Avanzado',
    estadoPago: 'Pagado',
    fecha: '2025-10-28',
  },
  {
    id: 102,
    alumno: 'María López',
    programa: 'Excel Profesional',
    estadoPago: 'Pendiente',
    fecha: '2025-10-28',
  },
  {
    id: 103,
    alumno: 'Luis Castillo',
    programa: 'Power BI Avanzado',
    estadoPago: 'Observado',
    fecha: '2025-10-27',
  },
  {
    id: 104,
    alumno: 'Andrea Torres',
    programa: 'Excel Profesional',
    estadoPago: 'Pagado',
    fecha: '2025-10-26',
  },
  // ... acá vendría el resto real que te trae el backend
])

// Modal de filtros
const showFilterModal = ref(false)

const filters = reactive({
  alumno: '',
  programa: '',
  estadoPago: '',
  fechaDesde: '',
  fechaHasta: '',
})

function openFilterModal() {
  showFilterModal.value = true
}
function closeFilterModal() {
  showFilterModal.value = false
}
function clearFilters() {
  filters.alumno = ''
  filters.programa = ''
  filters.estadoPago = ''
  filters.fechaDesde = ''
  filters.fechaHasta = ''
}
function applyFilters() {
  // Podrías disparar búsqueda a backend aquí si fuera server-side
  // Por ahora solo cierra el modal
  showFilterModal.value = false
  // Resetea a primera página para que no quedes en una página vacía
  currentPage.value = 1
}

// Filtrado en memoria
const filteredRows = computed(() => {
  return inscripcionesRaw.value.filter((row) => {
    // alumno contiene
    if (
      filters.alumno &&
      !row.alumno.toLowerCase().includes(filters.alumno.toLowerCase())
    ) {
      return false
    }

    // programa contiene
    if (
      filters.programa &&
      !row.programa.toLowerCase().includes(filters.programa.toLowerCase())
    ) {
      return false
    }

    // estadoPago exacto
    if (filters.estadoPago && row.estadoPago !== filters.estadoPago) {
      return false
    }

    // rango de fechas
    if (filters.fechaDesde && row.fecha < filters.fechaDesde) {
      return false
    }
    if (filters.fechaHasta && row.fecha > filters.fechaHasta) {
      return false
    }

    return true
  })
})

// Paginación
const pageSize = ref(10)
const currentPage = ref(1)

const totalPages = computed(() => {
  const total = filteredRows.value.length
  const pages = Math.ceil(total / pageSize.value)
  return pages === 0 ? 1 : pages
})

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRows.value.slice(start, end)
})

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}
function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function goNew() {
  router.push({ name: 'FicoInscripcionesNew' })
}
</script>

<style scoped>
/* Card */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0,0,0,.05);
  margin-bottom: 1.5rem;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: .75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 1rem;
}
.actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
.card-body {
  padding: 1rem 1.25rem;
}

/* Tabla */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.table th {
  text-align: left;
  font-weight: 600;
  padding: .5rem .75rem;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
  white-space: nowrap;
}
.table td {
  padding: .5rem .75rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}
.nowrap {
  white-space: nowrap;
}
.empty-state {
  text-align: center;
  padding: 1rem;
  color: #6b7280;
  font-style: italic;
}

/* Paginación */
.pagination-bar {
  display: flex;
  align-items: center;
  gap: .75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  font-size: .8rem;
}
.page-info {
  color: #374151;
  font-weight: 500;
}

/* Botones */
.btn {
  display: inline-block;
  font-size: .8rem;
  line-height: 1rem;
  font-weight: 500;
  border-radius: .375rem;
  padding: .5rem .75rem;
  border: 1px solid #d1d5db;
  background-color: #fff;
  cursor: pointer;
}
.btn[disabled] {
  opacity: .4;
  cursor: not-allowed;
}
.btn-sm {
  padding: .25rem .5rem;
  font-size: .75rem;
  line-height: .875rem;
}
.btn-primary {
  background-color: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.btn-outline {
  background-color: #fff;
  border-color: #d1d5db;
  color: #374151;
}
.btn-close {
  background: transparent;
  border: none;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
}
.modal-card {
  background: #fff;
  border-radius: .5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 40px rgba(0,0,0,.18);
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: .75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: .9rem;
  color: #111827;
}
.modal-body {
  padding: 1rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: .5rem;
  padding: .75rem 1rem;
  border-top: 1px solid #e5e7eb;
}

/* Formulario modal */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px,100%),1fr));
  gap: 1rem;
}
.form-field {
  display: flex;
  flex-direction: column;
  font-size: .8rem;
}
.form-field label {
  font-weight: 500;
  margin-bottom: .25rem;
  color: #374151;
}
.form-field input,
.form-field select {
  border: 1px solid #d1d5db;
  border-radius: .375rem;
  padding: .5rem .75rem;
  font-size: .8rem;
  line-height: 1.25rem;
  color: #111827;
  background-color: #fff;
}
</style>