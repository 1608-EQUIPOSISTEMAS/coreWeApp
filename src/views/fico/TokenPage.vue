<template>
  <div class="token-page">
    <header class="ep-masthead">
      <div class="ep-masthead-left">
        <span class="ep-breadcrumb">FICO</span>
        <h1 class="ep-title">Tokens de Pago</h1>
        <span class="ep-subtitle">Gestion de links de pago</span>
      </div>
    </header>

    <section class="ep-section">
      <div class="ep-section-head">
        <h2 class="ep-section-title">Cola de trabajo</h2>
        <span class="ep-section-meta">
          <i class="fa-solid fa-clock"></i>
          {{ statsTimestamp }}
          <button class="ep-refresh-btn" :disabled="stats.loading" @click="fetchStats" title="Actualizar">
            <i class="fa-solid" :class="stats.loading ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
          </button>
        </span>
      </div>

      <div class="ep-kpis">
        <article v-for="k in kpiCards" :key="k.key" class="ep-kpi" :class="`ep-kpi-${k.color}`">
          <div class="ep-kpi-head">
            <span class="ep-kpi-label">{{ k.label }}</span>
            <i class="fa-solid ep-kpi-icon" :class="k.icon"></i>
          </div>
          <div class="ep-kpi-main">
            <span class="ep-kpi-value">{{ k.formatted }}</span>
          </div>
          <span class="ep-kpi-foot">
            {{ k.description }}
            <strong v-if="k.secondary">{{ k.secondary }}</strong>
          </span>
        </article>
      </div>
    </section>

    <section class="ep-section">
      <nav class="ep-tabs" aria-label="Estados de tokens">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          :class="['ep-tab', { 'is-active': filterStatus === tab.value }]"
          @click="setStatusFilter(tab.value)"
        >
          <i class="fa-solid" :class="tab.icon"></i> {{ tab.label }}
        </button>
      </nav>

      <div class="ep-toolbar">
        <div class="tp-search-wrap">
          <i class="fa-solid fa-magnifying-glass tp-search-icon"></i>
          <input
            v-model="searchQuery"
            class="tp-search"
            placeholder="Buscar alumno, documento..."
            @input="debounceSearch"
          />
        </div>
        <BasePagination v-model="pagination" :hide-filters="true" @change="fetchTokens" />
      </div>
    </section>

    <div class="ect-wrap">
      <table class="ect">
        <thead>
          <tr class="ect-head">
            <th>Alumno / Documento</th>
            <th>Programa / Edicion</th>
            <th class="tc" style="width:90px">Tipo</th>
            <th class="tc" style="width:110px">Proveedor</th>
            <th class="tr" style="width:110px">Monto</th>
            <th class="tc" style="width:120px">Estado</th>
            <th style="width:200px">Link</th>
            <th style="width:100px">Creado</th>
            <th class="tc" style="width:120px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="isLoading">
            <tr v-for="n in 10" :key="'sk-' + n" class="skeleton-row">
              <td>
                <div class="sk-cell" style="width:140px"></div>
                <div class="sk-cell mt-1" style="width:90px;height:8px"></div>
              </td>
              <td>
                <div class="sk-cell" style="width:160px"></div>
                <div class="sk-cell mt-1" style="width:60px;height:8px"></div>
              </td>
              <td class="tc"><div class="sk-cell" style="width:60px;margin:0 auto"></div></td>
              <td class="tc"><div class="sk-cell" style="width:80px;margin:0 auto"></div></td>
              <td class="tr"><div class="sk-cell" style="width:80px;margin-left:auto"></div></td>
              <td class="tc"><div class="sk-cell" style="width:90px;margin:0 auto"></div></td>
              <td><div class="sk-cell" style="width:170px"></div></td>
              <td><div class="sk-cell" style="width:80px"></div></td>
              <td class="tc"><div class="sk-cell" style="width:90px;margin:0 auto"></div></td>
            </tr>
          </template>
          <template v-else>
            <tr v-for="t in tokens" :key="t.token_id" class="ect-row">
              <td>
                <div class="cell-main cell-clip">{{ t.student_name }}</div>
                <div class="cell-sub">{{ t.document_number }} {{ t.student_email ? '· ' + t.student_email : '' }}</div>
              </td>
              <td>
                <div class="cell-main cell-clip">{{ t.program_name }}</div>
                <span class="pill pill-sm pill-slate">{{ t.edition_code }} {{ t.edition_start_date ? `(${new Date(t.edition_start_date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })})` : '' }}</span>
                <span v-if="hasValidations(t)" class="pill pill-sm pill-amber" style="margin-left:4px">Convalida</span>
              </td>
              <td class="tc">
                <span v-if="t.payment_type" class="pill pill-sm" :class="t.payment_type === 'credito' ? 'pill-amber' : 'pill-teal'">{{ t.payment_type === 'credito' ? 'Credito' : 'Debito' }}</span>
                <span v-else class="pill pill-sm pill-slate">---</span>
              </td>
              <td class="tc">
                <span class="pill pill-sm pill-blue">{{ t.provider_name || '---' }}</span>
              </td>
              <td class="tr mono">{{ t.currency }} {{ formatMoney(t.amount) }}</td>
              <td class="tc">
                <span class="pill" :class="statusConfig[t.status]?.class || 'pill-slate'">
                  {{ statusConfig[t.status]?.label || t.status }}
                </span>
              </td>
              <td>
                <div v-if="t.payment_url" class="tp-link-cell">
                  <span class="tp-link-text" :title="t.payment_url">{{ truncateUrl(t.payment_url) }}</span>
                  <button class="act-btn act-teal" title="Copiar link" @click="copyLink(t.payment_url)">
                    <i class="fa-solid fa-copy"></i>
                  </button>
                </div>
                <span v-else class="cell-sub">--</span>
              </td>
              <td class="cell-date">{{ formatDate(t.created_at) }}</td>
              <td class="tc">
                <div class="tp-actions">
                  <template v-if="t.status === 'pending'">
                    <template v-if="canWrite">
                      <button class="act-btn act-teal" title="Agregar Link" @click="openAddLink(t)">
                        <i class="fa-solid fa-link"></i>
                      </button>
                      <button class="act-btn act-red" title="Eliminar" @click="deleteToken(t)">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </template>
                    <span v-else class="cell-sub">En espera</span>
                  </template>
                  <template v-else-if="t.status === 'link_sent' || t.status === 'paid'">
                    <template v-if="t.enrollment_id">
                      <button class="tp-btn-confirm" title="Ver inscripcion" @click="goToEnrollment(t.enrollment_id)">
                        <i class="fa-solid fa-eye"></i> Ver
                      </button>
                    </template>
                    <template v-else-if="canWrite">
                      <button class="tp-btn-confirm" title="Crear inscripcion" @click="confirmToken(t)">
                        <i class="fa-solid fa-graduation-cap"></i> Inscribir
                      </button>
                    </template>
                    <button class="act-btn act-teal" title="Copiar link" @click="copyLink(t.payment_url)">
                      <i class="fa-solid fa-copy"></i>
                    </button>
                  </template>
                  <template v-else-if="t.status === 'confirmed'">
                    <i class="fa-solid fa-circle-check tp-confirmed-icon"></i>
                  </template>
                </div>
              </td>
            </tr>
            <tr v-if="!tokens.length">
              <td colspan="9" class="empty-row">Sin resultados</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showLinkModal" class="tp-overlay" @click.self="showLinkModal = false">
        <div class="tp-modal tp-modal-sm">
          <div class="tp-modal-head">
            <h2 class="tp-modal-title">Agregar Link de Pago</h2>
            <button class="tp-modal-close" @click="showLinkModal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="tp-modal-body">
            <div v-if="tokenAdvisorObs" class="tp-obs-ref">
              <div class="tp-obs-ref-title"><i class="fa-solid fa-comment-dots"></i> Observacion del asesor</div>
              <div class="tp-obs-ref-text">{{ tokenAdvisorObs }}</div>
            </div>
            <div v-if="linkToken?.payment_type" class="tp-obs-ref" style="margin-top:8px;background:#FEF3C7;border-color:#FCD34D">
              <div class="tp-obs-ref-title"><i class="fa-solid fa-credit-card"></i> Tipo de pago</div>
              <div class="tp-obs-ref-text" style="font-weight:700">{{ linkToken.payment_type === 'credito' ? 'Credito' : 'Debito' }}</div>
            </div>
            <label class="tp-label" style="margin-top:16px">Proveedor <span style="color:#DC2626">*</span></label>
            <select v-model="linkForm.cat_provider" class="tp-input">
              <option :value="null">--- Seleccionar proveedor ---</option>
              <option v-for="p in providerCatalog" :key="p.id" :value="p.id">{{ p.description }}</option>
            </select>
            <label class="tp-label">URL de pago <span style="color:#DC2626">*</span></label>
            <input v-model="linkForm.payment_url" class="tp-input" placeholder="https://..." />
            <label class="tp-label">Notas</label>
            <textarea v-model="linkForm.notes" class="tp-input tp-textarea" rows="2"></textarea>
          </div>
          <div class="tp-modal-foot">
            <button class="tp-btn-cancel" @click="showLinkModal = false">Cancelar</button>
            <button class="ep-btn-new" :disabled="!linkForm.payment_url || !linkForm.cat_provider" @click="submitLink">Guardar</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import BasePagination from '@/components/BasePagination.vue'

const toast = useToast()
const router = useRouter()
const catalog = inject('catalog')

const currentUserRoles = (() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').roles || []
  } catch {
    return []
  }
})()
const WRITE_ROLES = ['ADMIN', 'FICO', 'LIDER_FICO']
const canWrite = WRITE_ROLES.some(r => currentUserRoles.includes(r))

function goToEnrollment (enrollmentId) {
  router.push({ name: 'enrollmentDetail', params: { id: enrollmentId } })
}

const providerCatalog = (() => {
  const items = catalog.options('we_token_provider')
  if (items.length > 0) return items
  return [
    { id: 3247, description: 'Qulqi' },
    { id: 3248, description: 'MercadoPago' },
    { id: 3249, description: 'PayPal' }
  ]
})()

const statusConfig = {
  pending:   { label: 'Pendiente',    class: 'pill-amber' },
  link_sent: { label: 'Link Enviado', class: 'pill-blue' },
  paid:      { label: 'Pagado',       class: 'pill-green' },
  confirmed: { label: 'Confirmado',   class: 'pill-slate' }
}

const statusTabs = [
  { label: 'Todos',        value: '',          icon: 'fa-inbox' },
  { label: 'Pendiente',    value: 'pending',   icon: 'fa-hourglass-half' },
  { label: 'Link Enviado', value: 'link_sent', icon: 'fa-paper-plane' },
  { label: 'Pagado',       value: 'paid',      icon: 'fa-dollar-sign' },
  { label: 'Confirmado',   value: 'confirmed', icon: 'fa-circle-check' }
]

const tokens = ref([])
const isLoading = ref(false)
const filterStatus = ref('')
const searchQuery = ref('')
const pagination = ref({ page: 1, size: 25, total: 0 })

const stats = reactive({
  pending: 0,
  linkSent: 0,
  paidUnconfirmed: 0,
  amountPen: 0,
  amountUsd: 0,
  loading: false,
  loadedAt: null
})

const statsTimestamp = computed(() => {
  if (!stats.loadedAt) return stats.loading ? 'Cargando...' : 'Sin datos'
  return `Actualizado ${stats.loadedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
})

const kpiCards = computed(() => [
  {
    key: 'pending',
    label: 'Pendientes totales',
    icon: 'fa-hourglass-half',
    color: 'amber',
    formatted: stats.pending.toLocaleString('es-PE'),
    description: 'Esperan link de FICO'
  },
  {
    key: 'linkSent',
    label: 'Links enviados',
    icon: 'fa-paper-plane',
    color: 'indigo',
    formatted: stats.linkSent.toLocaleString('es-PE'),
    description: 'Esperan pago del alumno'
  },
  {
    key: 'paidUnconfirmed',
    label: 'Por confirmar',
    icon: 'fa-circle-exclamation',
    color: 'teal',
    formatted: stats.paidUnconfirmed.toLocaleString('es-PE'),
    description: 'Pagados, esperan inscribir'
  },
  {
    key: 'amount',
    label: 'Monto en espera',
    icon: 'fa-coins',
    color: 'green',
    formatted: 'S/ ' + formatMoneyInt(stats.amountPen),
    description: stats.amountUsd > 0 ? 'USD pendiente:' : 'En tokens no confirmados',
    secondary: stats.amountUsd > 0 ? '$ ' + formatMoneyInt(stats.amountUsd) : ''
  }
])

let searchTimer = null
function debounceSearch () {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { pagination.value.page = 1; fetchTokens() }, 350)
}

function setStatusFilter (value) {
  filterStatus.value = value
  pagination.value.page = 1
  fetchTokens()
}

async function fetchTokens () {
  isLoading.value = true
  try {
    const params = {
      status: filterStatus.value,
      q: searchQuery.value,
      page: pagination.value.page,
      size: pagination.value.size
    }
    const res = (await api.get('/token/list', { params })).data
    tokens.value = res.data?.items || []
    pagination.value.total = res.data?.total || 0
  } catch {
    toast.error('Error al cargar tokens')
  } finally {
    isLoading.value = false
  }
}

async function fetchStats () {
  stats.loading = true
  try {
    const res = (await api.get('/token/stats')).data
    const d = res.data || {}
    stats.pending = d.pending || 0
    stats.linkSent = d.linkSent || 0
    stats.paidUnconfirmed = d.paidUnconfirmed || 0
    stats.amountPen = d.amountPen || 0
    stats.amountUsd = d.amountUsd || 0
    stats.loadedAt = new Date()
  } catch {
    toast.error('Error al cargar indicadores')
  } finally {
    stats.loading = false
  }
}

// --- Add Link ---
const showLinkModal = ref(false)
const linkToken = ref(null)
const linkForm = ref({ payment_url: '', cat_provider: null, notes: '' })

const tokenAdvisorObs = computed(() => {
  const t = linkToken.value
  if (!t) return null
  if (t.advisor_observation) return t.advisor_observation
  const obs = t.inscription_data?.inscription?.observations
  if (obs) return obs
  return null
})

function openAddLink (t) {
  linkToken.value = t
  let defaultNotes = t.notes || `Link para ${t.student_name || '---'}`
  if (defaultNotes.includes(' | ')) defaultNotes = defaultNotes.split(' | ').pop()
  linkForm.value = { payment_url: t.payment_url || '', cat_provider: t.cat_provider || null, notes: defaultNotes }
  showLinkModal.value = true
}

async function submitLink () {
  try {
    await api.put('/token/update', {
      token_id: linkToken.value.token_id,
      payment_url: linkForm.value.payment_url,
      cat_provider: linkForm.value.cat_provider,
      notes: linkForm.value.notes || undefined
    })
    toast.success('Link actualizado')
    showLinkModal.value = false
    await Promise.all([fetchTokens(), fetchStats()])
  } catch {
    toast.error('Error al actualizar link')
  }
}

async function confirmToken (t) {
  try {
    const res = await api.post('/token/confirm', {
      token_id: t.token_id,
      provider_reference: ''
    })
    const enrollmentId = res.data?.data?.enrollment_id
    toast.success('Inscripcion creada correctamente.', { timeout: 4000 })
    if (enrollmentId) {
      router.push({ name: 'enrollmentDetail', params: { id: enrollmentId } })
    } else {
      await Promise.all([fetchTokens(), fetchStats()])
    }
  } catch (err) {
    toast.error(err?.response?.data?.error || 'Error al inscribir')
  }
}

async function deleteToken (t) {
  if (!confirm('Eliminar este token?')) return
  try {
    await api.delete(`/token/delete/${t.token_id}`)
    toast.success('Token eliminado')
    await Promise.all([fetchTokens(), fetchStats()])
  } catch {
    toast.error('Error al eliminar token')
  }
}

function hasValidations (t) {
  const vals = t.inscription_data?.validations
  return vals?.enabled && vals.validated_children?.length > 0
}

function formatMoney (v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMoneyInt (v) {
  return Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate (d) {
  if (!d) return '--'
  const dt = new Date(d)
  return dt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function truncateUrl (url) {
  if (!url) return ''
  try {
    const u = new URL(url)
    const path = u.pathname.length > 20 ? u.pathname.slice(0, 20) + '...' : u.pathname
    return u.hostname + path
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url
  }
}

async function copyLink (url) {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  } catch {
    toast.error('No se pudo copiar')
  }
}

onMounted(() => {
  fetchTokens()
  fetchStats()
})
</script>

<style scoped>
.token-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAFA;
  --e-border: #EFEFEF;
  --e-border-strong: #E5E5E5;
  --e-text: #1A1A1A;
  --e-text-secondary: #737373;
  --e-text-muted: #A3A3A3;
  --e-accent: #0D9488;
  --e-accent-soft: #F0FDFA;

  background: #FAFAFA;
  padding: 28px 32px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  min-height: 100vh;
}

.ep-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
}
.ep-masthead-left { display: flex; flex-direction: column; gap: 3px; }
.ep-breadcrumb {
  font-size: 11px;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.ep-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle {
  font-size: 12.5px;
  color: var(--e-text-muted);
  font-weight: 500;
  margin-top: 2px;
}

.ep-section {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.ep-section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.ep-section-title {
  font-size: 13px; font-weight: 700; margin: 0;
  color: var(--e-text); letter-spacing: -0.01em;
}
.ep-section-meta {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; color: var(--e-text-muted); font-weight: 500;
}
.ep-section-meta i { font-size: 10px; }
.ep-refresh-btn {
  width: 26px; height: 26px;
  border: 1px solid var(--e-border);
  background: #fff;
  border-radius: 6px; cursor: pointer;
  color: var(--e-text-secondary); font-size: 11px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 0.15s ease; margin-left: 4px;
}
.ep-refresh-btn:hover:not(:disabled) {
  background: var(--e-accent-soft);
  border-color: var(--e-accent);
  color: var(--e-accent);
}
.ep-refresh-btn:disabled { opacity: 0.5; cursor: wait; }

.ep-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.ep-kpi {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
.ep-kpi:hover {
  border-color: var(--e-border-strong);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04);
}
.ep-kpi::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: currentColor;
}
.ep-kpi-head {
  display: flex; justify-content: space-between; align-items: center;
}
.ep-kpi-label {
  font-size: 11px; font-weight: 600;
  color: var(--e-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ep-kpi-icon { font-size: 12px; color: currentColor; opacity: 0.65; }
.ep-kpi-main {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 8px;
}
.ep-kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--e-text);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.ep-kpi-foot {
  font-size: 11px; color: var(--e-text-muted);
  border-top: 1px solid var(--e-border);
  padding-top: 8px; margin-top: 2px;
}
.ep-kpi-foot strong { color: var(--e-text-secondary); font-weight: 600; font-variant-numeric: tabular-nums; margin-left: 4px; }

.ep-kpi-indigo { color: #6366F1; }
.ep-kpi-amber  { color: #D97706; }
.ep-kpi-green  { color: #10B981; }
.ep-kpi-teal   { color: #0D9488; }

.ep-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--e-border);
}
.ep-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px;
  font-size: 12.5px; font-weight: 500;
  color: var(--e-text-secondary);
  background: var(--e-bg-subtle);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s ease;
  font-family: inherit;
}
.ep-tab i { font-size: 11px; opacity: 0.7; }
.ep-tab:hover { color: var(--e-text); background: #F5F5F5; }
.ep-tab.is-active {
  color: var(--e-accent);
  background: var(--e-accent-soft);
  border-color: rgba(13, 148, 136, 0.25);
  font-weight: 600;
}
.ep-tab.is-active i { opacity: 1; }

.ep-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}

.tp-search-wrap { position: relative; flex: 0 0 auto; }
.tp-search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--e-text-muted); font-size: 12px; pointer-events: none;
}
.tp-search {
  width: 280px;
  height: 34px;
  padding: 0 12px 0 34px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  color: var(--e-text);
  background: #fff;
  font-family: inherit;
  transition: all .2s ease;
  box-sizing: border-box;
}
.tp-search:focus {
  outline: none;
  border-color: var(--e-accent);
  box-shadow: 0 0 0 3px rgba(13,148,136,.06);
}
.tp-search::placeholder { color: #C4C4C4; }

.ect-wrap {
  background: #fff;
  border-radius: 14px;
  overflow-x: auto;
  border: 1px solid var(--e-border);
}
.ect {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #1A1A1A;
}
.tc { text-align: center; }
.tr { text-align: right; }

.ect-head th {
  background: #FAFAFA;
  padding: 11px 12px;
  text-align: left;
  font-weight: 500;
  color: #8C8C8C;
  border-bottom: 1px solid #F0F0F0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.ect-row td {
  padding: 14px 12px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
  height: 52px;
  box-sizing: border-box;
  transition: background .15s ease;
}
.ect-row:hover td { background: #FAFAFA; }
.ect-row:last-child td { border-bottom: none; }

.cell-main {
  font-weight: 600;
  color: #1A1A1A;
  font-size: 13px;
  line-height: 1.35;
}
.cell-clip {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-sub {
  color: #A3A3A3;
  font-size: 11.5px;
  margin-top: 2px;
}
.cell-date {
  font-size: 12px;
  color: #737373;
  white-space: nowrap;
}
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 12.5px;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.pill-sm { padding: 3px 8px; font-size: 10.5px; }
.pill-slate { background: #F5F5F5; color: #737373; }
.pill-green { background: #ECFDF5; color: #065F46; }
.pill-amber { background: #FFF8EB; color: #92400E; }
.pill-blue  { background: #EFF6FF; color: #1E40AF; }
.pill-red   { background: #FEF2F2; color: #991B1B; }
.pill-teal  { background: #F0FDFA; color: #0F766E; }

.tp-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.act-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #E8E8E8;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  color: #A3A3A3;
  font-size: 12px;
  transition: all .2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.act-btn.act-teal { border-color: #E8E8E8; color: #737373; }
.act-btn.act-teal:hover { background: #F0FDFA; border-color: var(--e-accent); color: var(--e-accent); }
.act-btn.act-red { border-color: #E8E8E8; color: #737373; }
.act-btn.act-red:hover { background: #FEF2F2; border-color: #FCA5A5; color: #EF4444; }

.tp-btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: #1A1A1A;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s ease;
  white-space: nowrap;
}
.tp-btn-confirm:hover { background: #333; }

.tp-confirmed-icon { color: #059669; font-size: 16px; }

.tp-link-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tp-link-text {
  font-size: 12px;
  color: var(--e-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.empty-row {
  padding: 48px;
  text-align: center;
  color: #C4C4C4;
  font-size: 13px;
}

.skeleton-row td {
  padding: 14px 12px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
  height: 52px;
  box-sizing: border-box;
}
.sk-cell {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F5 25%, #EBEBEB 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: tp-sk-shimmer 1.4s ease-in-out infinite;
  width: 100%;
}
.sk-cell.mt-1 { margin-top: 6px; }
@keyframes tp-sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.tp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.tp-modal {
  background: #fff;
  border-radius: 14px;
  width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,.15);
}
.tp-modal-sm { width: 420px; }
.tp-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 12px;
}
.tp-modal-title { font-size: 15px; font-weight: 600; color: #1A1A1A; margin: 0; }
.tp-modal-close {
  width: 30px;
  height: 30px;
  border: none;
  background: #F5F5F5;
  border-radius: 8px;
  cursor: pointer;
  color: #737373;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background .2s;
}
.tp-modal-close:hover { background: #EBEBEB; color: #1A1A1A; }
.tp-modal-body { padding: 20px 24px; }
.tp-obs-ref {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 8px;
  padding: 10px 14px;
}
.tp-obs-ref-title {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 4px;
}
.tp-obs-ref-title i { margin-right: 4px; }
.tp-obs-ref-text { font-size: 13px; color: #1A1A1A; line-height: 1.4; }
.tp-modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid #F0F0F0;
}

.tp-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 6px;
  margin-top: 16px;
}
.tp-label:first-child { margin-top: 0; }

.tp-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  color: #1A1A1A;
  background: #fff;
  font-family: inherit;
  transition: all .2s ease;
  box-sizing: border-box;
}
.tp-input:focus {
  outline: none;
  border-color: var(--e-accent);
  box-shadow: 0 0 0 3px rgba(13,148,136,.06);
}
.tp-textarea { height: auto; padding: 10px 12px; resize: vertical; }

.tp-btn-cancel {
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 500;
  color: #737373;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: all .2s ease;
}
.tp-btn-cancel:hover { background: #F5F5F5; color: #1A1A1A; }

.ep-btn-new {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #1A1A1A;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .2s ease;
  font-family: inherit;
}
.ep-btn-new:hover { background: #333; }
.ep-btn-new:disabled { opacity: .4; cursor: not-allowed; }

@media (max-width: 1280px) {
  .ep-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .token-page { padding: 16px; }
  .ep-toolbar { flex-direction: column; align-items: stretch; }
  .tp-search-wrap { width: 100%; }
  .tp-search { width: 100%; }
  .tp-modal { width: 95vw; }
  .tp-modal-sm { width: 95vw; }
  .ep-kpis { grid-template-columns: 1fr; }
}
</style>
