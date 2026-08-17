<template>
  <div class="gro-page">
    <div class="gro-head">
      <div>
        <div class="eyebrow">Marketing · Crecimiento RRSS</div>
        <h1>{{ view === 'carga' ? 'Carga de la semana' : 'Evolución por marca' }}</h1>
      </div>
      <div class="grow"></div>
      <div class="seg">
        <button type="button" :class="{ on: view === 'carga' }" @click="view = 'carga'">Carga</button>
        <button type="button" :class="{ on: view === 'resumen' }" @click="view = 'resumen'">Resumen</button>
      </div>
      <!-- Las flechas de semana solo tienen sentido en la carga, que es una
           rutina semanal; el resumen se mueve por rango de fechas. -->
      <div v-if="view === 'carga'" class="period-nav">
        <button class="arrow" type="button" title="Semana anterior" @click="shiftPeriod(-1)">‹</button>
        <span class="lbl">{{ weekLabel(currentWeek) }}</span>
        <button class="arrow" type="button" title="Semana siguiente" @click="shiftPeriod(1)">›</button>
      </div>
      <template v-else>
        <!-- La granularidad no se elige, la decide el ancho del rango: se muestra
             para que no parezca que la tabla cambió sola. -->
        <span class="grouping">por {{ grouping }}</span>
        <DateRangePicker :model-value="range" @update:model-value="setRange" />
      </template>
    </div>

    <div v-if="loading" class="empty">Cargando…</div>
    <!-- El vacío se mide contra `rows` y no contra `total`: `total` cuenta solo
         la cola manual, y quedaría en 0 el día que todas las redes tengan API. -->
    <div v-else-if="!rows.length" class="empty">
      Todavía no hay cuentas dadas de alta. Corré <code>node scripts/seed-social-accounts.mjs</code>.
    </div>

    <!-- ── Resumen: marca × semana ──────────────────────── -->
    <template v-else-if="view === 'resumen'">
      <div class="stats">
        <div class="st">
          <span class="n">{{ fmt(grandTotal) }}</span>
          <span class="l">Seguidores al cierre del período</span>
        </div>
        <div class="st">
          <span class="n">{{ grandGoal ? fmt(grandGoal) : '—' }}</span>
          <span class="l">Objetivo {{ goalYear }}</span>
        </div>
        <div v-if="grandGoalPct !== null" class="st" :class="grandGoalPct >= 100 ? 'ok' : ''">
          <span class="n">{{ grandGoalPct }}%</span>
          <span class="l">Avance del objetivo</span>
        </div>
        <div class="st" :class="{ warn: pendingCount }">
          <span class="n">{{ pendingCount }}</span>
          <span class="l">Cuentas sin dato de esta semana</span>
        </div>
      </div>

      <div v-for="group in brands" :key="group.brand" class="panel" :data-brand="brandSlot(group.brand)">
        <div class="b-head">
          <span class="b-name">{{ group.brand }}</span>
          <span class="grow"></span>
          <span class="b-tot">
            {{ group.reached === null ? 'sin datos' : `${fmt(group.reached)} seguidores` }}
          </span>
          <label class="b-goal" :title="`Objetivo de seguidores de ${group.brand} para ${goalYear}`">
            <span>Objetivo {{ goalYear }}</span>
            <input
              type="number"
              min="1"
              inputmode="numeric"
              placeholder="—"
              :value="group.goal ?? ''"
              :disabled="saving"
              @keydown.enter.prevent="$event.target.blur()"
              @change="saveGoal(group.brand, $event.target.value)"
            />
          </label>
          <span v-if="group.goalPct !== null" :class="['b-pct', { ok: group.goalPct >= 100 }]">
            {{ group.goalPct }}%
          </span>
        </div>
        <div v-if="group.goalPct !== null" class="b-bar">
          <!-- La barra se corta en 100% pero el número de arriba no: superar el
               objetivo tiene que verse, y una barra más larga que su riel no. -->
          <div class="fill" :style="{ width: Math.min(group.goalPct, 100) + '%' }"></div>
        </div>
        <div class="t-scroll">
          <table class="grid">
            <thead>
              <tr>
                <th class="acc">Cuenta</th>
                <th v-for="c in columns" :key="c.key" :class="{ future: c.future }">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in group.rows" :key="row.account_id">
                <th class="acc" :title="`${row.label} · ${row.display_name}`">
                  <span class="a-net">{{ row.label }}</span>
                  <span class="a-nom">{{ row.display_name }}</span>
                </th>
                <td v-for="(cell, i) in row.cells" :key="columns[i].key" :class="{ future: columns[i].future }">
                  <template v-if="cell">
                    <span class="n">{{ fmt(cell.followers) }}</span>
                    <span v-if="cell.growth !== null" :class="['d', cell.growth >= 0 ? 'up' : 'down']">
                      {{ cell.growth >= 0 ? '+' : '' }}{{ fmt(cell.growth) }}
                      <em
                        v-if="cell.weeks_spanned > 1"
                        :title="`Acumulado de ${cell.weeks_spanned} semanas: faltan mediciones intermedias`"
                      >*</em>
                    </span>
                  </template>
                  <span v-else class="none">—</span>
                </td>
              </tr>
              <tr class="tot">
                <th class="acc">Total {{ group.brand }}</th>
                <td v-for="(t, i) in group.totals" :key="columns[i].key" :class="{ future: columns[i].future }">
                  <span :class="t === null ? 'none' : 'n'">{{ fmt(t) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="shell">
      <!-- ── Cola ─────────────────────────────────────────── -->
      <aside class="queue">
        <div class="eyebrow accent">Cola de carga · {{ weekLabel(currentWeek) }}</div>
        <div class="q-count">
          <span class="big">{{ pendingCount }}</span>
          <span class="of">de {{ total }} pendientes</span>
        </div>
        <div class="bar"><div class="fill" :style="{ width: progressPct + '%' }"></div></div>

        <div class="q-list">
          <button
            v-for="row in queue"
            :key="row.account_id"
            type="button"
            :class="['q-item', { on: row.index === activeIndex, done: row.state === 'done' }]"
            @click="focusAccount(row.index)"
          >
            <span :class="['dot', row.state, { on: row.index === activeIndex }]">
              {{ row.state === 'done' ? '✓' : (row.index === activeIndex ? '›' : '') }}
            </span>
            <span class="q-txt">
              <span class="q-brand">{{ row.brand }}</span>
              <span class="q-net">{{ row.label }} · {{ row.display_name }}</span>
            </span>
            <span :class="['q-val', row.state]">
              {{ row.current ? fmt(row.current.followers) : '—' }}
            </span>
          </button>
        </div>
      </aside>

      <!-- ── Foco ─────────────────────────────────────────── -->
      <section v-if="active" class="focus">
        <div class="f-top">
          <div class="eyebrow accent">Cuenta {{ activeIndex + 1 }} de {{ total }}</div>
          <div class="keys">
            <span class="key"><kbd>Enter</kbd> guardar y siguiente</span>
            <span class="key"><kbd>S</kbd> sin dato</span>
          </div>
        </div>
        <h2>{{ active.brand }} · {{ active.label }}</h2>
        <p class="f-sub">
          {{ active.display_name }} ·
          <span :class="active.isManual ? 'tag manual' : 'tag api'">
            {{ active.isManual ? 'carga manual' : 'vía API' }}
          </span>
        </p>

        <div class="f-row">
          <div class="card capture">
            <div class="cap-t">Seguidores esta semana</div>
            <div class="cap-in">
              <input
                ref="inputEl"
                v-model="draft"
                class="inp"
                type="number"
                min="0"
                inputmode="numeric"
                placeholder="—"
                :disabled="saving"
                @keydown="onKey"
              />
              <div class="cap-vs">
                <div class="vs-l">
                  vs. {{ weekLabel(previousWeek) }} ·
                  {{ active.previous ? fmt(active.previous.followers) : 'sin dato' }}
                </div>
                <div :class="['vs-d', draftDelta === null ? 'none' : (draftDelta >= 0 ? 'up' : 'down')]">
                  {{ draftDelta === null ? '—' : (draftDelta >= 0 ? '+' : '') + fmt(draftDelta) }}
                </div>
              </div>
            </div>
            <div class="cap-btns">
              <button class="btn primary" type="button" :disabled="saving || draft === ''" @click="commit">
                {{ saving ? 'Guardando…' : 'Guardar y siguiente' }}
              </button>
              <button class="btn ghost" type="button" :disabled="saving" @click="skipActive">Sin dato</button>
            </div>
          </div>

          <div class="card trend">
            <div class="cap-t">
              {{ activeHistory.length ? `Últimas ${activeHistory.length} semanas` : 'Historial' }}
            </div>
            <svg v-if="activeHistory.length" viewBox="0 0 160 60" preserveAspectRatio="none" class="spark">
              <polyline
                :points="activeSpark"
                fill="none"
                stroke="var(--gro-line)"
                stroke-width="2.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div v-else class="spark-empty">Sin mediciones previas</div>
            <div v-if="activeHistory.length" class="t-range">
              <span>{{ weekLabel(activeHistory[0].week_start) }}</span>
              <span>{{ weekLabel(activeHistory[activeHistory.length - 1].week_start) }}</span>
            </div>
            <div v-if="activePace !== null" class="note">
              Ritmo: {{ activePace >= 0 ? '+' : '' }}{{ fmt(activePace) }} en promedio por semana.
            </div>
          </div>
        </div>

        <div v-if="activeRecent.length" class="recent">
          <div v-for="point in activeRecent" :key="point.week_start" class="r-card">
            <div class="r-w">{{ weekLabel(point.week_start) }}</div>
            <div class="r-v">
              <span class="n">{{ fmt(point.followers) }}</span>
              <span
                v-if="point.growth !== null"
                :class="['d', point.growth >= 0 ? 'up' : 'down']"
              >{{ point.growth >= 0 ? '+' : '' }}{{ fmt(point.growth) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Sin cuentas manuales no hay nada que cargar a mano: sin esto el panel
           derecho se dibuja vacío porque `active` es null. -->
      <section v-else class="focus">
        <div class="eyebrow accent">Nada que cargar</div>
        <h2>Todas las cuentas se leen por API</h2>
        <p class="f-sub">Los seguidores de esta semana los trae el cron. Mirá la evolución en «Resumen».</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useSocialGrowth } from '@/composables/useSocialGrowth.js'
import DateRangePicker from '@/components/DateRangePicker.vue'

const {
  rows, queue, brands, columns, active, activeIndex, activeHistory, activeSpark, activeRecent, activePace,
  currentWeek, previousWeek, range, goalYear, total, pendingCount, progressPct,
  loading, saving,
  load, saveActive, skipActive, focusAccount, shiftPeriod, setRange, saveGoal
} = useSocialGrowth()

// "carga" es el trabajo semanal cuenta por cuenta; "resumen" es la evolución de
// varias semanas. Comparten datos y ruta, así que es un solo permiso.
const view = ref('carga')

// Un color fijo por marca para distinguir los paneles de un vistazo. El slot va
// atado al NOMBRE y no a la posición: el resumen se ordena por seguidores, así
// que por índice dos marcas intercambiarían color al cruzarse en el ranking y se
// leería como un cambio de tendencia que nunca pasó.
// Los hex viven en el CSS porque cada tono tiene su propio paso para el modo
// oscuro y acá no sabemos qué tema está activo.
const BRAND_SLOT = {
  'WE EDUCACION': 1,
  'WE ONLINE': 2,
  'WE FOR BUSINESS': 3,
  'IIM': 4,
  'HR LATAM': 5,
  'WE INMOBILIARIA': 6
}
// Una marca nueva cae en el slot 0 (gris) en vez de robarle el color a otra: se
// nota que falta darla de alta acá, en lugar de disfrazarse de una existente.
const brandSlot = brand => BRAND_SLOT[brand] ?? 0

const NUM = new Intl.NumberFormat('es-PE')
const fmt = n => (n === null || n === undefined ? '—' : NUM.format(n))
const weekLabel = week => week.slice(8, 10) + '/' + week.slice(5, 7)

const draft = ref('')
const inputEl = ref(null)

// El delta se recalcula mientras se escribe: quien carga ve al instante si el
// número que tipeó tiene sentido, que es donde se cazan los errores de dedo.
const draftDelta = computed(() => {
  const value = String(draft.value).trim()
  if (value === '' || !active.value?.previous) return null
  return Number(value) - active.value.previous.followers
})

// Qué está mirando la matriz: lo dice el ancho del rango, no un selector.
const grouping = computed(() => (columns.value[0]?.kind === 'month' ? 'meses' : 'semanas'))

const grandTotal = computed(() => brands.value.reduce((sum, g) => sum + (g.reached || 0), 0))
const grandGoal = computed(() => brands.value.reduce((sum, g) => sum + (g.goal || 0), 0))

// Solo se muestra si hay al menos un objetivo cargado: un 0% con todas las metas
// vacías se lee como "no avanzamos nada", cuando nadie fijó una meta todavía.
const grandGoalPct = computed(() =>
  grandGoal.value ? Math.round(grandTotal.value / grandGoal.value * 100) : null)

// Al cambiar de cuenta el input arranca con lo ya cargado (para corregir) y toma
// el foco, que es lo que hace que la cola se pueda recorrer sin tocar el mouse.
watch(active, async row => {
  draft.value = row?.current ? String(row.current.followers) : ''
  await nextTick()
  inputEl.value?.focus()
}, { immediate: true })

// Volver a "carga" devuelve el foco al input: si hay que tocar el mouse para
// seguir tipeando, el atajo de teclado deja de servir.
watch(view, async mode => {
  if (mode !== 'carga') return
  await nextTick()
  inputEl.value?.focus()
})

function commit () {
  if (draft.value !== '') saveActive(draft.value)
}

function onKey (event) {
  if (event.key === 'Enter') { event.preventDefault(); commit() }
  // La "S" solo salta con el campo vacío: si ya hay un número tipeado, la
  // intención es guardarlo, no descartarlo.
  else if (event.key.toLowerCase() === 's' && String(draft.value).trim() === '') {
    event.preventDefault()
    skipActive()
  }
}

onMounted(load)
</script>

<style scoped>
/* Paleta WE. El diseño original venía en crema/terracota; acá el acento es el
   navy de marca (--we-navy) y las superficies son las del resto del ERP. */
.gro-page {
  --gro-surface: #fff;
  --gro-panel: #f8fafc;
  --gro-border: #e2e8f0;
  --gro-ink: #0f172a;
  --gro-muted: #475569;
  --gro-faint: #64748b;
  --gro-dim: #94a3b8;
  --gro-track: #e2e8f0;
  --gro-accent: var(--we-navy, #002060);
  --gro-up: #047857;
  --gro-up-bg: #ecfdf5;
  --gro-down: #b91c1c;
  --gro-down-bg: #fef2f2;
  /* Derivado del navy, no el navy puro: a 2.75px de trazo el #002060 se lee
     como negro y la serie pierde identidad de marca. */
  --gro-line: #3D5A96;
  padding: 6px 4px 30px;
}

.gro-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.gro-head .grow { flex: 1; }
.eyebrow { font-size: 11px; letter-spacing: .14em; font-weight: 700; color: var(--gro-faint); text-transform: uppercase; }
.eyebrow.accent { color: var(--gro-accent); }
h1 { font-size: 22px; font-weight: 800; color: var(--gro-ink); margin: 2px 0 0; }
.period-nav { display: flex; align-items: center; gap: 6px; }
.period-nav .lbl { font-weight: 700; min-width: 64px; text-align: center; font-size: 13px; color: var(--gro-ink); }
.period-nav .arrow { border: 1px solid var(--gro-border); background: var(--gro-surface); border-radius: 999px; width: 32px; height: 32px; cursor: pointer; font-size: 16px; color: var(--gro-muted); }
.btn { border-radius: 999px; padding: 10px 22px; font-weight: 700; font-size: 13.5px; cursor: pointer; border: 1.5px solid transparent; }
.btn.primary { background: var(--gro-accent); color: #fff; }
.btn.ghost { background: transparent; border-color: var(--gro-border); color: var(--gro-muted); }
.btn:disabled { opacity: .55; cursor: default; }

.empty { background: var(--gro-surface); border: 1px solid var(--gro-border); border-radius: 28px; padding: 30px; text-align: center; color: var(--gro-faint); font-size: 13px; }
.empty code { background: var(--gro-panel); border-radius: 5px; padding: 1px 6px; }

.grouping { font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--gro-faint); background: var(--gro-panel); border: 1px solid var(--gro-border); border-radius: 999px; padding: 5px 11px; }
.filters { display: flex; gap: 8px; }
.filters label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--gro-faint); text-transform: uppercase; letter-spacing: .06em; }
.filters select { border: 1px solid var(--gro-border); background: var(--gro-surface); color: var(--gro-ink); border-radius: 999px; padding: 7px 12px; font-size: 13px; font-weight: 700; cursor: pointer; }
.filters select:disabled { opacity: .55; }

.seg { display: flex; gap: 4px; background: var(--gro-panel); border: 1px solid var(--gro-border); border-radius: 999px; padding: 4px; }
.seg button { border: none; background: transparent; border-radius: 999px; padding: 7px 16px; font-weight: 700; font-size: 12.5px; color: var(--gro-muted); cursor: pointer; }
.seg button.on { background: var(--gro-accent); color: #fff; }

/* ── Resumen: marca × semana ── */
.stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.st { background: var(--gro-surface); border: 1px solid var(--gro-border); border-radius: 16px; padding: 10px 18px; display: flex; align-items: baseline; gap: 8px; }
.st .n { font-size: 20px; font-weight: 800; color: var(--gro-ink); font-variant-numeric: tabular-nums; }
.st .l { font-size: 12px; color: var(--gro-faint); font-weight: 600; }
.st.ok .n { color: var(--gro-up); }
.st.bad .n { color: var(--gro-down); }
.st.warn .n { color: #b45309; }

/* Color categórico por marca. Paleta validada con el validador de la guía de
   dataviz: son los slots 1-6 en su orden fijo, que resultó el subconjunto con la
   mejor separación de los 28 posibles, en claro y en oscuro a la vez.
   El color es refuerzo, NUNCA el único identificador: el nombre de la marca está
   escrito al lado. Ninguna combinación de 6 despega del piso all-pairs, y por eso
   la etiqueta visible no es opcional. */
.panel { background: var(--gro-surface); border: 1px solid var(--gro-border); border-left: 5px solid var(--brand, var(--gro-accent)); border-radius: 28px; overflow: hidden; margin-bottom: 14px; }
.panel[data-brand="1"] { --brand: #2a78d6; }
.panel[data-brand="2"] { --brand: #eb6834; }
.panel[data-brand="3"] { --brand: #1baf7a; }
.panel[data-brand="4"] { --brand: #eda100; }
.panel[data-brand="5"] { --brand: #e87ba4; }
.panel[data-brand="6"] { --brand: #008300; }
.panel[data-brand="0"] { --brand: var(--gro-dim); }
.b-head { display: flex; align-items: baseline; gap: 10px; padding: 11px 18px; border-bottom: 1px solid var(--gro-border); background: var(--gro-panel); }
.b-head .grow { flex: 1; }
.b-name { font-weight: 800; font-size: 12px; letter-spacing: .06em; color: var(--brand, var(--gro-accent)); }
.b-tot { font-size: 11.5px; font-weight: 700; color: var(--gro-faint); font-variant-numeric: tabular-nums; }
.b-goal { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--gro-faint); }
.b-goal input { width: 96px; border: 1px solid var(--gro-border); background: var(--gro-surface); color: var(--gro-ink); border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.b-goal input:focus { outline: 2px solid var(--brand, var(--gro-accent)); outline-offset: 1px; }
.b-pct { font-size: 12px; font-weight: 800; color: var(--gro-faint); font-variant-numeric: tabular-nums; }
.b-pct.ok { color: var(--gro-up); }
/* La barra usa el color de la marca, que ya distingue el panel; el verde queda
   reservado para el 100% alcanzado y no compite con la identidad. */
.b-bar { height: 4px; background: var(--gro-track); }
.b-bar .fill { height: 100%; background: var(--brand, var(--gro-accent)); transition: width .25s ease; }

/* La tabla scrollea dentro del panel: la página nunca scrollea de lado. */
.t-scroll { overflow-x: auto; }
/* table-layout fija: sin esto los nombres largos (los grupos de Facebook)
   ensanchan la columna de una sola marca y los paneles quedan desalineados. */
.grid { border-collapse: collapse; font-size: 11.5px; width: 100%; table-layout: fixed; }
.grid th, .grid td { border: 1px solid var(--gro-border); padding: 5px 9px; text-align: right; white-space: nowrap; }
.grid thead th { background: var(--gro-panel); font-weight: 800; color: var(--gro-faint); font-size: 11px; }
/* Ancho fijo por semana para que todas las marcas alineen sus columnas: si cada
   tabla se dimensiona por su contenido, los paneles quedan desfasados entre sí. */
.grid td, .grid thead th:not(.acc) { min-width: 88px; }
.grid th.acc { text-align: left; position: sticky; left: 0; background: var(--gro-surface); z-index: 1; width: 230px; overflow: hidden; text-overflow: ellipsis; }
.grid thead th.acc { background: var(--gro-panel); }
.a-net { font-weight: 800; color: var(--gro-ink); }
.a-nom { color: var(--gro-faint); margin-left: 6px; }
.grid .now { background: var(--gro-panel); }
/* Los meses que todavía no llegaron se atenúan en vez de ocultarse: se ve que el
   año tiene 12 columnas y cuántas faltan por vivir. */
.grid .future { opacity: .4; }
.grid .n { font-weight: 700; color: var(--gro-ink); font-variant-numeric: tabular-nums; }
.grid .d { display: block; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
.grid .d.up { color: var(--gro-up); }
.grid .d.down { color: var(--gro-down); }
.grid .d em { font-style: normal; cursor: help; }
.grid .none { color: var(--gro-dim); }
.grid tr.tot th, .grid tr.tot td { background: var(--gro-panel); font-weight: 800; border-top: 2px solid var(--gro-border); }

/* El diseño 1c: cola fija a la izquierda, foco a la derecha. */
.shell { display: grid; grid-template-columns: 330px 1fr; background: var(--gro-surface); border: 1px solid var(--gro-border); border-radius: 28px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, .06); }

/* ── Cola ── */
.queue { background: var(--gro-panel); padding: 26px 22px; border-right: 1px solid var(--gro-border); }
.q-count { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; }
.q-count .big { font-size: 30px; font-weight: 800; color: var(--gro-ink); line-height: 1; }
.q-count .of { font-size: 13px; font-weight: 700; color: var(--gro-muted); }
.bar { height: 10px; border-radius: 999px; background: var(--gro-track); overflow: hidden; margin-top: 14px; }
.bar .fill { height: 100%; background: var(--gro-up); border-radius: 999px; transition: width .25s ease; }

.q-list { display: flex; flex-direction: column; gap: 6px; margin-top: 20px; max-height: 520px; overflow-y: auto; }
.q-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 16px; background: transparent; border: 1.5px solid transparent; cursor: pointer; text-align: left; width: 100%; }
.q-item:hover { background: var(--gro-surface); }
.q-item.on { background: var(--gro-surface); border-color: var(--gro-accent); }
.dot { width: 20px; height: 20px; flex: none; border-radius: 999px; background: var(--gro-dim); display: grid; place-items: center; font-size: 11px; color: #fff; font-weight: 800; }
.dot.done { background: var(--gro-up); }
.dot.on { background: var(--gro-accent); }
.q-txt { flex: 1; min-width: 0; }
.q-brand { display: block; font-size: 12.5px; font-weight: 800; color: var(--gro-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.q-net { display: block; font-size: 11.5px; color: var(--gro-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.q-val { font-size: 12px; font-weight: 800; color: var(--gro-dim); font-variant-numeric: tabular-nums; }
.q-val.done { color: var(--gro-up); }

/* ── Foco ── */
.focus { padding: 30px 34px 32px; }
.f-top { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.keys { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 11.5px; font-weight: 700; color: var(--gro-muted); }
.key { display: inline-flex; align-items: center; gap: 6px; }
/* color explícito: el reboot de CoreUI pinta kbd con texto blanco sobre fondo
   oscuro, así que cambiar solo el fondo deja la tecla invisible. */
kbd { padding: 4px 10px; border-radius: 999px; background: var(--gro-panel); border: 1px solid var(--gro-border); color: var(--gro-ink); font: inherit; font-size: 11px; }
h2 { font-size: 30px; font-weight: 800; line-height: 1.15; margin: 10px 0 0; color: var(--gro-ink); }
.f-sub { font-size: 13px; color: var(--gro-muted); margin: 3px 0 0; }
.tag { font-size: 9.5px; font-weight: 800; letter-spacing: .08em; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; }
.tag.manual { background: #fef3c7; color: #b45309; }
.tag.api { background: var(--gro-up-bg); color: var(--gro-up); }

.f-row { display: flex; gap: 18px; align-items: stretch; margin-top: 22px; flex-wrap: wrap; }
.card { background: var(--gro-surface); border: 1px solid var(--gro-border); border-radius: 28px; padding: 20px 22px; }
.capture { flex: 1; min-width: 320px; }
.trend { width: 300px; background: var(--gro-panel); border-color: transparent; }
.cap-t { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--gro-faint); font-weight: 700; }
.cap-in { display: flex; align-items: center; gap: 14px; margin-top: 12px; }
.inp { flex: 1; min-width: 0; background: var(--gro-surface); border: 2px solid var(--gro-accent); border-radius: 999px; padding: 12px 22px; font-size: 28px; font-weight: 800; line-height: 1; color: var(--gro-ink); font-variant-numeric: tabular-nums; }
.inp:focus { outline: 3px solid rgba(0, 32, 96, .18); outline-offset: 1px; }
.cap-vs { text-align: right; }
.vs-l { font-size: 11px; color: var(--gro-faint); font-weight: 700; }
.vs-d { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
.vs-d.up { color: var(--gro-up); }
.vs-d.down { color: var(--gro-down); }
.vs-d.none { color: var(--gro-dim); }
.cap-btns { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }

.spark { width: 100%; height: 78px; margin-top: 14px; display: block; overflow: visible; }
.spark-empty { font-size: 12px; color: var(--gro-dim); margin-top: 22px; }
.t-range { display: flex; justify-content: space-between; font-size: 11px; color: var(--gro-muted); font-weight: 700; margin-top: 8px; }
.note { margin-top: 14px; font-size: 12.5px; color: var(--gro-up); background: var(--gro-up-bg); border-radius: 16px; padding: 10px 14px; font-weight: 600; }

.recent { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; }
.r-card { background: var(--gro-panel); border-radius: 16px; padding: 12px 14px; border: 1px solid var(--gro-border); }
.r-w { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--gro-faint); font-weight: 700; }
.r-v { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; }
.r-v .n { font-size: 17px; font-weight: 800; color: var(--gro-ink); font-variant-numeric: tabular-nums; }
.r-v .d { font-size: 12px; font-weight: 800; }
.r-v .d.up { color: var(--gro-up); }
.r-v .d.down { color: var(--gro-down); }

@media (max-width: 980px) {
  .shell { grid-template-columns: 1fr; }
  .queue { border-right: none; border-bottom: 1px solid var(--gro-border); }
  .recent { grid-template-columns: repeat(2, 1fr); }
}

/* ── Dark ── */
[data-coreui-theme="dark"] .gro-page {
  --gro-surface: #1A1A14;
  --gro-panel: #1F1F1A;
  --gro-border: #2A2A22;
  --gro-ink: #F4F4F0;
  --gro-muted: #C9C9C1;
  --gro-faint: #A0A099;
  --gro-dim: #6B6B62;
  --gro-track: #2A2A22;
  --gro-accent: #8FAADC;
  --gro-up: #34D399;
  --gro-up-bg: rgba(52, 211, 153, .14);
  --gro-down: #F87171;
  --gro-down-bg: rgba(248, 113, 113, .14);
  --gro-line: #8FAADC;
}
/* Los mismos 6 hues re-escalonados para el fondo oscuro: no es un flip
   automático, cada paso se validó contra la superficie #1A1A14. */
[data-coreui-theme="dark"] .gro-page .panel[data-brand="1"] { --brand: #3987e5; }
[data-coreui-theme="dark"] .gro-page .panel[data-brand="2"] { --brand: #d95926; }
[data-coreui-theme="dark"] .gro-page .panel[data-brand="3"] { --brand: #199e70; }
[data-coreui-theme="dark"] .gro-page .panel[data-brand="4"] { --brand: #c98500; }
[data-coreui-theme="dark"] .gro-page .panel[data-brand="5"] { --brand: #d55181; }
/* El verde no cambia de paso: en oscuro ya pasa contraste, y aclararlo lo pega
   al aqua del slot 3 (probado: peor par 7.8 contra 10.6). */
[data-coreui-theme="dark"] .gro-page .panel[data-brand="6"] { --brand: #008300; }
[data-coreui-theme="dark"] .gro-page .btn.primary,
[data-coreui-theme="dark"] .gro-page .dot.on { color: #14140F; }
[data-coreui-theme="dark"] .gro-page .dot.done { color: #14140F; }
[data-coreui-theme="dark"] .gro-page .shell { box-shadow: none; }
[data-coreui-theme="dark"] .gro-page .tag.manual { background: rgba(251, 191, 36, .18); color: #FBBF24; }
[data-coreui-theme="dark"] .gro-page .inp:focus { outline-color: rgba(143, 170, 220, .3); }
</style>
