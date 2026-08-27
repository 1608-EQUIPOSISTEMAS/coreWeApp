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
      <div class="ep-kpis">
        <article v-for="k in kpiCards" :key="k.key" class="ep-kpi" :class="`ep-kpi-${k.color}`">
          <div class="ep-kpi-head">
            <span class="ep-kpi-label">{{ k.label }}</span>
            <i class="fa-solid ep-kpi-icon" :class="k.icon"></i>
          </div>
          <div class="ep-kpi-main">
            <span v-if="isLoading" class="skel-kpi"></span>
            <span v-else class="ep-kpi-value">{{ k.formatted }}</span>
          </div>
          <span class="ep-kpi-foot">
            {{ k.description }}
            <strong v-if="k.secondary">{{ k.secondary }}</strong>
          </span>
        </article>
      </div>
    </section>

    <section class="ep-section ep-filter-bar" :class="{ 'is-filtered': activeFilterChips.length > 0 }">
      <div class="ep-filter-bar-main">
        <nav class="ep-tabs" aria-label="Estados de tokens">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            :class="['ep-tab', { 'is-active': filterStatus === tab.value && !filters.status_in.length }]"
            @click="setStatusFilter(tab.value)"
          >
            <i class="fa-solid" :class="tab.icon"></i> {{ tab.label }}
          </button>
        </nav>

        <div class="ep-toolbar">
          <span v-if="selectionMode" class="tp-selhint">
            <i class="fa-solid fa-object-group"></i>
            Modo seleccion — elige tus tokens compatibles
            <button class="tp-selhint-cancel" @click="cancelGrouping" title="Salir (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </span>
          <BasePagination
            v-model="pagination"
            @change="fetchTokens"
            @open-filters="onOpenFilters"
          />
        </div>
      </div>

      <div v-if="activeFilterChips.length > 0" class="ep-filter-strip">
        <span class="ep-filter-strip-badge">
          <i class="fa-solid fa-circle-half-stroke"></i>
          Filtros activos
          <span class="ep-filter-strip-count">{{ activeFilterChips.length }}</span>
        </span>
        <BaseFilterChips :items="activeFilterChips" @remove="clearFilter" @clear-all="clearAdvancedFilters" />
      </div>
    </section>

    <TokenFilterModal
      :visible="showFilterModal"
      @update:visible="v => showFilterModal = v"
      :filters="filters"
      :filtro-status="filtroStatus"
      :filtro-owners="filtroOwners"
      :filtro-provider="providerCatalog"
      :filtro-payment-type="filtroPaymentType"
      @apply="applyFilters"
      @clear="clearAdvancedFilters"
      @date-change="handleDateChange"
    />

    <div class="ect-wrap">
      <table class="ect">
        <thead>
          <tr class="ect-head">
            <th v-if="selectionMode" class="tc" style="width:36px"></th>
            <th style="width:90px">Creado</th>
            <th>Alumno / Contacto</th>
            <th>Programa / Edicion</th>
            <th class="tc" style="width:100px">Tipo</th>
            <th class="tc" style="width:120px">Proveedor</th>
            <th class="tr" style="width:100px">Monto</th>
            <th class="tc" style="width:110px">Estado</th>
            <th style="width:170px">Link</th>
            <th style="width:130px">Asesor</th>
            <th style="width:90px">Fecha pago</th>
            <th class="tc" style="width:170px">Acciones</th>
          </tr>
          <!-- Toda columna filtra desde esta fila: ningun control vive en el
               encabezado. Texto -> caja de escribir, categoria -> desplegable,
               fecha -> calendario de rango, dinero -> piso (>=). -->
          <tr class="ect-filters">
            <td v-if="selectionMode"></td>
            <td>
              <BaseDatePicker
                v-model="colFilters.creado"
                :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                placeholder="Creado..."
              />
            </td>
            <td>
              <input v-model="colFilters.alumno" class="filter-input" placeholder="Buscar..." />
            </td>
            <td>
              <input v-model="colFilters.programa" class="filter-input" placeholder="Buscar..." />
            </td>
            <td class="tc">
              <ColumnFilterDropdown
                column-label="Tipo"
                :all-items="tokens"
                :value-extractor="t => t.payment_type === 'credito' ? 'Credito' : t.payment_type === 'debito' ? 'Debito' : '(Sin tipo)'"
                v-model="colFilters.tipo"
              />
            </td>
            <td class="tc">
              <ColumnFilterDropdown
                column-label="Proveedor"
                :all-items="tokens"
                :value-extractor="t => t.provider_name || '(Sin proveedor)'"
                v-model="colFilters.proveedor"
              />
            </td>
            <td>
              <input v-model="colFilters.montoMin" type="number" min="0" class="filter-input tr" placeholder="&ge; 0" />
            </td>
            <td class="tc">
              <ColumnFilterDropdown
                column-label="Estado"
                :all-items="tokens"
                :value-extractor="t => statusConfig[t.status]?.label || t.status"
                v-model="colFilters.estado"
              />
            </td>
            <td></td>
            <td class="tc">
              <ColumnFilterDropdown
                column-label="Asesor"
                :all-items="tokens"
                :value-extractor="t => t.requested_by_name || t.created_by_name || '(Sin asesor)'"
                v-model="colFilters.asesor"
              />
            </td>
            <td>
              <BaseDatePicker
                v-model="colFilters.fechaPago"
                :config="{ mode: 'range', dateFormat: 'Y-m-d' }"
                placeholder="F. Pago..."
              />
            </td>
            <td class="tc">
              <button class="filter-clear" title="Limpiar filtros columna" @click="clearColFilters">
                <i class="fa-solid fa-eraser"></i>
              </button>
            </td>
          </tr>
        </thead>
        <tbody>
          <template v-if="isLoading">
            <tr v-for="n in 10" :key="'sk-' + n" class="skeleton-row">
              <td><div class="sk-cell" style="width:70px"></div></td>
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
              <td><div class="sk-cell" style="width:150px"></div></td>
              <td><div class="sk-cell" style="width:90px"></div></td>
              <td><div class="sk-cell" style="width:70px"></div></td>
              <td class="tc"><div class="sk-cell" style="width:120px;margin:0 auto"></div></td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="t in filteredTokens"
              :key="t.token_id"
              class="ect-row"
              :class="{
                'tp-row-grouped': !!t.group_id,
                'tp-row-selected': selectedTokenIds.has(t.token_id),
                'tp-row-disabled': selectionMode && !isSelectable(t) && !selectedTokenIds.has(t.token_id)
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
                  :title="isSelectable(t) ? 'Seleccionar' : 'No seleccionable (no es tuyo, ya tiene link o esta en otro grupo)'"
                  @click.stop="toggleTokenSelection(t)"
                />
              </td>
              <td class="cell-date">{{ formatDate(t.created_at) }}</td>
              <td>
                <div class="cell-main cell-clip">{{ t.student_name }}</div>
                <div class="cell-sub">{{ t.student_phone || '---' }}{{ t.student_email ? ' · ' + t.student_email : '' }}</div>
                <span v-if="getGroup(t)" class="tp-group-chip" :title="`Grupo ${getGroup(t).shortId} · ${getGroup(t).count} tokens · Total ${getGroup(t).currency} ${formatMoney(getGroup(t).total)}`">
                  <i class="fa-solid fa-object-group"></i>
                  GRUPO {{ getGroup(t).shortId }} · {{ getGroup(t).count }} tokens · Total {{ getGroup(t).currency }} {{ formatMoney(getGroup(t).total) }}
                </span>
              </td>
              <td>
                <div class="cell-main cell-clip">{{ t.program_name }}</div>
                <span class="pill pill-sm pill-slate">{{ t.edition_code }} {{ formatEditionShortDate(t.edition_start_date) }}</span>
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
                  <button class="tp-link-text" :title="`${t.payment_url}\n(Click para copiar)`" @click="copyLink(t.payment_url)">
                    {{ truncateUrl(t.payment_url) }}
                  </button>
                  <button
                    v-if="canAddLink && t.status !== 'confirmed'"
                    class="act-btn act-teal"
                    title="Editar link"
                    @click="openAddLink(t)"
                  >
                    <i class="fa-solid fa-pen"></i>
                  </button>
                </div>
                <span v-else class="cell-sub">--</span>
              </td>
              <td class="cell-advisor">{{ t.requested_by_name || t.created_by_name || '---' }}</td>
              <td class="cell-date">
                <template v-if="t.status === 'paid' || t.status === 'confirmed'">{{ formatDate(t.updated_at) }}</template>
                <span v-else class="cell-sub">—</span>
              </td>
              <td class="tc">
                <div class="tp-actions">
                  <template v-if="t.status === 'pending'">
                    <template v-if="canAddLink">
                      <button class="act-btn act-teal" title="Agregar Link" @click="openAddLink(t)">
                        <i class="fa-solid fa-link"></i>
                      </button>
                      <button class="act-btn act-red" title="Eliminar" @click="deleteToken(t)">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </template>
                    <button
                      v-if="canEditInscription(t)"
                      class="act-btn act-indigo"
                      title="Editar inscripcion"
                      @click="openEditInscription(t)"
                    >
                      <i class="fa-solid fa-user-pen"></i>
                    </button>
                    <button
                      v-if="t.group_id && !t.payment_url && Number(t.requested_by) === Number(currentUserId)"
                      class="act-btn act-slate"
                      title="Desagrupar este grupo"
                      @click="ungroupTokens(t.group_id)"
                    >
                      <i class="fa-solid fa-object-ungroup"></i>
                    </button>
                    <span v-if="!canAddLink && !canEditInscription(t) && !t.group_id" class="cell-sub">En espera</span>
                  </template>
                  <template v-else-if="t.status === 'link_sent' || t.status === 'paid'">
                    <template v-if="t.enrollment_id">
                      <button class="tp-btn-confirm" title="Ver inscripcion" @click="goToEnrollment(t.enrollment_id)">
                        <i class="fa-solid fa-eye"></i> Ver
                      </button>
                    </template>
                    <template v-else-if="canConfirmEnrollment">
                      <button
                        class="tp-btn-confirm"
                        :title="confirmingTokens.has(t.token_id) ? 'Inscribiendo...' : 'Crear inscripcion'"
                        :disabled="confirmingTokens.has(t.token_id)"
                        @click="confirmToken(t)"
                      >
                        <template v-if="confirmingTokens.has(t.token_id)">
                          <i class="fa-solid fa-spinner fa-spin"></i> Inscribiendo...
                        </template>
                        <template v-else>
                          <i class="fa-solid fa-graduation-cap"></i> Inscribir
                        </template>
                      </button>
                    </template>
                    <button
                      v-if="canEditInscription(t)"
                      class="act-btn act-indigo"
                      title="Editar inscripcion"
                      @click="openEditInscription(t)"
                    >
                      <i class="fa-solid fa-user-pen"></i>
                    </button>
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
              <td :colspan="selectionMode ? 12 : 11" class="empty-row">Sin resultados</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div
        v-if="ctxMenu.show"
        class="tp-ctx-menu"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @click.stop
      >
        <button
          v-if="!selectionMode && isSelectable(ctxMenu.token)"
          class="tp-ctx-item"
          @click="startGrouping(ctxMenu.token)"
        >
          <i class="fa-solid fa-object-group"></i> Agrupar tokens
        </button>
        <button
          v-if="selectionMode"
          class="tp-ctx-item"
          @click="cancelGrouping"
        >
          <i class="fa-solid fa-xmark"></i> Cancelar seleccion
        </button>
        <button
          v-if="ctxMenu.token?.group_id && Number(ctxMenu.token?.requested_by) === Number(currentUserId)"
          class="tp-ctx-item"
          @click="ungroupFromCtx"
        >
          <i class="fa-solid fa-object-ungroup"></i> Desagrupar grupo
        </button>
        <div v-if="!hasCtxActions" class="tp-ctx-empty">
          Sin acciones disponibles
        </div>
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
              · El limite de agrupacion es de {{ MAX_TOKENS_PER_GROUP }} tokens por grupo
            </span>
            <span v-if="selectionSummary.overLimit" class="tp-selbar-warn">
              · Supera el limite de {{ selectionSummary.currency }} {{ MAX_GROUP_AMOUNT }}
            </span>
          </span>
        </div>
        <button
          class="ep-btn-new"
          :disabled="selectionSummary.overLimit || selectionSummary.overCount"
          @click="submitGroup"
        >
          <i class="fa-solid fa-object-group"></i> Agrupar en un solo link
        </button>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showLinkModal" class="tp-overlay" @click.self="showLinkModal = false">
        <div class="tp-modal tp-modal-sm">
          <div class="tp-modal-head">
            <h2 class="tp-modal-title">
              {{ isEditingLink ? 'Editar' : 'Agregar' }} Link de Pago
              <span v-if="getGroup(linkToken)" class="tp-modal-badge">
                <i class="fa-solid fa-object-group"></i> Grupo {{ getGroup(linkToken).shortId }}
              </span>
            </h2>
            <button class="tp-modal-close" @click="showLinkModal = false">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="tp-modal-body">
            <div v-if="getGroup(linkToken)" class="tp-group-banner">
              <div class="tp-group-banner-title">
                <i class="fa-solid fa-layer-group"></i>
                Este link {{ isEditingLink ? 'cubre' : 'cubrira' }} <strong>{{ getGroup(linkToken).count }} tokens</strong> del mismo pago — los cambios se aplican a todos
              </div>
              <ul class="tp-group-list">
                <li v-for="gt in tokens.filter(x => x.group_id === linkToken?.group_id)" :key="gt.token_id">
                  <span>{{ gt.student_name || '---' }} · {{ gt.program_name || '---' }}</span>
                  <strong class="mono">{{ gt.currency }} {{ formatMoney(gt.amount) }}</strong>
                </li>
              </ul>
              <div class="tp-group-banner-total">
                <span>TOTAL</span>
                <strong class="mono">{{ getGroup(linkToken).currency }} {{ formatMoney(getGroup(linkToken).total) }}</strong>
              </div>
            </div>
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
import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import TokenFilterModal from './TokenFilterModal.vue'
import { inDateRange } from '@/utils/dateRange'
import { confirmAction } from '@/composables/useConfirm'
import { ServiceKeys } from '@/services'

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

const colFilters = ref(emptyColFilters())

function clearColFilters () {
  colFilters.value = emptyColFilters()
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

function applyFilters () {
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
  const cf = colFilters.value
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
  router.push({
    name:   'ComercialLeadDetalle',
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
    color: 'amber',
    formatted: stats.pending.toLocaleString('es-PE'),
    description: 'Esperan link de FICO'
  },
  {
    key: 'awaitingConfirmation',
    label: 'Por confirmar',
    icon: 'fa-paper-plane',
    color: 'indigo',
    formatted: stats.awaitingConfirmation.toLocaleString('es-PE'),
    description: 'Link enviado, esperan inscribir'
  },
  {
    key: 'confirmedToday',
    label: 'Confirmados hoy',
    icon: 'fa-circle-check',
    color: 'teal',
    formatted: stats.confirmedToday.toLocaleString('es-PE'),
    description: 'Cerrados en el dia de hoy'
  },
  {
    key: 'amount',
    label: 'Monto en espera',
    icon: 'fa-coins',
    color: 'green',
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
.token-page {
  --e-bg: #FFFFFF;
  --e-bg-subtle: #FAFAF8;
  --e-border: #E8E8E3;
  --e-border-strong: #D4D4CC;
  --e-text: #14140F;
  --e-text-secondary: #6F6F66;
  --e-text-muted: #A0A099;
  --e-accent: #10B981;
  --e-accent-soft: #ECFDF4;

  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--e-text);
  max-width: 1600px;
  margin: 0 auto;
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
  font-size: 26px;
  font-weight: 600;
  color: var(--e-text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle {
  font-size: 13.5px;
  color: var(--e-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}

.ep-section {
  background: transparent;
  border: none;
  padding: 0;
  margin-bottom: 14px;
}
.ep-section.ep-filter-bar {
  background: #fff;
  border: 1px solid var(--e-border);
  border-radius: 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(16, 185, 129, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.06);
}
.ep-filter-bar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 14px;
}
.ep-section.ep-filter-bar .ep-tabs {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
  flex: 0 1 auto;
}
.ep-section.ep-filter-bar .ep-toolbar {
  flex: 1 1 auto;
  justify-content: flex-end;
  margin: 0;
}

.ep-filter-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 14px;
  border-top: 1px solid var(--e-border);
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.04), rgba(16, 185, 129, 0.015));
}
.ep-filter-strip-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: #047857;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.ep-filter-strip-badge i { font-size: 11px; }
.ep-filter-strip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px; height: 18px;
  padding: 0 5px;
  background: var(--e-accent);
  color: #fff;
  border-radius: 9px;
  font-size: 10.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ep-filter-strip :deep(.active-filters) {
  margin-bottom: 0;
  flex: 1 1 auto;
}
.ep-filter-strip :deep(.active-filters .label) {
  display: none;
}
.ep-section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
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
  font-size: 30px;
  font-weight: 600;
  color: var(--e-text);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
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
  font-size: 12px;
  color: #1A1A1A;
}
.tc { text-align: center; }
.tr { text-align: right; }

.ect-head th {
  background: #FAFAFA;
  padding: 10px 10px;
  text-align: left;
  font-weight: 500;
  color: #8C8C8C;
  border-bottom: 1px solid #F0F0F0;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.ect-row td {
  padding: 10px 10px;
  border-bottom: 1px solid #F5F5F5;
  vertical-align: middle;
  height: 48px;
  box-sizing: border-box;
  transition: background .15s ease;
}
.ect-row:hover td { background: #FAFAFA; }
.ect-row:last-child td { border-bottom: none; }

.cell-main {
  font-weight: 600;
  color: #1A1A1A;
  font-size: 12px;
  line-height: 1.3;
}
.cell-clip {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cell-sub {
  color: #A3A3A3;
  font-size: 10.5px;
  margin-top: 2px;
}
.cell-date {
  font-size: 11px;
  color: #737373;
  white-space: nowrap;
}
.cell-advisor {
  font-size: 11.5px;
  color: #4B5563;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
}
.mono {
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 11.5px;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
}
.pill-sm { padding: 2px 7px; font-size: 10px; }
.pill-slate { background: #F5F5F5; color: #737373; }
.pill-green { background: #ECFDF5; color: #065F46; }
.pill-amber { background: #FFF8EB; color: #92400E; }
.pill-blue  { background: #EFF6FF; color: #1E40AF; }
.pill-red   { background: #FEF2F2; color: #991B1B; }
.pill-teal  { background: #F0FDFA; color: #0F766E; }

.tp-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  row-gap: 4px;
}
.act-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #E8E8E8;
  background: #fff;
  border-radius: 7px;
  cursor: pointer;
  color: #A3A3A3;
  font-size: 11px;
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
  gap: 5px;
  padding: 5px 10px;
  border: none;
  border-radius: 7px;
  background: var(--we-navy, #002060);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s ease;
  white-space: nowrap;
}
.tp-btn-confirm:hover { background: var(--we-navy-dark, #001540); }

.tp-confirmed-icon { color: #059669; font-size: 16px; }

.tp-link-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tp-link-text {
  display: inline-block;
  font-size: 12px;
  color: #4338CA;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(67, 56, 202, 0.35);
  text-underline-offset: 2px;
  transition: color 0.15s ease;
}
.tp-link-text:hover {
  color: #4F46E5;
  text-decoration-color: #4F46E5;
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
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  width: 640px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.15);
}
.tp-modal-sm { width: 640px; max-width: 95vw; }
.tp-modal-head {
  flex-shrink: 0;
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
.tp-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  scrollbar-width: thin;
  scrollbar-color: #D4D4D8 transparent;
}
.tp-modal-body::-webkit-scrollbar { width: 6px; }
.tp-modal-body::-webkit-scrollbar-track { background: transparent; }
.tp-modal-body::-webkit-scrollbar-thumb { background: #D4D4D8; border-radius: 3px; }
.tp-modal-body::-webkit-scrollbar-thumb:hover { background: #A1A1AA; }
.tp-obs-ref {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 8px;
  padding: 10px 14px;
  overflow: hidden;
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
.tp-obs-ref-text {
  font-size: 13px;
  color: #1A1A1A;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.tp-modal-foot {
  flex-shrink: 0;
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
  background: var(--we-navy, #002060);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .2s ease;
  font-family: inherit;
}
.ep-btn-new:hover { background: var(--we-navy-dark, #001540); }
.ep-btn-new:disabled { opacity: .4; cursor: not-allowed; }

@media (max-width: 1280px) {
  .ep-kpis { grid-template-columns: repeat(2, 1fr); }
}
.tp-selhint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 14px;
  background: #EEF2FF;
  color: #4338CA;
  border: 1px solid #C7D2FE;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.tp-selhint-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: #4338CA;
  border-radius: 6px;
  cursor: pointer;
}
.tp-selhint-cancel:hover { background: #C7D2FE; }

.tp-ctx-menu {
  position: fixed;
  z-index: 950;
  min-width: 200px;
  padding: 4px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  user-select: none;
}
.tp-ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #1F2937;
  font-size: 13px;
  text-align: left;
  border-radius: 6px;
  cursor: pointer;
}
.tp-ctx-item:hover { background: #EEF2FF; color: #4338CA; }
.tp-ctx-item i { width: 16px; color: #6366F1; }
.tp-ctx-empty {
  padding: 8px 12px;
  font-size: 12px;
  color: #9CA3AF;
  font-style: italic;
}

.tp-chk { width: 16px; height: 16px; cursor: pointer; accent-color: #6366F1; }
.tp-chk:disabled { cursor: not-allowed; opacity: 0.35; }

.tp-row-selected td { background: #EEF2FF !important; }
.tp-row-grouped td:first-child { border-left: 3px solid #6366F1; }
.tp-row-disabled td { opacity: 0.5; }
.ect-row { cursor: default; }
.ect-row.tp-row-grouped { cursor: default; }

.tp-group-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 2px 8px;
  background: #EEF2FF;
  color: #4338CA;
  border: 1px solid #C7D2FE;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.tp-selbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  background: #1F2937;
  color: #FFFFFF;
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  z-index: 900;
}
.tp-selbar-info { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.tp-selbar-info strong { font-size: 14px; }
.tp-selbar.is-over-limit { background: #7F1D1D; }
.tp-selbar-warn { color: #FCA5A5; font-weight: 600; }
.tp-selbar .ep-btn-new:disabled { opacity: 0.5; cursor: not-allowed; }

.tp-modal-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 3px 10px;
  background: #EEF2FF;
  color: #4338CA;
  border: 1px solid #C7D2FE;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  vertical-align: middle;
}

.tp-group-banner {
  margin-bottom: 12px;
  padding: 12px 14px;
  background: #F5F3FF;
  border: 1px solid #DDD6FE;
  border-radius: 10px;
}
.tp-group-banner-title {
  font-size: 13px;
  color: #4338CA;
  font-weight: 600;
  margin-bottom: 8px;
}
.tp-group-banner-title i { margin-right: 6px; }
.tp-group-list {
  list-style: none;
  padding: 0;
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #374151;
}
.tp-group-list li {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px dashed #DDD6FE;
}
.tp-group-list li:last-child { border-bottom: none; }
.tp-group-banner-total {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 2px solid #DDD6FE;
  font-size: 13px;
  font-weight: 700;
  color: #1F2937;
}

.act-slate {
  background: #F3F4F6;
  color: #4B5563;
  border: 1px solid #E5E7EB;
}
.act-slate:hover { background: #E5E7EB; }

.act-indigo {
  background: #EEF2FF;
  color: #4338CA;
  border: 1px solid #C7D2FE;
}
.act-indigo:hover { background: #E0E7FF; }

.tp-insc-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 10px;
  color: #1E40AF;
  font-size: 12px;
  line-height: 1.5;
}
.tp-insc-hint i { margin-top: 2px; }
.req { color: #DC2626; }

@media (max-width: 768px) {
  .ep-toolbar { flex-direction: column; align-items: stretch; }
  .tp-search-wrap { width: 100%; }
  .tp-search { width: 100%; }
  .tp-modal { width: 95vw; }
  .tp-modal-sm { width: 95vw; }
  .ep-kpis { grid-template-columns: 1fr; }
  .tp-selbar { left: 16px; right: 16px; transform: none; flex-direction: column; align-items: stretch; }
}

/* ---- column filter row ---- */
.ect-filters { background: var(--e-bg-subtle); }
.ect-filters td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--e-border);
}
.filter-input,
.filter-select {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--e-border-strong);
  border-radius: 6px;
  font-size: 12px;
  color: var(--e-text);
  background: #fff;
  transition: all .2s ease;
  font-family: inherit;
}
.filter-select { padding: 0 8px; cursor: pointer; appearance: auto; }
.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: var(--e-accent);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
}
.filter-input::placeholder { color: var(--e-text-muted); }
.filter-input.tr { text-align: right; }

/* Las flechitas del input number no caben en 30px y tapan el monto. */
.filter-input[type="number"] { -moz-appearance: textfield; }
.filter-input[type="number"]::-webkit-outer-spin-button,
.filter-input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* flatpickr renderiza su propio input (altInput) fuera del alcance de
   .filter-input: hay que igualarlo a mano o la fila queda despareja. */
.ect-filters :deep(.exec-flatpickr-input) {
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--e-border-strong);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  color: var(--e-text);
  background: #fff;
  box-sizing: border-box;
  outline: none;
  transition: all .2s ease;
}
.ect-filters :deep(.exec-flatpickr-input::placeholder) { color: var(--e-text-muted); }
.ect-filters :deep(.exec-flatpickr-input:focus) {
  border-color: var(--e-accent);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
}

.filter-clear {
  width: 28px;
  height: 28px;
  border: 1px solid var(--e-border-strong);
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  color: var(--e-text-muted);
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease;
}
.filter-clear:hover {
  background: #FEF2F2;
  border-color: #FCA5A5;
  color: #EF4444;
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .token-page {
  --e-bg: #1A1A14;
  --e-bg-subtle: #1F1F1A;
  --e-border: #2A2A22;
  --e-border-strong: #3A3A33;
  --e-text: #F4F4F0;
  --e-text-secondary: #A0A099;
  --e-text-muted: #6F6F66;
  --e-accent-soft: rgba(16,185,129,0.16);
}
[data-coreui-theme="dark"] .token-page .ep-section.ep-filter-bar { background: #1A1A14; }
[data-coreui-theme="dark"] .token-page .ep-section.ep-filter-bar.is-filtered {
  border-color: rgba(52, 211, 153, 0.32);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.08);
}
[data-coreui-theme="dark"] .token-page .ep-filter-strip {
  border-top-color: #2A2A22;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.10), rgba(16, 185, 129, 0.04));
}
[data-coreui-theme="dark"] .token-page .ep-filter-strip-badge { color: #34D399; }
[data-coreui-theme="dark"] .token-page .ep-kpi { background: #1A1A14; }
[data-coreui-theme="dark"] .token-page .ep-kpi:hover {
  border-color: #3A3A33;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.35);
}
[data-coreui-theme="dark"] .token-page .ep-tab { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .token-page .ep-tab:hover { background: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .token-page .tp-search { background: #1A1A14; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .token-page .tp-search::placeholder { color: #6F6F66; }
[data-coreui-theme="dark"] .token-page .ect-wrap { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .token-page .ect-head th { background: #1F1F1A; color: #A0A099; border-color: #2A2A22; }
[data-coreui-theme="dark"] .token-page .ect-row td { border-color: #2A2A22; color: #D4D4CC; }
[data-coreui-theme="dark"] .token-page .ect-row:hover td { background: #1F1F1A; }
[data-coreui-theme="dark"] .token-page .ect-filters,
[data-coreui-theme="dark"] .token-page .ect-filters td { background: #1F1F1A; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .token-page .filter-input,
[data-coreui-theme="dark"] .token-page .filter-select,
[data-coreui-theme="dark"] .token-page .ect-filters :deep(.exec-flatpickr-input) {
  background: #14140F;
  border-color: #2A2A22;
  color: #F4F4F0;
}
[data-coreui-theme="dark"] .token-page .filter-input::placeholder,
[data-coreui-theme="dark"] .token-page .ect-filters :deep(.exec-flatpickr-input::placeholder) { color: #6F6F66; }
[data-coreui-theme="dark"] .token-page .filter-input:focus,
[data-coreui-theme="dark"] .token-page .ect-filters :deep(.exec-flatpickr-input:focus),
[data-coreui-theme="dark"] .token-page .filter-select:focus {
  border-color: #34D399;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.18);
}
[data-coreui-theme="dark"] .token-page .filter-clear {
  background: #14140F;
  border-color: #2A2A22;
  color: #6F6F66;
}
[data-coreui-theme="dark"] .token-page .filter-clear:hover {
  background: rgba(239,68,68,0.16);
  border-color: rgba(239,68,68,0.4);
  color: #F87171;
}
[data-coreui-theme="dark"] .token-page .cell-main { color: #F4F4F0; }
[data-coreui-theme="dark"] .token-page .cell-sub { color: #A0A099; }
[data-coreui-theme="dark"] .token-page .ep-refresh-btn {
  background: #1A1A14;
}
</style>
