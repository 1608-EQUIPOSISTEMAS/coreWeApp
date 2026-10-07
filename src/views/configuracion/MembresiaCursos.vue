<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Cursos de membresía</h1>
        <p class="ds-sub">
          {{ draft.length }} de {{ channels.length }} cursos publicados entran a la membresía
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" :disabled="saving || !dirty" @click="save">
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> {{ saving ? 'Guardando…' : 'Guardar lista' }}
        </button>
      </div>
    </header>

    <p class="mc-intro">
      Al activar una membresía, el alumno se inscribe automáticamente en los cursos marcados aquí.
      Un curso nuevo publicado en el Campus <strong>no entra solo</strong>: hay que marcarlo en esta lista.
    </p>

    <p v-if="!isLoading && !configured" class="ds-callout warn">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <span>
        Lista sin configurar. Mientras esté vacía, las membresías siguen inscribiendo en
        <strong>todos los {{ channels.length }} cursos publicados</strong>. Marca los que correspondan y guarda.
      </span>
    </p>

    <p v-if="orphans.length" class="ds-callout info">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span>
        {{ orphans.length }} curso(s) de la lista ya no están publicados en Odoo y no se inscriben:
        <strong>{{ orphans.map(o => o.name || `#${o.id}`).join(', ') }}</strong>.
        Se quitarán de la lista al guardar.
      </span>
    </p>

    <section class="ds-panel">
      <div class="ds-panel-body mc-body">
        <div class="mc-toolbar">
          <div class="mc-search">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input v-model.trim="query" type="text" class="ds-input mc-search-input" placeholder="Buscar curso…" aria-label="Buscar curso" />
          </div>
          <div class="mc-quick">
            <button class="btn-exec btn-exec-ghost btn-sm" type="button" @click="markAll">Marcar todos</button>
            <button class="btn-exec btn-exec-ghost btn-sm" type="button" @click="clearAll">Desmarcar todos</button>
            <span v-if="dirty" class="ds-pill warn">Sin guardar</span>
          </div>
        </div>

        <div v-if="isLoading" class="mc-grid">
          <div v-for="n in 9" :key="'sk' + n" class="mc-skel-card">
            <span class="ds-skel" :style="{ width: (50 + (n % 4) * 12) + '%' }"></span>
          </div>
        </div>

        <p v-else-if="!filtered.length" class="ds-empty ds-empty--lista">
          {{ channels.length ? 'Ningún curso coincide con la búsqueda. Cambia el texto arriba.' : 'Odoo no devolvió cursos publicados.' }}
        </p>

        <div v-else class="mc-grid">
          <label
            v-for="c in filtered"
            :key="c.id"
            class="mc-card"
            :class="{ checked: draft.includes(c.id) }"
          >
            <input type="checkbox" :checked="draft.includes(c.id)" @change="toggle(c.id, $event.target.checked)" />
            <span class="mc-card-body">
              <span class="mc-card-name">{{ c.name }}</span>
              <span class="mc-card-id">canal #{{ c.id }}</span>
            </span>
            <i class="fa-solid fa-check mc-card-check" aria-hidden="true"></i>
          </label>
        </div>
      </div>
    </section>
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
    // 403 no es un fallo de Odoo: culpar a Odoo mandó a buscar el problema
    // al lado equivocado.
    toast.error(err?.response?.status === 403
      ? 'Tu rol no tiene permiso sobre esta lista.'
      : 'No se pudieron cargar los cursos desde Odoo.')
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
.mc-intro { max-width: 760px; margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--ds-ink-2); }

.mc-body { min-height: 320px; }
.mc-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.mc-search { position: relative; display: flex; align-items: center; width: 300px; max-width: 100%; }
.mc-search i { position: absolute; left: 11px; font-size: 11px; color: var(--ds-muted); pointer-events: none; }
/* Prefijo .mc-search a propósito: sin él, el shorthand `padding` de .ds-input
   (global) pisa el padding-left y el texto arranca debajo de la lupa. */
.mc-search .mc-search-input { padding-left: 30px; }
.mc-quick { display: flex; align-items: center; gap: 6px; }

.mc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; align-items: start; }
.mc-card { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface); cursor: pointer; transition: border-color .15s, background .15s; }
.mc-card:hover { border-color: var(--ds-border-strong); }
.mc-card:focus-within { outline: 2px solid var(--ds-accent); outline-offset: -2px; }
.mc-card.checked { border-color: var(--ds-accent); background: var(--ds-soft-info); }
.mc-card input { flex-shrink: 0; accent-color: var(--ds-accent); }
.mc-card-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.mc-card-name { font-size: 12.5px; font-weight: 600; color: var(--ds-ink); }
.mc-card-id { font-family: var(--ds-font-mono); font-size: 10px; color: var(--ds-muted); }
.mc-card-check { margin-left: auto; color: var(--ds-accent); opacity: 0; transition: opacity .15s; }
.mc-card.checked .mc-card-check { opacity: 1; }

.mc-skel-card { padding: 14px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); }

@media (max-width: 900px) {
  .mc-search { width: 100%; }
}
</style>
