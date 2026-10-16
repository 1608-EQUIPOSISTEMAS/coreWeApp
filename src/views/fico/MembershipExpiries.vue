<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Vencimientos de Membresía</h1>
        <p class="ds-sub">Cada membresía vence al año de su activación. Llama a los socios un mes antes para saber si renuevan o se retiran.</p>
      </div>
    </header>

    <div class="ds-kpis">
      <div v-for="k in cards" :key="k.key" class="ds-kpi">
        <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="loading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ formatValue(kpis[k.key] ?? 0, 'num') }}</span>
          </div>
          <span class="ds-kpi-label">{{ k.label }}</span>
          <span class="ds-kpi-note">{{ k.note }}</span>
        </div>
      </div>
    </div>

    <section class="ds-panel">
      <div class="mem-toolbar">
        <input
          v-model="search"
          type="search"
          class="ds-input mem-search"
          placeholder="Buscar por nombre, DNI, correo o celular…"
          aria-label="Buscar socio"
        />
        <div class="ds-tabs" role="group" aria-label="Estado de la membresía">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            :aria-pressed="statusFilter === t.key"
            @click="statusFilter = t.key"
          >
            {{ t.label }} <span class="mem-count">{{ kpis[t.key] ?? 0 }}</span>
          </button>
        </div>
        <select v-model="tierFilter" class="ds-input mem-tier" aria-label="Membresía">
          <option value="">Todas las membresías</option>
          <option v-for="t in tiers" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa mem-table">
          <thead>
            <tr>
              <th>Socio / documento</th>
              <th style="width:150px">Contacto</th>
              <th style="width:120px">Membresía</th>
              <th style="width:110px">Activación</th>
              <th style="width:110px">Vencimiento</th>
              <th style="width:150px">Estado</th>
              <th class="tc" style="width:56px"><span class="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`">
                <td colspan="7"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <tr v-else-if="!visible.length">
              <td colspan="7" class="ds-empty--lista mem-empty">
                No hay socios con estos filtros. Prueba otra pestaña o quita la búsqueda.
              </td>
            </tr>
            <tr
              v-for="it in visible"
              v-else
              :key="it.person_id"
              class="link"
              tabindex="0"
              @click="goToEnrollment(it.enrollment_id)"
              @keydown.enter.self="goToEnrollment(it.enrollment_id)"
            >
              <td>
                <div class="mem-main">{{ it.full_name }}</div>
                <div class="mem-sub">{{ it.document_number || 'sin DNI' }}</div>
              </td>
              <td>
                <div class="mono">{{ it.phone || '—' }}</div>
                <div class="mem-sub">{{ it.email || 'sin correo' }}</div>
              </td>
              <td>
                <span class="ds-pill">{{ it.tier }}</span>
                <div v-if="it.renewals" class="mem-sub">Renovó {{ it.renewals }} {{ it.renewals === 1 ? 'vez' : 'veces' }}</div>
              </td>
              <td class="mono">{{ fmt.formatDate(it.start_date) }}</td>
              <td class="mono">{{ fmt.formatDate(it.expiry_date) }}</td>
              <td><span class="ds-pill" :class="STATUS[it.status].tone">{{ statusLabel(it) }}</span></td>
              <td class="tc">
                <button
                  class="btn-icon btn-icon-sm"
                  type="button"
                  title="Abrir inscripción"
                  aria-label="Abrir inscripción"
                  @click.stop="goToEnrollment(it.enrollment_id)"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const router = useRouter()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)
const fmt = useEnrollmentFormatters()

// Las claves coinciden con status y kpis del backend (membership.entity.js).
const STATUS = {
  expiring: { label: 'Por vencer', tone: 'warn' },
  expired: { label: 'Vencida', tone: 'bad' },
  active: { label: 'Vigente', tone: 'ok' }
}
// "Por vencer" abre primero: es la lista de socios a llamar.
const TABS = [
  { key: 'expiring', label: 'Por vencer' },
  { key: 'expired', label: 'Vencidas' },
  { key: 'active', label: 'Vigentes' },
  { key: 'total', label: 'Todas' }
]
const cards = [
  { key: 'expiring', label: 'Por vencer', note: 'vencen en 30 días o menos', icon: 'fa-clock', tone: 'warn' },
  { key: 'expired', label: 'Vencidas sin renovar', note: 'a retirar si no renuevan', icon: 'fa-user-xmark', tone: 'bad' },
  { key: 'active', label: 'Vigentes', note: 'faltan más de 30 días', icon: 'fa-id-card', tone: 'ok' },
  { key: 'renewed', label: 'Renovaron', note: 'socios con al menos una renovación', icon: 'fa-rotate', tone: 'info' }
]

const items = ref([])
const kpis = ref({})
const loading = ref(false)
const search = ref('')
const statusFilter = ref('expiring')
const tierFilter = ref('')

const tiers = computed(() => [...new Set(items.value.map(i => i.tier))].sort())

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter(i =>
    (statusFilter.value === 'total' || i.status === statusFilter.value) &&
    (!tierFilter.value || i.tier === tierFilter.value) &&
    (!q || [i.full_name, i.document_number, i.email, i.phone].some(v => String(v || '').toLowerCase().includes(q)))
  )
})

function statusLabel ({ status, days_to_expiry: days }) {
  if (status === 'expired') return `Vencida hace ${-days} d`
  if (status === 'expiring') return days === 0 ? 'Vence hoy' : `Vence en ${days} d`
  return STATUS.active.label
}

async function load () {
  loading.value = true
  try {
    const r = await ficoService.getMembershipExpiries()
    items.value = r?.items || []
    kpis.value = r?.kpis || {}
  } catch (err) {
    console.error('[MembershipExpiries]', err)
    toast.error(err?.response?.data?.error || 'No se pudieron cargar los vencimientos.')
  } finally {
    loading.value = false
  }
}

function goToEnrollment (id) {
  router.push({ name: 'enrollmentDetail', params: { id: String(id) } })
}

onMounted(load)
</script>

<style scoped>
.mem-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 18px; border-bottom: 1px solid var(--ds-border); }
.mem-search { flex: 1; min-width: 220px; }
.mem-tier { width: 190px; }
.mem-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ds-tabs > button[aria-pressed="true"] .mem-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

.mem-table td { vertical-align: middle; }
.mem-main { font-weight: 600; color: var(--ds-ink); line-height: 1.3; }
.mem-sub { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.mem-empty { text-align: center; color: var(--ds-muted); }
.tc { text-align: center; }
.mono { font-variant-numeric: tabular-nums; }
</style>
