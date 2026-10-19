<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Retirados</h1>
        <p class="ds-sub">Retiros de 2026 y su encuesta de salida. Quien la responde participa en el sorteo de una beca online.</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="!participantes.length" @click="exportarParticipantes">
          <i class="fa-solid fa-file-export" aria-hidden="true"></i> Exportar participantes
        </button>
        <button class="btn-exec btn-exec-primary" type="button" :disabled="!seleccion.size || sending" @click="enviar">
          <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
          {{ sending ? 'Enviando…' : `Enviar encuesta (${seleccion.size})` }}
        </button>
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
      <div class="ret-toolbar">
        <input
          v-model="search"
          type="search"
          class="ds-input ret-search"
          placeholder="Buscar por nombre, DNI, correo o programa…"
          aria-label="Buscar retirado"
        />
        <div class="ds-tabs" role="group" aria-label="Estado de la encuesta">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            :aria-pressed="statusFilter === t.key"
            @click="statusFilter = t.key"
          >
            {{ t.label }} <span class="ret-count">{{ kpis[t.key] ?? 0 }}</span>
          </button>
        </div>
      </div>

      <div class="ds-table-scroll">
        <table class="ds-table ds-table--lista ds-table--densa ret-table">
          <thead>
            <tr>
              <th class="tc" style="width:40px">
                <input
                  type="checkbox"
                  :checked="todosMarcados"
                  :disabled="!enviables.length"
                  aria-label="Marcar todos los visibles"
                  @change="marcarTodos($event.target.checked)"
                />
              </th>
              <th>Alumno / documento</th>
              <th style="width:190px">Contacto</th>
              <th style="width:180px">Programa</th>
              <th style="width:100px">Retiro</th>
              <th style="width:150px">Encuesta</th>
              <th>Respuesta</th>
              <th class="tc" style="width:56px"><span class="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 8" :key="`sk-${n}`">
                <td colspan="8"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <tr v-else-if="!visible.length">
              <td colspan="8" class="ds-empty--lista ret-empty">
                No hay retirados con estos filtros. Prueba otra pestaña o quita la búsqueda.
              </td>
            </tr>
            <tr v-for="it in visible" v-else :key="it.enrollment_id">
              <td class="tc">
                <input
                  type="checkbox"
                  :checked="seleccion.has(it.enrollment_id)"
                  :disabled="!!it.bloqueo_envio"
                  :title="it.bloqueo_envio || 'Enviar encuesta'"
                  :aria-label="`Seleccionar a ${it.full_name}`"
                  @change="alternar(it.enrollment_id)"
                />
              </td>
              <td>
                <div class="ret-main">{{ it.full_name }}</div>
                <div class="ret-sub">{{ it.document_number || 'sin DNI' }}</div>
              </td>
              <td>
                <div class="mono">{{ it.phone || '—' }}</div>
                <div class="ret-sub">{{ it.email || 'sin correo' }}</div>
              </td>
              <td>
                <div class="ret-main">{{ it.program_name || '—' }}</div>
                <div class="ret-sub">{{ it.edition_code || 'sin edición' }}</div>
              </td>
              <td class="mono">{{ fmt.formatDate(it.retiro_date) }}</td>
              <td>
                <span class="ds-pill" :class="ESTADO[it.estado].tone">{{ ESTADO[it.estado].label }}</span>
                <div v-if="it.estado === 'enviada'" class="ret-sub">
                  {{ fmt.formatDate(it.enviada_at) }}<template v-if="it.envios > 1"> · {{ it.envios }} envíos</template>
                </div>
                <div v-else-if="it.estado === 'respondida'" class="ret-sub">{{ fmt.formatDate(it.respondida_at) }}</div>
              </td>
              <td>
                <template v-if="it.estado === 'respondida'">
                  <div class="ret-main">{{ motivoLabel(it) }}</div>
                  <div class="ret-sub">¿Volvería?: {{ VOLVERIA[it.volveria] }}</div>
                  <div v-if="it.mejora" class="ret-sub ret-mejora" :title="it.mejora">“{{ it.mejora }}”</div>
                </template>
                <span v-else class="ret-sub">—</span>
              </td>
              <td class="tc">
                <button
                  class="btn-icon btn-icon-sm"
                  type="button"
                  title="Abrir inscripción"
                  aria-label="Abrir inscripción"
                  @click="goToEnrollment(it.enrollment_id)"
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
import { confirmAction } from '@/composables/useConfirm'

const router = useRouter()
const toast = useToast()
const ficoService = inject(ServiceKeys.Fico)
const fmt = useEnrollmentFormatters()

// Claves = estado del backend (retirados.entity.js).
const ESTADO = {
  sin_enviar: { label: 'Sin enviar', tone: '' },
  enviada: { label: 'Enviada', tone: 'warn' },
  respondida: { label: 'Respondió', tone: 'ok' }
}

// Codigos = CHECK de retiro_encuestas; Nexus muestra los mismos textos.
const MOTIVOS = {
  ECONOMICO: 'Económico',
  TIEMPO: 'Falta de tiempo / trabajo',
  EXPECTATIVAS: 'El curso no cumplió sus expectativas',
  DOCENTE: 'Docente o metodología',
  PERSONAL: 'Problemas personales o de salud',
  OTRO: 'Otro'
}
const VOLVERIA = { SI: 'Sí', TAL_VEZ: 'Tal vez', NO: 'No' }

const TABS = [
  { key: 'sin_enviar', label: 'Sin enviar' },
  { key: 'enviada', label: 'Enviada' },
  { key: 'respondida', label: 'Respondieron' },
  { key: 'total', label: 'Todos' }
]

const cards = [
  { key: 'total', label: 'Retirados', note: 'retiros de 2026', icon: 'fa-user-minus', tone: 'info' },
  { key: 'sin_enviar', label: 'Sin encuesta', note: 'todavía no reciben el correo', icon: 'fa-envelope', tone: 'warn' },
  { key: 'enviada', label: 'Esperando respuesta', note: 'correo enviado, sin responder', icon: 'fa-hourglass-half', tone: 'info' },
  { key: 'respondida', label: 'Participan en el sorteo', note: 'respondieron la encuesta', icon: 'fa-ticket', tone: 'ok' }
]

const items = ref([])
const kpis = ref({})
const loading = ref(false)
const sending = ref(false)
const search = ref('')
const statusFilter = ref('sin_enviar')
const seleccion = ref(new Set())

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter(i =>
    (statusFilter.value === 'total' || i.estado === statusFilter.value) &&
    (!q || [i.full_name, i.document_number, i.email, i.program_name].some(v => String(v || '').toLowerCase().includes(q)))
  )
})
const enviables = computed(() => visible.value.filter(i => !i.bloqueo_envio))
const todosMarcados = computed(() => enviables.value.length > 0 && enviables.value.every(i => seleccion.value.has(i.enrollment_id)))
const participantes = computed(() => items.value.filter(i => i.estado === 'respondida'))

function motivoLabel ({ motivo, motivo_otro: otro }) {
  return motivo === 'OTRO' ? `Otro: ${otro}` : MOTIVOS[motivo]
}

function alternar (id) {
  const s = new Set(seleccion.value)
  s.has(id) ? s.delete(id) : s.add(id)
  seleccion.value = s
}

function marcarTodos (marcar) {
  const s = new Set(seleccion.value)
  for (const i of enviables.value) marcar ? s.add(i.enrollment_id) : s.delete(i.enrollment_id)
  seleccion.value = s
}

async function load () {
  loading.value = true
  try {
    const r = await ficoService.getRetirados()
    items.value = r?.items || []
    kpis.value = r?.kpis || {}
  } catch (err) {
    console.error('[Retirados]', err)
    toast.error(err?.response?.data?.error || 'No se pudieron cargar los retirados.')
  } finally {
    loading.value = false
  }
}

async function enviar () {
  const n = seleccion.value.size
  const ok = await confirmAction({
    title: `¿Enviar la encuesta a ${n} ${n === 1 ? 'alumno' : 'alumnos'}?`,
    text: 'Cada uno recibe un correo con su link personal a Nexus y la invitación al sorteo de la beca online.',
    confirmText: 'Sí, enviar'
  })
  if (!ok) return
  sending.value = true
  try {
    const r = await ficoService.enviarEncuestaRetiro([...seleccion.value])
    if (r.enviados) toast.success(`Encuesta enviada a ${r.enviados} ${r.enviados === 1 ? 'alumno' : 'alumnos'}.`)
    for (const f of [...r.fallidos, ...r.omitidos]) toast.warning(`${f.full_name}: ${f.motivo}`)
    seleccion.value = new Set()
    await load()
  } catch (err) {
    console.error('[Retirados] envio', err)
    toast.error(err?.response?.data?.error || 'No se pudo enviar la encuesta.')
  } finally {
    sending.value = false
  }
}

// ponytail: CSV armado aqui; si un tercer modulo exporta, extraer a shared/lib.
function exportarParticipantes () {
  const celda = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const filas = [
    ['Alumno', 'DNI', 'Correo', 'Celular', 'Programa', 'Edicion', 'Retiro', 'Respondio', 'Motivo', 'Volveria', 'Que pudimos hacer mejor'],
    ...participantes.value.map(i => [
      i.full_name, i.document_number, i.email, i.phone, i.program_name, i.edition_code,
      i.retiro_date, i.respondida_at, motivoLabel(i), VOLVERIA[i.volveria], i.mejora
    ])
  ]
  // BOM: sin el, Excel abre las tildes rotas.
  const blob = new Blob(['﻿' + filas.map(f => f.map(celda).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'participantes-sorteo-retirados.csv' })
  a.click()
  URL.revokeObjectURL(a.href)
}

function goToEnrollment (id) {
  router.push({ name: 'enrollmentDetail', params: { id: String(id) } })
}

onMounted(load)
</script>

<style scoped>
.ret-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 18px; border-bottom: 1px solid var(--ds-border); }
.ret-search { flex: 1; min-width: 220px; }
.ret-count {
  display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 4px; padding: 0 5px;
  border-radius: 9px; background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 10.5px;
}
.ds-tabs > button[aria-pressed="true"] .ret-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

.ret-table td { vertical-align: middle; }
.ret-main { font-weight: 600; color: var(--ds-ink); line-height: 1.3; }
.ret-sub { margin-top: 2px; font-size: 11.5px; color: var(--ds-muted); }
.ret-mejora { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: italic; }
.ret-empty { text-align: center; color: var(--ds-muted); }
.tc { text-align: center; }
.mono { font-variant-numeric: tabular-nums; }
</style>
