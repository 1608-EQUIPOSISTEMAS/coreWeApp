<template>
  <div class="card border-0 shadow-sm mb-4">
    
    <div class="card-header bg-white p-4 border-bottom">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-1 fw-bold text-primary">
            <i class="fa-solid fa-chart-pie me-2"></i>Control Comercial
          </h4>
          <span class="text-muted small">Tablero de conversión y rendimiento</span>
        </div>
        <button 
          class="btn btn-primary px-4 py-2 shadow-sm btn-hover-effect" 
          @click="fetchStats" 
          :disabled="isLoading"
        >
          <i class="fa-solid fa-sync me-2" :class="{'fa-spin': isLoading}"></i> 
          {{ isLoading ? 'Cargando...' : 'Actualizar Datos' }}
        </button>
      </div>

      <div class="filter-bar bg-light rounded-3 p-3 border">
            <div class="row g-3 align-items-end">
               <div class="col-xl-2 col-md-4">
                  <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                  <i class="fa-regular fa-calendar me-1"></i> Registro
                  </label>
                  <BaseDatePicker
                     v-model="dateRangeString"
                     :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                     class="form-control bg-white"
                     placeholder="Registro..."
                     @on-change="(d, s) => handleDateFilterChange(d, 'created')"
                  />
               </div>
               <div class="col-xl-2 col-md-4">
                  <label class="form-label small fw-bold text-uppercase text-success mb-1">
                  <i class="fa-solid fa-money-bill-wave me-1"></i> F. Pago
                  </label>
                  <BaseDatePicker
                     v-model="payRangeString"
                     :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                     class="form-control bg-white"
                     placeholder="F. Pago..."
                     @on-change="(d, s) => handleDateFilterChange(d, 'payment')"
                  />
               </div>
               <div class="col-xl-3 col-md-4">
                  <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                     <i class="fa-solid fa-user-tie me-1"></i> Asesor Asignado
                  </label>
                  <MultiSelect
                     v-model="filters.owner_user_ids"
                     :items="filtroOwners"
                     label-key="description"
                     value-key="id"
                     placeholder="Todos..."
                     class="bg-white"
                  />
               </div>
               
               <div class="col-xl-2 col-md-6">
                  <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                     <i class="fa-solid fa-laptop me-1"></i> Modalidad
                  </label>
                  <SearchSelect
                     v-model="filters.model_modality_id"
                     :items="catalog.options('we_modality')"
                     label-field="description"
                     value-field="id"
                     placeholder="Todas..."
                  />
               </div>

               <div class="col-xl-3 col-md-6">
                  <label class="form-label small fw-bold text-uppercase text-secondary mb-1">
                     <i class="fa-solid fa-graduation-cap me-1"></i> Programa / Interés
                  </label>
                  <div class="input-group shadow-sm">
                     <input 
                     type="text" 
                     class="form-control border-start-0" 
                     v-model="filters.program_text" 
                     placeholder="Buscar..." 
                     @keyup.enter="fetchStats"
                     >
                  </div>
               </div>
            </div>
            </div>
    </div>

    <div class="card-body bg-body-tertiary" style="min-height: 500px;">
      
      <div v-if="isLoading" class="d-flex flex-column align-items-center justify-content-center h-100 py-5 fade-in">
         <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
         <h5 class="text-muted fw-bold">Calculando conversiones...</h5>
      </div>
        
      <div v-else-if="stats" class="animate__animated animate__fadeIn p-2">
                
        <div class="row g-3 mb-4">
           <div class="col-xl-3 col-md-6" @click="drillDown('all')">
              <div class="card border-0 shadow-sm h-100 p-3 text-center kpi-card cursor-pointer position-relative overflow-hidden bg-white">
                 <div class="text-secondary x-small fw-bold uppercase ls-1 mb-1">Total Leads</div>
                 <h2 class="fw-bold text-primary mb-2">{{ stats.general.total }}</h2>
                 <div class="d-flex justify-content-center gap-2 mt-auto">
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle pointer-badge" @click.stop="drillDown('web')">Web: {{ stats.general.countWeb }}</span>
                    <span class="badge bg-dark-subtle text-dark border border-dark-subtle pointer-badge" @click.stop="drillDown('b2b')">B2B: {{ stats.general.countB2B }}</span>
                 </div>
              </div>
           </div>
           
           <div class="col-xl-3 col-md-6" @click="drillDown('follow', 'we_calling_pending')">
              <div class="card border-0 shadow-sm h-100 p-3 text-center kpi-card cursor-pointer bg-white">
                 <div class="text-secondary x-small fw-bold uppercase ls-1 mb-1">Seg. Pendientes</div>
                 <h2 class="fw-bold text-warning mb-2">{{ stats.general.followUpPending }}</h2>
                 <div class="small text-muted mt-auto">de <strong class="text-dark">{{ stats.general.attemptUpCount }}</strong> gestionados</div>
              </div>
           </div>

           <div class="col-xl-3 col-md-6" @click="drillDown('interest', 'Alta')">
              <div class="card border-0 shadow-sm h-100 p-3 text-center kpi-card cursor-pointer bg-white">
                 <div class="text-secondary x-small fw-bold uppercase ls-1 mb-1">Alta Intención</div>
                 <h2 class="fw-bold text-danger mb-2">{{ stats.general.highInterestCount }}</h2>
                 <div class="small text-muted mt-auto">Leads calientes</div>
              </div>
           </div>

           <div class="col-xl-3 col-md-6" @click="drillDown('sales')">
              <div class="card border-0 shadow-sm h-100 p-3 text-center kpi-card cursor-pointer bg-white">
                 <div class="text-secondary x-small fw-bold uppercase ls-1 mb-1">Ventas (Cierres)</div>
                 <h2 class="fw-bold text-success mb-2">{{ stats.general.sales }}</h2>
                 <div class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 mt-auto">
                   <i class="fa-solid fa-chart-line me-1"></i> {{ stats.general.conversionRate }}% Conv. Global
                 </div>
              </div>
           </div>
        </div>

        <div class="row g-4 mb-4">
           <div class="col-lg-6">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-dark border-bottom py-3 d-flex align-items-center">
                    <span class="bg-dark-subtle text-dark p-1 rounded me-2"><i class="fa-solid fa-filter"></i></span>
                    Pipeline (Estados)
                 </div>
                 <div class="card-body scroll-y-custom">
                    <div v-for="(cat, idx) in stats.byStatus" :key="idx" 
                         class="d-flex align-items-center mb-3 cursor-pointer row-hover p-2 rounded"
                         @click="drillDown('status', cat.name)">
                       <div class="flex-grow-1">
                          <div class="small fw-bold text-dark">{{ cat.name }}</div>
                          <div class="x-small text-muted" v-if="cat.sales > 0">
                             <span class="text-success fw-bold">{{ cat.sales }} ventas</span> 
                             ({{ cat.conversion_rate }}%)
                          </div>
                       </div>
                       <div class="me-3 fw-bold text-secondary text-end" style="min-width: 40px;">{{ cat.count }}</div>
                       <div class="progress" style="width: 100px; height: 6px;">
                          <div class="progress-bar bg-success" :style="{ width: (cat.count / stats.general.total * 100) + '%' }"></div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
           
           <div class="col-lg-6">
                <div class="card border-0 shadow-sm h-100 widget-card">
                    <div class="card-header bg-white fw-bold text-primary border-bottom py-3 d-flex align-items-center">
                        <span class="bg-primary-subtle text-primary p-1 rounded me-2"><i class="fa-solid fa-user-tie"></i></span>
                        Rendimiento por Asesor
                    </div>
                    <div class="card-body scroll-y-custom p-0">
                        <StatsTable 
                        :data="stats.byOwner" 
                        @click-row="(item) => drillDown('owner', item.name)" 
                        />
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-4 mb-4">
           <div class="col-lg-6">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-purple border-bottom py-3 d-flex align-items-center">
                    <span class="bg-primary-subtle text-primary p-1 rounded me-2"><i class="fa-solid fa-stopwatch"></i></span>
                    Momento del Cliente (Lifecycle)
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable 
                       :data="stats.byMoment" 
                       @click-row="(item) => drillDown('moment', item.name)" 
                    />
                 </div>
              </div>
           </div>

           <div class="col-lg-6">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-dark border-bottom py-3 d-flex align-items-center">
                    <span class="bg-secondary-subtle text-dark p-1 rounded me-2"><i class="fa-solid fa-phone-volume"></i></span>
                    Resultado Último Contacto
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable 
                       :data="stats.byFollowStatus" 
                       @click-row="(item) => drillDown('follow', item.name)" 
                    />
                 </div>
              </div>
           </div>
        </div>

        <div class="row g-4 mb-4">
           <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-secondary border-bottom py-3 d-flex align-items-center">
                    <span class="bg-secondary-subtle text-secondary p-1 rounded me-2"><i class="fa-solid fa-chess"></i></span>
                    Estrategia
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable 
                       :data="stats.byStrategy" 
                       @click-row="(item) => drillDown('strategy', item.name)" 
                    />
                 </div>
              </div>
           </div>

           <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-secondary border-bottom py-3 d-flex align-items-center">
                    <span class="bg-secondary-subtle text-secondary p-1 rounded me-2"><i class="fa-solid fa-bullhorn"></i></span>
                    Canales
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable 
                       :data="stats.byChannel" 
                       @click-row="(item) => drillDown('channel', item.name)" 
                    />
                 </div>
              </div>
           </div>

           <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-secondary border-bottom py-3 d-flex align-items-center">
                    <span class="bg-secondary-subtle text-secondary p-1 rounded me-2"><i class="fa-solid fa-share-nodes"></i></span>
                    Medios
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable :data="stats.byMedium" />
                 </div>
              </div>
           </div>
        </div>

        <div class="row g-4 mb-4">
           <div class="col-lg-6">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-warning border-bottom py-3 d-flex align-items-center">
                    <span class="bg-warning-subtle text-warning-emphasis p-1 rounded me-2"><i class="fa-solid fa-tag"></i></span>
                    Promoción (T. Consulta)
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable 
                       :data="stats.byPromotion" 
                       @click-row="(item) => drillDown('promotion', item.name)" 
                    />
                 </div>
              </div>
           </div>

           <div class="col-lg-6">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-info border-bottom py-3 d-flex align-items-center">
                    <span class="bg-info-subtle text-info p-1 rounded me-2"><i class="fa-solid fa-magnifying-glass"></i></span>
                    Palabras Clave
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable 
                       :data="stats.byWord" 
                       @click-row="(item) => drillDown('word', item.name)" 
                    />
                 </div>
              </div>
           </div>
        </div>

        <div class="row g-4">
           <div class="col-lg-4">
            <div class="card border-0 shadow-sm h-100 widget-card">
                <div class="card-header bg-white fw-bold text-primary border-bottom py-3 d-flex align-items-center">
                    <span class="bg-primary-subtle text-primary p-1 rounded me-2"><i class="fa-solid fa-layer-group"></i></span>
                    Tipo Programa
                </div>
                <div class="card-body scroll-y-custom p-0">
                    <StatsTable 
                    :data="stats.byProgramType" 
                    @click-row="(item) => drillDown('program_type', item.name)" 
                    />
                </div>
            </div>
            </div>

           <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-danger border-bottom py-3 d-flex align-items-center">
                    <span class="bg-danger-subtle text-danger p-1 rounded me-2"><i class="fa-solid fa-temperature-half"></i></span>
                    Nivel Interés
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <table class="table table-hover mb-0 small align-middle">
                       <thead class="table-light sticky-top">
                          <tr>
                             <th class="ps-3 py-2 border-0">Nivel</th>
                             <th class="text-end py-2 border-0">Leads</th>
                             <th class="text-end py-2 border-0 text-success">Ventas</th>
                             <th class="text-end pe-3 py-2 border-0 text-muted">%</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr v-for="(seg, idx) in stats.byInterest" :key="idx" class="cursor-pointer" @click="drillDown('interest', seg.name)">
                             <td class="ps-3 py-2 border-0">
                                <span class="badge" :class="getBadgeClassInterest(seg.code)">{{ seg.name }}</span>
                             </td>
                             <td class="text-end fw-bold py-2 border-0">{{ seg.count }}</td>
                             <td class="text-end fw-bold text-success py-2 border-0">{{ seg.sales }}</td>
                             <td class="text-end pe-3 text-muted py-2 border-0">{{ seg.conversion_rate }}%</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>

           <div class="col-lg-4">
              <div class="card border-0 shadow-sm h-100 widget-card">
                 <div class="card-header bg-white fw-bold text-secondary border-bottom py-3 d-flex align-items-center">
                    <span class="bg-secondary-subtle text-secondary p-1 rounded me-2"><i class="fa-solid fa-globe"></i></span>
                    Geografía
                 </div>
                 <div class="card-body scroll-y-custom p-0">
                    <StatsTable  @click-row="(item) => drillDown('country', item.name)" :data="stats.byCountry" />
                 </div>
              </div>
           </div>
        </div>

      </div>

      <div v-else class="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
         <i class="fa-solid fa-filter fa-4x mb-3 text-secondary opacity-25"></i>
         <h6 class="fw-bold">Esperando filtros...</h6>
         <p class="small">Selecciona los criterios arriba y pulsa "Actualizar" para ver el reporte.</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject, h, defineComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'  // <-- añade useRoute
import { ServiceKeys } from '@/services'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import SearchSelect from '@/components/SearchSelect.vue'
// --- COMPONENTE INTERNO (sin cambios) ---
const StatsTable = defineComponent({
  props: ['data'],
  emits: ['click-row'],
  render() {
    return h('table', { class: 'table table-hover table-striped mb-0 small align-middle' }, [
      h('thead', { class: 'table-light sticky-top' }, [
        h('tr', [
          h('th', { class: 'ps-3 py-2 border-0' }, 'Nombre'),
          h('th', { class: 'text-end py-2 border-0' }, 'Leads'),
          h('th', { class: 'text-end py-2 border-0 text-success' }, 'Ventas'),
          h('th', { class: 'text-end pe-3 py-2 border-0 text-muted' }, '%'),
        ])
      ]),
      h('tbody',
        (this.data || []).map((item, i) =>
          h('tr', {
            key: i,
            class: 'cursor-pointer',
            onClick: () => this.$emit('click-row', item)
          }, [
            h('td', { class: 'ps-3 py-2 border-0' }, item.name),
            h('td', { class: 'text-end fw-bold py-2 border-0' }, item.count),
            h('td', { class: 'text-end fw-bold text-success py-2 border-0' }, item.sales),
            h('td', { class: 'text-end pe-3 text-muted py-2 border-0' }, item.conversion_rate + '%'),
          ])
        )
      )
    ])
  }
})

const router = useRouter()
const route  = useRoute()   // <-- añadido
const comercialService = inject(ServiceKeys.Comercial)
const authService      = inject(ServiceKeys.Auth)
const catalog          = inject('catalog')

// === ESTADO ===
const isLoading      = ref(false)
const stats          = ref(null)
const filtroOwners   = ref([])
const dateRangeString = ref(null)
const payRangeString  = ref(null)

// === HELPERS URL ===
const decodeFilter = (jsonStr) => {
  if (!jsonStr) return []
  try { return JSON.parse(jsonStr) } catch (e) { return [] }
}

const encodeFilter = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return undefined
  return JSON.stringify(arr.map(i => ({ value: i.value ?? i.id, label: i.label ?? i.description })))
}

const getIds = (arr) =>
  Array.isArray(arr) ? arr.map(i => i.value ?? i.id).filter(x => x != null) : []

// === FILTROS ===
const filters = reactive({
  rangoFechas: { start: '', end: '' },
  rangoPago:   { start: '', end: '' },
  owner_user_ids: [],   // [{value, label}]
  program_text: '',
  model_modality_id: null
})

// === LIFECYCLE ===
onMounted(async () => {
  await loadOwners()
  await parseQueryAndApply()
  fetchStats()
})

// === CARGA CATÁLOGOS ===
async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => {
      // Replicamos la lógica exacta del SQL: Nombre + Inicial del Apellido.
      const fName = (u.first_name || '').trim()
      const lName = (u.last_name || '').trim()
      
      let fullName = fName
      if (lName) fullName += ` ${lName.charAt(0)}.`
      
      // Si no tiene nombre ni apellido, usamos el ID como fallback igual que el backend
      const desc = fullName.trim() || `Usuario ${u.user_id}`

      return { 
        id: u.user_id, 
        description: desc 
      }
    })
  } catch (e) { 
    console.error(e) 
  }
}

// === LEER URL AL MONTAR ===
async function parseQueryAndApply() {
  const q = route.query
  if (Object.keys(q).length === 0) return

  // Fechas de registro
  if (q.from_date || q.to_date) {
    filters.rangoFechas = { start: q.from_date || '', end: q.to_date || '' }
    if (q.from_date) dateRangeString.value = `${q.from_date} a ${q.to_date || q.from_date}`
  }

  // Fechas de pago
  if (q.pay_date_from || q.pay_date_to) {
    filters.rangoPago = { start: q.pay_date_from || '', end: q.pay_date_to || '' }
    if (q.pay_date_from) payRangeString.value = `${q.pay_date_from} a ${q.pay_date_to || q.pay_date_from}`
  }
if (q.model_modality_id) {
    filters.model_modality_id = Number(q.model_modality_id)
  }
  // Texto programa
  if (q.program_text) filters.program_text = q.program_text

  // Asesores: acepta el nuevo formato JSON y el antiguo de IDs separados por coma
  if (q.owner_user_ids) {
    // Intenta parsear como JSON primero (nuevo formato)
    const decoded = decodeFilter(q.owner_user_ids)
    if (decoded.length > 0) {
      filters.owner_user_ids = decoded
    } else {
      // Fallback: venía como "1,2,3" (drillDown antiguo)
      const ids = q.owner_user_ids.split(',').map(Number).filter(Boolean)
      filters.owner_user_ids = filtroOwners.value
        .filter(u => ids.includes(u.id))
        .map(u => ({ value: u.id, label: u.description }))
    }
  }
}

// === FECHAS ===
function handleDateFilterChange(selectedDates, type) {
  const toSQL = (d) => {
    if (!d) return ''
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().split('T')[0]
  }
  let start = '', end = ''
  if (Array.isArray(selectedDates) && selectedDates.length > 0) {
    start = toSQL(selectedDates[0])
    end   = selectedDates[1] ? toSQL(selectedDates[1]) : start
  }
  if (type === 'created') filters.rangoFechas = { start, end }
  else if (type === 'payment') filters.rangoPago = { start, end }
}

// === FETCH STATS (escribe en URL + llama API) ===
async function fetchStats() {
  isLoading.value = true

  // 1. Sincronizar URL con estado actual
  const queryParams = {}
  if (filters.rangoFechas.start) {
    queryParams.from_date = filters.rangoFechas.start
    queryParams.to_date   = filters.rangoFechas.end
  }

  if (filters.model_modality_id) queryParams.model_modality_id = filters.model_modality_id
  if (filters.rangoPago.start) {
    queryParams.pay_date_from = filters.rangoPago.start
    queryParams.pay_date_to   = filters.rangoPago.end
  }
  if (filters.program_text)         queryParams.program_text    = filters.program_text
  if (filters.owner_user_ids.length) queryParams.owner_user_ids = encodeFilter(filters.owner_user_ids)

  router.replace({ query: queryParams })

  // 2. Llamada a la API
  try {
    const data = await comercialService.leadStats({
      from_date:       filters.rangoFechas.start || null,
      to_date:         filters.rangoFechas.end   || null,
      pay_date_from:   filters.rangoPago.start   || null,
      pay_date_to:     filters.rangoPago.end     || null,
      program_text:    filters.program_text      || null,
      model_modality_ids: filters.model_modality_id ? [filters.model_modality_id] : [],
      owner_user_ids:  getIds(filters.owner_user_ids)
    })
    stats.value = data
  } catch (error) {
    console.error('Error cargando stats:', error)
  } finally {
    isLoading.value = false
  }
}

// === DRILL DOWN (ahora con {value, label} en URL) ===
function drillDown(type, valueName) {

  // Base: heredamos las fechas y texto del filtro actual
  const query = {}
  if (filters.rangoFechas.start) {
    query.from_date = filters.rangoFechas.start
    query.to_date   = filters.rangoFechas.end
  }
  if (filters.rangoPago.start) {
    query.pay_date_from = filters.rangoPago.start
    query.pay_date_to   = filters.rangoPago.end
  }
  if (filters.program_text)          query.program_text    = filters.program_text
  if (filters.owner_user_ids.length) query.owner_user_ids  = encodeFilter(filters.owner_user_ids)
  // Heredar modalidad formateada como [{value, label}] para el Listado
  if (filters.model_modality_id) {
    const modObj = catalog.options('we_modality').find(x => x.id === filters.model_modality_id)
    if (modObj) {
      query.model_modality_ids = encodeFilter([{ value: modObj.id, label: modObj.description }])
    }
  }
  // Helper: busca en catálogo y devuelve JSON {value, label}
  const findInCatalog = (catalogKey, field, val) => {
    const found = catalog.options(catalogKey).find(x => x[field] === val)
    return found ? encodeFilter([{ value: found.id, label: found.description }]) : null
  }

  if (type === 'all') {
    // Sin filtro extra
  }
  else if (type === 'web') {
    query.web = 'Y'
  }
  else if (type === 'b2b') {
    query.b2b = 'Y'
  }
  else if (type === 'sales') {
    const opts = catalog.options('we_lead_status')
    const salesItems = opts
      .filter(x => ['we_lead_status_bought', 'we_lead_status_insc'].includes(x.alias))
      .map(x => ({ value: x.id, label: x.description }))
    if (salesItems.length) query.status_lead_ids = encodeFilter(salesItems)
  }
  else if (type === 'status') {
    const r = findInCatalog('we_lead_status', 'description', valueName)
    if (r) query.status_lead_ids = r
  }
  else if (type === 'owner') {
  const found = filtroOwners.value.find(u => u.description === valueName)
  if (found) query.owner_user_ids = encodeFilter([{ value: found.id, label: found.description }])
}
  else if (type === 'strategy') {
    const r = findInCatalog('we_type_strategy', 'description', valueName)
    if (r) query.strategy_ids = r
  }
  else if (type === 'channel') {
    const r = findInCatalog('we_social_media', 'description', valueName)
    if (r) query.channel_ids = r
  }
  else if (type === 'program_type') {
    const r = findInCatalog('we_program_type', 'description', valueName)
    if (r) query.type_program_ids = r
  }
  else if (type === 'word') {
    const r = findInCatalog('we_key_word', 'description', valueName)
    if (r) query.word_ids = r
  }
  else if (type === 'promotion') {
    const r = findInCatalog('we_category_query', 'description', valueName)
    if (r) query.query_ids = r
  }
  else if (type === 'interest') {
    const opts = catalog.options('we_lead_interest')
    const found = opts.find(x => x.description === valueName)
      ?? opts.find(x => x.alias === 'we_lead_interest_high' && valueName === 'Alta')
    if (found) query.interest_level_ids = encodeFilter([{ value: found.id, label: found.description }])
  }
else if (type === 'medium') {
    // Busca en el catálogo de medios y lo codifica como [{value, label}]
    const r = findInCatalog('we_medium_contact', 'description', valueName)
    if (r) query.medium_contact_ids = r
  }
  else if (type === 'country') {
    // Busca en el catálogo de países y lo codifica como [{value, label}]
    const r = findInCatalog('we_country', 'description', valueName)
    if (r) query.code_country_ids = r
  }
  else if (type === 'moment') {
    const r = findInCatalog('we_moment', 'description', valueName)
    if (r) query.moment_ids = r
  }
  else if (type === 'follow') {
    const opts  = catalog.options('we_calling')
    const found = opts.find(x => x.description === valueName)
      ?? opts.find(x => x.alias === valueName)
console.log(opts)
console.log(found)
    if (found) query.last_follow_ids = encodeFilter([{ value: found.id, label: found.description }])
console.log(valueName)
  }
console.log(query)
  const routeData = router.resolve({ name: 'ComercialListado', query })
  window.open(routeData.href, '_blank')
}

// === HELPERS VISUALES ===
function getBadgeClassInterest(alias) {
  if (alias === 'we_lead_interest_high')   return 'bg-danger text-white'
  if (alias === 'we_lead_interest_medium') return 'bg-warning text-dark'
  return 'bg-secondary text-white'
}
</script>

<style scoped>
/* ESTILOS */
.kpi-card { transition: transform 0.2s, box-shadow 0.2s; }
.kpi-card:hover { transform: translateY(-3px); box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1) !important; }
.widget-card { border-radius: 0.5rem; overflow: hidden; }
.row-hover:hover { background-color: #f1f5f9; }
.cursor-pointer { cursor: pointer; }
.pointer-badge:hover { background-color: #e2e8f0 !important; }
.ls-1 { letter-spacing: 0.05em; }
.x-small { font-size: 0.7rem; }
.scroll-y-custom {
  max-height: 280px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.sticky-top { position: sticky; top: 0; z-index: 5; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.fade-in { animation: fadeIn 0.5s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>