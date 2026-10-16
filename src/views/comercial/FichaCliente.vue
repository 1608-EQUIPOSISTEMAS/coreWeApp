<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <div class="title-row">
          <h1 class="ds-title">{{ ficha?.nombre || 'Ficha del cliente' }}</h1>
          <span v-if="estado" class="ds-pill" :class="estado.tone">
            <i class="fa-solid" :class="estado.icon" aria-hidden="true"></i> {{ estado.label }}
          </span>
        </div>
        <p class="ds-sub">{{ subtitulo }}</p>
      </div>
      <form class="ds-head-actions buscador" role="search" @submit.prevent="buscar">
        <label class="visually-hidden" for="ficha-telefono">Número de celular</label>
        <input
          id="ficha-telefono"
          v-model.trim="telefono"
          class="ds-input"
          type="tel"
          inputmode="tel"
          autocomplete="off"
          placeholder="Celular, ej. 912 345 678"
          required
          minlength="6"
          maxlength="30"
        />
        <button class="btn-exec btn-exec-primary" type="submit" :disabled="loading">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> {{ loading ? 'Buscando…' : 'Buscar' }}
        </button>
      </form>
    </header>

    <p v-if="error" class="ds-alert">{{ error }}</p>

    <section v-if="loading" class="ds-kpis" aria-busy="true">
      <div v-for="n in 3" :key="n" class="ds-kpi"><span class="ds-skel"></span></div>
    </section>

    <section v-else-if="!ficha && !error" class="ds-panel">
      <p class="ds-empty ds-empty--lista">
        Escribe el celular del cliente arriba para ver qué consultó, qué compró y qué conviene ofrecerle ahora.
      </p>
    </section>

    <template v-else-if="ficha && !ficha.historial.length">
      <p class="ds-verdict ok">
        <strong>Número nuevo</strong>
        <span>Nunca consultó ni compró. Elige qué pide, califícalo y regístralo: con 1 consulta va a la cadencia de WhatsApp; si vuelve a escribir, sube a Llamar hoy.</span>
      </p>
      <ManualPrograma :phone-key="ficha.phone_key" />
    </template>

    <template v-else-if="ficha">
      <div v-if="veredicto" class="verdict-row">
        <p class="ds-verdict" :class="veredicto.tone">
          <strong>{{ veredicto.title }}</strong>
          <span v-if="veredicto.nivel" class="ds-pill" :class="veredicto.nivel.tone">
            <i class="fa-solid" :class="veredicto.nivel.icon" aria-hidden="true"></i> Nivel {{ veredicto.nivel.label }}
          </span>
          <span>{{ veredicto.text }}</span>
        </p>
        <router-link v-if="ficha.lead_id" class="btn-exec btn-exec-primary" :to="{ name: 'ComercialLeadsNew', query: { clone_from: ficha.lead_id } }">
          <i class="fa-solid fa-user-plus" aria-hidden="true"></i> Inscribir
        </router-link>
      </div>

      <section class="ds-kpis" aria-label="Resumen del cliente">
        <div v-for="k in kpis" :key="k.id" class="ds-kpi">
          <span class="ds-kpi-icon" :class="k.tone" aria-hidden="true"><i class="fa-solid" :class="k.icon"></i></span>
          <div class="ds-kpi-body">
            <span class="ds-kpi-value">{{ k.value }}</span>
            <span class="ds-kpi-label">{{ k.label }}</span>
            <span class="ds-kpi-note">{{ k.note }}</span>
          </div>
        </div>
      </section>

      <section v-if="llamadas.length" class="ds-callout info ya-dijo" aria-label="Lo que ya dijo">
        <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
        <div>
          <strong>Lo que ya dijo (no se lo vuelvas a preguntar)</strong>
          <ul>
            <li v-for="c in llamadas" :key="c.key">{{ c.texto }} <small class="nota-inline">{{ c.detalle }}</small></li>
          </ul>
        </div>
      </section>

      <ManualPrograma
        :phone-key="ficha.phone_key"
        :default-program-id="ultimoProgramaConsultado"
        :price-objection="saidTooExpensive(ficha.llamadas)"
      />

      <div class="ds-row ds-row--mitad">
        <article class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title">¿Qué le ofrecemos ahora?</h3>
            <span class="ds-panel-hint">En vivo y presencial</span>
          </header>
          <div class="ds-panel-body">
            <ol v-if="ofertas.length" class="sugerencias">
              <li v-for="o in ofertas" :key="o.key" class="sugerencia">
                <div class="sugerencia-head">
                  <strong class="sugerencia-programa">{{ o.programa }}</strong>
                  <span class="ds-pill" :class="o.origen.tone">{{ o.origen.label }}</span>
                  <span class="ds-pill" :class="o.tierTone">{{ o.tier }}</span>
                </div>
                <p class="sugerencia-razon">{{ o.razon }}</p>
                <div class="sugerencia-cierre">
                  <span class="ds-pill" :class="o.edicionTone"><i class="fa-solid fa-calendar-day" aria-hidden="true"></i> {{ o.edicion }}</span>
                  <span v-if="o.precio" class="precio">{{ o.precio }}</span>
                  <a class="btn-exec btn-exec-outline btn-sm" :href="o.whatsapp" target="_blank" rel="noopener">
                    <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Enviar propuesta
                  </a>
                </div>
              </li>
            </ol>
            <p v-else class="ds-empty">
              No pidió nada que siga vigente y ningún patrón supera el 8% con 30 casos o más. Pregúntale qué le interesa.
            </p>
          </div>
          <footer class="ds-panel-foot">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>Primero lo que pidió; después lo que compraron personas con su mismo historial. "Enviar propuesta" abre WhatsApp con fecha y precio, editable antes de enviar.</span>
          </footer>
        </article>

        <article class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title">¿Qué ha hecho con nosotros?</h3>
            <span class="ds-panel-hint">{{ formatValue(ficha.historial.length, 'num') }} eventos</span>
          </header>
          <div class="ds-panel-body">
            <div class="ds-table-scroll">
              <table class="ds-table">
                <thead>
                  <tr><th>Fecha</th><th>Qué</th><th>Programa</th><th>Asesor</th><th class="num">Monto</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in filasVisibles" :key="r.key">
                    <td class="fecha">
                      {{ r.fecha }}
                      <small v-if="r.fechaNota" class="nota">{{ r.fechaNota }}</small>
                    </td>
                    <td><span class="ds-pill" :class="r.tone">{{ r.tipo }}</span></td>
                    <td>{{ r.programa }} <small class="nota">{{ r.origen }}</small></td>
                    <td>{{ r.asesor }}</td>
                    <td class="num">{{ r.monto }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <footer v-if="filas.length > LIMITE" class="ds-panel-foot">
            <button class="btn-exec btn-exec-ghost btn-sm" type="button" @click="verTodo = !verTodo">
              {{ verTodo ? 'Ver solo los últimos 10' : `Ver los ${filas.length} eventos` }}
            </button>
          </footer>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import { formatValue } from '@/shared/lib/formatValue'
import { statusOf, headline, buildKpis, timelineRow, outlookVerdict, offerView, callRow, saidTooExpensive } from '@/features/prediccion/fichaCliente'
import ManualPrograma from './ficha/ManualPrograma.vue'

const LIMITE = 10

const service = inject(ServiceKeys.Prediccion)
const route = useRoute()
const router = useRouter()

const telefono = ref(String(route.query.tel ?? ''))
const ficha = ref(null)
const loading = ref(false)
const error = ref('')
const verTodo = ref(false)

// El numero vive en la URL (?tel=): el enlace compartido abre la misma ficha.
function buscar () {
  router.replace({ query: { ...route.query, tel: telefono.value } })
}

async function cargar (tel) {
  if (!tel) {
    ficha.value = null
    return
  }
  loading.value = true
  error.value = ''
  verTodo.value = false
  try {
    ficha.value = await service.ficha(tel)
  } catch (err) {
    console.error('[FichaCliente] ficha', { tel, err })
    ficha.value = null
    error.value = err?.response?.data?.message || 'No se pudo cargar la ficha. Vuelve a intentar en un momento.'
  } finally {
    loading.value = false
  }
}
watch(() => route.query.tel, (tel) => {
  telefono.value = String(tel ?? '')
  cargar(telefono.value)
}, { immediate: true })

const estado = computed(() => (ficha.value ? statusOf(ficha.value.resumen) : null))
const subtitulo = computed(() => {
  if (!ficha.value) return 'Qué consultó, qué compró y qué ofrecerle, por número de celular.'
  return `${ficha.value.phone_key} · ${headline(ficha.value.resumen)}`
})
const kpis = computed(() => buildKpis(ficha.value.resumen, ficha.value.historial))
const veredicto = computed(() => outlookVerdict(ficha.value.pronostico))
const ultimoProgramaConsultado = computed(() =>
  ficha.value.historial.find((e) => e.event_type === 'CONSULTA' && e.program_id)?.program_id ?? null)
// `?? []`: en un deploy el frontend nuevo puede hablar un rato con el backend viejo.
const ofertas = computed(() => (ficha.value.ofertas ?? []).map((o) => offerView(o, ficha.value.phone_key)))
const filas = computed(() => ficha.value.historial.map(timelineRow))
const llamadas = computed(() => (ficha.value.llamadas ?? []).map(callRow))
const filasVisibles = computed(() => (verTodo.value ? filas.value : filas.value.slice(0, LIMITE)))
</script>

<style scoped>
.title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; }
.buscador { flex-wrap: nowrap; }
.buscador .ds-input { width: 220px; }

.sugerencias { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
.sugerencia { padding-bottom: 12px; border-bottom: 1px solid var(--ds-border); }
.sugerencia:last-child { padding-bottom: 0; border-bottom: 0; }
.sugerencia-head { display: flex; align-items: center; gap: 8px; }
.sugerencia-programa { flex: 1; min-width: 0; font-size: 13.5px; color: var(--ds-heading); }
.sugerencia-razon { margin: 4px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--ds-ink-2); }
.sugerencia-cierre { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }
.sugerencia-cierre .btn-exec { margin-left: auto; }
.precio { font-size: 12.5px; font-weight: 600; color: var(--ds-heading); font-variant-numeric: tabular-nums; }

.ya-dijo ul { margin: 4px 0 0; padding-left: 16px; }
.nota-inline { font-size: 11px; color: var(--ds-muted); }

.verdict-row { display: flex; align-items: stretch; gap: 12px; }
.verdict-row .ds-verdict { flex: 1; margin: 0; }
.verdict-row .btn-exec { align-self: center; }

.fecha { white-space: nowrap; font-variant-numeric: tabular-nums; }
.nota { display: block; font-size: 11px; color: var(--ds-muted); }

@media (max-width: 600px) {
  .verdict-row { flex-direction: column; }
  .buscador { width: 100%; }
  .buscador .ds-input { flex: 1; width: auto; }
}
</style>
