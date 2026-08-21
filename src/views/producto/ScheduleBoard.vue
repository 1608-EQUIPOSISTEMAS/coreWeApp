<template>
  <div class="board-shell">
    <!-- ════ HEADER ════ -->
    <header class="crono-head">
      <div class="month-badge">{{ monthAbbr }}</div>
      <div class="crono-title">
        <div class="eyebrow">VISTA DE SOLO LECTURA · CRONOGRAMA</div>
        <h1>{{ periodLabel }}</h1>
      </div>
      <div class="grow"></div>

      <div class="month-nav">
        <button type="button" class="arrow" @click="changeMonth(-1)" title="Mes anterior">‹</button>
        <select v-model.number="selectedMonth" @change="fetchAll" class="seg-select">
          <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
        </select>
        <select v-model.number="selectedYear" @change="fetchAll" class="seg-select">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <button type="button" class="arrow" @click="changeMonth(1)" title="Mes siguiente">›</button>
      </div>

      <div class="crono-search">
        <span>⌕</span>
        <input v-model.trim="search" type="search" placeholder="Buscar curso, docente, código…" />
      </div>

      <select v-model="lineFilter" class="line-filter">
        <option value="">Todas las líneas</option>
        <option v-for="l in courseLines" :key="l" :value="l">{{ l }}</option>
      </select>

      <button type="button" class="refresh" @click="fetchAll" title="Recargar">↻</button>
    </header>

    <!-- ════ KPIs ════ -->
    <div class="kpis">
      <!-- inscripciones con su desglose: de qué canal sale cada alumno -->
      <div class="kpi kpi-canales">
        <div class="lbl"><span class="dot" style="background:var(--c-orange)"></span>Inscripciones</div>
        <div class="val">
          <span v-if="isLoading" class="skel-kpi" style="width:320px"></span>
          <template v-else>
            <b class="big">{{ kpiSums.inscritos }}</b>
            <span class="eq">=</span>
            <span v-for="(c, i) in AULA_CHANNELS" :key="c.key" class="chit" :title="c.desc">
              <i v-if="i" class="sep">/</i>
              <span class="dot" :style="{ background: c.color }"></span>{{ c.title }}<b>{{ kpiSums.ch[c.key] }}</b>
            </span>
          </template>
        </div>
      </div>

      <div class="kpi">
        <div class="lbl"><span class="dot" style="background:var(--c-sky)"></span>Programas</div>
        <div class="val">
          <span v-if="isLoading" class="skel-kpi" style="width:48px"></span>
          <template v-else><b>{{ kpiSums.count }}</b><span>ediciones</span></template>
        </div>
      </div>

      <div class="kpi">
        <div class="lbl"><span class="dot" style="background:var(--c-purple)"></span>Ventas vs Objetivo</div>
        <div class="val">
          <span v-if="isLoading" class="skel-kpi"></span>
          <template v-else>
            <b>{{ kpiVsObjetivo.ventas }}</b>
            <span class="vs">/ {{ kpiVsObjetivo.objetivo }}</span>
            <span class="kpct" :style="{ background: soft(kpiVsObjetivo.color), color: kpiVsObjetivo.color }">{{ kpiVsObjetivo.pct }}%</span>
          </template>
        </div>
      </div>

    </div>

    <!-- ════ TABLA ════ -->
    <div class="crono-tbl">
      <table class="crono">
        <thead>
          <tr>
            <th title="Cuenta apertura / Cuenta programada">CA · CP</th>
            <th>CURSO · IDENTIFICACIÓN</th>
            <th>CRONOGRAMA</th>
            <th>DOCENTE</th>
            <th>SEGUIMIENTO</th>
            <th class="th-group">
              <div class="g-title">AULA / INSCRITOS</div>
              <div class="g-cols"><span>VEN</span><span>SEG</span><span>B2B</span><span>MEM</span><span>BEC</span><span class="hot">AULA</span></div>
            </th>
            <th>OBJETIVO</th>
            <th class="c-num" title="Consultas (leads)">CONS.</th>
            <th class="c-num">OBS.</th>
          </tr>
        </thead>

        <tbody>
          <!-- skeleton -->
          <template v-if="isLoading">
            <tr v-for="n in 7" :key="'sk' + n" class="skrow">
              <td v-for="c in 9" :key="c"><span class="sk" :style="{ width: (55 + ((n + c) * 13) % 40) + '%' }"></span></td>
            </tr>
          </template>

          <!-- contenido -->
          <template v-else>
            <template v-for="week in displayWeeks" :key="week.schedule">
              <tr class="week-row">
                <td :colspan="9">
                  <div class="week-bar" :class="{ collapsed: !week.isOpen }" @click="toggleWeek(week.schedule)">
                    <button type="button" class="caret"><span>▾</span></button>
                    <span class="wk-chip"></span>
                    <h3>Semana {{ week.schedule }}</h3>
                    <span class="ed-pill">{{ week.count }} ediciones</span>
                    <span class="grow"></span>
                    <span class="stat">{{ week.summary }}</span>
                  </div>
                </td>
              </tr>

              <template v-for="it in (week.isOpen ? week.items : [])" :key="it.e.edition_num_id">
                <tr class="ed" :class="[it.fam ? 'fam' : 'solo', 'clickable', { fused: it.fused }, it.e.meta_vacantes ? 'meta' : 'sinmeta', 'segrow-' + (it.e.cat_segment || 'none').toLowerCase()]" :style="{ '--seg': it.sc.tint }" @click="openAulaInfo(it)">
                  <!-- CA / CP -->
                  <td>
                    <div class="cacp">
                      <div class="kv"><span class="k">CA</span><span class="v">{{ it.e.calc_da ?? 0 }}</span></div>
                      <div class="kv"><span class="k">CP</span><span class="v">{{ it.e.calc_dp ?? 0 }}</span></div>
                    </div>
                  </td>

                  <!-- Curso / Identificación -->
                  <td class="c-curso">
                    <div :class="it.depth > 0 ? 'child-wrap' : null">
                      <div v-if="it.depth > 0" class="child-connector" :style="{ marginLeft: ((it.depth - 1) * 18) + 'px' }"><span class="node"></span></div>
                      <div class="curso">
                        <div class="top">
                          <span class="lvl-badge" :style="{ background: soft(it.sc.color), color: it.sc.color }">{{ it.e.cat_segment || '—' }}</span>
                          <span class="name">{{ it.e.program_abreviature || '—' }}</span>
                          <span v-if="isNewMet(it.e)" class="nm-badge" title="Curso con la nueva metodología">NM</span>
                        </div>
                        <div class="area">{{ lineLabel(it.e) }} · {{ typeLabel(it.e) }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Cronograma -->
                  <td>
                    <div class="cro">
                      <div class="dates">
                        <span class="date-chip">{{ fmtShort(it.e.start_date) }}</span>
                        <span class="arrow-to">→</span>
                        <span class="date-end">{{ fmtShort(it.e.end_date) }}</span>
                        <span class="ses" v-if="it.e.program_sessions">· {{ it.e.program_sessions }} ses</span>
                      </div>
                      <div class="when"><b>{{ daysLabel(it.e) }}</b> · {{ hourLabel(it.e) }}</div>
                    </div>
                  </td>

                  <!-- Docente: clic = copiar TODOS los docentes, no abre el modal.
                       Con más de 2, el hover muestra un popover con la lista completa. -->
                  <td class="doc-copy" @click.stop="copyDocentes(it.e)" :title="docentes(it.e).length > 2 ? '' : 'Clic para copiar: ' + docentes(it.e).join(', ')">
                    <div class="docs">
                      <div class="lbl">{{ docentes(it.e).length > 1 ? 'DOCENTES' : 'DOCENTE' }}</div>
                      <div v-for="(d, i) in docentes(it.e).slice(0, 2)" :key="i" class="name" :class="{ multi: docentes(it.e).length > 1 }" :title="d">{{ d }}</div>
                      <div v-if="docentes(it.e).length > 2" class="more">+{{ docentes(it.e).length - 2 }} más</div>
                      <div v-if="docentes(it.e).length > 2" class="doc-pop">
                        <div class="lbl">DOCENTES ({{ docentes(it.e).length }})</div>
                        <div v-for="(d, i) in docentes(it.e)" :key="'p' + i" class="pop-name">{{ d }}</div>
                        <div class="pop-hint">Clic para copiar todos</div>
                      </div>
                    </div>
                  </td>

                  <!-- Seguimiento -->
                  <td>
                    <div class="segui">
                      <div class="item"><span class="g" :class="it.e.expedient ? 'ok' : 'no'"></span>Ficha</div>
                      <div class="item"><span class="g" :class="it.e.confirmation ? 'ok' : 'no'"></span>Docente</div>
                    </div>
                  </td>

                  <!-- Aula / Inscritos -->
                  <td>
                    <div class="aula-cell">
                      <span class="acol" :class="{ zero: !it.e.cnt_ventas }">{{ it.e.cnt_ventas ?? 0 }}</span>
                      <span class="acol" :class="{ zero: !it.e.cnt_segui }">{{ it.e.cnt_segui ?? 0 }}</span>
                      <span class="acol" :class="{ zero: !it.e.cnt_b2b }">{{ it.e.cnt_b2b ?? 0 }}</span>
                      <span class="acol" :class="{ zero: !it.e.cnt_memb }">{{ it.e.cnt_memb ?? 0 }}</span>
                      <span class="acol bec">{{ it.e.cnt_becas ?? 0 }}</span>
                      <span class="acol total" :class="{ empty: !(it.e.cnt_aula ?? 0) }"
                        :style="(it.e.cnt_aula ?? 0) ? { background: aulaColor(it.e.cnt_aula) } : null">{{ it.e.cnt_aula ?? 0 }}</span>
                    </div>
                  </td>

                  <!-- Objetivo -->
                  <td>
                    <div class="obj">
                      <template v-if="it.e.meta_vacantes">
                        <div class="orow">
                          <span class="frac"><b>{{ it.e.cnt_ventas ?? 0 }}</b> <span class="t">/ {{ it.e.meta_vacantes }}</span></span>
                          <span class="pct" :style="{ background: soft(it.fl.color), color: it.fl.color }">{{ it.fl.pct }}%</span>
                        </div>
                        <div class="track"><i :style="{ width: it.fl.w + '%', background: it.fl.color }"></i></div>
                      </template>
                      <span v-else class="sinmeta-txt">Sin meta</span>
                    </div>
                  </td>

                  <!-- Consultas -->
                  <td class="cons" :class="{ zero: !it.e.cnt_consultas }">{{ it.e.cnt_consultas ?? 0 }}</td>

                  <!-- Obs -->
                  <td class="obs" :title="it.e.notes">{{ it.e.notes || '—' }}</td>
                </tr>
              </template>
            </template>

            <!-- vacío -->
            <tr v-if="!displayWeeks.length">
              <td :colspan="9">
                <div class="empty-state">
                  <div class="icon">⌖</div>
                  <div class="big">No hay ediciones para este filtro</div>
                  <div class="sub">Prueba con otro mes, línea o término de búsqueda.</div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div class="crono-foot">
      <span class="dot"></span>
      <span>Haz clic en un curso para ver de dónde sale su AULA · Ficha / Confirmado: punto verde = Sí · <span class="nm-badge">NM</span> = curso con la nueva metodología.</span>
    </div>

    <!-- ════ RESÚMENES DEL MES ════ -->
    <div class="sumgrid">
      <div class="sumcard">
        <div class="sum-title">CANTIDAD DE PROGRAMAS POR CATEGORÍA</div>
        <table class="sumtbl">
          <thead><tr><th v-for="c in catSummary.cols" :key="c.label">{{ c.label }}</th><th class="tot">TOTAL</th></tr></thead>
          <tbody><tr><td v-for="c in catSummary.cols" :key="c.label">{{ c.n }}</td><td class="tot">{{ catSummary.total }}</td></tr></tbody>
        </table>
      </div>
      <div class="sumcard sum-lines">
        <div class="sum-title">CANTIDAD DE PROGRAMAS PROGRAMADOS POR LÍNEAS</div>
        <table class="sumtbl">
          <thead><tr><th v-for="l in lineSummary" :key="l.label">{{ l.label }}</th></tr></thead>
          <tbody><tr><td v-for="l in lineSummary" :key="l.label">{{ l.n }}</td></tr></tbody>
        </table>
      </div>
    </div>

    <div class="sumgrid">
      <div class="sumcard">
        <div class="sum-title">TIPOS DE CURSO</div>
        <table class="deftbl">
          <thead><tr><th>N°</th><th>TIPO</th><th>N° DE TIPO</th><th>DEFINICIÓN</th></tr></thead>
          <tbody>
            <tr v-for="(t, i) in typeSummary" :key="t.key">
              <td class="num">{{ i + 1 }}</td>
              <td class="tag">{{ t.key }}</td>
              <td class="num">{{ t.n }}</td>
              <td class="def">{{ t.def }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="sumcard">
        <div class="sum-title">SEGMENTOS</div>
        <table class="deftbl">
          <thead><tr><th>N°</th><th>SEG</th><th>N° PROG</th><th>DEFINICIÓN</th></tr></thead>
          <tbody>
            <tr v-for="(s, i) in segSummary" :key="s.key" :style="s.tint ? { background: s.tint } : null">
              <td class="num">{{ i + 1 }}</td>
              <td class="tag">{{ s.key }}</td>
              <td class="num">{{ s.n }}</td>
              <td class="def">{{ s.def }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ════ MODAL: de dónde sale el AULA (Información: todos · Alumnos: líderes/gerencia) ════ -->
    <div v-if="aulaModal" class="am-overlay" @click.self="aulaModal = null">
      <div class="am-card" :class="{ wide: amTab === 'alumnos' }">
        <div class="am-head">
          <div>
            <div class="am-eyebrow">¿DE DÓNDE SALE EL AULA?</div>
            <div class="am-title">{{ aulaModal.e.program_abreviature || '—' }}</div>
            <div class="am-sub">{{ lineLabel(aulaModal.e) }} · {{ typeLabel(aulaModal.e) }}</div>
          </div>
          <button type="button" class="am-close" @click="aulaModal = null">✕</button>
        </div>

        <div class="am-tabs">
          <button type="button" :class="{ on: amTab === 'info' }" @click="amTab = 'info'">Información</button>
          <button type="button" :class="{ on: amTab === 'arbol' }" @click="amTab = 'arbol'">Árbol</button>
          <button v-if="canSeeStudents" type="button" :class="{ on: amTab === 'alumnos' }" @click="showStudentsTab">
            Alumnos<span v-if="amStudents"> · {{ amStudents.length }}</span>
          </button>
        </div>

        <!-- Tab: Información (de dónde sale cada canal) -->
        <template v-if="amTab === 'info'">
          <div class="am-body">
            <div v-for="c in AULA_CHANNELS" :key="c.tag" class="am-row">
              <span class="am-tag" :style="{ background: soft(c.color), color: c.color }">{{ c.tag }}</span>
              <div class="am-txt">
                <div class="am-t">{{ c.title }} <b>{{ amChannelValue(c) }}</b></div>
                <div class="am-d">{{ c.desc }}</div>
              </div>
            </div>
          </div>

          <div class="am-foot">
            <div class="am-formula">
              AULA = VEN + SEG + MEM + B2B →
              <b :style="{ color: aulaColor(amFromList ? amAula : (aulaModal.e.cnt_aula ?? 0)) }">{{ amFromList ? amAula : (aulaModal.e.cnt_aula ?? 0) }}</b>
              <span>(las becas ocupan asiento pero no suman)</span>
            </div>
            <div v-if="aulaModal.isProgram" class="am-note">
              Este es un programa padre: sus alumnos se sientan en las aulas de sus cursos hijos,
              por eso su AULA puede ser 0 y los hijos muestran a esos alumnos en la columna SEG.
            </div>
          </div>
        </template>

        <!-- Tab: Árbol (padre + hijos de ESTA edición; si el padre tiene otro padre, sale también) -->
        <template v-else-if="amTab === 'arbol'">
          <div class="am-body">
            <div v-if="!amTree.length" class="am-loading">Esta edición no tiene programas padres ni cursos hijos asociados.</div>
            <div v-else>
              <div v-for="(g, gi) in amTree" :key="gi" class="am-tree-grp">
                <div class="am-tree-parent">
                  <span class="am-tree-ptag">PADRE</span>
                  <b>{{ g.name || '—' }}</b>
                  <span class="am-tree-code">{{ g.code }}</span>
                </div>
                <div v-for="ch in g.children" :key="ch.edition_num_id || ch.global_code" class="am-tree-child" :class="{ cur: ch.is_current }">
                  <span class="am-tree-node"></span>
                  <div class="am-tree-txt">
                    <div>
                      <b>{{ ch.program_abreviature || ch.abbreviation || '—' }}</b>
                      <span v-if="ch.is_current" class="am-tree-curtag">ESTA EDICIÓN</span>
                    </div>
                    <div class="am-tree-meta">
                      {{ ch.global_code || 'S/C' }}<template v-if="ch.specific_code"> · {{ ch.specific_code }}</template>
                      <template v-if="ch.start_date"> · {{ fmtShort(ch.start_date) }} → {{ fmtShort(ch.end_date) }}</template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Tab: Alumnos (quién es de qué canal, con asesor y correo) -->
        <template v-else>
          <div class="am-body am-students">
            <div v-if="amLoading" class="am-loading">Cargando alumnos…</div>
            <div v-else-if="!amStudents || !amStudents.length" class="am-loading">
              No hay alumnos activos en esta aula<template v-if="aulaModal.isProgram">: en los programas padre los alumnos figuran en sus cursos hijos</template>.
            </div>
            <table v-else class="am-tbl">
              <thead>
                <tr><th>CANAL</th><th>ALUMNO</th><th>ASESOR</th><th>CORREO</th><th>DETALLE</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in amStudents" :key="s.enrollment_id" :class="{ 'row-laptop': s.has_laptop_promo }">
                  <td><span class="am-tag" :style="{ background: soft(s.ch.color), color: s.ch.color }">{{ s.ch.tag }}</span></td>
                  <td class="am-name">{{ s.full_name }}</td>
                  <td class="am-agent">{{ agentLabel(s) }}</td>
                  <td class="am-mail">{{ s.platform_user || s.email || '—' }}</td>
                  <td class="am-extra">
                    <!-- Promo LAPTOP (descuento "LAPTOP PROMO"): el alumno trae su equipo -->
                    <span v-if="s.has_laptop_promo" class="am-laptop" title="Esta inscripcion incluye laptop como beneficio">
                      <i class="fa-solid fa-laptop"></i> Traerá laptop
                    </span>
                    <template v-if="s.ch.tag === 'SEG' && s.parent_codes?.length">Viene de {{ s.parent_codes.join(', ') }}</template>
                    <template v-else-if="s.ch.tag === 'MEM' && s.membership_tier_name">{{ s.membership_tier_name }}</template>
                    <template v-else-if="!s.has_laptop_promo">—</template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'

const editionService = inject(ServiceKeys.Edition)
const dashboardService = inject(ServiceKeys.Dashboard)
const toast = useToast()

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const years = [2024, 2025, 2026]
const MABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Paleta por segmento (badge). Las líneas/tipos reales vienen de la data.
// Colores vía tokens CSS (--c-*): en dark el <style> los aclara y todo esto se adapta solo
// `color` = tinta del badge (tokens oscuros, legibles sobre blanco).
// `tint` = hue vivo para el fondo de la fila: los --c-* mezclados al 13% dan un beige/gris
// sucio (el ámbar #a96208 deja de leerse naranja); el hue saturado sí pastelea en ambos temas.
const SEG_COLORS = {
  A1: { color: 'var(--c-blue)', tint: '#3b82f6' },
  A2: { color: 'var(--c-amber)', tint: '#f59e0b' },
  A3: { color: 'var(--c-teal)', tint: '#14b8a6' },
  A4: { color: 'var(--c-orange)', tint: '#f97316' },
  A5: { color: 'var(--c-red)', tint: '#ef4444' },
  A6: { color: 'var(--c-violet)', tint: '#7c3aed' },
  A7: { color: 'var(--c-navy)', tint: '#1e3a8a' }, // CERRADO
}
const DEFAULT_SEG = { color: 'var(--ink-2)' }
function segColor(e) { return SEG_COLORS[(e.cat_segment || '').toUpperCase()] || DEFAULT_SEG }

// Fondo suave de chips: color-mix en vez de hex+'1A' para aceptar var(--ink) (tema oscuro)
const soft = c => `color-mix(in oklab, ${c} 11%, transparent)`

const today = new Date()
const selectedMonth = ref(today.getMonth() + 1)
const selectedYear = ref(today.getFullYear())
const schedules = ref([])
const isLoading = ref(false)
const search = ref('')
const lineFilter = ref('')
const closedWeeks = ref({})
const aulaModal = ref(null)

// Rol desde la sesión (mismo storage que usa el guard del router)
let userRoles = []
try { userRoles = JSON.parse(localStorage.getItem('user'))?.roles ?? [] } catch { /* sesión corrupta: sin tab Alumnos */ }
// El modal lo abre cualquiera (el tab Información enseña cómo se clasifica y
// qué es venta). El tab Alumnos (datos personales) es solo para gerencia y
// líderes: cualquier alias LIDER_* califica, sin lista que mantener.
const canSeeStudents = userRoles.some(r => r === 'ADMIN' || r === 'GERENCIA' || r.startsWith('LIDER_'))

const amTab = ref('info')
const amStudents = ref(null)
const amLoading = ref(false)

function openAulaInfo(it) {
  aulaModal.value = it
  amTab.value = 'info'
  // Sin permiso de Alumnos no se pide la lista (trae correos): con [] el tab
  // Información cae a los contadores de la fila.
  amStudents.value = canSeeStudents ? null : []
  if (canSeeStudents) loadStudents(it.e.edition_num_id)
}

function showStudentsTab() { amTab.value = 'alumnos' }

async function copyDocentes(e) {
  const list = docentes(e)
  if (!list.length) { toast.info('Sin docentes asignados'); return }
  try {
    await navigator.clipboard.writeText(list.join('\n'))
    toast.success(list.length === 1 ? 'Docente copiado' : `${list.length} docentes copiados`)
  } catch {
    toast.error('No se pudo copiar al portapapeles')
  }
}

// Árbol de ESTA edición (misma interpretación de tree_detail que Editions.vue):
// cursos → nodos de contexto con parent_* + children (hermanos, incl. él mismo);
// programas → lista plana de hijos, el programa mismo hace de padre del grupo.
// Los cancelados/inactivos (A5, active='N') no se muestran en el árbol,
// salvo que sea la edición que el usuario tiene abierta.
const amTree = computed(() => {
  const e = aulaModal.value?.e
  const raw = Array.isArray(e?.tree_detail) ? e.tree_detail : []
  if (!e || !raw.length) return []
  const alive = ch => (ch.active || 'Y') !== 'N' || ch.edition_num_id === e.edition_num_id
  const isChildContext = raw[0].children || raw[0].parent_edition_id
  if (isChildContext) {
    return raw
      .filter(n => (n.active || 'Y') !== 'N')
      .map(n => ({
        code: n.parent_global_code || 'S/C',
        name: n.parent_abbreviation || 'Programa padre',
        children: (n.children || []).filter(alive).map(ch => ({ ...ch, is_current: ch.edition_num_id === e.edition_num_id })),
      }))
  }
  return [{
    code: e.global_code || 'S/C',
    name: e.program_abreviature,
    children: raw.filter(alive).map(ch => ({ ...ch, is_current: false })),
  }]
})

// Se carga al abrir el modal: Información cuenta sobre la MISMA lista real que
// muestra Alumnos, para que ambas pestañas y la fórmula del AULA cuadren.
async function loadStudents(editionId) {
  amLoading.value = true
  try {
    const rows = await editionService.classroomStudentsList({ edition_id: editionId })
    const order = { VEN: 0, SEG: 1, MEM: 2, B2B: 3, BEC: 4 }
    amStudents.value = (rows || [])
      .map(s => ({ ...s, ch: studentChannel(s) }))
      .sort((a, b) => order[a.ch.tag] - order[b.ch.tag] || (a.full_name || '').localeCompare(b.full_name || ''))
  } catch (err) {
    console.error('Error cargando alumnos del aula:', err)
    toast.error('No se pudo cargar la lista de alumnos')
    amStudents.value = []
  } finally {
    amLoading.value = false
  }
}

// Conteo por canal desde la lista real. Si el aula está vacía (programas padre:
// sus alumnos se sientan en los cursos hijos) se cae a los contadores de la fila,
// que ahí describen las ventas del programa.
const amFromList = computed(() => Array.isArray(amStudents.value) && amStudents.value.length > 0)
const amCounts = computed(() => {
  const c = { VEN: 0, SEG: 0, MEM: 0, B2B: 0, BEC: 0 }
  ;(amStudents.value || []).forEach(s => { c[s.ch.tag]++ })
  return c
})
const amAula = computed(() => amCounts.value.VEN + amCounts.value.SEG + amCounts.value.MEM + amCounts.value.B2B)
function amChannelValue(c) {
  if (amFromList.value) return amCounts.value[c.tag]
  if (amStudents.value) return aulaModal.value?.e[c.key] ?? 0
  return '…'
}

// ASESOR con la misma composicion que la columna AGENTE del panel FICO:
// "origen - codigo" cuando existen ambos (ej. "B2B - JF39"), si no el que haya.
function agentLabel(s) {
  const origin = String(s.agent_origin || '').trim()
  const code = String(s.agent_code || '').trim()
  if (origin && code && !origin.toUpperCase().includes(code.toUpperCase())) {
    return `${origin} - ${code}`
  }
  return code || origin || '—'
}

// Clasificación por canal del alumno: mismo criterio y PRIORIDAD que los
// contadores del cronograma (comm_bucket): beca > membresía > b2b > hijo de
// paquete (SEG) > venta directa. MEM usa member_benefits (excluye MEMBRESIA
// PLUS, igual que el cronograma): un socio PLUS cuenta como VEN/SEG.
function studentChannel(s) {
  const tag = s.is_beca ? 'BEC'
    : s.member_benefits ? 'MEM'
    : s.is_b2b ? 'B2B'
    : (s.parent_codes && s.parent_codes.length) ? 'SEG'
    : 'VEN'
  return AULA_CHANNELS.find(c => c.tag === tag)
}

// Explicación de cada canal del contador de aula (por qué van separados)
const AULA_CHANNELS = [
  { key: 'cnt_ventas', tag: 'VEN', title: 'Venta directa', color: 'var(--ink)',
    desc: 'Matrículas vendidas directamente sobre esta edición. Es el número que compite contra el objetivo del mes.' },
  { key: 'cnt_segui', tag: 'SEG', title: 'Seguimiento', color: 'var(--c-sky)',
    desc: 'Alumnos que vienen arrastrados de un programa padre (paquetes) o de una reprogramación. No son venta nueva de esta edición, por eso se cuentan aparte.' },
  { key: 'cnt_memb', tag: 'MEM', title: 'Membresía', color: 'var(--c-purple)',
    desc: 'Alumnos que entran usando su membresía (WE PLUS, GOLD, PLATINUM, BLACK). No pagan esta edición de forma individual.' },
  { key: 'cnt_b2b', tag: 'B2B', title: 'Convenio B2B', color: 'var(--c-teal)',
    desc: 'Alumnos inscritos por convenio con empresas o instituciones. Se negocian por contrato, fuera de la venta directa.' },
  { key: 'cnt_becas', tag: 'BEC', title: 'Becas', color: 'var(--c-amber)',
    desc: 'Alumnos becados: ocupan asiento pero no facturan, por eso NO suman al total de AULA.' },
]

// Líneas = categoría del programa (BI, Excel, Proyectos, SAP…), NO we_business_line
// (EN VIVO/ONLINE/FUNDACIÓN/B2B), que el SP del cronograma ni siquiera devuelve.
// Se arman con lo que trae el mes: así el combo nunca ofrece una línea sin ediciones.
const courseLines = computed(() =>
  [...new Set(monthItemsActive.value.map(e => e.program_line_business).filter(Boolean))].sort()
)

const monthAbbr = computed(() => MABBR[selectedMonth.value - 1].toUpperCase())
const periodLabel = computed(() => `${months[selectedMonth.value - 1]} ${selectedYear.value}`)

// ── Carga: ediciones del mes + objetivos + consultas, fusionados por edición ──
async function fetchAll() {
  isLoading.value = true
  try {
    const { items } = await editionService.editionByWeekList({
      page: 1, size: 200,
      selectedMonth: selectedMonth.value,
      selectedYear: selectedYear.value
    })
    const weeks = Array.isArray(items) ? items : []
    const ids = weeks.flatMap(w => (w.items || []).map(e => e.edition_num_id)).filter(Boolean)

    const [goals, leads] = await Promise.all([
      dashboardService.programGoalsList({ year: selectedYear.value, month_num: selectedMonth.value }).catch(() => ({ items: [] })),
      ids.length ? dashboardService.leadsPerEditionList({ edition_ids: ids }).catch(() => []) : Promise.resolve([])
    ])

    const goalByEd = {}
    ;(goals.items || []).forEach(g => { goalByEd[g.edition_id] = Number(g.meta_vacantes || 0) })
    const consByEd = {}
    ;(leads || []).forEach(l => { consByEd[l.edition_num_id] = l.consultas })

    weeks.forEach(w => (w.items || []).forEach(e => {
      // Los congresos/eventos llevan su propia meta en Fundacion > Objetivos:
      // no compiten contra el objetivo de vacantes del cronograma.
      e.meta_vacantes = isEvent(e) ? 0 : (goalByEd[e.edition_num_id] || 0)
      e.consultas = consByEd[e.edition_num_id] ?? 0
      e.vf = (e.cnt_ventas ?? 0) - e.meta_vacantes
    }))

    schedules.value = weeks
    closedWeeks.value = {}
  } catch (err) {
    console.error('Error cargando cronograma:', err)
    toast.error('No se pudo cargar el cronograma')
    schedules.value = []
  } finally {
    isLoading.value = false
  }
}

function changeMonth(delta) {
  let m = selectedMonth.value + delta
  let y = selectedYear.value
  if (m <= 0) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
  selectedMonth.value = m
  selectedYear.value = y
  fetchAll()
}

function toggleWeek(s) { closedWeeks.value = { ...closedWeeks.value, [s]: !closedWeeks.value[s] } }

// ── Reglas derivadas ──
// Estado por fechas: < inicio → Por iniciar, > fin → Finalizado, en medio → En curso.
function statusOf(e) {
  const s = parseLocal(e.start_date)
  const en = parseLocal(e.end_date)
  if (s && today < s) return { key: 'Por iniciar', live: false }
  if (en && today > en) return { key: 'Finalizado', live: false }
  return { key: 'En curso', live: true }
}
// % de logro del objetivo: se mide por VENTAS (no por aula, que mezcla otros canales).
// Semáforo objetivo: <50% naranja · 50–100% negro · >100% (superado) verde.
function fillOf(e) {
  const ventas = e.cnt_ventas ?? 0
  const obj = e.meta_vacantes ?? 0
  const pct = obj > 0 ? Math.round((ventas / obj) * 100) : 0
  let color = 'var(--c-orange)'
  if (pct > 100) color = 'var(--s4-fg)'
  else if (pct >= 50) color = 'var(--ink)' /* neutro: sigue al tema (en dark #1b1917 sería invisible) */
  return { pct, color, w: Math.min(100, pct) }
}

// Semáforo AULA: <15 naranja · 15–34 negro (lleno) · 35+ verde.
function aulaColor(n) {
  if (n >= 35) return 'var(--s4-fg)'
  if (n < 15) return 'var(--c-orange)'
  return 'var(--ink)'
}

// ── Filtros (texto + línea) ──
const filteredWeeks = computed(() => {
  const q = search.value.toLowerCase()
  const line = lineFilter.value
  return schedules.value.map(w => ({
    schedule: w.schedule,
    items: (w.items || []).filter(e => {
      if ((e.cat_segment || '').toUpperCase() === 'A5') return false // A5 = cancelados, no se muestran
      if (line && lineLabel(e) !== line) return false
      if (!q) return true
      return [e.program_abreviature, e.instructor, e.version_code, e.global_code, e.specific_code, lineLabel(e), typeLabel(e)]
        .some(v => (v || '').toLowerCase().includes(q))
    })
  }))
})

const displayWeeks = computed(() => filteredWeeks.value
  .filter(w => w.items.length)
  .map(w => {
    // Familia = cadena DIP → PEE → ESP → curso. El SP ya las ordena consecutivas;
    // aquí unimos filas cuyos árboles (tree_detail) se intersectan y cada programa
    // suma un nivel de indentación en la cascada. Sin etiquetas: solo líneas.
    let famIds = null
    let progCount = 0
    const items = w.items.map(e => {
      const isCourse = e.program_type_alias === 'we_program_type_course'
      const td = Array.isArray(e.tree_detail) ? e.tree_detail : []
      const isProgram = !isCourse && td.length > 0
      // tree_detail cambia de forma según el tipo: en programas trae HIJOS
      // (edition_num_id), en cursos trae PADRES (parent_edition_id).
      const own = [e.edition_num_id, ...td.map(x => isCourse ? x.parent_edition_id : x.edition_num_id)].filter(Boolean)
      const joins = !!famIds && own.some(id => famIds.has(id))
      let depth = 0
      if (joins) {
        own.forEach(id => famIds.add(id))
        depth = progCount
        if (isProgram) progCount++
      } else if (isProgram) {
        famIds = new Set(own)
        progCount = 1
      } else {
        famIds = null
        progCount = 0
      }
      return {
        e, sc: segColor(e), fl: fillOf(e), st: statusOf(e),
        fam: joins || isProgram, depth, isProgram,
      }
    })
    // dentro de la familia solo el último miembro conserva su línea divisoria
    items.forEach((it, i) => { it.fused = it.fam && !!items[i + 1] && items[i + 1].depth > 0 })
    const live = items.filter(it => it.st.live).length
    const avg = items.length ? Math.round(items.reduce((s, it) => s + it.fl.pct, 0) / items.length) : 0
    return {
      schedule: w.schedule, count: items.length, items,
      isOpen: !closedWeeks.value[w.schedule],
      summary: `${live} en curso · ${avg}% logro prom.`,
    }
  }))

// ── KPIs (sobre lo filtrado): ventas vs objetivo (juntos, para compararlos), programas y aula ──
const kpiSums = computed(() => {
  const all = filteredWeeks.value.flatMap(w => w.items)
  const sum = k => all.reduce((s, e) => s + (e[k] ?? 0), 0)
  const ch = Object.fromEntries(AULA_CHANNELS.map(c => [c.key, sum(c.key)]))
  // Inscripciones = alumnos sentados en el aula, becados incluidos. Ojo: la
  // columna AULA de la tabla NO suma becas (no facturan), por eso este total
  // es mayor que la suma de esa columna.
  return {
    count: all.length, ventas: sum('cnt_ventas'), objetivo: sum('meta_vacantes'),
    ch, inscritos: sum('cnt_aula') + ch.cnt_becas,
  }
})
const kpiVsObjetivo = computed(() => {
  const { ventas, objetivo } = kpiSums.value
  const pct = objetivo > 0 ? Math.round((ventas / objetivo) * 100) : 0
  let color = 'var(--c-orange)'
  if (pct > 100) color = 'var(--s4-fg)'
  else if (pct >= 50) color = 'var(--ink)'
  return { ventas, objetivo, pct, color }
})

// ── Resúmenes del mes (sobre TODO el mes, sin filtros de UI). Los A5
// (cancelados) NUNCA cuentan en Categoría/Líneas/Tipos; solo aparecen en su
// propia fila de la tabla Segmentos. ──
const TYPE_DEFS = [
  { key: 'A', def: 'Cursos que no requieren mayor seguimiento y esfuerzo en el proceso de venta' },
  { key: 'B', def: 'Cursos que requieren seguimiento y monitoreo en el proceso de venta' },
  { key: 'C', def: 'Cursos que requieren minuciosa atención y seguimiento para la venta' },
  { key: 'D', def: 'Cursos que requieren mucho esfuerzo para la venta' },
  { key: 'N1', def: 'Curso nuevo de una línea existente' },
  { key: 'N2', def: 'Curso nuevo de una línea nueva. Ejemplo: Marketing Digital, Contrataciones' },
]
// Tintes como color-mix sobre var(--surface): el mismo valor sirve en claro y oscuro
const tint = (c, p = 12) => `color-mix(in oklab, ${c} ${p}%, var(--surface))`
// Sin tinte propio: cada fila se pinta con el mismo pastel del segmento en el cronograma
// (SEG_COLORS.tint, ver segSummary). Leyenda y tabla no pueden divergir.
const SEG_DEFS = [
  { key: 'A1', def: 'Cursos de apertura (no seguimientos: son los Diplomados, Especializaciones y PEE)' },
  { key: 'A2', def: 'Cursos de seguimiento (los cursos que pertenecen a un Diplomado, Especialización o PEE)' },
  { key: 'A3', def: 'Modificación de cursos aperturados: Marketing & Comercial deben realizar los cambios respectivos' },
  { key: 'A4', def: 'Modificación de cursos de seguimiento: Marketing & Comercial deben realizar los cambios respectivos' },
  { key: 'A5', def: 'Cursos cancelados' },
  { key: 'A6', def: 'Apertura de nuevos cursos (se considera nuevo en sus 3 primeras ediciones)' },
  { key: 'A7', def: 'Curso con vacantes completadas' },
]

const monthItems = computed(() => schedules.value.flatMap(w => w.items || []))
const monthItemsActive = computed(() =>
  monthItems.value.filter(e => (e.cat_segment || '').toUpperCase().trim() !== 'A5')
)

const catSummary = computed(() => {
  const n = alias => monthItemsActive.value.filter(e => e.program_type_alias === alias).length
  const cols = [
    { label: 'DIP', n: n('we_program_type_diploma') },
    { label: 'PEE', n: n('we_program_type_pee') },
    { label: 'ESP', n: n('we_program_type_specialization') },
    { label: 'CURSO', n: n('we_program_type_course') },
  ]
  return { cols, total: cols.reduce((s, c) => s + c.n, 0) }
})

const lineSummary = computed(() => {
  const m = new Map()
  monthItemsActive.value.forEach(e => {
    const l = lineLabel(e)
    m.set(l, (m.get(l) || 0) + 1)
  })
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, n]) => ({ label, n }))
})

// segSummary sigue usando monthItems: la fila A5 de Segmentos es justamente
// el conteo de cancelados; en el resto de resúmenes los A5 no existen.
const countBy = (items, fn, key) => items.filter(e => (fn(e) || '').toUpperCase().trim() === key).length
const typeSummary = computed(() => TYPE_DEFS.map(t => ({ ...t, n: countBy(monthItemsActive.value, typeLabel, t.key) })))
const segSummary = computed(() => SEG_DEFS.map(s => ({
  ...s,
  tint: tint(SEG_COLORS[s.key].tint, 13),
  n: countBy(monthItems.value, e => e.cat_segment, s.key),
})))

// ── Helpers de presentación ──
function isEvent(e) { return e.program_type_alias === 'we_program_type_event' }
function lineLabel(e) { return e.program_line_business || '—' }
// Nueva metodología: el SP la manda como 'Y'/'N' (o boolean según el driver).
// Se valida contra valores positivos, no por truthy: 'N' también es truthy.
function isNewMet(e) { const v = e.new_methodology; return v === true || v === 1 || v === 'Y' || v === 'y' }
function typeLabel(e) { return e.cat_course_category_label || e.program_type || '—' }
// Parse local para evitar el corrimiento de un día: "2025-05-21" en local, no UTC.
function parseLocal(v) {
  if (!v) return null
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
function fmtShort(v) {
  const d = parseLocal(v)
  return d ? `${d.getDate()} ${MABBR[d.getMonth()]}` : '—'
}
// Varios docentes vienen en un solo string separado por comas → uno por línea.
function docentes(e) {
  const list = (e.instructor || '').split(',').map(s => s.trim()).filter(Boolean)
  return list.length ? list : ['—']
}
function daysLabel(e) { return e.schedules?.[0]?.day_combination_label || '—' }
function hourLabel(e) {
  if (!e.schedules?.length) return '—'
  const base = e.schedules[0].hour_combination_label || ''
  return e.schedules.length > 1 ? `${base} (+${e.schedules.length - 1})` : base
}

onMounted(fetchAll)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Spline+Sans+Mono:wght@400;500;600;700&display=swap');

/* ===== Tokens del design system (light) ===== */
.board-shell {
  --font-sans: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  --font-mono: 'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  --accent: #002060; /* navy corporativo WE */
  --bg: #f3f2f1;
  --surface: #ffffff;
  --surface-2: #faf9f8;
  --surface-3: #f1efed;
  --border: #e8e6e3;
  --border-strong: #d8d4d0;
  --ink: #1b1917;
  --ink-2: #57534e;
  --ink-3: #8d877f;
  --track: #ece9e6;
  --s4-fg: #1d7a40;
  --shadow: 0 1px 2px rgba(28,25,23,.04), 0 1px 1px rgba(28,25,23,.03);
  --r-lg: 16px;
  /* acentos (los usa también el JS vía var(--c-*); en dark se aclaran abajo) */
  --c-blue: #2256c9;   /* A1 */
  --c-amber: #a96208;  /* A2 · BEC */
  --c-teal: #0a7a5c;   /* A3 · B2B */
  --c-orange: #d9603b; /* A4 · semáforo bajo */
  --c-red: #c0362c;    /* A5 */
  --c-violet: #7c3aed; /* A6 */
  --c-navy: #1e3a8a;   /* A7 cerrado */
  --c-sky: #2a6fdb;    /* SEG · KPI programas */
  --c-purple: #6b5cf0; /* MEM */
  --c-wine: #7A1F3D;   /* NM = nueva metodología */

  font-family: var(--font-sans);
  color: var(--ink);
  /* sin fondo propio: hereda el del layout del ERP para no duplicar fondos */
  padding: 2px 2px 1rem;
  -webkit-font-smoothing: antialiased;
}
.board-shell button { font-family: inherit; cursor: pointer; }

/* ===== Header ===== */
.crono-head { display: flex; align-items: center; gap: 12px; margin: 2px 2px 10px; flex-wrap: wrap; }
.month-badge {
  width: 38px; height: 38px; border-radius: 11px; flex: none; position: relative;
  background: var(--ink); color: var(--surface); display: grid; place-items: center;
  font-weight: 800; font-size: 11px; letter-spacing: .04em; box-shadow: var(--shadow);
}
.month-badge::before, .month-badge::after {
  content: ""; position: absolute; top: 5px; width: 4px; height: 4px; border-radius: 50%;
  background: color-mix(in oklab, var(--surface) 60%, transparent);
}
.month-badge::before { left: 10px; } .month-badge::after { right: 10px; }
.crono-title .eyebrow { font-size: 9.5px; font-weight: 700; letter-spacing: .13em; color: var(--ink-3); }
.crono-title h1 { font-size: 19px; font-weight: 800; letter-spacing: -0.015em; margin: 1px 0 0; }
.crono-head .grow, .week-bar .grow { flex: 1; }

.month-nav { display: flex; align-items: center; gap: 4px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 13px; box-shadow: var(--shadow); padding: 5px; }
.month-nav .arrow { width: 26px; height: 26px; border-radius: 7px; border: none; background: transparent; color: var(--ink-2);
  display: grid; place-items: center; font-size: 15px; line-height: 1; transition: .15s; }
.month-nav .arrow:hover { background: var(--surface-3); color: var(--ink); }
.seg-select { border: none; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--ink);
  padding: 0 5px; height: 26px; border-radius: 7px; outline: none; cursor: pointer; }
.seg-select:hover { background: var(--surface-3); }

.crono-search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; box-shadow: var(--shadow); padding: 0 11px; color: var(--ink-3); font-size: 12.5px; min-width: 210px; }
.crono-search input { border: none; outline: none; background: transparent; font-family: inherit; font-size: 12.5px;
  color: var(--ink); padding: 7px 0; flex: 1; }
.crono-search input::placeholder { color: var(--ink-3); }

.line-filter { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow);
  padding: 6px 10px; font-size: 12.5px; font-weight: 600; font-family: inherit; color: var(--ink); outline: none; cursor: pointer; }
.refresh { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface);
  color: var(--ink-2); display: grid; place-items: center; box-shadow: var(--shadow); font-size: 14px; }
.refresh:hover { background: var(--surface-3); color: var(--ink); }

/* ===== KPIs ===== */
/* Fila continua: las tarjetas se estiran para tapar el sobrante (flex-grow) en
   vez de dejarlo como un boquete entre ellas. */
.kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
.kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); padding: 13px 16px;
  display: flex; align-items: baseline; gap: 12px; min-width: 0; flex: 1 1 auto; }
.kpi .lbl { display: flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; letter-spacing: .07em; color: var(--ink-3); text-transform: uppercase; }
.kpi .lbl .dot { width: 7px; height: 7px; border-radius: 50%; }
.kpi .val { display: flex; align-items: baseline; gap: 6px; margin-left: auto; }
.kpi .val b { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.kpi .val span { font-size: 11px; color: var(--ink-3); font-weight: 600; }
.kpi .val .vs { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--ink-3); }
.kpi .val .kpct { font-family: var(--font-mono); font-size: 10px; font-weight: 800; border-radius: 20px; padding: 2px 8px; white-space: nowrap; }

/* Inscripciones: el total manda y el desglose lo sostiene, separado con "/"
   para que se lea como una frase. Va primera y no crece: mide su contenido,
   así el sobrante se lo reparten Programas y Ventas vs Objetivo. */
.kpi-canales { flex-grow: 0; }
.kpi-canales .val { flex-wrap: nowrap; gap: 8px; margin-left: 16px; overflow: hidden; }
.kpi-canales .val .big { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.kpi-canales .val .eq { font-size: 15px; font-weight: 700; color: var(--ink-3); opacity: .5; margin: 0 2px; }
.kpi-canales .val .chit { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700;
  letter-spacing: .03em; text-transform: uppercase; color: var(--ink-3); white-space: nowrap; }
.kpi-canales .val .chit .dot { width: 6px; height: 6px; border-radius: 50%; }
.kpi-canales .val .chit b { font-size: 14px; font-weight: 800; letter-spacing: -0.01em; color: var(--ink); font-variant-numeric: tabular-nums; }
.kpi-canales .val .chit .sep { font-style: normal; font-weight: 400; font-size: 13px; color: var(--ink-3); opacity: .35; margin-right: 4px; }

/* ===== Tabla ===== */
.crono-tbl { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow);
  overflow: auto; max-height: calc(100vh - 110px); }
.crono-tbl::-webkit-scrollbar { width: 10px; height: 10px; }
.crono-tbl::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 999px; border: 2px solid var(--surface); }
table.crono { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 1150px; }
table.crono th, table.crono td { text-align: left; }
table.crono thead th {
  position: sticky; top: 0; z-index: 6; background: var(--surface-3); color: var(--ink-2);
  font-size: 10px; font-weight: 700; letter-spacing: .06em; padding: 7px 10px; border-bottom: 1px solid var(--border); white-space: nowrap;
}
/* separación vertical estilo hoja de cálculo, en el hairline cálido del sistema */
table.crono thead th:not(:last-child),
table.crono tbody tr.ed td:not(:last-child),
table.crono tbody tr.skrow td:not(:last-child) { border-right: 1px solid var(--border-strong); }
.th-group { text-align: center !important; }
.th-group .g-title { font-size: 10px; letter-spacing: .1em; color: var(--accent); margin-bottom: 4px; }
.th-group .g-cols { display: flex; gap: 8px; justify-content: center; }
.th-group .g-cols span { width: 26px; text-align: center; }
.th-group .g-cols span.hot { color: var(--ink); font-weight: 800; width: 32px; }
th.c-num, td.c-num { text-align: center; }

/* fila banda de semana */
tr.week-row td { background: var(--bg); padding: 0; border-bottom: 1px solid var(--border); }
.week-bar { display: flex; align-items: center; gap: 10px; padding: 5px 12px; cursor: pointer; }
.week-bar .caret { width: 22px; height: 22px; border: none; background: transparent; color: var(--ink-3); display: grid;
  place-items: center; border-radius: 6px; transition: .15s; }
.week-bar .caret:hover { background: var(--surface-3); color: var(--ink); }
.week-bar .caret span { display: inline-block; transition: transform .18s; font-size: 12px; }
.week-bar.collapsed .caret span { transform: rotate(-90deg); }
.week-bar .wk-chip { width: 6px; height: 15px; border-radius: 3px; background: var(--ink); }
.week-bar h3 { font-size: 13px; font-weight: 800; margin: 0; }
.week-bar .ed-pill { font-size: 10.5px; font-weight: 600; color: var(--ink-2); background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 1px 9px; }
.week-bar .stat { font-size: 11px; color: var(--ink-3); font-weight: 600; }

/* celdas del cuerpo */
table.crono tbody td { padding: 5px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; background: var(--surface); }
table.crono tbody tr.ed.clickable { cursor: pointer; }
table.crono tbody tr.ed:hover td { background: var(--surface-2); }

/* estado por fondo pastel muy suave: con meta naranja · sin meta azul
   (color-mix sobre --surface: el mismo tinte funciona en claro y oscuro) */
tr.ed.meta td { background: color-mix(in oklab, var(--c-orange) 7%, var(--surface)); }
tr.ed.sinmeta td { background: color-mix(in oklab, var(--c-sky) 6%, var(--surface)); }
tr.ed.meta:hover td { background: color-mix(in oklab, var(--c-orange) 13%, var(--surface)); }
tr.ed.sinmeta:hover td { background: color-mix(in oklab, var(--c-sky) 11%, var(--surface)); }

/* CA/CP */
.cacp { display: flex; flex-direction: column; gap: 1px; }
.cacp .kv { display: flex; align-items: center; gap: 6px; }
.cacp .k { font-size: 8.5px; font-weight: 700; color: var(--ink-3); width: 14px; }
.cacp .v { font-family: var(--font-mono); font-weight: 400; font-size: 11.5px; color: var(--ink-2); font-variant-numeric: tabular-nums; }

/* curso */
.curso { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.curso .top { display: flex; align-items: center; gap: 7px; }
.lvl-badge { font-size: 9px; font-weight: 800; font-family: var(--font-mono); border-radius: 4px; padding: 1px 6px; flex: none; }
.curso .name { font-size: 13px; font-weight: 700; letter-spacing: -0.01em; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.curso .area { font-size: 10.5px; color: var(--ink-3); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* NM: píldora sólida vino. Sólida y no pastel como .lvl-badge, porque debe
   distinguirse de un vistazo sobre los tintes de fila (meta/sinmeta/A6/A7). */
.nm-badge { font-size: 8.5px; font-weight: 800; font-family: var(--font-mono); letter-spacing: .04em;
  border-radius: 4px; padding: 1px 5px; flex: none; background: var(--c-wine); color: #fff; }

/* cronograma: inicio resaltado (chip oscuro) · fin más claro */
.cro { display: flex; flex-direction: column; gap: 2px; }
.cro .dates { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--ink-2); white-space: nowrap; }
.date-chip { font-family: var(--font-mono); font-size: 10.5px; font-weight: 800; background: var(--ink); color: var(--surface); border-radius: 5px; padding: 1px 6px; }
.cro .arrow-to { color: var(--ink-3); }
.cro .date-end { color: var(--ink-3); }
.cro .ses { color: var(--ink-3); font-weight: 600; }
.cro .when { font-size: 10.5px; color: var(--ink-3); white-space: nowrap; }
.cro .when b { color: var(--ink-2); font-weight: 700; }

/* docente */
.docs { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.docs .lbl { font-size: 8.5px; font-weight: 700; letter-spacing: .06em; color: var(--ink-3); }
.docs .name { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.docs .name.multi { font-weight: 600; font-size: 11.5px; }
.docs .more { font-size: 10.5px; font-weight: 700; color: var(--ink-3); cursor: default; }

/* popover con la lista completa de docentes (hover sobre la celda) */
td.doc-copy { position: relative; }
.doc-pop {
  display: none; position: absolute; z-index: 40; top: calc(100% - 6px); left: 10px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 10px 28px rgba(28, 25, 23, .16);
  padding: 10px 14px; min-width: 210px; max-width: 300px;
}
td.doc-copy:hover .doc-pop { display: block; }
.doc-pop .pop-name { font-size: 12px; font-weight: 600; color: var(--ink, #1b1917); padding: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-pop .pop-hint { margin-top: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: .04em; color: var(--ink-3); border-top: 1px dashed var(--border); padding-top: 5px; }

/* seguimiento: en una sola línea para compactar la fila */
.segui { display: flex; gap: 10px; }
.segui .item { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--ink-2); white-space: nowrap; }
.segui .g { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.g.ok { background: var(--s4-fg); } .g.no { background: var(--ink-3); }

/* aula: el color del total lo pone aulaColor(): <15 naranja · 15–34 negro · 35+ verde */
.aula-cell { display: flex; gap: 8px; justify-content: center; align-items: center; }
.aula-cell .acol { width: 26px; text-align: center; font-family: var(--font-mono); font-size: 12.5px; font-weight: 700; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.aula-cell .acol.zero { color: var(--ink-3); font-weight: 500; opacity: .6; }
/* becas siempre en gris apagado: no suman al aula, no deben llamar la atención */
.aula-cell .acol.bec { color: var(--ink-3); font-weight: 500; opacity: .6; }
/* el total AULA es el punto focal de la fila: píldora sólida con el color del
   semáforo (el ojo va primero a las formas rellenas de color) */
/* color: --surface y no #fff: cuando el semáforo devuelve var(--ink) en dark, la píldora
   queda clara y el texto debe invertirse (mismo patrón que .month-badge / .date-chip) */
.aula-cell .acol.total { font-weight: 800; font-size: 12.5px; color: var(--surface); border-radius: 7px; padding: 3px 0; width: 32px; flex: none; }
.aula-cell .acol.total.empty { background: var(--surface-3); color: var(--ink-3); font-weight: 600; }

/* objetivo */
.obj { display: flex; flex-direction: column; gap: 3px; min-width: 128px; }
/* "orow"/"acol" y no "row"/"col": Bootstrap global del ERP secuestra esas clases */
.obj .orow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.obj .frac { font-size: 12px; font-weight: 700; white-space: nowrap; }
.obj .frac b { font-family: var(--font-mono); }
.obj .frac .t { color: var(--ink-3); font-weight: 600; font-family: var(--font-mono); }
.obj .pct { font-size: 9.5px; font-weight: 800; font-family: var(--font-mono); border-radius: 20px; padding: 1px 7px; white-space: nowrap; }
.obj .track { height: 4px; border-radius: 20px; background: var(--track); overflow: hidden; }
.obj .track > i { display: block; height: 100%; border-radius: 20px; transition: width .4s; }
.sinmeta-txt { font-size: 11.5px; color: var(--ink-3); font-style: italic; }

/* consultas en negro */
td.cons { text-align: center; font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--ink); }
td.cons.zero { color: var(--ink-3); font-weight: 500; opacity: .6; }
td.obs { color: var(--ink-3); font-size: 10.5px; font-style: italic; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ============================================================
   PADRE ↔ HIJO — solo líneas: tinte, fusión y conector (sin etiquetas)
   ============================================================ */
tr.ed.fam td { background: color-mix(in oklab, var(--accent) 4%, var(--surface)); }
tr.ed.fam:hover td { background: color-mix(in oklab, var(--accent) 8%, var(--surface-2)); }

/* Tinte de fila por segmento: SIEMPRE manda el color del tipado (A1 azul, A2 ámbar,
   A3 teal, A4 naranja, A6 violeta, A7 navy). Va después de .fam/.meta/.sinmeta y lleva
   el prefijo table.crono tbody para ganarle también al hover genérico.
   --seg lo pone la fila (segColor); sin segmento (.segrow-none) se queda el tinte meta/sinmeta. */
/* 13% del hue vivo = el mismo pastel que ya tenían A6/A7. El hover no oscurece:
   el tinte ES la identidad del segmento, no un estado. */
table.crono tbody tr.ed:not(.segrow-none) td,
table.crono tbody tr.ed:not(.segrow-none):hover td { background: color-mix(in oklab, var(--seg) 13%, var(--surface)); }
table.crono tbody tr.ed.segrow-a7 td:first-child { box-shadow: inset 3px 0 0 var(--c-navy); }
/* miembros fusionados: sin línea divisoria dentro de la familia */
tr.ed.fused td { border-bottom-color: transparent; }

/* celda curso de miembros anidados: indentación por nivel + conector de árbol */
.child-wrap { display: flex; align-items: stretch; gap: 12px; padding-left: 6px; }
.child-connector { position: relative; width: 20px; flex: none; }
.child-connector::before { /* vertical */
  content: ""; position: absolute; left: 8px; top: -14px; bottom: 50%; width: 2px; background: var(--accent);
}
.child-connector::after { /* codo horizontal */
  content: ""; position: absolute; left: 8px; top: 50%; width: 12px; height: 2px; background: var(--accent);
}
.child-connector .node { position: absolute; left: 5px; top: calc(50% - 3px); width: 8px; height: 8px; border-radius: 50%;
  background: var(--surface); border: 2px solid var(--accent); }

/* ===== skeleton ===== */
tr.skrow td { padding: 16px 12px; }
.sk { display: block; height: 13px; border-radius: 6px; background: linear-gradient(90deg, var(--surface-3), var(--track), var(--surface-3));
  background-size: 200% 100%; animation: cgsk 1.3s infinite; }
@keyframes cgsk { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

/* ===== modal "¿de dónde sale el AULA?" ===== */
.am-overlay { position: fixed; inset: 0; z-index: 1080; background: rgba(28,25,23,.4); backdrop-filter: blur(2px);
  display: grid; place-items: center; padding: 20px; animation: cgfade .15s ease; }
@keyframes cgfade { from { opacity: 0 } to { opacity: 1 } }
.am-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
  box-shadow: 0 20px 60px -20px rgba(28,25,23,.4); width: min(560px, 100%); max-height: 90vh; overflow: auto;
  font-family: var(--font-sans); animation: amup .18s ease; transition: width .2s ease; }
.am-card.wide { width: min(880px, 100%); }
@keyframes amup { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
.am-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
.am-head > div { flex: 1; min-width: 0; }
.am-eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: .1em; color: var(--accent); }
.am-title { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; margin-top: 2px; }
.am-sub { font-size: 12px; color: var(--ink-3); font-weight: 500; margin-top: 1px; }
.am-close { width: 30px; height: 30px; border-radius: 8px; border: none; background: transparent; color: var(--ink-3);
  display: grid; place-items: center; font-size: 13px; flex: none; }
.am-close:hover { background: var(--surface-3); color: var(--ink); }
.am-tabs { display: flex; gap: 22px; padding: 0 20px; border-bottom: 1px solid var(--border); }
.am-tabs button { background: none; border: none; padding: 11px 2px 12px; margin-bottom: -1px; font-size: 13.5px; font-weight: 600;
  color: var(--ink-3); border-bottom: 2px solid transparent; }
.am-tabs button:hover { color: var(--ink-2); }
.am-tabs button.on { color: var(--ink); border-bottom-color: var(--ink); }
.am-body { padding: 8px 20px; }
.am-students { max-height: 56vh; overflow: auto; padding-bottom: 14px; }
.am-loading { padding: 26px 0; text-align: center; color: var(--ink-3); font-size: 13px; }
.am-tbl { width: 100%; border-collapse: separate; border-spacing: 0; }
.am-tbl th { position: sticky; top: 0; background: var(--surface); text-align: left; font-size: 10.5px; font-weight: 700;
  letter-spacing: .07em; color: var(--ink-3); padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.am-tbl td { padding: 9px 10px; border-bottom: 1px solid var(--border); font-size: 12.5px; vertical-align: middle; }
.am-tbl tr:last-child td { border-bottom: none; }
.am-tbl .am-name { font-weight: 700; color: var(--ink); }
.am-tbl .am-agent { font-family: var(--font-mono); font-weight: 700; color: var(--ink-2); white-space: nowrap; }
.am-tbl .am-mail { color: var(--ink-2); word-break: break-all; }
.am-tbl .am-extra { color: var(--ink-3); font-size: 12px; }
/* Promo LAPTOP: mismos colores que la etiqueta "Traera laptop" del panel FICO */
.am-laptop { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; font-size: 10px; font-weight: 800; border-radius: 5px; padding: 2px 7px; margin-right: 6px; background: #ECFEFF; color: #155E75; border: 1px solid #A5F3FC; }
.am-laptop i { font-size: 9px; color: #0891B2; }
.am-tbl tr.row-laptop td { background: #ECFEFF; }
.am-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.am-row:last-child { border-bottom: none; }
td.doc-copy { cursor: copy; }

/* Tab Árbol */
.am-tree-grp { margin-bottom: 16px; }
.am-tree-grp:last-child { margin-bottom: 0; }
.am-tree-parent { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink); padding-bottom: 6px; }
.am-tree-ptag { font-size: 9px; font-weight: 800; font-family: var(--font-mono); letter-spacing: .06em; border-radius: 4px; padding: 1px 6px; background: color-mix(in oklab, var(--accent) 12%, transparent); color: var(--accent); flex: none; }
.am-tree-code { font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); }
.am-tree-child { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0 6px 10px; margin-left: 6px; border-left: 2px solid var(--border-strong); }
.am-tree-child.cur { background: color-mix(in oklab, var(--accent) 8%, transparent); border-radius: 0 8px 8px 0; border-left-color: var(--accent); }
.am-tree-node { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-3); margin-top: 5px; flex: none; }
.am-tree-child.cur .am-tree-node { background: var(--accent); }
.am-tree-txt { font-size: 12.5px; color: var(--ink); }
.am-tree-meta { font-size: 10.5px; font-family: var(--font-mono); color: var(--ink-3); margin-top: 1px; }
.am-tree-curtag { font-size: 9px; font-weight: 800; font-family: var(--font-mono); border-radius: 4px; padding: 1px 6px; margin-left: 6px; background: var(--accent); color: var(--surface); }
.am-tag { flex: none; font-family: var(--font-mono); font-size: 10px; font-weight: 800; border-radius: 5px; padding: 3px 8px; margin-top: 1px; }
.am-txt { min-width: 0; }
.am-t { font-size: 13.5px; font-weight: 700; color: var(--ink); }
.am-t b { font-family: var(--font-mono); margin-left: 4px; }
.am-d { font-size: 12.5px; line-height: 1.5; color: var(--ink-2); margin-top: 2px; }
.am-foot { padding: 14px 20px 18px; border-top: 1px solid var(--border); background: var(--surface-2); border-radius: 0 0 var(--r-lg) var(--r-lg); }
.am-formula { font-size: 13px; font-weight: 700; color: var(--ink); }
.am-formula b { font-family: var(--font-mono); font-size: 15px; }
.am-formula span { font-size: 11.5px; color: var(--ink-3); font-weight: 500; margin-left: 4px; }
.am-note { margin-top: 10px; font-size: 12px; line-height: 1.5; color: var(--accent);
  background: color-mix(in oklab, var(--accent) 8%, transparent); border-radius: 8px; padding: 8px 12px; }

/* ===== vacío + pie ===== */
.empty-state { text-align: center; padding: 70px 20px; color: var(--ink-3); }
.empty-state .icon { font-size: 34px; margin-bottom: 10px; opacity: .5; }
.empty-state .big { font-size: 18px; font-weight: 700; color: var(--ink-2); margin-bottom: 6px; }
.empty-state .sub { font-size: 12.5px; }
/* ===== resúmenes del mes ===== */
.sumgrid { display: grid; grid-template-columns: auto 1fr; gap: 10px; margin-top: 10px; align-items: start; }
.sumgrid + .sumgrid { grid-template-columns: 1fr 1fr; }
.sumcard { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); padding: 10px 14px; overflow-x: auto; }
.sum-title { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--ink-3); margin-bottom: 7px; }
.sumtbl { border-collapse: collapse; }
.sumtbl th, .sumtbl td { border: 1px solid var(--border-strong); padding: 3px 12px; text-align: center; white-space: nowrap; }
.sumtbl th { font-size: 10px; font-weight: 700; letter-spacing: .04em; color: var(--ink-2); background: var(--surface-3); }
.sumtbl td { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--ink); }
.sumtbl .tot { background: var(--surface-3); }
.sumtbl td.tot { font-weight: 800; }
.deftbl { border-collapse: collapse; width: 100%; }
.deftbl th, .deftbl td { border: 1px solid var(--border-strong); padding: 3px 9px; text-align: left; }
.deftbl th { font-size: 9.5px; font-weight: 700; letter-spacing: .05em; color: var(--ink-2); background: var(--surface-3); white-space: nowrap; }
.deftbl td { font-size: 11px; color: var(--ink-2); }
.deftbl td.num { font-family: var(--font-mono); font-weight: 700; text-align: center; color: var(--ink); width: 1%; white-space: nowrap; }
.deftbl td.tag { font-family: var(--font-mono); font-weight: 800; text-align: center; color: var(--ink); width: 1%; white-space: nowrap; }
.deftbl td.def { line-height: 1.35; }

.crono-foot { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 11px; color: var(--ink-3); flex-wrap: wrap; }
.crono-foot .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--s4-fg); flex: none; }
.crono-foot b { color: var(--accent); }

/* ════════════════════════════════════════
   DARK MODE — misma paleta cálida que FICO inscripciones (EnrollmentPage)
   Solo se redefinen tokens: todo el resto del CSS y los colores que
   inyecta el JS (var(--c-*)) se adaptan solos.
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .board-shell {
  --accent: #8FAADC; /* derivado claro del navy WE: el puro #002060 no se lee en dark */
  --bg: #14140F;
  --surface: #1A1A14;
  --surface-2: #1F1F1A;
  --surface-3: #24241E;
  --border: #2A2A22;
  --border-strong: #3A3A33;
  --ink: #F4F4F0;
  --ink-2: #A0A099;
  --ink-3: #8A8A80;
  --track: #2A2A22;
  --s4-fg: #34D399;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 1px 1px rgba(0,0,0,.3);
  --c-blue: #7BA3F0;
  --c-amber: #D9A04C;
  --c-teal: #3FB598;
  --c-orange: #E8845F;
  --c-red: #EF7B72;
  --c-violet: #A78BFA;
  --c-navy: #8FA8E0;
  --c-sky: #74A4EC;
  --c-purple: #9D91F5;
  --c-wine: #B84A6B; /* el #7A1F3D puro se pierde sobre el fondo oscuro */
}
[data-coreui-theme="dark"] .board-shell .am-laptop { background: rgba(8,145,178,.18); color: #67E8F9; border-color: rgba(103,232,249,.35); }
[data-coreui-theme="dark"] .board-shell .am-laptop i { color: #22D3EE; }
[data-coreui-theme="dark"] .board-shell .am-tbl tr.row-laptop td { background: rgba(8,145,178,.14); }
[data-coreui-theme="dark"] .board-shell .am-overlay { background: rgba(0,0,0,.55); }
[data-coreui-theme="dark"] .board-shell .am-card { box-shadow: 0 20px 60px -20px rgba(0,0,0,.7); }
[data-coreui-theme="dark"] .board-shell .doc-pop { box-shadow: 0 10px 28px rgba(0,0,0,.55); }

@media (max-width: 1100px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .cg-detail-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
