<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-text">
            <span class="brand-eyebrow">Configuración</span>
            <h1 class="brand-title">Cursos de Membresía</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <div class="inline-kpi">
            <span class="inline-kpi-label">En la membresía</span>
            <span class="inline-kpi-value accent">{{ draft.length }}<span class="kpi-total"> / {{ channels.length }}</span></span>
          </div>
          <button class="btn-exec btn-exec-primary" :disabled="saving || !dirty" @click="save">
            <i class="fa-solid fa-floppy-disk"></i> {{ saving ? 'Guardando...' : 'Guardar lista' }}
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <p class="intro">
        Al activar una membresía el alumno se inscribe automáticamente en los cursos marcados aquí.
        Un curso nuevo publicado en el Campus <strong>no entra solo</strong>: hay que marcarlo en esta lista.
      </p>

      <div v-if="!isLoading && !configured" class="banner banner-warn">
        <i class="fa-solid fa-triangle-exclamation me-1"></i>
        Lista sin configurar. Mientras esté vacía, las membresías siguen inscribiendo en
        <strong>todos los {{ channels.length }} cursos publicados</strong>. Marque los que correspondan y guarde.
      </div>

      <div v-if="orphans.length" class="banner banner-info">
        <i class="fa-solid fa-circle-info me-1"></i>
        {{ orphans.length }} curso(s) de la lista ya no están publicados en Odoo y no se inscriben:
        <strong>{{ orphans.map(o => o.name || `#${o.id}`).join(', ') }}</strong>.
        Se quitarán de la lista al guardar.
      </div>

      <section class="detail-panel">
        <div class="toolbar">
          <div class="search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input v-model.trim="query" type="text" class="exec-input-light search-input" placeholder="Buscar curso..." />
          </div>
          <div class="quick-actions">
            <button class="btn-link" @click="markAll">Marcar todos</button>
            <span class="text-muted">·</span>
            <button class="btn-link" @click="clearAll">Desmarcar todos</button>
            <span v-if="dirty" class="pill pill-amber ms-2">Sin guardar</span>
          </div>
        </div>

        <template v-if="isLoading">
          <div class="courses-grid">
            <div v-for="n in 9" :key="'sk' + n" class="skel-card">
              <span class="skel" :style="{ width: (50 + (n % 4) * 12) + '%' }"></span>
            </div>
          </div>
        </template>

        <div v-else-if="!filtered.length" class="empty-state">
          {{ channels.length ? 'Ningún curso coincide con la búsqueda.' : 'Odoo no devolvió cursos publicados.' }}
        </div>

        <div v-else class="courses-grid">
          <label
            v-for="c in filtered"
            :key="c.id"
            class="course-card"
            :class="{ checked: draft.includes(c.id) }"
          >
            <input type="checkbox" :checked="draft.includes(c.id)" @change="toggle(c.id, $event.target.checked)" />
            <div class="course-body">
              <span class="course-name">{{ c.name }}</span>
              <span class="course-id text-mono">canal #{{ c.id }}</span>
            </div>
            <i class="fa-solid fa-check course-check"></i>
          </label>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const toast = useToast()
const configService = inject(ServiceKeys.Config)

const channels = ref([])
const orphans = ref([])
const configured = ref(false)
const draft = ref([])      // channel_ids marcados
const saved = ref([])      // ultimo estado persistido, para detectar cambios
const query = ref('')
const isLoading = ref(false)
const saving = ref(false)

const filtered = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return channels.value
  return channels.value.filter(c => (c.name || '').toLowerCase().includes(q))
})

function sortedJson(arr) {
  return JSON.stringify([...arr].sort((a, b) => a - b))
}

const dirty = computed(() => sortedJson(draft.value) !== sortedJson(saved.value))

function toggle(id, on) {
  if (on) {
    if (!draft.value.includes(id)) draft.value.push(id)
  } else {
    draft.value = draft.value.filter(x => x !== id)
  }
}

// Marcar/desmarcar respeta el filtro de busqueda: con "Excel" escrito solo
// afecta lo que se ve, que es lo que el usuario espera al ver la lista filtrada.
function markAll() {
  draft.value = [...new Set([...draft.value, ...filtered.value.map(c => c.id)])]
}

function clearAll() {
  const visible = new Set(filtered.value.map(c => c.id))
  draft.value = draft.value.filter(id => !visible.has(id))
}

async function save() {
  saving.value = true
  try {
    await configService.membershipCourseSave(draft.value)
    toast.success(`Lista guardada: ${draft.value.length} cursos entran a la membresía.`)
    await fetch()
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudo guardar la lista.')
  } finally {
    saving.value = false
  }
}

async function fetch() {
  try {
    const data = await configService.membershipCourseList()
    channels.value = data.channels || []
    orphans.value = data.orphans || []
    configured.value = !!data.configured
    saved.value = channels.value.filter(c => c.included).map(c => c.id)
    draft.value = [...saved.value]
  } catch (err) {
    console.error('Error cargando cursos de membresía:', err)
    toast.error('No se pudieron cargar los cursos desde Odoo.')
    channels.value = []
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await fetch()
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.exec-shell { min-height: 100vh; display: flex; flex-direction: column; font-size: 13px; color: var(--text-primary, #0f172a); }

/* El masthead NO se pinta aca: style.scss lo fuerza a claro con !important
   desde la unificacion de marca 07/2026. Solo layout. */
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-eyebrow { display: block; margin-bottom: 3px; }
.brand-title { margin: 0; }
.masthead-actions { display: flex; gap: 16px; align-items: center; }

/* Contador. Los colores los pone .exec-masthead .inline-kpi-* del global
   (claro y dark): pintarlos aca da texto blanco sobre fondo blanco. */
.inline-kpi { text-align: right; }
.inline-kpi-label { display: block; font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
.inline-kpi-value { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.kpi-total { font-size: 12px; font-weight: 600; opacity: .55; }

.exec-body { flex: 1; padding: 20px 28px; }
.intro { font-size: 12.5px; color: var(--text-secondary, #475569); max-width: 760px; margin: 0 0 14px; line-height: 1.55; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-link { background: none; border: none; color: var(--teal-600, #0d9488); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; }
.btn-link:hover { text-decoration: underline; }

.banner { border-radius: 6px; padding: 10px 14px; font-size: 12.5px; margin-bottom: 12px; line-height: 1.5; }
.banner-warn { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
.banner-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

.detail-panel { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); padding: 16px 18px; min-height: 320px; }

.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.search-wrap { position: relative; display: flex; align-items: center; }
.search-wrap i { position: absolute; left: 11px; font-size: 11px; color: var(--text-muted, #94a3b8); pointer-events: none; }
/* Prefijo .search-wrap a proposito: sin el, el shorthand `padding` de
   .exec-input-light (declarado despues) pisa el padding-left y el texto
   arranca debajo de la lupa. */
.search-wrap .search-input { width: 280px; max-width: 100%; padding-left: 30px; }
.quick-actions { display: flex; gap: 8px; align-items: center; }

.courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; align-items: start; }
.course-card { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; background: #fff; padding: 11px 14px; cursor: pointer; transition: all .15s; }
.course-card:hover { border-color: var(--slate-400, #94a3b8); }
.course-card.checked { border-color: var(--teal-500, #14b8a6); background: rgba(20,184,166,.06); }
.course-card input { accent-color: var(--teal-500, #14b8a6); flex-shrink: 0; }
.course-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.course-name { font-weight: 600; font-size: 12.5px; }
.course-id { font-size: 10px; color: var(--text-muted, #94a3b8); }
.course-check { margin-left: auto; color: var(--teal-500, #14b8a6); opacity: 0; transition: opacity .15s; }
.course-card.checked .course-check { opacity: 1; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-amber { background: #fef3c7; color: #b45309; }

.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.text-muted { color: var(--text-muted, #94a3b8); }
.me-1 { margin-right: 4px; }
.ms-2 { margin-left: 8px; }
.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }

.exec-input-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; }
.exec-input-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

.skel { display: block; height: 14px; border-radius: 4px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-card { border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 14px; }

@media (max-width: 992px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-body { padding: 16px 12px; }
  .search-wrap .search-input { width: 100%; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .exec-shell {
  --slate-50: #1F1F1A;
  --slate-100: #24241E;
  --slate-300: #3A3A33;
  --slate-400: #8A8A80;
  --border: #2A2A22;
  --text-primary: #F4F4F0;
  --text-secondary: #A0A099;
  --text-muted: #8A8A80;
}
[data-coreui-theme="dark"] .exec-shell .btn-exec-primary { background: #F4F4F0; color: #14140F; border-color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-shell .btn-exec-primary:hover:not(:disabled) { background: #E4E4DD; }
[data-coreui-theme="dark"] .exec-shell .btn-link { color: #2DD4BF; }
[data-coreui-theme="dark"] .exec-shell .detail-panel { background: #1A1A14; box-shadow: 0 1px 4px rgba(0, 0, 0, .4); }
[data-coreui-theme="dark"] .exec-shell .course-card { background: #1A1A14; }
[data-coreui-theme="dark"] .exec-shell .course-card.checked { border-color: #2DD4BF; background: rgba(20, 184, 166, .12); }
[data-coreui-theme="dark"] .exec-shell .banner-warn { background: rgba(245, 158, 11, .12); border-color: rgba(245, 158, 11, .3); color: #FBBF24; }
[data-coreui-theme="dark"] .exec-shell .banner-info { background: rgba(59, 130, 246, .12); border-color: rgba(59, 130, 246, .3); color: #60A5FA; }
[data-coreui-theme="dark"] .exec-shell .pill-amber { background: rgba(245, 158, 11, .16); color: #FBBF24; }
[data-coreui-theme="dark"] .exec-shell .exec-input-light { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-shell .skel { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
[data-coreui-theme="dark"] .exec-shell .text-muted { color: #8A8A80; }
</style>
