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
        <button type="button" :class="{ on: view === 'resumen' }" @click="view = 'resumen'">
          {{ weeks.length }} semanas
        </button>
      </div>
      <div class="period-nav">
        <button class="arrow" type="button" title="Semana anterior" @click="shiftPeriod(-1)">‹</button>
        <span class="lbl">{{ weekLabel(currentWeek) }}</span>
        <button class="arrow" type="button" title="Semana siguiente" @click="shiftPeriod(1)">›</button>
      </div>
      <button class="btn primary" type="button" :disabled="syncing" @click="sync">
        {{ syncing ? 'Sincronizando…' : '⟳ Sincronizar' }}
      </button>
    </div>

    <div v-if="loading" class="empty">Cargando…</div>
    <div v-else-if="!total" class="empty">
      Todavía no hay cuentas dadas de alta. Corré <code>node scripts/seed-social-accounts.mjs</code>.
    </div>

    <!-- ── Resumen: marca × semana ──────────────────────── -->
    <template v-else-if="view === 'resumen'">
      <div class="stats">
        <div class="st">
          <span class="n">{{ fmt(grandTotal) }}</span>
          <span class="l">Seguidores en total</span>
        </div>
        <div class="st" :class="grandGrowth >= 0 ? 'ok' : 'bad'">
          <span class="n">{{ grandGrowth >= 0 ? '+' : '' }}{{ fmt(grandGrowth) }}</span>
          <span class="l">Esta semana</span>
        </div>
        <div class="st" :class="{ warn: pendingCount }">
          <span class="n">{{ pendingCount }}</span>
          <span class="l">Cuentas sin dato de esta semana</span>
        </div>
      </div>

      <div v-for="group in brands" :key="group.brand" class="panel">
        <div class="b-head">
          <span class="b-name">{{ group.brand }}</span>
          <span class="grow"></span>
          <span class="b-tot">
            {{ group.totals[group.totals.length - 1] === null
              ? 'sin datos'
              : `${fmt(group.totals[group.totals.length - 1])} seguidores` }}
          </span>
        </div>
        <div class="t-scroll">
          <table class="grid">
            <thead>
              <tr>
                <th class="acc">Cuenta</th>
                <th v-for="w in weeks" :key="w" :class="{ now: w === currentWeek }">{{ weekLabel(w) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in group.rows" :key="row.account_id">
                <th class="acc" :title="`${row.label} · ${row.display_name}`">
                  <span class="a-net">{{ row.label }}</span>
                  <span class="a-nom">{{ row.display_name }}</span>
                </th>
                <td v-for="w in weeks" :key="w" :class="{ now: w === currentWeek }">
                  <template v-if="row.points.get(w)">
                    <span class="n">{{ fmt(row.points.get(w).followers) }}</span>
                    <span
                      v-if="row.points.get(w).growth !== null"
                      :class="['d', row.points.get(w).growth >= 0 ? 'up' : 'down']"
                    >
                      {{ row.points.get(w).growth >= 0 ? '+' : '' }}{{ fmt(row.points.get(w).growth) }}
                      <em
                        v-if="row.points.get(w).weeks_spanned > 1"
                        :title="`Acumulado de ${row.points.get(w).weeks_spanned} semanas: faltan mediciones intermedias`"
                      >*</em>
                    </span>
                  </template>
                  <span v-else class="none">—</span>
                </td>
              </tr>
              <tr class="tot">
                <th class="acc">Total {{ group.brand }}</th>
                <td v-for="(t, i) in group.totals" :key="i" :class="{ now: weeks[i] === currentWeek }">
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useSocialGrowth } from '@/composables/useSocialGrowth.js'

const {
  queue, brands, weeks, active, activeIndex, activeHistory, activeSpark, activeRecent, activePace,
  currentWeek, previousWeek, total, pendingCount, progressPct,
  loading, syncing, saving,
  load, saveActive, skipActive, focusAccount, sync, shiftPeriod
} = useSocialGrowth()

// "carga" es el trabajo semanal cuenta por cuenta; "resumen" es la evolución de
// varias semanas. Comparten datos y ruta, así que es un solo permiso.
const view = ref('carga')

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

const grandTotal = computed(() =>
  brands.value.reduce((sum, g) => sum + (g.totals[g.totals.length - 1] || 0), 0))

const grandGrowth = computed(() =>
  brands.value.reduce((sum, g) => sum + g.rows.reduce(
    (acc, row) => acc + (row.points.get(currentWeek.value)?.growth || 0), 0), 0))

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

.panel { background: var(--gro-surface); border: 1px solid var(--gro-border); border-radius: 28px; overflow: hidden; margin-bottom: 14px; }
.b-head { display: flex; align-items: baseline; gap: 10px; padding: 11px 18px; border-bottom: 1px solid var(--gro-border); background: var(--gro-panel); }
.b-head .grow { flex: 1; }
.b-name { font-weight: 800; font-size: 12px; letter-spacing: .06em; color: var(--gro-accent); }
.b-tot { font-size: 11.5px; font-weight: 700; color: var(--gro-faint); font-variant-numeric: tabular-nums; }

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
[data-coreui-theme="dark"] .gro-page .btn.primary,
[data-coreui-theme="dark"] .gro-page .dot.on { color: #14140F; }
[data-coreui-theme="dark"] .gro-page .dot.done { color: #14140F; }
[data-coreui-theme="dark"] .gro-page .shell { box-shadow: none; }
[data-coreui-theme="dark"] .gro-page .tag.manual { background: rgba(251, 191, 36, .18); color: #FBBF24; }
[data-coreui-theme="dark"] .gro-page .inp:focus { outline-color: rgba(143, 170, 220, .3); }
</style>
