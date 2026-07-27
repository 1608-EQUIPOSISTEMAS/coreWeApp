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
      <div class="seg sw">
        <button type="button" :class="{ on: view === 'cal' }" @click="view = 'cal'">Calendario</button>
        <button type="button" :class="{ on: view === 'list' }" @click="view = 'list'">Lista</button>
      </div>
      <div class="chips">
        <button v-for="f in NETWORKS" :key="f.v" type="button"
                :class="['chip', { on: fNetwork === f.v }]" @click="fNetwork = f.v">{{ f.t }}</button>
      </div>
      <div class="chips">
        <button v-for="f in STATUS_FILTER" :key="f.v" type="button"
                :class="['chip', { on: fStatus === f.v }]" @click="fStatus = f.v">{{ f.t }}</button>
      </div>
    </div>

    <!-- Calendario semanal: franjas horarias × días, Programado / Publicado -->
    <div v-if="view === 'cal'" class="weeks">
      <div v-for="(w, i) in weeks" :key="w.key" class="panel wk">
        <div class="wk-head">
          <span class="wk-n">SEM {{ i + 1 }}</span>
          <span class="wk-r">{{ w.range }}</span>
          <span class="grow"></span>
          <span class="wk-tot">{{ w.pub }} publicadas · {{ w.tot }} en total</span>
        </div>
        <div class="wk-scroll">
          <table class="cal">
            <thead>
              <tr>
                <th class="hcol" rowspan="2">HORA</th>
                <th v-for="d in w.days" :key="d.key" colspan="2"
                    :class="['dhead', { off: !d.inMonth, today: d.isToday }]">
                  {{ d.label }}
                  <span v-if="d.tot" class="dbadge" :title="`${d.pub} publicadas de ${d.tot}`">{{ d.pub }}/{{ d.tot }}</span>
                </th>
              </tr>
              <tr>
                <template v-for="d in w.days" :key="'s' + d.key">
                  <th class="sub" :class="{ off: !d.inMonth }">Programado</th>
                  <th class="sub" :class="{ off: !d.inMonth }">Publicado</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in SLOTS" :key="s">
                <td class="hcol">{{ s }}</td>
                <template v-for="d in w.days" :key="d.key + s">
                  <td v-for="k in ['S', 'P']" :key="k" class="cell" :class="{ off: !d.inMonth }"
                      @click="cell(d.key, s, k).length || newAt(d.key, s, k)">
                    <button v-for="p in cell(d.key, s, k)" :key="k + p.post_id" type="button"
                            :class="['pchip', p.network.toLowerCase(), p.status.toLowerCase()]"
                            :title="`${p.account_name || ''} — ${p.caption || 'sin descripción'}`"
                            @click.stop="openModal(p)">
                      <b>{{ p.network === 'IG' ? 'IG' : 'LI' }}</b> {{ hhmm(k === 'S' ? p.scheduled_at : p.published_at) }}
                    </button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div v-if="view === 'list'" class="panel">
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
        <template v-else>
        <tbody v-for="g in grouped" :key="g.key">
          <tr class="dayrow">
            <td colspan="8">
              <span class="d-lbl">{{ g.label }}</span>
              <span class="d-n">{{ g.items.length }} {{ g.items.length === 1 ? 'publicación' : 'publicaciones' }}</span>
              <span v-if="g.published" class="d-ok">{{ g.published }} publicada{{ g.published === 1 ? '' : 's' }}</span>
              <span v-if="g.ig" class="d-net ig">IG {{ g.ig }}</span>
              <span v-if="g.li" class="d-net linkedin">LI {{ g.li }}</span>
            </td>
          </tr>
          <tr v-for="p in g.items" :key="p.post_id" :class="{ dim: p.status === 'CANCELADO' }">
            <td><span :class="['net', p.network.toLowerCase()]">{{ p.network === 'IG' ? 'Instagram' : 'LinkedIn' }}</span></td>
            <td class="acc">{{ p.account_name || '—' }}</td>
            <td class="wide">
              <div class="cap" :title="p.caption || ''">{{ p.caption || '—' }}</div>
              <a v-if="p.permalink" class="lnk" :href="p.permalink" target="_blank" rel="noopener">ver publicación ↗</a>
            </td>
            <td>{{ fcell(p.scheduled_at, g.key) }}</td>
            <td>{{ fcell(p.published_at, g.key) }}</td>
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
        </template>
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
const view = ref('cal')
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

const q2 = n => String(n).padStart(2, '0')
function dstr (d) { const t = new Date(d); return `${t.getFullYear()}-${q2(t.getMonth() + 1)}-${q2(t.getDate())}` }
function hhmm (d) { const t = new Date(d); return `${q2(t.getHours())}:${q2(t.getMinutes())}` }
// Día efectivo = cuándo se publicó; si aún no, cuándo está programada.
function dayKey (p) {
  const d = p.published_at || p.scheduled_at
  return d ? dstr(d) : ''
}
const grouped = computed(() => {
  const map = new Map()
  for (const p of filtered.value) {
    const k = dayKey(p)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(p)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] || '9999').localeCompare(b[0] || '9999')) // sin fecha al final
    .map(([key, items]) => ({
      key,
      label: key
        ? new Date(`${key}T00:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })
        : 'Sin fecha',
      items,
      published: items.filter(p => p.status === 'PUBLICADO').length,
      ig: items.filter(p => p.network === 'IG').length,
      li: items.filter(p => p.network === 'LINKEDIN').length
    }))
})

function count (s) { return posts.value.filter(p => p.status === s).length }
function needsConfirm (p) { return p.status === 'NO_PROGRAMADO' && p.confirmed !== 'Y' }
function fdate (d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
// Dentro de un grupo el día ya está en la cabecera: solo la hora, salvo que caiga en otro día.
function fcell (d, key) {
  if (!d) return '—'
  return dstr(d) === key ? hhmm(d) : fdate(d)
}

// ── Calendario semanal ──────────────────────────────────────────────
// Franjas fijas del calendario de marketing (mismas de la hoja de Publicaciones).
const SLOTS = ['07:30', '09:00', '10:00', '11:00', '12:00', '13:15', '14:30', '15:30', '16:30', '17:30', '18:00', '18:30', '19:00']
const SLOT_MIN = SLOTS.map(s => Number(s.slice(0, 2)) * 60 + Number(s.slice(3)))
// Cada post cae en la última franja que empieza antes de su hora (lo de antes de 07:30 va a la primera).
function slotOf (d) {
  const t = new Date(d)
  const m = t.getHours() * 60 + t.getMinutes()
  let i = 0
  for (let k = 0; k < SLOT_MIN.length; k++) if (m >= SLOT_MIN[k]) i = k
  return SLOTS[i]
}

// Índice día|franja|tipo → posts. 'S' = por scheduled_at, 'P' = por published_at.
const cellIndex = computed(() => {
  const m = new Map()
  const put = (d, kind, p) => {
    const k = `${dstr(d)}|${slotOf(d)}|${kind}`
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(p)
  }
  for (const p of filtered.value) {
    if (p.scheduled_at) put(p.scheduled_at, 'S', p)
    if (p.published_at) put(p.published_at, 'P', p)
  }
  return m
})
function cell (day, slot, kind) { return cellIndex.value.get(`${day}|${slot}|${kind}`) || [] }

// Conteo por día efectivo: total y publicadas.
const dayCount = computed(() => {
  const m = new Map()
  for (const g of grouped.value) m.set(g.key, { tot: g.items.length, pub: g.published })
  return m
})

const weeks = computed(() => {
  const [y, mo] = month.value.split('-').map(Number)
  const last = new Date(y, mo, 0)
  const cur = new Date(y, mo - 1, 1)
  cur.setDate(1 - ((cur.getDay() + 6) % 7)) // retrocede al lunes de esa semana
  const hoy = dstr(new Date())
  const out = []
  while (cur <= last) {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cur)
      d.setDate(cur.getDate() + i)
      const key = dstr(d)
      const c = dayCount.value.get(key) || { tot: 0, pub: 0 }
      days.push({
        key,
        label: d.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: '2-digit' }),
        inMonth: d.getMonth() === mo - 1,
        isToday: key === hoy,
        tot: c.tot,
        pub: c.pub
      })
    }
    out.push({
      key: days[0].key,
      days,
      range: `${days[0].label} — ${days[6].label}`,
      tot: days.reduce((a, d) => a + d.tot, 0),
      pub: days.reduce((a, d) => a + d.pub, 0)
    })
    cur.setDate(cur.getDate() + 7)
  }
  return out
})

// Click en celda vacía: alta rápida con día y hora ya puestos.
function newAt (day, slot, kind) {
  openModal()
  form.mode = kind === 'P' ? 'registrar' : 'programar'
  if (kind === 'P') form.published_at = `${day}T${slot}`
  else form.scheduled_at = `${day}T${slot}`
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

/* ── Calendario semanal ── */
.seg.sw { width: auto; }
.seg.sw button { padding: 5px 14px; font-size: 12px; }
.weeks { display: flex; flex-direction: column; gap: 14px; }
.wk { overflow: hidden; }
.wk-head { display: flex; align-items: baseline; gap: 10px; padding: 9px 14px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.wk-head .grow { flex: 1; }
.wk-n { font-weight: 800; font-size: 12px; letter-spacing: .06em; color: var(--we-navy, #002060); }
.wk-r { font-size: 12px; color: #64748b; text-transform: capitalize; }
.wk-tot { font-size: 11.5px; font-weight: 700; color: #64748b; }
.wk-scroll { overflow-x: auto; }
.cal { border-collapse: collapse; font-size: 11.5px; width: 100%; min-width: 1000px; }
.cal th, .cal td { border: 1px solid #eef2f7; padding: 0; }
.cal .hcol { width: 58px; min-width: 58px; text-align: center; font-weight: 700; color: #64748b; background: #f8fafc; padding: 4px; }
.cal .dhead { padding: 5px 4px; font-size: 11.5px; font-weight: 800; color: #0f172a; text-transform: capitalize; background: #f8fafc; white-space: nowrap; }
.cal .dhead.today { background: #eef2ff; color: var(--we-navy, #002060); }
.cal .dhead.off, .cal .sub.off, .cal .cell.off { background: #fbfcfd; color: #94a3b8; }
.cal .dbadge { font-size: 10px; font-weight: 700; color: #475569; background: #e2e8f0; border-radius: 999px; padding: 1px 6px; margin-left: 5px; }
.cal .sub { padding: 3px 4px; font-size: 9.5px; font-weight: 700; letter-spacing: .04em; color: #94a3b8; text-transform: uppercase; background: #fff; }
.cal .cell { min-width: 68px; height: 30px; vertical-align: top; padding: 2px; cursor: pointer; }
.cal .cell:hover { background: #f8fafc; }
.pchip { display: block; width: 100%; text-align: left; border: 1px solid transparent; border-radius: 5px; padding: 2px 5px; font-size: 10.5px; font-weight: 600; cursor: pointer; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pchip b { font-weight: 800; }
.pchip.ig { background: #fdf2f8; color: #be185d; border-color: #fbcfe8; }
.pchip.linkedin { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.pchip.cancelado { opacity: .45; text-decoration: line-through; }
.pchip.no_programado { box-shadow: inset 3px 0 0 #ef4444; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-size: 11px; letter-spacing: .06em; color: #64748b; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.tbl td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.tbl tr.dim { opacity: .45; }
.dayrow td { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 7px 12px; }
.d-lbl { font-weight: 800; font-size: 12.5px; color: #0f172a; text-transform: capitalize; }
.d-n { font-size: 11.5px; font-weight: 700; color: #64748b; margin-left: 10px; }
.d-ok { font-size: 11.5px; font-weight: 700; color: #047857; margin-left: 8px; }
.d-net { font-size: 11px; font-weight: 700; margin-left: 8px; padding: 2px 7px; border-radius: 999px; }
.d-net.ig { background: #fdf2f8; color: #be185d; }
.d-net.linkedin { background: #eff6ff; color: #1d4ed8; }
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

/* ══════════ DARK MODE ══════════ */
[data-coreui-theme="dark"] .pub-page .eyebrow { color: #A0A099; }
[data-coreui-theme="dark"] .pub-page h1 { color: #F4F4F0; }
[data-coreui-theme="dark"] .pub-page .period-nav .arrow { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .pub-page .btn.ghost { background: #1F1F1A; border-color: #2A2A22; color: #C9C9C1; }
[data-coreui-theme="dark"] .pub-page .st { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .pub-page .st .n { color: #F4F4F0; }
[data-coreui-theme="dark"] .pub-page .st .l { color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .st.ok .n { color: #34D399; }
[data-coreui-theme="dark"] .pub-page .st.warn .n { color: #FBBF24; }
[data-coreui-theme="dark"] .pub-page .st.alert { background: rgba(239, 68, 68, .14); border-color: rgba(239, 68, 68, .4); }
[data-coreui-theme="dark"] .pub-page .st.alert .n { color: #F87171; }
[data-coreui-theme="dark"] .pub-page .chip { background: #1F1F1A; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .chip.on { background: var(--we-navy, #002060); border-color: var(--we-navy, #002060); color: #fff; }
[data-coreui-theme="dark"] .pub-page .panel { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .pub-page .wk-head { background: #1F1F1A; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .pub-page .wk-n { color: #8FAADC; }
[data-coreui-theme="dark"] .pub-page .wk-r,
[data-coreui-theme="dark"] .pub-page .wk-tot { color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .cal th,
[data-coreui-theme="dark"] .pub-page .cal td { border-color: #24241E; }
[data-coreui-theme="dark"] .pub-page .cal .hcol { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .cal .dhead { background: #1F1F1A; color: #F4F4F0; }
[data-coreui-theme="dark"] .pub-page .cal .dhead.today { background: rgba(143, 170, 220, .18); color: #8FAADC; }
[data-coreui-theme="dark"] .pub-page .cal .dhead.off,
[data-coreui-theme="dark"] .pub-page .cal .sub.off,
[data-coreui-theme="dark"] .pub-page .cal .cell.off { background: #171712; color: #6E6E66; }
[data-coreui-theme="dark"] .pub-page .cal .dbadge { background: #2A2A22; color: #C9C9C1; }
[data-coreui-theme="dark"] .pub-page .cal .sub { background: #1A1A14; color: #6E6E66; }
[data-coreui-theme="dark"] .pub-page .cal .cell:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .pub-page .pchip.ig { background: rgba(236, 72, 153, .14); color: #F9A8D4; border-color: rgba(236, 72, 153, .3); }
[data-coreui-theme="dark"] .pub-page .pchip.linkedin { background: rgba(59, 130, 246, .14); color: #93C5FD; border-color: rgba(59, 130, 246, .3); }
[data-coreui-theme="dark"] .pub-page .tbl th { color: #A0A099; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .pub-page .tbl td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .pub-page .tbl .empty { color: #8A8A80; }
[data-coreui-theme="dark"] .pub-page .dayrow td { background: #1F1F1A; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .pub-page .d-lbl { color: #F4F4F0; }
[data-coreui-theme="dark"] .pub-page .d-n { color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .d-ok { color: #34D399; }
[data-coreui-theme="dark"] .pub-page .d-net.ig { background: rgba(236, 72, 153, .14); color: #F9A8D4; }
[data-coreui-theme="dark"] .pub-page .d-net.linkedin { background: rgba(59, 130, 246, .14); color: #93C5FD; }
[data-coreui-theme="dark"] .pub-page .lnk { color: #60A5FA; }
[data-coreui-theme="dark"] .pub-page .acc { color: #C9C9C1; }
[data-coreui-theme="dark"] .pub-page .net.ig { background: rgba(236, 72, 153, .14); color: #F9A8D4; }
[data-coreui-theme="dark"] .pub-page .net.linkedin { background: rgba(59, 130, 246, .14); color: #93C5FD; }
[data-coreui-theme="dark"] .pub-page .status.programado { background: rgba(245, 158, 11, .14); color: #FBBF24; }
[data-coreui-theme="dark"] .pub-page .status.publicado { background: rgba(16, 185, 129, .14); color: #34D399; }
[data-coreui-theme="dark"] .pub-page .status.no_programado { background: rgba(239, 68, 68, .14); color: #F87171; }
[data-coreui-theme="dark"] .pub-page .status.cancelado { background: #24241E; color: #8A8A80; }
[data-coreui-theme="dark"] .pub-page .src { color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .src.auto { color: #A78BFA; }
[data-coreui-theme="dark"] .pub-page .ab { background: #1F1F1A; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .ab.ok { color: #34D399; border-color: rgba(16, 185, 129, .35); }
[data-coreui-theme="dark"] .pub-page .ab.pub { color: #FBBF24; border-color: rgba(245, 158, 11, .35); }
[data-coreui-theme="dark"] .pub-page .ab.del { color: #F87171; }
[data-coreui-theme="dark"] .pub-page .skel { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
[data-coreui-theme="dark"] .pub-page .pub-modal { background: #1A1A14; color: #F4F4F0; box-shadow: 0 24px 60px rgba(0, 0, 0, .6); }
[data-coreui-theme="dark"] .pub-page .pub-modal::backdrop { background: rgba(0, 0, 0, .6); }
[data-coreui-theme="dark"] .pub-page .pub-modal h2 { color: #F4F4F0; }
[data-coreui-theme="dark"] .pub-page .pub-modal label { color: #C9C9C1; }
[data-coreui-theme="dark"] .pub-page .pub-modal input,
[data-coreui-theme="dark"] .pub-page .pub-modal select,
[data-coreui-theme="dark"] .pub-page .pub-modal textarea { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .pub-page .seg { border-color: #2A2A22; }
[data-coreui-theme="dark"] .pub-page .seg button { background: #1F1F1A; color: #A0A099; }
[data-coreui-theme="dark"] .pub-page .seg button.on { background: var(--we-navy, #002060); color: #fff; }
</style>
