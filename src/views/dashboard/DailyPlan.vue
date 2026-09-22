<template>
  <!-- Plan del día con IA. El mismo plan, dos vistas:
       · Comercial: el asesor ve el suyo; el líder el de todo su equipo con una
         nota por persona.
       · Otras áreas (FICO, Académica, Producto): un plan común del área; el
         colaborador ve qué atender primero, el líder además el resumen del área.
       Se genera de madrugada con el modelo local; aquí solo se lee. -->
  <section v-if="data && data.rol" class="ds-panel plan">
    <header class="ds-panel-head">
      <div>
        <h3 class="ds-panel-title">
          <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
          {{ titulo }}
        </h3>
        <p class="ds-panel-sub">
          <template v-if="data.plan_date">
            {{ esDeHoy ? 'Generado' : 'Último plan generado' }} el {{ data.generated_at }} ·
            prioridades por reglas, textos redactados por IA (revísalos antes de enviar)
          </template>
          <template v-else>Todavía no hay un plan generado.</template>
        </p>
      </div>
      <div v-if="esLider" class="ds-panel-actions">
        <button class="btn-exec btn-exec-outline" type="button" :disabled="generando" @click="regenerar">
          <i class="fa-solid" :class="generando ? 'fa-spinner fa-spin' : 'fa-rotate'" aria-hidden="true"></i>
          {{ generando ? 'Generando… (unos minutos)' : 'Regenerar' }}
        </button>
      </div>
    </header>

    <div class="ds-panel-body">
      <p v-if="error" class="ds-alert">{{ error }}</p>

      <!-- ── Área (FICO, Académica, Producto…) ── -->
      <template v-if="esArea && data.plan">
        <p class="enfoque">{{ esLider ? data.plan.resumen_lider : data.plan.enfoque_colaborador }}</p>
        <div v-if="esLider && data.plan.tarjetas?.length" class="totales">
          <span v-for="t in data.plan.tarjetas" :key="t.label" :class="['tarjeta', t.tono]" :title="t.comparativo || ''">
            <b>{{ t.valor ?? '—' }}</b> {{ t.label.toLowerCase() }}
          </span>
        </div>
        <p v-if="!data.plan.pendientes.length" class="ds-empty">No hay pendientes en rojo ni en ámbar hoy.</p>
        <ol v-else class="leads">
          <li v-for="(p, i) in data.plan.pendientes" :key="i" class="lead">
            <div class="lead-head">
              <RouterLink v-if="p.ruta" class="lead-nombre" :to="p.ruta">{{ p.titulo }}</RouterLink>
              <span v-else class="lead-nombre sin-link">{{ p.titulo }}</span>
              <span class="ds-chip">{{ p.grupo }}</span>
            </div>
            <p :class="['motivo', p.tono === 'bad' ? 'pago' : 'nuevo']">{{ p.detalle }}</p>
          </li>
        </ol>
      </template>

      <!-- ── Asesor ── -->
      <template v-else-if="!esArea && !esLider && data.plan">
        <p class="enfoque">{{ data.plan.enfoque_asesor }}</p>
        <MesResumen :mes="data.plan.mes" />
        <p v-if="!data.plan.plan.leads.length" class="ds-empty">No tienes consultas pendientes que priorizar hoy.</p>
        <PlanLeads v-else :leads="data.plan.plan.leads" />
      </template>

      <!-- ── Líder ── -->
      <template v-else-if="!esArea && esLider && data.equipo">
        <p v-if="data.equipo.resumen" class="enfoque">{{ data.equipo.resumen }}</p>
        <div class="totales">
          <span><b>{{ data.equipo.ventas }}</b>{{ data.equipo.meta ? ` / ${data.equipo.meta}` : '' }} ventas del mes</span>
          <span><b>{{ data.equipo.sin_gestion }}</b> consultas sin gestión</span>
          <span><b>{{ data.equipo.priorizadas }}</b> priorizadas hoy</span>
        </div>

        <div v-for="a in asesoresOrdenados" :key="a.user_id" class="asesor">
          <button class="asesor-head" type="button" :aria-expanded="abierto === a.user_id" @click="abierto = abierto === a.user_id ? null : a.user_id">
            <span class="semaforo" :class="a.mes.tono" aria-hidden="true"></span>
            <span class="asesor-nombre">{{ a.nombre }}</span>
            <span class="asesor-cifras">
              {{ a.mes.ventas }}{{ a.mes.meta ? ` / ${a.mes.meta}` : '' }} ventas ·
              {{ a.mes.sin_gestion }} sin gestión ·
              {{ a.plan.leads.length }} hoy
            </span>
            <i class="fa-solid" :class="abierto === a.user_id ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true"></i>
          </button>
          <p class="nota">{{ a.nota_lider }}</p>
          <div v-if="abierto === a.user_id" class="asesor-body">
            <MesResumen :mes="a.mes" />
            <p v-if="!a.plan.leads.length" class="ds-empty">Sin consultas que priorizar hoy.</p>
            <PlanLeads v-else :leads="a.plan.leads" />
          </div>
        </div>
      </template>

      <p v-else-if="!error" class="ds-empty">
        {{ esLider ? 'Pulsa "Regenerar" para armar el plan de hoy.' : 'Tu plan aparecerá aquí cada mañana.' }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted, h } from 'vue'
import { RouterLink } from 'vue-router'
import { ServiceKeys } from '@/services'

const props = defineProps({ viewAs: { type: String, default: null } })
const dashboardService = inject(ServiceKeys.Dashboard)

const data = ref(null)
const error = ref('')
const abierto = ref(null)
const generando = ref(false)

async function load () {
  try {
    data.value = await dashboardService.dailyPlan(props.viewAs)
    generando.value = !!data.value?.generando
    error.value = ''
  } catch (e) {
    console.error('dailyPlan:', e)
    error.value = e?.response?.data?.message || 'No se pudo cargar el plan del día.'
  }
}

// Mientras se genera, se consulta cada 20 s hasta que termine.
let sondeo = null
function vigilar () {
  clearInterval(sondeo)
  sondeo = setInterval(async () => {
    await load()
    if (!generando.value) clearInterval(sondeo)
  }, 20000)
}

async function regenerar () {
  generando.value = true
  try {
    await dashboardService.regenerateDailyPlan(props.viewAs)
    vigilar()
  } catch (e) {
    generando.value = false
    error.value = e?.response?.data?.message || 'No se pudo iniciar la generación.'
  }
}

onMounted(async () => {
  await load()
  if (generando.value) vigilar()
})
onUnmounted(() => clearInterval(sondeo))

const esLider = computed(() => data.value?.rol === 'lider')
const esArea = computed(() => data.value?.tipo === 'area')
const titulo = computed(() => {
  if (esArea.value) return esLider.value ? `Plan del día · ${data.value.label}` : `Tu enfoque de hoy · ${data.value.label}`
  return esLider.value ? 'Plan del día del equipo' : 'Tu plan de hoy'
})
const hoyIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const esDeHoy = computed(() => data.value?.plan_date === hoyIso())

// Primero quien más necesita al líder: rojo, ámbar, verde, sin meta.
const ORDEN_TONO = { bad: 0, warn: 1, neutro: 2, ok: 3 }
const asesoresOrdenados = computed(() => [...(data.value?.asesores ?? [])]
  .sort((a, b) => ORDEN_TONO[a.mes.tono] - ORDEN_TONO[b.mes.tono] || b.plan.leads.length - a.plan.leads.length))

/* ── Subcomponentes locales ── */

const MesResumen = (p) => {
  const m = p.mes
  const partes = [
    m.meta ? `${m.ventas} de ${m.meta} ventas (a la fecha tocaban ${m.esperado})` : `${m.ventas} ventas en el mes`,
    `${m.sin_gestion} consultas sin gestión`
  ]
  if (m.contacto_24h_pct !== null && m.contacto_24h_pct !== undefined) partes.push(`${m.contacto_24h_pct}% contactadas en < 24 h`)
  return h('p', { class: ['mes', m.tono] }, partes.join(' · '))
}
MesResumen.props = ['mes']

const copiado = ref(null)
async function copiar (lead) {
  try {
    await navigator.clipboard.writeText(lead.whatsapp)
    copiado.value = lead.lead_id
    setTimeout(() => { if (copiado.value === lead.lead_id) copiado.value = null }, 2000)
  } catch { /* sin permiso de portapapeles: el texto sigue visible para copiar a mano */ }
}
const waLink = (lead) => `https://wa.me/${lead.telefono}?text=${encodeURIComponent(lead.whatsapp)}`

const PlanLeads = (p) => h('ol', { class: 'leads' }, p.leads.map(lead => h('li', { key: lead.lead_id, class: 'lead' }, [
  h('div', { class: 'lead-head' }, [
    h(RouterLink, { class: 'lead-nombre', to: `/comercial/leads/${lead.lead_id}` }, () => lead.nombre),
    lead.programa ? h('span', { class: 'ds-chip' }, lead.programa) : null
  ]),
  h('p', { class: ['motivo', lead.tipo] }, lead.motivo),
  lead.whatsapp
    ? h('div', { class: 'wa' }, [
      h('p', { class: 'wa-texto' }, lead.whatsapp),
      h('div', { class: 'wa-acciones' }, [
        h('button', { type: 'button', class: 'btn-exec btn-exec-outline btn-sm', onClick: () => copiar(lead) },
          copiado.value === lead.lead_id ? '¡Copiado!' : 'Copiar'),
        lead.telefono
          ? h('a', { class: 'btn-exec btn-sm', href: waLink(lead), target: '_blank', rel: 'noopener' }, 'Abrir WhatsApp')
          : null
      ])
    ])
    : null
])))
PlanLeads.props = ['leads']
</script>

<style scoped>
.plan .ds-panel-title i { color: var(--ds-accent); margin-right: 6px; }
.enfoque { margin: 0 0 10px; font-size: 14.5px; line-height: 1.5; color: var(--ds-heading); }
:deep(.mes) { margin: 0 0 12px; font-size: 12.5px; color: var(--ds-ink-2); }
:deep(.mes.bad) { color: var(--ds-bad-ink); }
:deep(.mes.warn) { color: var(--ds-warn-ink); }
:deep(.mes.ok) { color: var(--ds-ok-ink); }

.totales { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-bottom: 14px; font-size: 13px; color: var(--ds-ink-2); }
.totales b { color: var(--ds-heading); font-size: 15px; }
.tarjeta.bad b { color: var(--ds-bad-ink); }
.tarjeta.warn b { color: var(--ds-warn-ink); }
.tarjeta.ok b { color: var(--ds-ok-ink); }
.sin-link { color: var(--ds-heading) !important; }

.asesor { border-top: 1px solid var(--ds-border); padding: 10px 0; }
.asesor-head { display: flex; align-items: center; gap: 10px; width: 100%; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; color: inherit; }
.asesor-nombre { font-weight: 700; color: var(--ds-heading); }
.asesor-cifras { flex: 1; font-size: 12.5px; color: var(--ds-ink-2); }
.semaforo { width: 10px; height: 10px; border-radius: 50%; background: var(--ds-muted); flex: none; }
.semaforo.ok { background: var(--ds-ok); }
.semaforo.warn { background: var(--ds-warn); }
.semaforo.bad { background: var(--ds-bad-ink); }
.nota { margin: 6px 0 0 20px; font-size: 13px; line-height: 1.45; color: var(--ds-ink-2); }
.asesor-body { margin: 10px 0 0 20px; }

:deep(.leads) { margin: 0; padding-left: 20px; }
:deep(.lead) { padding: 10px 0; border-top: 1px dashed var(--ds-border); }
:deep(.lead:first-child) { border-top: 0; padding-top: 0; }
:deep(.lead-head) { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
:deep(.lead-nombre) { font-weight: 700; color: var(--ds-accent); text-decoration: none; }
:deep(.motivo) { margin: 4px 0 0; font-size: 13px; color: var(--ds-ink-2); }
:deep(.motivo.agenda), :deep(.motivo.pago) { color: var(--ds-bad-ink); font-weight: 600; }
:deep(.motivo.nuevo) { color: var(--ds-warn-ink); font-weight: 600; }
:deep(.wa) { margin-top: 8px; padding: 10px 12px; border-radius: 8px; background: var(--ds-surface-2); border: 1px solid var(--ds-border); }
:deep(.wa-texto) { margin: 0 0 8px; font-size: 13px; line-height: 1.45; white-space: pre-wrap; }
:deep(.wa-acciones) { display: flex; gap: 8px; }
:deep(.btn-sm) { padding: 4px 10px; font-size: 12px; }
</style>
