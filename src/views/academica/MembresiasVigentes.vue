<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Membresías Vigentes</h1>
        <p class="ds-sub">Socios con beneficio activo. La membresía dura 12 meses desde su fecha de registro.</p>
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
      <div class="mv-toolbar">
        <input
          v-model="search"
          type="search"
          class="ds-input mv-search"
          placeholder="Buscar por nombre, DNI, correo o celular…"
          aria-label="Buscar socio"
        />
        <div class="ds-tabs" role="group" aria-label="Etapa de la membresía">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            :aria-pressed="statusFilter === t.key"
            @click="statusFilter = t.key"
          >
            {{ t.label }} <span class="mv-count">{{ kpis[t.key] ?? 0 }}</span>
          </button>
        </div>
      </div>
      <div class="mv-toolbar">
        <span class="mv-label">Membresía</span>
        <div class="ds-tabs" role="group" aria-label="Membresía">
          <button type="button" :aria-pressed="!tierFilter" @click="tierFilter = ''">
            Todas <span class="mv-count">{{ items.length }}</span>
          </button>
          <button
            v-for="t in tiers"
            :key="t.tier"
            type="button"
            :aria-pressed="tierFilter === t.tier"
            @click="tierFilter = t.tier"
          >
            {{ t.tier }} <span class="mv-count">{{ t.count }}</span>
          </button>
        </div>
      </div>

      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa">
          <thead>
            <tr>
              <th>Socio / documento</th>
              <th style="width:150px">Contacto</th>
              <th style="width:120px">Membresía</th>
              <th style="width:110px">Registro</th>
              <th style="width:110px">Vencimiento</th>
              <th style="width:150px">Etapa</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`">
                <td colspan="6"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <tr v-else-if="!visible.length">
              <td colspan="6" class="ds-empty--lista mv-empty">
                No hay socios con estos filtros. Prueba otra pestaña o quita la búsqueda.
              </td>
            </tr>
            <template v-for="it in visible" v-else :key="it.person_id">
            <tr
              :class="{ link: it.checkpoints.length }"
              :tabindex="it.checkpoints.length ? 0 : undefined"
              :aria-expanded="it.checkpoints.length ? openId === it.person_id : undefined"
              @click="toggle(it)"
              @keydown.enter="toggle(it)"
            >
              <td>
                <div class="mv-main">{{ it.full_name }}</div>
                <div class="mv-sub">{{ it.document_number || 'sin DNI' }}</div>
              </td>
              <td>
                <div class="mono">{{ it.phone || '—' }}</div>
                <div class="mv-sub">{{ it.email || 'sin correo' }}</div>
              </td>
              <td>
                <span class="ds-pill">{{ it.tier }}</span>
                <div v-if="it.renewals" class="mv-sub">Renovó {{ it.renewals }} {{ it.renewals === 1 ? 'vez' : 'veces' }}</div>
              </td>
              <td class="mono">{{ fmt.formatDate(it.start_date) }}</td>
              <td class="mono">{{ fmt.formatDate(it.expiry_date) }}</td>
              <td><span class="ds-pill" :class="STATUS[it.status].tone">{{ statusLabel(it) }}</span></td>
            </tr>
            <tr v-if="openId === it.person_id" class="mv-checks-row">
              <td colspan="6">
                <table class="mv-checks">
                  <thead>
                    <tr><th v-for="c in it.checkpoints" :key="c" scope="col">{{ c }}</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="c in it.checkpoints" :key="c">
                        <input
                          type="checkbox"
                          :checked="it.checks.includes(c)"
                          :disabled="!canMark || saving.has(`${it.enrollment_id}:${c}`)"
                          :aria-label="`${c} de ${it.full_name}`"
                          @change="toggleCheck(it, c, $event.target.checked)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue.js'
import { useEnrollmentFormatters } from '@/composables/useEnrollmentFormatters'

const toast = useToast()
const membresiasService = inject(ServiceKeys.AcademicaMembresias)
const fmt = useEnrollmentFormatters()

// Las claves coinciden con status y kpis del backend (academica-membresias.entity.js).
// La etapa la calcula el backend contra el hoy de Lima. Sin "vencidas": esas
// las gestiona FICO en Vencimientos Membresía.
const STATUS = {
  welcome: { label: 'Bienvenida', tone: 'info' },
  followup: { label: 'Seguimiento', tone: 'ok' },
  expiring: { label: 'Por vencer', tone: 'warn' }
}
const TABS = [
  { key: 'total', label: 'Todas' },
  { key: 'welcome', label: 'Bienvenida' },
  { key: 'followup', label: 'Seguimiento' },
  { key: 'expiring', label: 'Por vencer' }
]
const cards = [
  { key: 'welcome', label: 'Bienvenida', note: 'primeros 7 días desde el registro', icon: 'fa-hand', tone: 'info' },
  { key: 'followup', label: 'Seguimiento', note: 'entre la bienvenida y el aviso', icon: 'fa-id-card', tone: 'ok' },
  { key: 'expiring', label: 'Por vencer', note: 'vencen en 10 días o menos', icon: 'fa-clock', tone: 'warn' },
  { key: 'renewed', label: 'Renovaron', note: 'socios con al menos una renovación', icon: 'fa-rotate', tone: 'info' }
]

const items = ref([])
const kpis = ref({})
const loading = ref(false)
const search = ref('')
const statusFilter = ref('total')
const tierFilter = ref('')

// ponytail: las membresías salen de los socios cargados; una membresía del
// catálogo sin socios vigentes no aparece (hoy las 4 del ERP tienen socios).
const tiers = computed(() => {
  const counts = new Map()
  for (const i of items.value) counts.set(i.tier, (counts.get(i.tier) || 0) + 1)
  return [...counts].map(([tier, count]) => ({ tier, count })).sort((a, b) => a.tier.localeCompare(b.tier))
})

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter(i =>
    (statusFilter.value === 'total' || i.status === statusFilter.value) &&
    (!tierFilter.value || i.tier === tierFilter.value) &&
    (!q || [i.full_name, i.document_number, i.email, i.phone].some(v => String(v || '').toLowerCase().includes(q)))
  )
})

// Marcar es de Academica; GERENCIA ve los checks pero no los toca (el backend lo
// vuelve a validar).
const roles = (() => {
  try { return JSON.parse(localStorage.getItem('user') || '{}').roles || [] } catch { return [] }
})()
const canMark = ['ADMIN', 'LIDER_ACADEMICA', 'ACADEMICA'].some(r => roles.includes(r))

// Socio desplegado: uno a la vez. Por vencer no tiene checks y no se despliega.
const openId = ref(null)
function toggle (it) {
  if (!it.checkpoints.length) return
  openId.value = openId.value === it.person_id ? null : it.person_id
}

// Optimista: la casilla cambia al toque y se revierte si el backend la rechaza
// (ej. el socio cambio de etapa desde que se cargo la lista).
const saving = ref(new Set())
async function toggleCheck (it, checkpoint, checked) {
  const key = `${it.enrollment_id}:${checkpoint}`
  const before = it.checks
  it.checks = checked ? [...before, checkpoint] : before.filter(c => c !== checkpoint)
  saving.value.add(key)
  try {
    await membresiasService.marcarCheck({ enrollmentId: it.enrollment_id, checkpoint, checked })
  } catch (err) {
    it.checks = before
    toast.error(err?.response?.data?.message || err?.response?.data?.error || `No se pudo guardar ${checkpoint}.`)
  } finally {
    saving.value.delete(key)
  }
}

function statusLabel ({ status, days_to_expiry: days }) {
  if (status === 'expiring') return days === 0 ? 'Vence hoy' : `Vence en ${days} d`
  return STATUS[status].label
}

async function load () {
  loading.value = true
  try {
    const r = await membresiasService.vigentes()
    items.value = r?.items || []
    kpis.value = r?.kpis || {}
  } catch (err) {
    console.error('[MembresiasVigentes]', err)
    toast.error(err?.response?.data?.message || err?.response?.data?.error || 'No se pudieron cargar las membresías.')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.mv-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 18px; border-bottom: 1px solid var(--ds-border); }
.mv-search { flex: 1; min-width: 220px; }
.mv-label { font-size: 11.5px; font-weight: 600; color: var(--ds-muted); }
.mv-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ds-tabs > button[aria-pressed="true"] .mv-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

.mv-main { font-weight: 600; color: var(--ds-ink); line-height: 1.3; }
.mv-sub { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.mv-empty { text-align: center; color: var(--ds-muted); }
.mono { font-variant-numeric: tabular-nums; }

.mv-checks-row > td { background: var(--ds-surface-2); }
.mv-checks { border-collapse: collapse; }
.mv-checks th, .mv-checks td { min-width: 44px; padding: 4px 8px; text-align: center; border: 1px solid var(--ds-border); }
.mv-checks th { font-size: 11.5px; font-weight: 600; color: var(--ds-ink-2); background: var(--ds-surface); }
.mv-checks td { background: var(--ds-surface); }
.mv-checks input { width: 16px; height: 16px; cursor: pointer; accent-color: var(--ds-accent); }
.mv-checks input:disabled { cursor: not-allowed; }
</style>
