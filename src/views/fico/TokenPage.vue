<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Tokens de pago</h1>
        <p class="ds-sub">Links de pago pedidos por Comercial: FICO pone el link e inscribe cuando se paga</p>
      </div>
    </header>

    <div class="ds-kpis">
      <div v-for="k in kpiCards" :key="k.key" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="isLoading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ k.formatted }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.description }} <strong v-if="k.secondary">{{ k.secondary }}</strong></span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="tp-toolbar">
        <div class="ds-tabs" role="group" aria-label="Estado del token">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :aria-pressed="filterStatus === tab.value && !filters.status_in.length"
            @click="setStatusFilter(tab.value)"
          >
            <i class="fa-solid" :class="tab.icon" aria-hidden="true"></i> {{ tab.label }}
          </button>
        </div>
        <span v-if="selectionMode" class="tp-selhint">
          <i class="fa-solid fa-object-group" aria-hidden="true"></i>
          Modo selección: elige tus tokens compatibles
          <button class="btn-icon btn-icon-sm" type="button" title="Salir (Esc)" aria-label="Salir del modo selección" @click="cancelGrouping">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </span>
        <BasePagination v-model="pagination" @change="fetchTokens" @open-filters="onOpenFilters" />
      </div>
      <div v-if="activeFilterChips.length > 0" class="tp-chips">
        <BaseFilterChips :items="activeFilterChips" @remove="clearFilter" @clear-all="clearAdvancedFilters" />
      </div>
    </section>

    <TokenFilterModal
      :visible="showFilterModal"
      :filters="filters"
      :filtro-status="filtroStatus"
      :filtro-owners="filtroOwners"
      :filtro-provider="providerCatalog"
      :filtro-payment-type="filtroPaymentType"
      @update:visible="v => showFilterModal = v"
      @apply="applyFilters"
      @clear="clearAdvancedFilters"
    />

    <section class="ds-panel">
      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa tp-table">
          <thead>
            <tr>
              <th v-if="selectionMode" class="tc" style="width:36px"><span class="sr-only">Seleccionar</span></th>
              <th v-for="col in COLUMNS" :key="col.key" :class="col.cls" :style="col.width ? `width:${col.width}` : null">
                <button
                  v-if="col.filter"
                  type="button"
                  class="ds-th-filter"
                  :class="{ 'is-active': colToggles.isActive(col.key) }"
                  :aria-expanded="colToggles.isOpen(col.key)"
                  :title="colToggles.isOpen(col.key) ? 'Ocultar filtro' : 'Filtrar por esta columna'"
                  @click="colToggles.toggle(col.key)"
                >
                  {{ col.label }} <i class="fa-solid fa-filter" aria-hidden="true"></i>
                </button>
                <template v-else>{{ col.label }}</template>
              </th>
            </tr>
            <!-- Fila de filtros: aparece solo con alguna columna abierta o con un
                 filtro puesto (useColumnFilterToggles), igual que Inscripciones. -->
            <tr v-if="colToggles.anyVisible.value" class="tp-filters">
              <th v-if="selectionMode"></th>
              <th>
                <BaseDatePicker v-if="colToggles.isOpen('creado')" v-model="colFilters.creado" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" />
              </th>
              <th><input v-if="colToggles.isOpen('alumno')" v-model="colFilters.alumno" class="ds-input" placeholder="Nombre o teléfono…" aria-label="Filtrar por alumno" /></th>
              <th><input v-if="colToggles.isOpen('programa')" v-model="colFilters.programa" class="ds-input" placeholder="Programa…" aria-label="Filtrar por programa" /></th>
              <th>
                <ColumnFilterDropdown v-if="colToggles.isOpen('tipo')" v-model="colFilters.tipo" column-label="Tipo" :all-items="tokens" :value-extractor="t => t.payment_type === 'credito' ? 'Credito' : t.payment_type === 'debito' ? 'Debito' : '(Sin tipo)'" />
              </th>
              <th>
                <ColumnFilterDropdown v-if="colToggles.isOpen('proveedor')" v-model="colFilters.proveedor" column-label="Proveedor" :all-items="tokens" :value-extractor="t => t.provider_name || '(Sin proveedor)'" />
              </th>
              <th><input v-if="colToggles.isOpen('montoMin')" v-model="colFilters.montoMin" type="number" min="0" class="ds-input tp-num" placeholder="&ge; 0" aria-label="Monto mínimo" /></th>
              <th>
                <ColumnFilterDropdown v-if="colToggles.isOpen('estado')" v-model="colFilters.estado" column-label="Estado" :all-items="tokens" :value-extractor="t => statusConfig[t.status]?.label || t.status" />
              </th>
              <th></th>
              <th>
                <ColumnFilterDropdown v-if="colToggles.isOpen('asesor')" v-model="colFilters.asesor" column-label="Asesor" :all-items="tokens" :value-extractor="t => t.requested_by_name || t.created_by_name || '(Sin asesor)'" />
              </th>
              <th>
                <BaseDatePicker v-if="colToggles.isOpen('fechaPago')" v-model="colFilters.fechaPago" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Desde – hasta" />
              </th>
              <th class="tc">
                <button class="btn-icon btn-icon-sm" type="button" title="Limpiar y cerrar filtros" aria-label="Limpiar y cerrar filtros" @click="clearColFilters">
                  <i class="fa-solid fa-eraser" aria-hidden="true"></i>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="n in 10" :key="'sk-' + n">
                <td :colspan="selectionMode ? 12 : 11"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <template v-else>
              <tr
                v-for="t in filteredTokens"
                :key="t.token_id"
                :class="{
                  'is-grouped': !!t.group_id,
                  'is-selected': selectedTokenIds.has(t.token_id),
                  'is-disabled': selectionMode && !isSelectable(t) && !selectedTokenIds.has(t.token_id)
                }"
                @click="selectionMode && toggleTokenSelection(t)"
                @contextmenu="openCtxMenu($event, t)"
              >
                <td v-if="selectionMode" class="tc">
                  <input
                    type="checkbox"
                    class="tp-chk"
                    :checked="selectedTokenIds.has(t.token_id)"
                    :disabled="!isSelectable(t)"
                    :title="isSelectable(t) ? 'Seleccionar' : 'No seleccionable (no es tuyo, ya tiene link o está en otro grupo)'"
                    @click.stop="toggleTokenSelection(t)"
                  />
                </td>
                <td class="mono">{{ formatDate(t.created_at) }}</td>
                <td>
                  <div class="tp-main">{{ t.student_name }}</div>
                  <div class="tp-sub">{{ t.student_phone || '—' }}{{ t.student_email ? ' · ' + t.student_email : '' }}</div>
                  <span v-if="getGroup(t)" class="ds-pill violet tp-group" :title="`Grupo ${getGroup(t).shortId} · ${getGroup(t).count} tokens · Total ${getGroup(t).currency} ${formatMoney(getGroup(t).total)}`">
                    <i class="fa-solid fa-object-group" aria-hidden="true"></i>
                    Grupo {{ getGroup(t).shortId }} · {{ getGroup(t).count }} tokens · {{ getGroup(t).currency }} {{ formatMoney(getGroup(t).total) }}
                  </span>
                </td>
                <td>
                  <div class="tp-main">{{ t.program_name }}</div>
                  <span v-if="t.edition_code" class="ds-pill">{{ t.edition_code }} {{ formatEditionShortDate(t.edition_start_date) }}</span>
                  <span v-if="hasValidations(t)" class="ds-pill violet tp-ml">Convalida</span>
                </td>
                <td>
                  <span v-if="t.payment_type" class="ds-pill" :class="t.payment_type === 'credito' ? 'warn' : 'cyan'">{{ t.payment_type === 'credito' ? 'Crédito' : 'Débito' }}</span>
                  <span v-else class="tp-sub">—</span>
                </td>
                <td><span class="ds-pill info">{{ t.provider_name || '—' }}</span></td>
                <td class="num mono tp-amount">{{ t.currency }} {{ formatMoney(t.amount) }}</td>
                <td><span class="ds-pill" :class="statusConfig[t.status]?.tone">{{ statusConfig[t.status]?.label || t.status }}</span></td>
                <td>
                  <div v-if="t.payment_url" class="tp-link">
                    <button class="tp-link-text" type="button" :title="`${t.payment_url}\n(Clic para copiar)`" @click="copyLink(t.payment_url)">
                      {{ truncateUrl(t.payment_url) }}
                    </button>
                    <button v-if="canAddLink && t.status !== 'confirmed'" class="btn-icon btn-icon-sm" type="button" title="Editar link" aria-label="Editar link" @click="openAddLink(t)">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i>
                    </button>
                  </div>
                  <span v-else class="tp-sub">—</span>
                </td>
                <td>{{ t.requested_by_name || t.created_by_name || '—' }}</td>
                <td class="mono">
                  <template v-if="t.status === 'paid' || t.status === 'confirmed'">{{ formatDate(t.updated_at) }}</template>
                  <span v-else class="tp-sub">—</span>
                </td>
                <td class="tc">
                  <div class="tp-actions">
                    <template v-if="t.status === 'pending'">
                      <template v-if="canAddLink">
                        <button class="btn-exec btn-exec-primary btn-sm" type="button" title="Agregar link de pago" @click="openAddLink(t)">
                          <i class="fa-solid fa-link" aria-hidden="true"></i> Link
                        </button>
                        <button class="btn-icon btn-icon-sm tp-danger" type="button" title="Eliminar token" aria-label="Eliminar token" @click="deleteToken(t)">
                          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                        </button>
                      </template>
                      <button v-if="canEditInscription(t)" class="btn-icon btn-icon-sm" type="button" title="Editar inscripción" aria-label="Editar inscripción" @click="openEditInscription(t)">
                        <i class="fa-solid fa-user-pen" aria-hidden="true"></i>
                      </button>
                      <button
                        v-if="t.group_id && !t.payment_url && Number(t.requested_by) === Number(currentUserId)"
                        class="btn-icon btn-icon-sm"
                        type="button"
                        title="Desagrupar este grupo"
                        aria-label="Desagrupar este grupo"
                        @click="ungroupTokens(t.group_id)"
                      >
                        <i class="fa-solid fa-object-ungroup" aria-hidden="true"></i>
                      </button>
                      <span v-if="!canAddLink && !canEditInscription(t) && !t.group_id" class="tp-sub">En espera</span>
                    </template>
                    <template v-else-if="t.status === 'link_sent' || t.status === 'paid'">
                      <button v-if="t.enrollment_id" class="btn-exec btn-exec-outline btn-sm" type="button" title="Ver inscripción" @click="goToEnrollment(t.enrollment_id)">
                        <i class="fa-solid fa-eye" aria-hidden="true"></i> Ver
                      </button>
                      <button
                        v-else-if="canConfirmEnrollment"
                        class="btn-exec btn-exec-primary btn-sm"
                        type="button"
                        :disabled="confirmingTokens.has(t.token_id)"
                        @click="confirmToken(t)"
                      >
                        <i class="fa-solid" :class="confirmingTokens.has(t.token_id) ? 'fa-spinner fa-spin' : 'fa-graduation-cap'" aria-hidden="true"></i>
                        {{ confirmingTokens.has(t.token_id) ? 'Inscribiendo…' : 'Inscribir' }}
                      </button>
                      <button v-if="canEditInscription(t)" class="btn-icon btn-icon-sm" type="button" title="Editar inscripción" aria-label="Editar inscripción" @click="openEditInscription(t)">
                        <i class="fa-solid fa-user-pen" aria-hidden="true"></i>
                      </button>
                      <button class="btn-icon btn-icon-sm" type="button" title="Copiar link" aria-label="Copiar link" @click="copyLink(t.payment_url)">
                        <i class="fa-solid fa-copy" aria-hidden="true"></i>
                      </button>
                    </template>
                    <i v-else-if="t.status === 'confirmed'" class="fa-solid fa-circle-check tp-done" title="Inscrito" aria-label="Inscrito"></i>
                  </div>
                </td>
              </tr>
              <tr v-if="!tokens.length">
                <td :colspan="selectionMode ? 12 : 11" class="ds-empty--lista tp-empty">No hay tokens con estos filtros.</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="ctxMenu.show"
        class="tp-ctx-menu"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @click.stop
      >
        <button v-if="!selectionMode && isSelectable(ctxMenu.token)" class="tp-ctx-item" type="button" @click="startGrouping(ctxMenu.token)">
          <i class="fa-solid fa-object-group" aria-hidden="true"></i> Agrupar tokens
        </button>
        <button v-if="selectionMode" class="tp-ctx-item" type="button" @click="cancelGrouping">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i> Cancelar selección
        </button>
        <button
          v-if="ctxMenu.token?.group_id && Number(ctxMenu.token?.requested_by) === Number(currentUserId)"
          class="tp-ctx-item"
          type="button"
          @click="ungroupFromCtx"
        >
          <i class="fa-solid fa-object-ungroup" aria-hidden="true"></i> Desagrupar grupo
        </button>
        <div v-if="!hasCtxActions" class="tp-ctx-empty">Sin acciones disponibles</div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="selectionMode && selectionSummary.count >= 2"
        class="tp-selbar"
        :class="{ 'is-over-limit': selectionSummary.overLimit || selectionSummary.overCount }"
      >
        <div class="tp-selbar-info">
          <strong>{{ selectionSummary.count }} de {{ MAX_TOKENS_PER_GROUP }} tokens seleccionados</strong>
          <span>
            Total: <strong>{{ selectionSummary.currency }} {{ formatMoney(selectionSummary.total) }}</strong>
            <span v-if="selectionSummary.overCount" class="tp-selbar-warn">
              · El límite de agrupación es de {{ MAX_TOKENS_PER_GROUP }} tokens por grupo
            </span>
            <span v-if="selectionSummary.overLimit" class="tp-selbar-warn">
              · Supera el límite de {{ selectionSummary.currency }} {{ MAX_GROUP_AMOUNT }}
            </span>
          </span>
        </div>
        <button
          class="btn-exec btn-exec-primary"
          type="button"
          :disabled="selectionSummary.overLimit || selectionSummary.overCount"
          @click="submitGroup"
        >
          <i class="fa-solid fa-object-group" aria-hidden="true"></i> Agrupar en un solo link
        </button>
      </div>
    </Teleport>

    <BaseModal
      :model-value="showLinkModal"
      :title="`${isEditingLink ? 'Editar' : 'Agregar'} link de pago`"
      size="md"
      @update:model-value="v => showLinkModal = v"
    >
      <div ref="linkModalBody" class="tp-link-form">
        <div v-if="getGroup(linkToken)" class="tp-group-box">
          <p class="tp-group-title">
            <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
            Este link {{ isEditingLink ? 'cubre' : 'cubrirá' }} <strong>{{ getGroup(linkToken).count }} tokens</strong> del mismo pago (grupo {{ getGroup(linkToken).shortId }}): los cambios se aplican a todos.
          </p>
          <ul class="tp-group-list">
            <li v-for="gt in tokens.filter(x => x.group_id === linkToken?.group_id)" :key="gt.token_id">
              <span>{{ gt.student_name || '—' }} · {{ gt.program_name || '—' }}</span>
              <strong class="mono">{{ gt.currency }} {{ formatMoney(gt.amount) }}</strong>
            </li>
          </ul>
          <div class="tp-group-total">
            <span>Total</span>
            <strong class="mono">{{ getGroup(linkToken).currency }} {{ formatMoney(getGroup(linkToken).total) }}</strong>
          </div>
        </div>
        <p v-if="tokenAdvisorObs" class="ds-callout info">
          <i class="fa-solid fa-comment-dots" aria-hidden="true"></i>
          <span><strong>Observación del asesor:</strong> {{ tokenAdvisorObs }}</span>
        </p>
        <p v-if="linkToken?.payment_type" class="ds-callout warn">
          <i class="fa-solid fa-credit-card" aria-hidden="true"></i>
          <span>Tipo de pago: <strong>{{ linkToken.payment_type === 'credito' ? 'Crédito' : 'Débito' }}</strong></span>
        </p>
        <div class="ds-field">
          <label class="ds-label" for="tp-provider">Proveedor<span class="ds-req">*</span></label>
          <select id="tp-provider" v-model="linkForm.cat_provider" class="ds-input" required>
            <option :value="null">Seleccionar proveedor…</option>
            <option v-for="p in providerCatalog" :key="p.id" :value="p.id">{{ p.description }}</option>
          </select>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="tp-url">URL de pago<span class="ds-req">*</span></label>
          <input id="tp-url" v-model="linkForm.payment_url" class="ds-input" placeholder="https://…" required />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="tp-notes">Notas</label>
          <textarea id="tp-notes" v-model="linkForm.notes" class="ds-input" rows="2"></textarea>
        </div>
      </div>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="showLinkModal = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="!linkForm.payment_url || !linkForm.cat_provider" @click="submitLink">Guardar</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import TokenFilterModal from './TokenFilterModal.vue'
import BaseModal from '@/components/BaseModal.vue'
import { useColumnFilterToggles } from '@/composables/useColumnFilterToggles.js'
import { inDateRange } from '@/utils/dateRange'
import { confirmAction } from '@/composables/useConfirm'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import { ServiceKeys } from '@/services'
import { leadRouteForUser } from '@/utils/leadRouteForUser.js'

const toast = useToast()
const router = useRouter()
const catalog = inject('catalog')
const authService = inject(ServiceKeys.Auth)

const currentUser = (() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
})()
const currentUserRoles = currentUser.roles || []
const currentUserId    = currentUser.user_id || currentUser.id || null

const LINK_ROLES    = ['ADMIN', 'FICO', 'LIDER_FICO', 'LIDER_COMERCIAL']
const CONFIRM_ROLES = ['ADMIN', 'FICO', 'LIDER_FICO']
const canAddLink           = LINK_ROLES.some(r => currentUserRoles.includes(r))
const canConfirmEnrollment = CONFIRM_ROLES.some(r => currentUserRoles.includes(r))

function goToEnrollment (enrollmentId) {
  router.push({ name: 'enrollmentDetail', params: { id: enrollmentId } })
}

// Respaldo si el catalogo llega sin el grupo (pasa con el cache local). Ids =
// tabla catalog (we_token_provider); antes eran 3247-3249, que no existen, y
// al editar un link el proveedor salia vacio.
const providerCatalog = (() => {
  const items = catalog.options('we_token_provider')
  if (items.length > 0) return items
  return [
    { id: 4311, description: 'Qulqi' },
    { id: 4312, description: 'MercadoPago' },
    { id: 4313, description: 'PayPal' }
  ]
})()

// tone = clase de .ds-pill. Confirmado es el estado final (inscrito): neutro.
const statusConfig = {
  pending: { label: 'Pendiente', tone: 'warn' },
  link_sent: { label: 'Link enviado', tone: 'info' },
  paid: { label: 'Pagado', tone: 'ok' },
  confirmed: { label: 'Confirmado', tone: '' }
}

// Columnas de la tabla; las de filter: true abren su filtro con un clic.
const COLUMNS = [
  { key: 'creado', label: 'Creado', width: '96px', filter: true },
  { key: 'alumno', label: 'Alumno / contacto', filter: true },
  { key: 'programa', label: 'Programa / edición', filter: true },
  { key: 'tipo', label: 'Tipo', width: '90px', filter: true },
  { key: 'proveedor', label: 'Proveedor', width: '110px', filter: true },
  { key: 'montoMin', label: 'Monto', width: '110px', filter: true, cls: 'num' },
  { key: 'estado', label: 'Estado', width: '110px', filter: true },
  { key: 'link', label: 'Link', width: '170px' },
  { key: 'asesor', label: 'Asesor', width: '110px', filter: true },
  { key: 'fechaPago', label: 'F. pago', width: '96px', filter: true },
  { key: 'acciones', label: 'Acciones', width: '170px', cls: 'tc' }
]

const statusTabs = [
  { label: 'Todos',        value: '',          icon: 'fa-inbox' },
  { label: 'Pendiente',    value: 'pending',   icon: 'fa-hourglass-half' },
  { label: 'Link Enviado', value: 'link_sent', icon: 'fa-paper-plane' },
  { label: 'Confirmado',   value: 'confirmed', icon: 'fa-circle-check' }
]

const tokens = ref([])
const isLoading = ref(false)
const confirmingTokens = ref(new Set())
const filterStatus = ref('')
const searchQuery = ref('')
const pagination = ref({ page: 1, size: 25, total: 0 })

const emptyColFilters = () => ({
  creado: '',
  alumno: '',
  programa: '',
  tipo: [],
  proveedor: [],
  montoMin: '',
  estado: [],
  asesor: [],
  fechaPago: ''
})

// reactive (no ref): useColumnFilterToggles lee las claves del objeto, y limpiar
// con Object.assign mantiene la misma referencia.
const colFilters = reactive(emptyColFilters())
const colToggles = useColumnFilterToggles(colFilters)

function clearColFilters () {
  Object.assign(colFilters, emptyColFilters())
  colToggles.closeAll()
}

// === Filtros avanzados (modal) ===
// Estos viajan al backend en cada fetchTokens. Los col-filters de arriba siguen
// siendo client-side sobre la pagina cargada — son complementarios.
const filters = reactive({
  q: '',
  status_in: [],
  payment_type_in: [],
  providers_in: [],
  requested_by_in: [],
  installment_only: '',
  currency: '',
  date_from: null,
  date_to: null,
  created_range_string: null
})
const showFilterModal = ref(false)
const activeFilterChips = ref([])
const filtroOwners = ref([])

const filtroStatus = [
  { id: 'pending',   description: 'Pendiente' },
  { id: 'link_sent', description: 'Link Enviado' },
  { id: 'paid',      description: 'Pagado' },
  { id: 'confirmed', description: 'Confirmado' }
]
const filtroPaymentType = [
  { id: 'credito', description: 'Credito' },
  { id: 'debito',  description: 'Debito' }
]

async function loadOwners () {
  if (!authService) return
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => {
      const f = (u.first_name || '').trim()
      const l = (u.last_name || '').trim()
      let n = f; if (l) n += ` ${l.charAt(0)}.`
      return { id: u.user_id, description: n.trim() || `Usuario ${u.user_id}` }
    })
  } catch (e) { console.error('[TokenPage] loadOwners:', e) }
}

function rebuildChips () {
  const chips = []
  const labelById = (items, id) => {
    const m = items.find(x => String(x.id) === String(id?.id ?? id))
    return m?.description || (id?.description || String(id?.id ?? id))
  }
  const mc = (key, lbl, items, source) => {
    if (!items?.length) return
    const ls = items.map(i => source ? labelById(source, i) : (i.description || i.label || String(i)))
    chips.push({
      key,
      label: ls.length === 1 ? `${lbl}: ${ls[0]}` : `${lbl}: ${ls.length} sel.`,
      text: `${lbl}: ${ls.join(', ')}`,
      details: ls
    })
  }

  if (filters.q) chips.push({ key: 'q', label: `Busqueda: ${filters.q}`, text: `Busqueda: ${filters.q}` })
  mc('status_in', 'Estado', filters.status_in, filtroStatus)
  mc('payment_type_in', 'Tipo', filters.payment_type_in, filtroPaymentType)
  mc('providers_in', 'Proveedor', filters.providers_in, providerCatalog)
  mc('requested_by_in', 'Asesor', filters.requested_by_in, filtroOwners.value)
  if (filters.installment_only === 'true')  chips.push({ key: 'installment_only', label: 'Tipo: Cuotas',  text: 'Solo cuotas' })
  if (filters.installment_only === 'false') chips.push({ key: 'installment_only', label: 'Tipo: Contado', text: 'Solo contado' })
  if (filters.currency) chips.push({ key: 'currency', label: `Moneda: ${filters.currency}`, text: `Moneda: ${filters.currency}` })
  if (filters.created_range_string) chips.push({ key: 'created_range', label: `Creado: ${filters.created_range_string}`, text: `Creado: ${filters.created_range_string}` })

  activeFilterChips.value = chips
}

function handleDateChange (rangeStr) {
  if (!rangeStr) { filters.date_from = null; filters.date_to = null; return }
  const p = rangeStr.split(' to ')
  filters.date_from = p[0] || null
  filters.date_to   = p[1] || p[0] || null
}

// El modal manda su borrador: recien aqui se copia a los filtros de la pagina.
function applyFilters (draft) {
  if (draft) {
    Object.assign(filters, draft)
    handleDateChange(draft.created_range_string)
  }
  // Modal y tabs comparten el concepto "estado". Si el usuario eligio estados
  // en el modal, las tabs dejan de mandar — evita doble filtro contradictorio.
  if (filters.status_in?.length) filterStatus.value = ''
  showFilterModal.value = false
  pagination.value.page = 1
  rebuildChips()
  fetchTokens()
}

function clearFilter (key) {
  if (key === 'q') filters.q = ''
  else if (key === 'created_range') {
    filters.date_from = null; filters.date_to = null; filters.created_range_string = null
  }
  else if (key === 'installment_only') filters.installment_only = ''
  else if (key === 'currency') filters.currency = ''
  else if (['status_in', 'payment_type_in', 'providers_in', 'requested_by_in'].includes(key)) {
    filters[key] = []
  }
  pagination.value.page = 1
  rebuildChips()
  fetchTokens()
}

function clearAdvancedFilters () {
  Object.assign(filters, {
    q: '', status_in: [], payment_type_in: [], providers_in: [], requested_by_in: [],
    installment_only: '', currency: '',
    date_from: null, date_to: null, created_range_string: null
  })
  showFilterModal.value = false
  pagination.value.page = 1
  rebuildChips()
  fetchTokens()
}

const filteredTokens = computed(() => {
  const cf = colFilters
  return tokens.value.filter(t => {
    if (cf.alumno) {
      const q = cf.alumno.toLowerCase()
      const blob = `${t.student_name || ''} ${t.student_phone || ''} ${t.student_email || ''}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    if (cf.programa) {
      const q = cf.programa.toLowerCase()
      const blob = `${t.program_name || ''} ${t.edition_code || ''}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    if (cf.tipo.length) {
      const tipo = t.payment_type === 'credito' ? 'Credito' : t.payment_type === 'debito' ? 'Debito' : '(Sin tipo)'
      if (!cf.tipo.includes(tipo)) return false
    }
    if (cf.proveedor.length) {
      const prov = t.provider_name || '(Sin proveedor)'
      if (!cf.proveedor.includes(prov)) return false
    }
    if (cf.asesor.length) {
      const ases = t.requested_by_name || t.created_by_name || '(Sin asesor)'
      if (!cf.asesor.includes(ases)) return false
    }
    if (cf.estado.length) {
      const estado = statusConfig[t.status]?.label || t.status
      if (!cf.estado.includes(estado)) return false
    }
    if (cf.creado.trim() && !inDateRange(t.created_at, cf.creado)) return false
    // La fecha de pago es la ultima actualizacion, y solo cuenta como tal
    // cuando el token ya se pago o se confirmo (igual que en la celda).
    if (cf.fechaPago.trim()) {
      const pagado = t.status === 'paid' || t.status === 'confirmed'
      if (!pagado || !inDateRange(t.updated_at, cf.fechaPago)) return false
    }
    if (cf.montoMin !== '' && Number(t.amount || 0) < Number(cf.montoMin)) return false
    return true
  })
})

function onOpenFilters () {
  showFilterModal.value = true
}

const selectionMode    = ref(false)
const selectedTokenIds = ref(new Set())
const ctxMenu = ref({ show: false, x: 0, y: 0, token: null })

function openCtxMenu (event, token) {
  event.preventDefault()
  ctxMenu.value = { show: true, x: event.clientX, y: event.clientY, token }
}

function closeCtxMenu () {
  if (ctxMenu.value.show) ctxMenu.value = { show: false, x: 0, y: 0, token: null }
}

function startGrouping (t) {
  selectionMode.value = true
  toggleTokenSelection(t)
  closeCtxMenu()
}

function cancelGrouping () {
  selectionMode.value = false
  selectedTokenIds.value = new Set()
  closeCtxMenu()
}

function ungroupFromCtx () {
  const gid = ctxMenu.value.token?.group_id
  closeCtxMenu()
  if (gid) ungroupTokens(gid)
}

const hasCtxActions = computed(() => {
  const t = ctxMenu.value.token
  if (!t) return false
  if (selectionMode.value) return true
  if (isSelectable(t)) return true
  if (t.group_id && Number(t.requested_by) === Number(currentUserId)) return true
  return false
})

function isSelectable (t) {
  return t?.status === 'pending'
    && !t?.payment_url
    && !t?.group_id
    && Number(t?.requested_by) === Number(currentUserId)
}

// Espejo de las constantes de token.entity.js en el backend. La validacion real
// vive alla; aca solo evitamos que el asesor arme una seleccion que el servidor
// va a rechazar despues.
const MAX_GROUP_AMOUNT = 3000
const MAX_TOKENS_PER_GROUP = 10

function toggleTokenSelection (t) {
  if (!isSelectable(t)) return
  const s = new Set(selectedTokenIds.value)
  if (s.has(t.token_id)) {
    s.delete(t.token_id)
  } else {
    if (s.size >= MAX_TOKENS_PER_GROUP) {
      toast.error(`El limite de agrupacion es de ${MAX_TOKENS_PER_GROUP} tokens por grupo`)
      return
    }
    s.add(t.token_id)
  }
  selectedTokenIds.value = s
}

const selectionSummary = computed(() => {
  const items = tokens.value.filter(t => selectedTokenIds.value.has(t.token_id))
  const total = items.reduce((s, t) => s + Number(t.amount || 0), 0)
  const overLimit = total > MAX_GROUP_AMOUNT
  const overCount = items.length > MAX_TOKENS_PER_GROUP
  return { items, count: items.length, currency: items[0]?.currency || '', total, overLimit, overCount }
})

const isEditingLink = computed(() => !!linkToken.value?.payment_url)

function canEditInscription (t) {
  return Number(t?.requested_by) === Number(currentUserId)
    && t?.status !== 'confirmed'
    && t?.status !== 'paid'
}

function openEditInscription (t) {
  if (!t.lead_id) {
    toast.error('No se encontro el lead asociado al token')
    return
  }
  // Al formulario del area de quien pidio el token: B2B y Fundacion no pueden
  // abrir la ruta de Comercial y el guard los sacaba sin editar nada.
  router.push({
    name:   leadRouteForUser(currentUser),
    params: { id: t.lead_id },
    query:  { editToken: t.token_id }
  })
}

const groupIndex = computed(() => {
  const map = new Map()
  for (const t of tokens.value) {
    if (!t.group_id) continue
    const g = map.get(t.group_id) || { count: 0, total: 0, currency: t.currency, ownedByMe: false, hasLink: false }
    g.count += 1
    g.total += Number(t.amount || 0)
    if (Number(t.requested_by) === Number(currentUserId)) g.ownedByMe = true
    if (t.payment_url) g.hasLink = true
    map.set(t.group_id, g)
  }
  for (const [gid, g] of map) g.shortId = gid.slice(0, 4).toUpperCase()
  return map
})

function getGroup (t) {
  return t?.group_id ? groupIndex.value.get(t.group_id) : null
}

const stats = reactive({
  pending: 0,
  awaitingConfirmation: 0,
  confirmedToday: 0,
  amountPen: 0,
  amountUsd: 0,
  loading: false,
  loadedAt: null
})

const kpiCards = computed(() => [
  {
    key: 'pending',
    label: 'Pendientes totales',
    icon: 'fa-hourglass-half',
    tone: 'warn',
    formatted: stats.pending.toLocaleString('es-PE'),
    description: 'Esperan link de FICO'
  },
  {
    key: 'awaitingConfirmation',
    label: 'Por confirmar',
    icon: 'fa-paper-plane',
    tone: '',
    formatted: stats.awaitingConfirmation.toLocaleString('es-PE'),
    description: 'Link enviado, esperan inscribir'
  },
  {
    key: 'confirmedToday',
    label: 'Confirmados hoy',
    icon: 'fa-circle-check',
    tone: 'ok',
    formatted: stats.confirmedToday.toLocaleString('es-PE'),
    description: 'Cerrados en el dia de hoy'
  },
  {
    key: 'amount',
    label: 'Monto en espera',
    icon: 'fa-coins',
    tone: '',
    formatted: 'S/ ' + formatMoneyInt(stats.amountPen),
    description: stats.amountUsd > 0 ? 'USD pendiente:' : 'En tokens activos',
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
  // Las tabs son "single-select". Si habia un multi-status del modal, limpiarlo
  // para que ambos no se contradigan.
  if (filters.status_in.length) {
    filters.status_in = []
    rebuildChips()
  }
  pagination.value.page = 1
  fetchTokens()
}

function buildListParams () {
  const ids = arr => arr.map(i => i?.id ?? i).filter(v => v !== null && v !== undefined && v !== '')
  return {
    status:           filterStatus.value || undefined,
    status_in:        ids(filters.status_in),
    payment_type_in:  ids(filters.payment_type_in),
    providers_in:     ids(filters.providers_in),
    requested_by_in:  ids(filters.requested_by_in),
    installment_only: filters.installment_only || undefined,
    currency:         filters.currency || undefined,
    date_from:        filters.date_from || undefined,
    date_to:          filters.date_to   || undefined,
    q:                filters.q || undefined,
    page:             pagination.value.page,
    size:             pagination.value.size
  }
}

async function fetchTokens () {
  isLoading.value = true
  try {
    const res = (await api.get('/token/list', { params: buildListParams() })).data
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
    stats.awaitingConfirmation = d.awaitingConfirmation || 0
    stats.confirmedToday = d.confirmedToday || 0
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
const linkModalBody = ref(null)
const linkFieldsFilled = useRequiredFieldsGuard(linkModalBody)

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
  const studentName = t.student_name || '---'
  const stored     = (t.notes || '').trim()
  const looksAuto  = !stored || /^Link para[\s\-_]*$/i.test(stored)
  const notes      = looksAuto ? `Link para ${studentName}` : stored
  linkForm.value = {
    payment_url:  t.payment_url  || '',
    cat_provider: t.cat_provider || null,
    notes
  }
  showLinkModal.value = true
}

async function submitLink () {
  if (!linkFieldsFilled()) return
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
  // Guard contra doble click. La operacion es idempotente en backend (verifica si
  // existe enrollment para el lead), pero deshabilitar el boton evita reintentos
  // visuales y race conditions cuando la red esta lenta.
  if (confirmingTokens.value.has(t.token_id)) return
  confirmingTokens.value.add(t.token_id)
  confirmingTokens.value = new Set(confirmingTokens.value)
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
  } finally {
    confirmingTokens.value.delete(t.token_id)
    confirmingTokens.value = new Set(confirmingTokens.value)
  }
}

async function deleteToken (t) {
  const ok = await confirmAction({
    title:       'Eliminar token?',
    text:        `Se eliminara permanentemente el token de ${t.student_name || '---'}.`,
    confirmText: 'Si, eliminar',
    icon:        'warning',
    danger:      true
  })
  if (!ok) return
  try {
    await api.delete(`/token/delete/${t.token_id}`)
    toast.success('Token eliminado')
    await Promise.all([fetchTokens(), fetchStats()])
  } catch {
    toast.error('Error al eliminar token')
  }
}

async function submitGroup () {
  const s = selectionSummary.value
  if (s.count < 2) return
  if (s.overCount) {
    toast.error(`El limite de agrupacion es de ${MAX_TOKENS_PER_GROUP} tokens por grupo (seleccionaste ${s.count})`)
    return
  }
  try {
    await api.post('/token/group', { token_ids: Array.from(selectedTokenIds.value) })
    toast.success(`${s.count} tokens agrupados en un solo link`)
    selectedTokenIds.value = new Set()
    selectionMode.value = false
    await fetchTokens()
  } catch (err) {
    toast.error(err?.response?.data?.error || 'No se pudo agrupar')
  }
}

async function ungroupTokens (groupId) {
  const group = groupIndex.value.get(groupId)
  const count = group?.count || 0
  const ok = await confirmAction({
    title:       'Desagrupar tokens?',
    text:        count
      ? `Se borrara el link compartido y los ${count} tokens volveran a estado pendiente, listos para pedir un link nuevo cada uno.`
      : 'Se borrara el link compartido y los tokens volveran a pendiente.',
    confirmText: 'Si, desagrupar',
    icon:        'warning',
    danger:      true
  })
  if (!ok) return
  try {
    await api.post('/token/ungroup', { group_id: groupId })
    toast.success('Grupo desagrupado y tokens reiniciados a pendiente')
    await fetchTokens()
  } catch (err) {
    toast.error(err?.response?.data?.error || 'No se pudo desagrupar')
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
  // Formateo por componentes de la cadena calendario YYYY-MM-DD para evitar
  // TZ shift cuando el server Node corre en UTC.
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${m[3]} ${meses[+m[2] - 1]} ${m[1]}`
  }
  const dt = new Date(d)
  return isNaN(dt) ? '--' : dt.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Etiqueta corta DD/MM para el chip de edicion. Misma logica TZ-safe.
function formatEditionShortDate (d) {
  if (!d) return ''
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `(${m[3]}/${m[2]})`
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

function onGlobalClick () {
  closeCtxMenu()
}
function onGlobalKeyDown (e) {
  if (e.key === 'Escape') {
    if (ctxMenu.value.show) closeCtxMenu()
    else if (selectionMode.value) cancelGrouping()
  }
}

onMounted(() => {
  loadOwners()
  fetchTokens()
  fetchStats()
  window.addEventListener('click', onGlobalClick)
  window.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('click', onGlobalClick)
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<style scoped>
/* Todo con tokens ds-*: sin bloque dark. El menu contextual y la barra de
   seleccion van teletransportados al body, pero el scope de Vue los alcanza. */
.tc { text-align: center; }
.num { text-align: right; }
.mono { font-variant-numeric: tabular-nums; }

.tp-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 12px; padding: 12px 18px; }
.tp-chips { display: flex; align-items: center; gap: 8px; padding: 0 18px 12px; }
.tp-selhint {
  display: inline-flex; align-items: center; gap: 8px; padding: 4px 6px 4px 12px;
  border-radius: var(--ds-radius-sm); background: var(--ds-soft-violet); color: var(--ds-violet-ink);
  font-size: 12.5px; font-weight: 600;
}

.tp-table td { vertical-align: middle; }
.tp-filters th { padding-top: 4px; padding-bottom: 8px; vertical-align: top; font-weight: 400; text-transform: none; }
.tp-filters .ds-input { height: 30px; padding: 4px 8px; font-size: 12px; }
.tp-num { text-align: right; }
.tp-main { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: var(--ds-ink); }
.tp-sub { font-size: 11.5px; color: var(--ds-muted); }
.tp-ml { margin-left: 4px; }
.tp-group { margin-top: 4px; }
.tp-amount { font-weight: 700; color: var(--ds-heading); white-space: nowrap; }
.tp-empty { text-align: center; color: var(--ds-muted); }

.tp-link { display: flex; align-items: center; gap: 4px; }
.tp-link-text {
  max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  padding: 0; border: 0; background: none; cursor: copy;
  font-family: inherit; font-size: 12px; color: var(--ds-accent);
}
.tp-link-text:hover, .tp-link-text:focus-visible { text-decoration: underline; }
.tp-actions { display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.tp-danger:hover { background: var(--ds-soft-bad); color: var(--ds-bad-ink); }
.tp-done { font-size: 16px; color: var(--ds-ok); }

/* Estados de fila: agrupado (borde violeta), elegido y no seleccionable */
.tp-table tr.is-grouped td:first-child { box-shadow: inset 3px 0 0 var(--ds-violet-ink); }
.tp-table tr.is-selected td { background: var(--ds-soft-info); }
.tp-table tr.is-disabled td { opacity: 0.5; }
.tp-chk { width: 16px; height: 16px; cursor: pointer; accent-color: var(--ds-accent); }
.tp-chk:disabled { cursor: not-allowed; opacity: 0.35; }

/* Menu contextual (clic derecho) */
.tp-ctx-menu {
  position: fixed; z-index: 950; min-width: 200px; padding: 4px; user-select: none;
  border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
}
.tp-ctx-item {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 12px; cursor: pointer;
  border: 0; border-radius: var(--ds-radius-control); background: transparent; text-align: left;
  font-family: inherit; font-size: 13px; color: var(--ds-ink);
}
.tp-ctx-item:hover, .tp-ctx-item:focus-visible { background: var(--ds-soft-info); color: var(--ds-info-ink); }
.tp-ctx-item i { width: 16px; color: var(--ds-accent); }
.tp-ctx-empty { padding: 8px 12px; font-size: 12px; font-style: italic; color: var(--ds-muted); }

/* Barra flotante de seleccion para agrupar */
.tp-selbar {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 900;
  display: flex; align-items: center; gap: 20px; padding: 12px 20px;
  border-radius: var(--ds-radius); background: var(--ds-brand); color: var(--ds-on-brand);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
.tp-selbar.is-over-limit { background: var(--ds-bad); }
.tp-selbar-info { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.tp-selbar-info strong { font-size: 14px; }
.tp-selbar-warn { font-weight: 700; }

/* Modal de link */
.tp-link-form { display: flex; flex-direction: column; gap: 12px; }
.tp-group-box { padding: 12px 14px; border-radius: var(--ds-radius-sm); background: var(--ds-soft-violet); color: var(--ds-violet-ink); }
.tp-group-title { display: flex; align-items: flex-start; gap: 8px; margin: 0 0 8px; font-size: 12.5px; line-height: 1.5; }
.tp-group-list { margin: 0; padding: 0; list-style: none; font-size: 12px; }
.tp-group-list li { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-top: 1px solid var(--ds-border); color: var(--ds-ink); }
.tp-group-total { display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--ds-border); font-size: 12.5px; font-weight: 700; }

@media (max-width: 900px) {
  .tp-selbar { left: 16px; right: 16px; transform: none; flex-direction: column; align-items: stretch; }
}
</style>
