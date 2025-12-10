<template>
  <div class="card leads-card">
    <div class="card-header">
        <div>
          <div class="title-">Listado de Precios</div>
          <div class="title- text-muted">Gestión de tarifas por versión de programa</div>
        </div>
      <div class="actions">
        <button class="btn btn-sm btn-outline" @click="fetchPrograms" title="Recargar datos">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>
    </div>

    <div class="card-body p-0">
      <div class="table-container">
        <table class="table" :class="{ dense }">
          <thead class="sticky-header">
            <tr>
              <th rowspan="2" class="th-program" style="left: 0; z-index: 30;">Programa</th>
              <th colspan="2" class="text-center th-dark-group">P. Estudiante</th>
              <th colspan="2" class="text-center th-dark-group">P. Profesional</th>
              <th colspan="2" class="text-center th-dark-group">Diferencia (Abs)</th>
              <th rowspan="2" class="text-center th-dark-single" style="width: 80px;">Estado</th>
              <th rowspan="2" class="text-center th-dark-single" style="width: 100px;">Acción</th>
            </tr>
            <tr>
              <th class="th-sub">Soles S/</th>
              <th class="th-sub">Dolares $</th>
              <th class="th-sub">Soles S/</th>
              <th class="th-sub">Dolares $</th>
              <th class="th-sub">Diff S/</th>
              <th class="th-sub">Diff $</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="e in lPrices" :key="e.program_version_id" :class="{ 'row-modified': isModified(e) }">
              
              <td class="td-program">
                <div class="d-flex flex-column">
                  <span class="fw-bold text-dark">{{ e.program_type_for_iu || e.program_name || '—' }}</span>
                  <span class="text-muted small mono">
                    <i class="fa-solid fa-code me-1 opacity-50"></i>{{ e.version_code }}
                  </span>
                </div>
              </td>

              <td>
                <CurrencyInput
                  v-model="e.price_student_soles"
                  :currency="currencySoles"
                  :storeAsMinor="false" 
                  placeholder="0.00"
                  class="form-control-sm input-price"
                />
              </td>
              <td>
                <CurrencyInput
                  v-model="e.price_student_dollars"
                  :currency="currencyDollars"
                  :storeAsMinor="false"
                  placeholder="0.00"
                  class="form-control-sm input-price"
                />
              </td>

              <td>
                <CurrencyInput
                  v-model="e.price_professional_soles"
                  :currency="currencySoles"
                  :storeAsMinor="false"
                  placeholder="0.00"
                  class="form-control-sm input-price"
                />
              </td>
              <td>
                <CurrencyInput
                  v-model="e.price_professional_dollars"
                  :currency="currencyDollars"
                  :storeAsMinor="false"
                  placeholder="0.00"
                  class="form-control-sm input-price"
                />
              </td>

              <td class="text-end">
                <span class="fw-bold small" :class="getDiffClass(e.price_professional_soles, e.price_student_soles)">
                  S/ {{ calcDiff(e.price_professional_soles, e.price_student_soles) }}
                </span>
              </td>
              <td class="text-end">
                <span class="fw-bold small" :class="getDiffClass(e.price_professional_dollars, e.price_student_dollars)">
                  $ {{ calcDiff(e.price_professional_dollars, e.price_student_dollars) }}
                </span>
              </td>

              <td class="text-center align-middle">
                <label class="form-switch">
                  <input type="checkbox" v-model="e.active" />
                  <span></span>
                </label>
              </td>

              <td class="text-center align-middle">
                <div class="d-flex justify-content-center gap-2">
                  <div v-if="e._saving" class="text-primary">
                    <i class="fas fa-spinner fa-spin"></i>
                  </div>
                  
                  <template v-else-if="isModified(e)">
                    <button 
                      class="btn-icon btn-save" 
                      title="Guardar cambios"
                      @click="saveRow(e)"
                    >
                      <i class="fa-solid fa-floppy-disk"></i>
                    </button>
                    <button 
                      class="btn-icon btn-undo" 
                      title="Deshacer cambios"
                      @click="revertRow(e)"
                    >
                      <i class="fa-solid fa-rotate-left"></i>
                    </button>
                  </template>
                  
                  <span v-else class="text-muted opacity-25">
                    <i class="fa-solid fa-check"></i>
                  </span>
                </div>
              </td>

            </tr>
            
            <tr v-if="lPrices.length === 0">
              <td colspan="9" class="text-center py-5 text-muted">
                <i class="fa-solid fa-inbox fa-2x mb-2 d-block opacity-25"></i>
                No hay versiones de programas cargadas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification' 
import CurrencyInput from '@/components/CurrencyInput.vue'

const toast = useToast()
const programService = inject(ServiceKeys.Program) // Ajusta según tu inyección real
const catalog = inject('catalog') // Ajusta según tu inyección real

const dense = ref(false)
const lPrices = ref([])

// --- Carga Inicial ---
const fetchPrograms = async () => {
  try {
    const response = await programService.programVersionCaller()
    
    // Mapeo inicial
    lPrices.value = (response || []).map(item => {
      const data = {
        ...item,
        price_student_soles: Number(item.price_student_soles || 0),
        price_student_dollars: Number(item.price_student_dollars || 0),
        price_professional_soles: Number(item.price_professional_soles || 0),
        price_professional_dollars: Number(item.price_professional_dollars || 0),
        active: item.active === 'Y' || item.active === true,
        _saving: false
      }
      
      // Creamos un snapshot del estado original para comparar después
      data._originalState = JSON.stringify(getComparableData(data));
      
      return data;
    })
    
  } catch (error) {
    console.error('Error al cargar programas:', error)
    toast.error('Error al cargar el listado de precios')
  }
}

onMounted(() => {
  fetchPrograms()
})

// --- Lógica de Comparación y Estado ---

// Función auxiliar para extraer solo los datos editables para comparación
const getComparableData = (row) => ({
  ps_s: row.price_student_soles,
  ps_d: row.price_student_dollars,
  pp_s: row.price_professional_soles,
  pp_d: row.price_professional_dollars,
  act:  row.active
})

// Detecta si la fila ha cambiado respecto a su original
const isModified = (row) => {
  const current = JSON.stringify(getComparableData(row));
  return current !== row._originalState;
}

// Revertir cambios
const revertRow = (row) => {
  if (!row._originalState) return;
  const original = JSON.parse(row._originalState);
  
  row.price_student_soles = original.ps_s;
  row.price_student_dollars = original.ps_d;
  row.price_professional_soles = original.pp_s;
  row.price_professional_dollars = original.pp_d;
  row.active = original.act;
}

// --- Lógica de Negocio ---

// Calcula diferencia Absoluta
const calcDiff = (prof, stud) => {
    const p = Number(prof) || 0
    const s = Number(stud) || 0
    return Math.abs(p - s).toFixed(2)
}

// Clase CSS (Mantiene lógica visual: verde si prof > stud, rojo si no)
const getDiffClass = (prof, stud) => {
    const diff = Number(prof) - Number(stud)
    if (diff > 0) return 'text-success'
    if (diff < 0) return 'text-danger'
    return 'text-muted'
}

// Guardar Fila
const saveRow = async (e) => {
  if (e._saving) return
  e._saving = true
  
  try {
    await programService.programVersionUpdate({
      program_version_id: e.program_version_id,
      price_student_soles: e.price_student_soles,
      price_student_dollars: e.price_student_dollars,
      price_professional_soles: e.price_professional_soles,
      price_professional_dollars: e.price_professional_dollars,
      active: e.active, 
    })

    // Éxito: Actualizamos el estado original al nuevo estado guardado
    e._originalState = JSON.stringify(getComparableData(e));
    toast.success(`Precio actualizado correctamente`)
    
  } catch (error) {
    console.error('Error al guardar:', error)
    toast.error('No se pudo guardar el cambio')
  } finally {
    e._saving = false
  }
}

// --- Configuración de Moneda (Mantenido igual) ---
const currencyCatalog = ref(
    catalog?.options('we_currency', {
      mapItem: x => ({
        id: x.id, alias: x.alias,
        raw: {
          code: x.code ?? x.abbreviation,
          symbol: x.symbol ?? x.prefix,
          minorUnit: 2,
          locale: x.locale ?? (x.abbreviation === 'USD' ? 'en-US' : 'es-PE'),
        }
      })
    }) || []
)

const currencySoles = computed(() => {
    const c = currencyCatalog.value.find(i => i.alias === 'we_currency_pen')
    return c ? c.raw : { symbol: 'S/', code: 'PEN' }
})

const currencyDollars = computed(() => {
    const c = currencyCatalog.value.find(i => i.alias === 'we_currency_usd')
    return c ? c.raw : { symbol: '$', code: 'USD' }
})
</script>

<style scoped>
/* Contenedor principal para scroll */
.table-container {
  width: 100%;
  max-height: 75vh; /* Ajusta según tu pantalla */
  overflow-y: auto;
  position: relative;
  border-radius: 0 0 0.5rem 0.5rem;
}

.table {
  width: 100%;
  border-collapse: separate; /* Necesario para sticky headers complejos */
  border-spacing: 0;
  font-size: 0.85rem;
}

/* --- STICKY HEADERS MAGIA --- */
.sticky-header th {
  position: sticky;
  z-index: 20;
  background-color: #1f2937; /* Gris oscuro Tailwind */
  color: #f9fafb;
  border-bottom: 1px solid #374151;
}

/* Primera fila del encabezado */
.sticky-header tr:first-child th {
  top: 0;
  height: 40px; /* Altura fija para calcular el top de la sgte fila */
}

/* Segunda fila del encabezado */
.sticky-header tr:nth-child(2) th {
  top: 40px; /* Altura de la primera fila */
  z-index: 20;
  background-color: #374151; /* Un poco más claro para diferenciar */
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* Bordes para separar las secciones del header */
.th-program { border-right: 1px solid #4b5563; }
.th-dark-group { border-right: 1px solid #4b5563; }
.th-sub { padding: 0.5rem; border-right: 1px solid #4b5563; }

/* Estilos de celda cuerpo */
.table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
  background: #fff;
}

/* Efecto visual cuando una fila está modificada */
.row-modified td {
  background-color: #fffbeb; /* Amarillo muy suave */
}

.input-price {
  text-align: right;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
  width: 100%;
}
.input-price:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
  outline: none;
}

/* Botones de acción */
.btn-icon {
  border: none;
  background: transparent;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save {
  background-color: #dcfce7;
  color: #166534;
}
.btn-save:hover {
  background-color: #16a34a;
  color: white;
  transform: translateY(-1px);
}

.btn-undo {
  background-color: #fee2e2;
  color: #991b1b;
}
.btn-undo:hover {
  background-color: #ef4444;
  color: white;
}

/* Switch Estilo */
.form-switch { position: relative; width: 36px; height: 20px; display: inline-block; }
.form-switch input { display: none; }
.form-switch span {
  position: absolute; inset: 0; background: #e5e7eb; border-radius: 999px; transition: .2s; cursor: pointer;
}
.form-switch span::after {
  content: ''; width: 16px; height: 16px; background: #fff; border-radius: 50%;
  position: absolute; top: 2px; left: 2px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15);
}
.form-switch input:checked + span { background: #10b981; }
.form-switch input:checked + span::after { left: 18px; }

/* Card & Header General */
.leads-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex; justify-content: space-between; align-items: center;
  background: #fff;
}
.title-icon {
  background: #eff6ff; color: #2563eb; 
  width: 40px; height: 40px; border-radius: 50%; 
  display: grid; place-items: center; font-size: 1.1rem;
}
.text-success { color: #059669 !important; }
.text-danger { color: #dc2626 !important; }
.text-muted { color: #9ca3af !important; }
.fw-bold { font-weight: 600; }
.mono { font-family: ui-monospace, SFMono-Regular, monospace; }
</style>