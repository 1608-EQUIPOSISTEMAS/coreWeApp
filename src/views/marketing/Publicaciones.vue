<template>
  <div class="pub-page">
    <div class="pub-head">
      <div>
        <div class="eyebrow">MARKETING · PUBLICACIONES RRSS</div>
        <h1>Calendario de publicaciones</h1>
      </div>
      <div class="grow"></div>
      <div class="period-nav">
        <button class="arrow" type="button" @click="shiftMonth(-1)">‹</button>
        <span class="lbl">{{ monthLabel }}</span>
        <button class="arrow" type="button" @click="shiftMonth(1)">›</button>
      </div>
      <button class="btn ghost" type="button" :disabled="syncing" @click="syncNow">
        {{ syncing ? 'Sincronizando…' : '⟳ Sincronizar' }}
      </button>
      <button class="btn primary" type="button" @click="openModal()">+ Nueva publicación</button>
    </div>

    <!-- Resumen del mes -->
    <div class="stats">
      <div class="st"><span class="n">{{ count('PROGRAMADO') }}</span><span class="l">Programadas</span></div>
      <div class="st ok"><span class="n">{{ count('PUBLICADO') }}</span><span class="l">Publicadas</span></div>
      <div class="st warn"><span class="n">{{ count('NO_PROGRAMADO') }}</span><span class="l">Sin programar</span></div>
      <div class="st alert" v-if="pendConfirm"><span class="n">{{ pendConfirm }}</span><span class="l">Por confirmar</span></div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="chips">
        <button v-for="f in NETWORKS" :key="f.v" type="button"
                :class="['chip', { on: fNetwork === f.v }]" @click="fNetwork = f.v">{{ f.t }}</button>
      </div>
      <div class="chips">
        <button v-for="f in STATUS_FILTER" :key="f.v" type="button"
                :class="['chip', { on: fStatus === f.v }]" @click="fStatus = f.v">{{ f.t }}</button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="panel">
      <table class="tbl">
        <thead>
          <tr>
            <th>Red</th><th>Cuenta</th><th class="wide">Contenido</th>
            <th>Programada</th><th>Publicada</th><th>Estado</th><th>Origen</th><th></th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr v-for="n in 6" :key="'sk' + n">
            <td v-for="c in 8" :key="c"><span class="skel"></span></td>
          </tr>
        </tbody>
        <tbody v-else-if="!filtered.length">
          <tr><td colspan="8" class="empty">Sin publicaciones en este periodo.</td></tr>
        </tbody>
        <tbody v-else>
          <tr v-for="p in filtered" :key="p.post_id" :class="{ dim: p.status === 'CANCELADO' }">
            <td><span :class="['net', p.network.toLowerCase()]">{{ p.network === 'IG' ? 'Instagram' : 'LinkedIn' }}</span></td>
            <td class="acc">{{ p.account_name || '—' }}</td>
            <td class="wide">
              <div class="cap" :title="p.caption || ''">{{ p.caption || '—' }}</div>
              <a v-if="p.permalink" class="lnk" :href="p.permalink" target="_blank" rel="noopener">ver publicación ↗</a>
            </td>
            <td>{{ fdate(p.scheduled_at) }}</td>
            <td>{{ fdate(p.published_at) }}</td>
            <td><span :class="['status', p.status.toLowerCase()]">{{ STATUS_TXT[p.status] }}</span></td>
            <td><span :class="['src', p.source.toLowerCase()]">{{ p.source === 'AUTO' ? 'Auto' : 'Manual' }}</span></td>
            <td class="acts">
              <button v-if="needsConfirm(p)" class="ab ok" title="Confirmar publicación" @click="confirmPost(p)">✓</button>
              <button v-if="p.status === 'PROGRAMADO'" class="ab pub" title="Marcar como publicada" @click="markPublished(p)">▸</button>
              <button class="ab" title="Editar" @click="openModal(p)">✎</button>
              <button class="ab del" title="Eliminar" @click="removePost(p)">🗑</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal crear/editar (pub-modal: "modal" a secas lo pisa el display:none de Bootstrap) -->
    <dialog ref="dlg" class="pub-modal" @click.self="closeModal">
      <form @submit.prevent="savePost">
        <h2>{{ form.post_id ? 'Editar publicación' : 'Nueva publicación' }}</h2>

        <div v-if="!form.post_id" class="seg">
          <button type="button" :class="{ on: form.mode === 'programar' }" @click="form.mode = 'programar'">Programar</button>
          <button type="button" :class="{ on: form.mode === 'registrar' }" @click="form.mode = 'registrar'">Registrar ya publicada</button>
        </div>

        <div class="row2">
          <label>Red
            <select v-model="form.network" :disabled="!!form.post_id" required>
              <option value="IG">Instagram</option>
              <option value="LINKEDIN">LinkedIn</option>
            </select>
          </label>
          <label>Cuenta / página
            <input v-model="form.account_name" placeholder="we.educacion, WE Educación Ejecutiva…" />
          </label>
        </div>

        <div class="row2">
          <label v-if="form.mode === 'programar' || form.post_id">Fecha y hora programada
            <input type="datetime-local" v-model="form.scheduled_at" :required="form.mode === 'programar' && !form.post_id" />
          </label>
          <label v-if="form.mode === 'registrar' || form.post_id">Fecha y hora de publicación
            <input type="datetime-local" v-model="form.published_at" :required="form.mode === 'registrar' && !form.post_id" />
          </label>
        </div>

        <label>Contenido / descripción
          <textarea v-model="form.caption" rows="3" placeholder="Texto o resumen de la publicación"></textarea>
        </label>
        <label>Link (opcional)
          <input v-model="form.permalink" placeholder="https://…" />
        </label>
        <label>Notas
          <input v-model="form.notes" placeholder="Observaciones internas" />
        </label>

        <div class="m-foot">
          <button type="button" class="btn ghost" @click="closeModal">Cancelar</button>
          <button type="submit" class="btn primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, inject, onMounted, watch } from 'vue'
import { ServiceKeys } from '@/services'

const marketing = inject(ServiceKeys.Marketing)

const NETWORKS = [{ v: '', t: 'Todas las redes' }, { v: 'IG', t: 'Instagram' }, { v: 'LINKEDIN', t: 'LinkedIn' }]
const STATUS_FILTER = [
  { v: '', t: 'Todos' }, { v: 'PROGRAMADO', t: 'Programadas' },
  { v: 'PUBLICADO', t: 'Publicadas' }, { v: 'NO_PROGRAMADO', t: 'Sin programar' }
]
const STATUS_TXT = { PROGRAMADO: 'Programada', PUBLICADO: 'Publicada', NO_PROGRAMADO: 'Sin programar', CANCELADO: 'Cancelada' }

const today = new Date()
const month = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
const posts = ref([])
const loading = ref(true)
const syncing = ref(false)
const saving = ref(false)
const fNetwork = ref('')
const fStatus = ref('')
const dlg = ref(null)

const form = reactive({ post_id: null, mode: 'programar', network: 'IG', account_name: '', scheduled_at: '', published_at: '', caption: '', permalink: '', notes: '' })

const monthLabel = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
})
const filtered = computed(() => posts.value
  .filter(p => !fNetwork.value || p.network === fNetwork.value)
  .filter(p => !fStatus.value || p.status === fStatus.value))
const pendConfirm = computed(() => posts.value.filter(needsConfirm).length)

function count (s) { return posts.value.filter(p => p.status === s).length }
function needsConfirm (p) { return p.status === 'NO_PROGRAMADO' && p.confirmed !== 'Y' }
function fdate (d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function shiftMonth (n) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
// datetime-local trabaja en hora local; toISOString la convierte a UTC para la API.
function toIso (v) { return v ? new Date(v).toISOString() : null }
function toLocal (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

async function load () {
  loading.value = true
  try {
    posts.value = await marketing.socialPosts({ month: month.value })
  } finally { loading.value = false }
}

async function syncNow () {
  syncing.value = true
  try {
    const r = await marketing.syncSocialPosts()
    if (r?.ig_skip && r?.li_skip) {
      alert('Sincronización automática aún sin configurar (faltan credenciales de las APIs). El registro manual funciona normal.')
    }
    await load()
  } finally { syncing.value = false }
}

function openModal (p) {
  form.post_id = p?.post_id || null
  form.mode = p?.published_at ? 'registrar' : 'programar'
  form.network = p?.network || 'IG'
  form.account_name = p?.account_name || ''
  form.scheduled_at = toLocal(p?.scheduled_at)
  form.published_at = toLocal(p?.published_at)
  form.caption = p?.caption || ''
  form.permalink = p?.permalink || ''
  form.notes = p?.notes || ''
  dlg.value.showModal()
}
function closeModal () { dlg.value.close() }

async function savePost () {
  saving.value = true
  try {
    const payload = {
      network: form.network,
      account_name: form.account_name || null,
      scheduled_at: toIso(form.scheduled_at),
      published_at: toIso(form.published_at),
      caption: form.caption || null,
      permalink: form.permalink || null,
      notes: form.notes || null
    }
    if (form.post_id) await marketing.updateSocialPost(form.post_id, payload)
    else await marketing.createSocialPost(payload)
    closeModal()
    await load()
  } finally { saving.value = false }
}

async function confirmPost (p) {
  await marketing.updateSocialPost(p.post_id, { confirmed: 'Y' })
  p.confirmed = 'Y'
}
async function markPublished (p) {
  await marketing.updateSocialPost(p.post_id, { status: 'PUBLICADO', published_at: new Date().toISOString(), confirmed: 'Y' })
  await load()
}
async function removePost (p) {
  if (!window.confirm('¿Eliminar esta publicación del registro?')) return
  await marketing.deleteSocialPost(p.post_id)
  await load()
}

watch(month, load)
onMounted(load)
</script>

<style scoped>
.pub-page { padding: 6px 4px 30px; }
.pub-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.pub-head .grow { flex: 1; }
.eyebrow { font-size: 11px; letter-spacing: .12em; font-weight: 700; color: #64748b; }
h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 2px 0 0; }
.period-nav { display: flex; align-items: center; gap: 6px; }
.period-nav .lbl { font-weight: 700; text-transform: capitalize; min-width: 130px; text-align: center; }
.period-nav .arrow { border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; width: 30px; height: 30px; cursor: pointer; font-size: 16px; }
.btn { border-radius: 9px; padding: 8px 14px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--we-navy, #002060); color: #fff; }
.btn.ghost { background: #fff; border-color: #e2e8f0; color: #334155; }
.btn:disabled { opacity: .6; cursor: default; }

.stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.st { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 16px; display: flex; align-items: baseline; gap: 8px; }
.st .n { font-size: 20px; font-weight: 800; color: #0f172a; }
.st .l { font-size: 12px; color: #64748b; font-weight: 600; }
.st.ok .n { color: #047857; }
.st.warn .n { color: #b45309; }
.st.alert { border-color: #fca5a5; background: #fef2f2; }
.st.alert .n { color: #b91c1c; }

.filters { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { border: 1px solid #e2e8f0; background: #fff; color: #475569; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
.chip.on { background: var(--we-navy, #002060); border-color: var(--we-navy, #002060); color: #fff; }

.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-size: 11px; letter-spacing: .06em; color: #64748b; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.tbl td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.tbl tr.dim { opacity: .45; }
.tbl .empty { text-align: center; color: #94a3b8; padding: 28px; }
.wide { min-width: 260px; max-width: 420px; }
.cap { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.lnk { font-size: 12px; color: #2563eb; text-decoration: none; }
.acc { white-space: nowrap; color: #475569; }

.net { font-weight: 700; font-size: 12px; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.net.ig { background: #fdf2f8; color: #be185d; }
.net.linkedin { background: #eff6ff; color: #1d4ed8; }
.status { font-weight: 700; font-size: 11.5px; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.status.programado { background: #fffbeb; color: #b45309; }
.status.publicado { background: #ecfdf5; color: #047857; }
.status.no_programado { background: #fef2f2; color: #b91c1c; }
.status.cancelado { background: #f1f5f9; color: #64748b; }
.src { font-size: 11.5px; font-weight: 600; color: #64748b; }
.src.auto { color: #7c3aed; }

.acts { white-space: nowrap; text-align: right; }
.ab { border: 1px solid #e2e8f0; background: #fff; border-radius: 7px; width: 28px; height: 28px; cursor: pointer; margin-left: 4px; font-size: 13px; color: #475569; }
.ab.ok { color: #047857; border-color: #a7f3d0; }
.ab.pub { color: #b45309; border-color: #fde68a; }
.ab.del { color: #b91c1c; }

.skel { display: inline-block; width: 70%; height: 13px; border-radius: 6px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: sk 1.2s infinite; }
@keyframes sk { to { background-position: -200% 0; } }

.pub-modal { border: none; border-radius: 16px; padding: 0; width: min(560px, 92vw); box-shadow: 0 24px 60px rgba(2, 6, 23, .25); margin: auto; }
.pub-modal::backdrop { background: rgba(2, 6, 23, .45); }
.pub-modal form { padding: 22px; display: flex; flex-direction: column; gap: 12px; }
.pub-modal h2 { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 2px; }
.seg { display: flex; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.seg button { flex: 1; padding: 8px; border: none; background: #fff; font-weight: 700; font-size: 13px; color: #64748b; cursor: pointer; }
.seg button.on { background: var(--we-navy, #002060); color: #fff; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pub-modal label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 700; color: #475569; }
.pub-modal input, .pub-modal select, .pub-modal textarea { border: 1px solid #e2e8f0; border-radius: 9px; padding: 8px 10px; font-size: 13px; font-family: inherit; color: #0f172a; }
.m-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
@media (max-width: 640px) { .row2 { grid-template-columns: 1fr; } }
</style>
