<template>
  <div class="exec-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Tablero de conversión y rendimiento</span>
            <h1 class="brand-title">Control Comercial</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-primary" @click="fetchStats" :disabled="isLoading">
            <svg :class="{ 'spin': isLoading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            {{ isLoading ? 'Actualizando...' : 'Actualizar Datos' }}
          </button>
        </div>
      </div>

      <div class="masthead-filters filter-scrollable">
        <div class="filter-group">
          <label class="filter-label">REGISTRO</label>
          <BaseDatePicker
             v-model="dateRangeString"
             :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
             class="exec-input-dark"
             placeholder="Seleccionar..."
             @on-change="(d, s) => handleDateFilterChange(d, 'created')"
          />
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">F. PAGO</label>
          <BaseDatePicker
             v-model="payRangeString"
             :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
             class="exec-input-dark exec-input-success"
             placeholder="Seleccionar..."
             @on-change="(d, s) => handleDateFilterChange(d, 'payment')"
          />
        </div>
        <div class="filter-sep" v-if="!isStrictlyComercial"></div>
        <div class="filter-group" v-if="!isStrictlyComercial">
          <label class="filter-label">ASESOR ASIGNADO</label>
          <MultiSelect
             v-model="filters.owner_user_ids"
             :items="filtroOwners"
             label-key="description"
             value-key="id"
             placeholder="Todos..."
             class="exec-input-dark-component"
          />
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">MODALIDAD</label>
          <SearchSelect
             v-model="filters.model_modality_id"
             :items="catalog.options('we_modality')"
             label-field="description"
             value-field="id"
             placeholder="Todas..."
             class="exec-input-dark-component w-md"
          />
        </div>
        <div class="filter-sep"></div>
        <div class="filter-group">
          <label class="filter-label">PROGRAMA / INTERÉS</label>
          <input 
             type="text" 
             class="exec-input-dark" 
             v-model="filters.program_text" 
             placeholder="Buscar texto..." 
             @keyup.enter="fetchStats"
          >
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div v-if="isLoading" class="exec-loader">
        <div class="loader-ring"></div>
        <p class="loader-text">Calculando conversiones y rendimiento...</p>
      </div>

      <div v-else-if="stats" class="view-dashboard slide-fade-enter-active">
        
        <div class="kpi-strip">
           <div class="kpi-card kpi-interactive" @click="drillDown('all')">
             <div class="kpi-card-header">
               <span class="kpi-card-label">TOTAL LEADS</span>
               <div class="kpi-indicator ind-blue"></div>
             </div>
             <div class="kpi-card-value accent-text">{{ stats.general.total }}</div>
             <div class="kpi-card-actions">
                <span class="pill pill-blue interactive-pill" @click.stop="drillDown('web')">Web: {{ stats.general.countWeb }}</span>
                <span class="pill pill-slate interactive-pill" @click.stop="drillDown('b2b')">B2B: {{ stats.general.countB2B }}</span>
             </div>
           </div>

           <div class="kpi-card kpi-interactive" @click="drillDown('follow', 'we_calling_pending')">
             <div class="kpi-card-header">
               <span class="kpi-card-label">SEG. PENDIENTES</span>
               <div class="kpi-indicator ind-amber"></div>
             </div>
             <div class="kpi-card-value" style="color: var(--amber-500)">{{ stats.general.followUpPending }}</div>
             <div class="kpi-card-sub">De <strong style="color: var(--text-primary)">{{ stats.general.attemptUpCount }}</strong> gestionados</div>
           </div>

           <div class="kpi-card kpi-interactive" @click="drillDown('interest', 'Alta')">
             <div class="kpi-card-header">
               <span class="kpi-card-label">ALTA PRIORIDAD</span>
               <div class="kpi-indicator ind-red"></div>
             </div>
             <div class="kpi-card-value" style="color: var(--red-600)">{{ stats.general.highInterestCount }}</div>
             <div class="kpi-card-sub">Leads de ediciones por comenzar</div>
           </div>

           <div class="kpi-card kpi-interactive kpi-card-highlight" @click="drillDown('sales')">
             <div class="kpi-card-header">
               <span class="kpi-card-label" style="color: var(--teal-500)">VENTAS (CIERRES)</span>
               <div class="kpi-indicator ind-green"></div>
             </div>
             <div class="kpi-card-value" style="color: var(--white)">{{ stats.general.sales }}</div>
             <div class="kpi-card-sub" style="color: var(--teal-500); font-weight: 600;">
                {{ stats.general.conversionRate }}% Conv. Global
             </div>
           </div>
        </div>

        <div class="chart-grid-2">
           <div class="chart-panel">
             <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Pipeline (Estados)</div>
                 <div class="chart-panel-sub">Distribución y conversión por estado comercial</div>
               </div>
             </div>
             <div class="chart-area panel-scroll-area">
                <div v-for="(cat, idx) in stats.byStatus" :key="idx" 
                     class="list-row-item interactive-row"
                     @click="drillDown('status', cat.name)">
                   <div class="row-info">
                      <span class="row-title">{{ cat.name }}</span>
                      <span class="row-meta" v-if="cat.sales > 0">
                         <span class="c-green fw-600">{{ cat.sales }} ventas</span> ({{ cat.conversion_rate }}%)
                      </span>
                   </div>
                   <div class="row-stats">
                      <span class="row-count">{{ cat.count }}</span>
                      <div class="row-bar-track">
                         <div class="row-bar-fill" :style="{ width: (cat.count / stats.general.total * 100) + '%' }"></div>
                      </div>
                   </div>
                </div>
             </div>
           </div>

           <div class="chart-panel" >
             <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Rendimiento por Asesor</div>
                 <div class="chart-panel-sub">Leads asignados y tasas de conversión</div>
               </div>
             </div>
             <div class="chart-area panel-scroll-area p-0">
                <StatsTable 
                   :data="stats.byOwner" 
                   @click-row="(item) => drillDown('owner', item.name)" 
                />
             </div>
           </div>
        </div>

        <div class="chart-grid-2">
           <div class="chart-panel">
             <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Momento del Cliente (Lifecycle)</div>
               </div>
             </div>
             <div class="chart-area panel-scroll-area p-0">
                <StatsTable 
                   :data="stats.byMoment" 
                   @click-row="(item) => drillDown('moment', item.name)" 
                />
             </div>
           </div>

           <div class="chart-panel">
             <div class="chart-panel-header">
               <div>
                 <div class="chart-panel-title">Resultado Último Contacto</div>
               </div>
             </div>
             <div class="chart-area panel-scroll-area p-0">
                <StatsTable 
                   :data="stats.byFollowStatus" 
                   @click-row="(item) => drillDown('follow', item.name)" 
                />
             </div>
           </div>
        </div>

        <div class="chart-grid-3">
           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Estrategia</div></div>
             <div class="chart-area panel-scroll-area p-0"><StatsTable :data="stats.byStrategy" @click-row="(item) => drillDown('strategy', item.name)" /></div>
           </div>
           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Canales</div></div>
             <div class="chart-area panel-scroll-area p-0"><StatsTable :data="stats.byChannel" @click-row="(item) => drillDown('channel', item.name)" /></div>
           </div>
           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Medios</div></div>
             <div class="chart-area panel-scroll-area p-0"><StatsTable :data="stats.byMedium" /></div>
           </div>
        </div>

        <div class="chart-grid-2">
           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Promoción (T. Consulta)</div></div>
             <div class="chart-area panel-scroll-area p-0"><StatsTable :data="stats.byPromotion" @click-row="(item) => drillDown('promotion', item.name)" /></div>
           </div>
           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Palabras Clave</div></div>
             <div class="chart-area panel-scroll-area p-0"><StatsTable :data="stats.byWord" @click-row="(item) => drillDown('word', item.name)" /></div>
           </div>
        </div>

        <div class="chart-grid-3">
           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Tipo Programa</div></div>
             <div class="chart-area panel-scroll-area p-0"><StatsTable :data="stats.byProgramType" @click-row="(item) => drillDown('program_type', item.name)" /></div>
           </div>
           
           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Nivel Interés</div></div>
             <div class="chart-area panel-scroll-area p-0">
                <table class="exec-table">
                   <thead>
                      <tr class="thead-sub">
                         <th class="ts ts-c" style="background: var(--slate-100); color: var(--text-secondary); border: none;">Nivel</th>
                         <th class="ts ts-c text-right" style="background: var(--slate-100); color: var(--text-secondary); border: none;">Leads</th>
                         <th class="ts ts-c text-right" style="background: var(--slate-100); color: var(--teal-600); border: none;">Ventas</th>
                         <th class="ts ts-c text-right" style="background: var(--slate-100); color: var(--text-secondary); border: none;">%</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr v-for="(seg, idx) in stats.byInterest" :key="idx" class="tbody-row interactive-row" @click="drillDown('interest', seg.name)">
                         <td class="td-a" style="border: none;">
                            <span class="pill" :class="getBadgeClassInterestExec(seg.code)">{{ seg.name }}</span>
                         </td>
                         <td class="td-a text-right fw-600" style="border: none;">{{ seg.count }}</td>
                         <td class="td-a text-right fw-600 c-green" style="border: none;">{{ seg.sales }}</td>
                         <td class="td-a text-right text-muted" style="border: none;">{{ seg.conversion_rate }}%</td>
                      </tr>
                   </tbody>
                </table>
             </div>
           </div>

           <div class="chart-panel">
             <div class="chart-panel-header"><div class="chart-panel-title">Geografía</div></div>
             <div class="chart-area panel-scroll-area p-0"><StatsTable @click-row="(item) => drillDown('country', item.name)" :data="stats.byCountry" /></div>
           </div>
        </div>

      </div>

      <div v-else class="exec-loader">
         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--slate-300)" stroke-width="1.5" style="margin-bottom: 16px;">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
         </svg>
         <p class="loader-text" style="font-size: 15px; color: var(--text-primary);">Esperando filtros...</p>
         <p class="loader-text" style="font-weight: 400;">Selecciona los criterios arriba y pulsa "Actualizar Datos".</p>
      </div>

    </main>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, inject, h, defineComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'  // <-- añade useRoute
import { ServiceKeys } from '@/services'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import SearchSelect from '@/components/SearchSelect.vue'

const isStrictlyComercial = ref(false)
const selectedAdvisorId = ref(null)
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
  applyRoleRestrictions() // 1. Validar roles e inyectar ID si aplica
  
  await loadOwners()
  await parseQueryAndApply()
  
  // 2. Re-asegurar que el filtro no fue pisado por la URL si es estrictamente comercial
  if (isStrictlyComercial.value) {
     applyRoleRestrictions() 
  }
  
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
function getBadgeClassInterestExec(alias) {
  if (alias === 'we_lead_interest_high')   return 'pill-red'
  if (alias === 'we_lead_interest_medium') return 'pill-amber'
  return 'pill-slate'
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
  if (q.owner_user_ids && !isStrictlyComercial.value) {
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
// === VALIDACIÓN DE ROLES ===
function applyRoleRestrictions() {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const userData = JSON.parse(userStr)
      const roles = userData.roles || []
      
      const isComercial = roles.includes('COMERCIAL')
      const isLider = roles.includes('LIDER_COMERCIAL')
      
      // Si es Comercial pero NO es Lider Comercial
      if (isComercial && !isLider) {
        isStrictlyComercial.value = true
        selectedAdvisorId.value = userData.user_id
        
        // Clavamos el filtro con el usuario logueado
        filters.owner_user_ids = [{
          value: userData.user_id,
          label: userData.full_name || `Usuario ${userData.user_id}`
        }]
      }
    }
  } catch (error) {
    console.error('Error procesando el usuario desde localStorage:', error)
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
/* ═══════════════════════════════════════════════
   TOKENS & BASE
═══════════════════════════════════════════════ */
:root {
  --navy-900: #0f172a;
  --navy-800: #1e293b;
  --navy-700: #334155;
  --slate-400: #94a3b8;
  --slate-300: #cbd5e1;
  --slate-100: #f1f5f9;
  --slate-50:  #f8fafc;
  --teal-600:  #0d9488;
  --teal-500:  #14b8a6;
  --blue-600:  #2563eb;
  --amber-500: #f59e0b;
  --red-600:   #dc2626;
  --gold-400:  #fbbf24;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;
}

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.exec-shell {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: var(--slate-50);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

/* ═══════════════════════════════════════════════
   MASTHEAD & FILTERS
═══════════════════════════════════════════════ */
.exec-masthead {
  background: var(--navy-900);
  color: var(--white);
  border-bottom: 1px solid var(--navy-700);
}

.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 3px; height: 44px; background: var(--teal-500); border-radius: 2px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 18px; font-weight: 700; margin: 0; color: var(--white); }

.masthead-actions { display: flex; gap: 10px; align-items: center; }
.btn-exec {
  display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: background 0.15s, opacity 0.15s;
}
.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-primary:disabled { opacity: 0.55; cursor: default; }

.masthead-filters {
  display: flex; align-items: center; gap: 0; padding: 0 28px; min-height: 52px;
  overflow-x: auto; scrollbar-width: none;
}
.masthead-filters::-webkit-scrollbar { display: none; }
.filter-group { display: flex; flex-direction: column; gap: 4px; padding: 10px 20px 10px 0; min-width: max-content; }
.filter-label { font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--slate-400); font-weight: 600; cursor: default; }
.filter-sep { width: 1px; height: 32px; background: rgba(255,255,255,0.1); margin: 0 20px 0 0; }

/* Custom Dark Inputs */
.exec-input-dark {
  background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.18);
  color: var(--white); font-family: inherit; font-size: 12.5px; font-weight: 500; padding: 3px 0; outline: none; min-width: 130px;
}
.exec-input-dark::placeholder { color: rgba(255,255,255,0.3); }
.exec-input-dark:focus { border-bottom-color: var(--teal-500); }
.exec-input-success:focus { border-bottom-color: #22c55e; }

/* Wrapper para MultiSelect / SearchSelect si inyectan HTML propio */
.exec-input-dark-component { min-width: 180px; }
.w-md { min-width: 150px; }
:deep(.exec-input-dark-component .multiselect__tags),
:deep(.exec-input-dark-component input) { background: transparent !important; border: none !important; border-bottom: 1px solid rgba(255,255,255,0.18) !important; color: var(--white) !important; padding-left: 0 !important; border-radius: 0 !important; }

/* ═══════════════════════════════════════════════
   BODY & LOADER
═══════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 24px 28px; }

.exec-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; }
.loader-ring { width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--teal-600); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loader-text { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

/* ═══════════════════════════════════════════════
   DASHBOARD & KPIs
═══════════════════════════════════════════════ */
.view-dashboard { display: flex; flex-direction: column; gap: 20px; }

.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi-card { background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s; }
.kpi-interactive:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); cursor: pointer; border-color: var(--slate-300); }
.kpi-card-highlight { background: var(--navy-900); border-color: var(--navy-700); }

.kpi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.kpi-card-label { font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; font-weight: 700; color: var(--text-muted); }
.kpi-indicator { width: 7px; height: 7px; border-radius: 50%; }
.ind-blue { background: var(--blue-600); } .ind-amber { background: var(--amber-500); } .ind-red { background: var(--red-600); } .ind-green { background: #22c55e; }

.kpi-card-value { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; font-variant-numeric: tabular-nums; }
.kpi-card-sub { font-size: 11px; color: var(--text-muted); font-weight: 500; }
.kpi-card-actions { display: flex; gap: 8px; margin-top: 6px; }

/* Badges */
.pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; }
.pill-blue { background: #dbeafe; color: #1d4ed8; }
.pill-slate { background: #f1f5f9; color: #475569; }
.pill-red { background: #fee2e2; color: #b91c1c; }
.pill-amber { background: #fef3c7; color: #92400e; }
.interactive-pill:hover { filter: brightness(0.95); cursor: pointer; }

/* ═══════════════════════════════════════════════
   GRIDS & PANELS
═══════════════════════════════════════════════ */
.chart-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px;}
.chart-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;}

.chart-panel { background: var(--white); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; }
.chart-panel-header { padding: 14px 20px; border-bottom: 1px solid var(--slate-100); background: #fafbfc; }
.chart-panel-title { font-size: 12.5px; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.03em; }
.chart-panel-sub { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

.chart-area { flex: 1; }
.panel-scroll-area { max-height: 280px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--slate-300) transparent; }
.p-0 { padding: 0 !important; }

/* Listas custom (Pipeline) */
.list-row-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid var(--slate-50); transition: background 0.15s; }
.interactive-row:hover { background: #f8fafc; cursor: pointer; }
.row-info { display: flex; flex-direction: column; gap: 2px; }
.row-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.row-meta { font-size: 10.5px; color: var(--text-muted); }
.row-stats { display: flex; align-items: center; gap: 12px; }
.row-count { font-size: 13px; font-weight: 700; color: var(--text-secondary); min-width: 30px; text-align: right; }
.row-bar-track { width: 80px; height: 5px; background: var(--slate-100); border-radius: 3px; overflow: hidden; }
.row-bar-fill { height: 100%; background: var(--teal-500); border-radius: 3px; }

/* ═══════════════════════════════════════════════
   TABLAS (Override nativo + Bootstrap)
═══════════════════════════════════════════════ */
.exec-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.exec-table th { padding: 10px 16px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; text-align: left; border-bottom: 2px solid var(--border); }
.exec-table td { padding: 10px 16px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.tbody-row:last-child td { border-bottom: none; }

/* Hack para sobrescribir las clases de Bootstrap generadas por StatsTable.vue sin tocar el script */
:deep(.chart-area table) { width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'IBM Plex Sans', sans-serif; }
:deep(.chart-area table thead) { position: sticky; top: 0; background: var(--slate-100); z-index: 2; }
:deep(.chart-area table th) { padding: 10px 16px !important; font-size: 10px !important; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; color: var(--text-secondary); border: none !important; }
:deep(.chart-area table td) { padding: 10px 16px !important; border-bottom: 1px solid #f8fafc !important; color: var(--text-primary); vertical-align: middle; }
:deep(.chart-area table tbody tr:hover td) { background: #f0f9ff !important; transition: background 0.1s; cursor: pointer; }
:deep(.chart-area table .text-success) { color: #15803d !important; font-weight: 600; }
:deep(.chart-area table .text-muted) { color: var(--text-muted) !important; }

/* Utilidades */
.text-right { text-align: right; }
.text-center { text-align: center; }
.fw-600 { font-weight: 600; }
.c-green { color: #15803d; }
.accent-text { color: var(--teal-600); }

/* Animaciones */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }
.slide-fade-enter-active { transition: all 0.3s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateY(10px); }
/* --- RAYITA Y TÍTULO --- */
.masthead-brand { 
  display: flex; 
  align-items: center; 
  gap: 14px; /* Espacio entre la rayita y el texto */
}

.brand-rule {
  width: 3px; height: 42px;
  background: #2e3e91; border-radius: 2px; flex-shrink: 0;
}
.brand-eyebrow { 
  font-size: 11px; 
  letter-spacing: 0.1em; 
  text-transform: uppercase; 
  color: var(--text-secondary); 
  font-weight: 600; 
  display: block; 
  margin-bottom: 2px; 
}

.brand-title { 
  font-size: 22px; 
  font-weight: 700; 
  margin: 0; 
  color: var(--text-primary); 
  letter-spacing: -0.02em;
}

/* --- SOMBRAS Y BORDES PARA LAS CAJAS --- */
.kpi-card, .chart-panel { 
  background: var(--white); 
  /* Borde más definido */
  border: 1px solid rgba(15, 23, 42, 0.08); 
  border-radius: 8px; 
  /* Sombreado más fuerte para despegar la caja del fondo */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04); 
  transition: transform 0.2s, box-shadow 0.2s; 
}

/* Efecto al pasar el mouse por las tarjetas principales */
.kpi-interactive:hover { 
  transform: translateY(-3px); 
  /* Sombra aún más grande al hacer hover */
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05); 
  cursor: pointer; 
  border-color: var(--slate-300); 
}
</style>