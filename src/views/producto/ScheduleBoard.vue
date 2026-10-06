<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <div class="sb-title-row">
          <h1 class="ds-title">Cronograma</h1>
          <!-- El aviso de simulación va pegado al título y no en un tooltip: esta
               vista es idéntica a la real y se usa para presentar, así que tiene
               que ser imposible confundir un plan con la programación vigente. -->
          <span v-if="isPlanPreview" class="ds-pill warn">
            <i class="fa-solid fa-flask" aria-hidden="true"></i>
            Simulación · no es el cronograma real{{ planName ? ` · ${planName}` : '' }}
          </span>
        </div>
        <p class="ds-sub">{{ periodLabel }} · {{ kpiSums.count }} ediciones · solo lectura</p>
      </div>

      <div class="ds-head-actions">
        <div class="sb-month-nav">
          <button type="button" class="btn-icon sb-nav-btn" title="Mes anterior" aria-label="Mes anterior" @click="changeMonth(-1)">
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <select v-model.number="selectedMonth" class="ds-input sb-ctl" aria-label="Mes" @change="fetchAll">
            <option v-for="(m, i) in months" :key="i" :value="i + 1">{{ m }}</option>
          </select>
          <select v-model.number="selectedYear" class="ds-input sb-ctl" aria-label="Año" @change="fetchAll">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <button type="button" class="btn-icon sb-nav-btn" title="Mes siguiente" aria-label="Mes siguiente" @click="changeMonth(1)">
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>

        <input v-model.trim="search" class="ds-input sb-ctl sb-search" type="search" aria-label="Buscar edición" placeholder="Buscar curso, docente, código…" />

        <select v-model="lineFilter" class="ds-input sb-ctl" aria-label="Línea">
          <option value="">Todas las líneas</option>
          <option v-for="l in courseLines" :key="l" :value="l">{{ l }}</option>
        </select>

        <button type="button" class="btn-exec btn-exec-outline" @click="fetchAll">
          <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Actualizar
        </button>
      </div>
    </header>

    <div class="ds-kpis">
      <!-- inscripciones con su desglose: de qué canal sale cada alumno -->
      <div class="ds-kpi sb-kpi-canales">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-users"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="isLoading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ kpiSums.inscritos }}</span>
          </div>
          <span class="ds-kpi-label">Inscripciones</span>
          <div v-if="!isLoading" class="sb-channels">
            <span v-for="c in AULA_CHANNELS" :key="c.key" class="sb-chit" :title="c.desc">
              <span class="sb-dot" :style="{ background: c.color }"></span>{{ c.title }} <b>{{ kpiSums.ch[c.key] }}</b>
            </span>
          </div>
        </div>
      </div>

      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-layer-group"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="isLoading" class="skel-kpi"></span>
            <span v-else class="ds-kpi-value">{{ kpiSums.count }}</span>
          </div>
          <span class="ds-kpi-label">Programas</span>
          <span class="ds-kpi-note">Ediciones del mes con los filtros puestos</span>
        </div>
      </div>

      <div class="ds-kpi">
        <span class="ds-kpi-icon" aria-hidden="true"><i class="fa-solid fa-bullseye"></i></span>
        <div class="ds-kpi-body">
          <div class="ds-kpi-row">
            <span v-if="isLoading" class="skel-kpi"></span>
            <template v-else>
              <span class="ds-kpi-value">{{ kpiVsObjetivo.ventas }}</span>
              <span class="sb-kpct" :style="{ background: soft(kpiVsObjetivo.color), color: kpiVsObjetivo.color }">{{ kpiVsObjetivo.pct }}%</span>
            </template>
          </div>
          <span class="ds-kpi-label">Ventas vs objetivo</span>
          <span class="ds-kpi-note">Objetivo del mes: {{ kpiVsObjetivo.objetivo }}</span>
        </div>
      </div>
    </div>

    <section class="sb-board">
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
                <td v-for="c in 9" :key="c"><span class="ds-skel" :style="{ width: (55 + ((n + c) * 13) % 40) + '%' }"></span></td>
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
                  <p class="ds-empty ds-empty--lista">No hay ediciones para este filtro. Prueba con otro mes, línea o término de búsqueda.</p>
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
    </section>

    <!-- ════ RESÚMENES DEL MES ════ -->
    <div class="sumgrid">
      <div class="sumcard">
        <h3 class="sum-title">Programas por categoría</h3>
        <table class="sumtbl">
          <thead><tr><th v-for="c in catSummary.cols" :key="c.label">{{ c.label }}</th><th class="tot">TOTAL</th></tr></thead>
          <tbody><tr><td v-for="c in catSummary.cols" :key="c.label">{{ c.n }}</td><td class="tot">{{ catSummary.total }}</td></tr></tbody>
        </table>
      </div>
      <div class="sumcard">
        <h3 class="sum-title">Programas programados por línea</h3>
        <table class="sumtbl">
          <thead><tr><th v-for="l in lineSummary" :key="l.label">{{ l.label }}</th></tr></thead>
          <tbody><tr><td v-for="l in lineSummary" :key="l.label">{{ l.n }}</td></tr></tbody>
        </table>
      </div>
    </div>

    <div class="sumgrid">
      <div class="sumcard">
        <h3 class="sum-title">Tipos de curso</h3>
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
        <h3 class="sum-title">Segmentos</h3>
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
    <!-- La tabla de Alumnos (5 columnas con correo) pide más ancho que la explicación. -->
    <BaseModal :model-value="!!aulaModal" title="¿De dónde sale el AULA?" :size="amTab === 'alumnos' ? 'lg' : 'md'" @update:model-value="aulaModal = null">
      <template v-if="aulaModal">
        <div class="am-head">
          <div class="am-title">{{ aulaModal.e.program_abreviature || '—' }}</div>
          <div class="am-sub">{{ lineLabel(aulaModal.e) }} · {{ typeLabel(aulaModal.e) }}</div>
        </div>

        <div class="ds-tabs am-tabs" role="tablist" aria-label="Detalle del aula">
          <button type="button" role="tab" :aria-selected="String(amTab === 'info')" @click="amTab = 'info'">Información</button>
          <button type="button" role="tab" :aria-selected="String(amTab === 'arbol')" @click="amTab = 'arbol'">Árbol</button>
          <button v-if="canSeeStudents" type="button" role="tab" :aria-selected="String(amTab === 'alumnos')" @click="showStudentsTab">
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
                      <i class="fa-solid fa-laptop" aria-hidden="true"></i> Traerá laptop
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
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { objetivoDeCanales } from '@/shared/lib/cronograma'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'

const editionService = inject(ServiceKeys.Edition)
const dashboardService = inject(ServiceKeys.Dashboard)
const schedulePlanService = inject(ServiceKeys.SchedulePlan)
const toast = useToast()

// ── Modo simulación ────────────────────────────────────────────────────────
// Con ?plan=<id> la vista pinta un escenario de Producto > Planificación en vez
// del cronograma real. Es la MISMA vista a propósito: el sentido de la
// simulación es ver el 2027 con la misma cara que tendrá el día que se publique,
// y una copia del componente se habría desincronizado a la primera semana.
const route = useRoute()
const planId = Number(route.query.plan) || null
const isPlanPreview = computed(() => !!planId)
const planName = ref('')

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
// Ventana de años derivada del año en curso: la lista fija se quedó corta el
// 1-ene y dejó fuera los planes a futuro (2027).
const CURRENT_YEAR = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)
const MABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Paleta por segmento, solo con tokens del sistema de diseño: claro y oscuro salen solos.
// `color` = tinta del badge (variante -ink, con contraste AA sobre su pastel).
// `tint` = hue para el fondo de la fila. Donde la tinta es parda (ámbar, rojo) se usa el
// relleno: el ámbar oscuro mezclado al 13% da un beige sucio que ya no se lee naranja.
const SEG_COLORS = {
  A1: { color: 'var(--ds-info-ink)', tint: 'var(--ds-info-ink)' },
  A2: { color: 'var(--ds-warn-ink)', tint: 'var(--ds-warn)' },
  A3: { color: 'var(--ds-cyan-ink)', tint: 'var(--ds-cyan-ink)' },
  A4: { color: 'var(--ds-orange-ink)', tint: 'var(--ds-orange-ink)' },
  A5: { color: 'var(--ds-bad-ink)', tint: 'var(--ds-bad)' },
  A6: { color: 'var(--ds-violet-ink)', tint: 'var(--ds-violet-ink)' },
  A7: { color: 'var(--ds-heading)', tint: 'var(--ds-brand)' }, // CERRADO
}
const DEFAULT_SEG = { color: 'var(--ds-ink-2)' }
function segColor(e) { return SEG_COLORS[(e.cat_segment || '').toUpperCase()] || DEFAULT_SEG }

// Fondo suave de chips: color-mix en vez de hex+'1A' para aceptar var(--ds-ink) (tema oscuro)
const soft = c => `color-mix(in oklab, ${c} 11%, transparent)`

const today = new Date()
// En simulación el mes/año los manda el planner (?m=&y=): abrir siempre en el
// mes actual mostraría un 2027 vacío y parecería que el plan no se guardó.
const selectedMonth = ref(Number(route.query.m) || today.getMonth() + 1)
const selectedYear = ref(Number(route.query.y) || today.getFullYear())
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
  // En simulación tampoco: la edición no existe todavía, así que no hay aula
  // que consultar (edition_num_id viaja en null).
  const conAula = canSeeStudents && !isPlanPreview.value && it.e?.edition_num_id
  amStudents.value = conAula ? null : []
  if (conAula) loadStudents(it.e.edition_num_id)
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
// counts_as_sale = gerencia pidió contarlo como venta (gana a todo menos beca).
function studentChannel(s) {
  const tag = s.is_beca ? 'BEC'
    : s.counts_as_sale ? 'VEN'
    : s.member_benefits ? 'MEM'
    : s.is_b2b ? 'B2B'
    : (s.parent_codes && s.parent_codes.length) ? 'SEG'
    : 'VEN'
  return AULA_CHANNELS.find(c => c.tag === tag)
}

// Explicación de cada canal del contador de aula (por qué van separados)
const AULA_CHANNELS = [
  { key: 'cnt_ventas', tag: 'VEN', title: 'Venta directa', color: 'var(--ds-ink)',
    desc: 'Matrículas vendidas directamente sobre esta edición. Es el número que compite contra el objetivo del mes.' },
  { key: 'cnt_segui', tag: 'SEG', title: 'Seguimiento', color: 'var(--ds-accent)',
    desc: 'Alumnos que vienen arrastrados de un programa padre (paquetes) o de una reprogramación. No son venta nueva de esta edición, por eso se cuentan aparte.' },
  { key: 'cnt_memb', tag: 'MEM', title: 'Membresía', color: 'var(--ds-violet-ink)',
    desc: 'Alumnos que entran usando su membresía (WE PLUS, GOLD, PLATINUM, BLACK). No pagan esta edición de forma individual.' },
  { key: 'cnt_b2b', tag: 'B2B', title: 'Convenio B2B', color: 'var(--ds-cyan-ink)',
    desc: 'Alumnos inscritos por convenio con empresas o instituciones. Se negocian por contrato, fuera de la venta directa.' },
  { key: 'cnt_becas', tag: 'BEC', title: 'Becas', color: 'var(--ds-warn-ink)',
    desc: 'Alumnos becados: ocupan asiento pero no facturan, por eso NO suman al total de AULA.' },
]

// Líneas = categoría del programa (BI, Excel, Proyectos, SAP…), NO we_business_line
// (EN VIVO/ONLINE/FUNDACIÓN/B2B), que el SP del cronograma ni siquiera devuelve.
// Se arman con lo que trae el mes: así el combo nunca ofrece una línea sin ediciones.
const courseLines = computed(() =>
  [...new Set(monthItemsActive.value.map(e => e.program_line_business).filter(Boolean))].sort()
)

const periodLabel = computed(() => `${months[selectedMonth.value - 1]} ${selectedYear.value}`)

// ── Carga: ediciones del mes + objetivos + consultas, fusionados por edición ──
async function fetchAll() {
  if (isPlanPreview.value) return fetchPlanMonth()
  isLoading.value = true
  try {
    const { items } = await editionService.editionByWeekList({
      // Mismo tope que el backend: con 200 un mes grande se truncaba sin aviso.
      page: 1, size: 500,
      selectedMonth: selectedMonth.value,
      selectedYear: selectedYear.value
    })
    const weeks = Array.isArray(items) ? items : []

    // Las consultas NO se piden aparte: editionByWeekList ya trae cnt_consultas
    // (los cinco estados que negocio llama consulta). El /leads-per-edition del
    // dashboard cuenta ademas Eliminado, Cerrado y Prox. Inicio, y su resultado
    // se escribia en e.consultas, campo que la tabla ni siquiera pinta.
    const goals = await dashboardService
      .programGoalsList({ year: selectedYear.value, month_num: selectedMonth.value })
      .catch(() => {
        // Sin objetivos el tablero igual sirve, pero no puede mostrar 0% como si fuera real.
        toast.warning('No se pudieron cargar los objetivos del mes: el % de logro no está disponible.')
        return { items: [] }
      })

    // El objetivo se DERIVA del reparto por canal, igual que en Gerencia >
    // Objetivos, que es donde se edita. Leer `meta_vacantes` (el total guardado)
    // hacia que las dos pantallas mostraran meses distintos: ver objetivoDeCanales.
    //
    // Pero una edicion SIN canales conserva su total guardado: hasta sep/2026 el
    // objetivo se cargaba a mano desde Producto > Cronograma y nunca tuvo
    // reparto. Derivar a secas dejaba en cero todo el historico, que es dato
    // cerrado y no se vuelve a cargar. El plan por canal arranca en oct/2026.
    const goalByEd = {}
    ;(goals.items || []).forEach(g => {
      goalByEd[g.edition_id] = objetivoDeCanales(g.metas_canal) || g.meta_vacantes
    })

    weeks.forEach(w => (w.items || []).forEach(e => {
      // Los congresos/eventos llevan su propia meta en Fundacion > Objetivos:
      // no compiten contra el objetivo de vacantes del cronograma.
      e.meta_vacantes = isEvent(e) ? 0 : (goalByEd[e.edition_num_id] || 0)
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

// Un mes del escenario. No pide objetivos ni consultas: una edición que todavía
// no existe no tiene ventas ni leads, y mostrar los del año pasado haría creer
// que el plan ya está vendido. Los contadores quedan en 0 a propósito.
async function fetchPlanMonth() {
  isLoading.value = true
  try {
    const { plan, items } = await schedulePlanService.previewMonth({
      planId, month: selectedMonth.value, year: selectedYear.value
    })
    planName.value = plan?.name || ''
    schedules.value = Array.isArray(items) ? items : []
    closedWeeks.value = {}
  } catch (err) {
    console.error('Error cargando la simulación:', err)
    toast.error('No se pudo cargar el plan')
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
  let color = 'var(--ds-orange-ink)'
  if (pct > 100) color = 'var(--ds-ok-ink)'
  else if (pct >= 50) color = 'var(--ds-ink)' /* neutro: sigue al tema */
  return { pct, color, w: Math.min(100, pct) }
}

// Semáforo AULA: <15 naranja · 15–34 negro (lleno) · 35+ verde.
function aulaColor(n) {
  if (n >= 35) return 'var(--ds-ok-ink)'
  if (n < 15) return 'var(--ds-orange-ink)'
  return 'var(--ds-ink)'
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
    // Solo promedian las ediciones con objetivo: una sin meta da 0% y hundía el promedio.
    const conMeta = items.filter(it => (it.e.meta_vacantes ?? 0) > 0)
    const avg = conMeta.length ? Math.round(conMeta.reduce((s, it) => s + it.fl.pct, 0) / conMeta.length) : 0
    return {
      schedule: w.schedule, count: items.length, items,
      isOpen: !closedWeeks.value[w.schedule],
      summary: `${live} en curso · ${avg}% logro prom.`,
    }
  }))

// ── KPIs (sobre lo filtrado): ventas vs objetivo (juntos, para compararlos), programas y aula ──
const kpiSums = computed(() => {
  const all = filteredWeeks.value.flatMap(w => w.items)
  // Los congresos/eventos quedan fuera de los totales, igual que ya lo estaban
  // en el objetivo (meta_vacantes sale en 0 para ellos): su meta y sus
  // asistentes se llevan en Fundación > Objetivos, no compiten con las aulas.
  // Contarlos aquí inflaba Inscripciones con cientos de asistentes de congreso.
  // Siguen listados en la tabla: esto solo los saca de los KPIs.
  const aulas = all.filter(e => !isEvent(e))
  const sum = k => aulas.reduce((s, e) => s + (e[k] ?? 0), 0)
  const ch = Object.fromEntries(AULA_CHANNELS.map(c => [c.key, sum(c.key)]))
  // Inscripciones = alumnos sentados en el aula, becados incluidos. Ojo: la
  // columna AULA de la tabla NO suma becas (no facturan), por eso este total
  // es mayor que la suma de esa columna.
  return {
    // count SI cuenta los eventos: es cuántas filas hay en la tabla de abajo.
    count: all.length, ventas: sum('cnt_ventas'), objetivo: sum('meta_vacantes'),
    // Numerador del % de logro: solo ventas de ediciones CON objetivo. Sumar las
    // de ediciones sin meta contra un denominador que no las incluye inflaba el %.
    ventasConMeta: aulas.filter(e => (e.meta_vacantes ?? 0) > 0).reduce((s, e) => s + (e.cnt_ventas ?? 0), 0),
    ch, inscritos: sum('cnt_aula') + ch.cnt_becas,
  }
})
const kpiVsObjetivo = computed(() => {
  const { ventasConMeta: ventas, objetivo } = kpiSums.value
  const pct = objetivo > 0 ? Math.round((ventas / objetivo) * 100) : 0
  let color = 'var(--ds-orange-ink)'
  if (pct > 100) color = 'var(--ds-ok-ink)'
  else if (pct >= 50) color = 'var(--ds-ink)'
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
// Tintes como color-mix sobre var(--ds-surface): el mismo valor sirve en claro y oscuro
const tint = (c, p = 12) => `color-mix(in oklab, ${c} ${p}%, var(--ds-surface))`
// Sin tinte propio: cada fila se pinta con el mismo pastel del segmento en el cronograma
// (SEG_COLORS.tint, ver segSummary). Leyenda y tabla no pueden divergir.
const SEG_DEFS = [
  { key: 'A1', def: 'Cursos de apertura (no seguimientos: son los Diplomados, Especializaciones y PEE)' },
  { key: 'A2', def: 'Cursos de seguimiento (los cursos que pertenecen a un Diplomado, Especialización o PEE)' },
  // A3 y A4 (modificación de cursos) salen de la leyenda por pedido de negocio
  // el 25/09/2026. Siguen en SEG_COLORS: si una edición viene con ese segmento,
  // la fila se pinta igual; lo que se quitó es la fila explicativa.
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
/* Colores solo con tokens --ds-*: claro y oscuro salen de design-system.css,
   sin bloque de modo oscuro propio. Los tokens viven en :root, así
   que también llegan al modal (BaseModal se teleporta a <body>). */

/* ===== Encabezado ===== */
.sb-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.sb-month-nav { display: flex; align-items: center; gap: 4px; }
.sb-nav-btn { width: 32px; height: 36px; padding: 0; }
/* .ds-input es width:100% (formularios); en la barra cada control mide su contenido */
.sb-ctl { width: auto; }
.sb-search { min-width: 210px; }

/* ===== KPIs ===== */
/* Inscripciones: el total manda y el desglose por canal lo sostiene */
.sb-kpi-canales { grid-column: span 2; }
.sb-channels { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 4px; }
.sb-chit { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--ds-muted); white-space: nowrap; }
.sb-chit b { font-weight: 800; color: var(--ds-ink); font-variant-numeric: tabular-nums; }
.sb-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.sb-kpct { font-family: var(--ds-font-mono); font-size: 11px; font-weight: 800; border-radius: 20px; padding: 2px 8px; white-space: nowrap; }

/* tabla + su leyenda van juntas: el gap de .ds-page las separaría demasiado */
.sb-board { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

/* ===== Tabla ===== */
/* El scroll horizontal vive aquí y no en la página: a 400 px la tabla (1150 px) se desliza sola */
.crono-tbl { background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
  overflow: auto; max-height: calc(100vh - 110px); }
.crono-tbl::-webkit-scrollbar { width: 10px; height: 10px; }
.crono-tbl::-webkit-scrollbar-thumb { background: var(--ds-border-strong); border-radius: 999px; border: 2px solid var(--ds-surface); }
table.crono { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 1150px; }
table.crono th, table.crono td { text-align: left; }
table.crono thead th {
  position: sticky; top: 0; z-index: 6; background: var(--ds-surface-3); color: var(--ds-ink-2);
  font-size: 10px; font-weight: 700; letter-spacing: .06em; padding: 7px 10px; border-bottom: 1px solid var(--ds-border); white-space: nowrap;
}
/* separación vertical estilo hoja de cálculo */
table.crono thead th:not(:last-child),
table.crono tbody tr.ed td:not(:last-child),
table.crono tbody tr.skrow td:not(:last-child) { border-right: 1px solid var(--ds-border-strong); }
.th-group { text-align: center !important; }
.th-group .g-title { font-size: 10px; letter-spacing: .1em; color: var(--ds-heading); margin-bottom: 4px; }
.th-group .g-cols { display: flex; gap: 8px; justify-content: center; }
.th-group .g-cols span { width: 26px; text-align: center; }
.th-group .g-cols span.hot { color: var(--ds-ink); font-weight: 800; width: 32px; }
th.c-num, td.c-num { text-align: center; }

/* fila banda de semana */
tr.week-row td { background: var(--ds-surface-3); padding: 0; border-bottom: 1px solid var(--ds-border); }
.week-bar { display: flex; align-items: center; gap: 10px; padding: 5px 12px; cursor: pointer; }
.week-bar .grow { flex: 1; }
.week-bar .caret { width: 22px; height: 22px; border: none; background: transparent; color: var(--ds-muted); display: grid;
  place-items: center; border-radius: 6px; transition: .15s; cursor: pointer; }
.week-bar .caret:hover { background: var(--ds-surface-2); color: var(--ds-ink); }
.week-bar .caret span { display: inline-block; transition: transform .18s; font-size: 12px; }
.week-bar.collapsed .caret span { transform: rotate(-90deg); }
.week-bar .wk-chip { width: 6px; height: 15px; border-radius: 3px; background: var(--ds-ink); }
.week-bar h3 { font-size: 13px; font-weight: 800; margin: 0; color: var(--ds-ink); }
.week-bar .ed-pill { font-size: 10.5px; font-weight: 600; color: var(--ds-ink-2); background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 20px; padding: 1px 9px; }
.week-bar .stat { font-size: 11px; color: var(--ds-muted); font-weight: 600; }

/* celdas del cuerpo */
table.crono tbody td { padding: 5px 10px; border-bottom: 1px solid var(--ds-border); vertical-align: middle; background: var(--ds-surface); color: var(--ds-ink); }
table.crono tbody tr.ed.clickable { cursor: pointer; }
table.crono tbody tr.ed:hover td { background: var(--ds-surface-2); }

/* estado por fondo pastel muy suave: con meta naranja · sin meta azul
   (color-mix sobre --ds-surface: el mismo tinte funciona en claro y oscuro) */
tr.ed.meta td { background: color-mix(in oklab, var(--ds-orange-ink) 7%, var(--ds-surface)); }
tr.ed.sinmeta td { background: color-mix(in oklab, var(--ds-accent) 6%, var(--ds-surface)); }
tr.ed.meta:hover td { background: color-mix(in oklab, var(--ds-orange-ink) 13%, var(--ds-surface)); }
tr.ed.sinmeta:hover td { background: color-mix(in oklab, var(--ds-accent) 11%, var(--ds-surface)); }

/* CA/CP */
.cacp { display: flex; flex-direction: column; gap: 1px; }
.cacp .kv { display: flex; align-items: center; gap: 6px; }
.cacp .k { font-size: 8.5px; font-weight: 700; color: var(--ds-muted); width: 14px; }
.cacp .v { font-family: var(--ds-font-mono); font-weight: 400; font-size: 11.5px; color: var(--ds-ink-2); font-variant-numeric: tabular-nums; }

/* curso */
.curso { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.curso .top { display: flex; align-items: center; gap: 7px; }
.lvl-badge { font-size: 9px; font-weight: 800; font-family: var(--ds-font-mono); border-radius: 4px; padding: 1px 6px; flex: none; }
.curso .name { font-size: 13px; font-weight: 700; letter-spacing: -0.01em; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.curso .area { font-size: 10.5px; color: var(--ds-muted); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* NM: píldora sólida vino. Sólida y no pastel como .lvl-badge, porque debe
   distinguirse de un vistazo sobre los tintes de fila (meta/sinmeta/A6/A7).
   Texto en --ds-surface: en oscuro el vino se aclara y el texto se invierte. */
.nm-badge { font-size: 8.5px; font-weight: 800; font-family: var(--ds-font-mono); letter-spacing: .04em;
  border-radius: 4px; padding: 1px 5px; flex: none; background: var(--ds-rose-ink); color: var(--ds-surface); }

/* cronograma: inicio resaltado (chip oscuro) · fin más claro */
.cro { display: flex; flex-direction: column; gap: 2px; }
.cro .dates { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--ds-ink-2); white-space: nowrap; }
.date-chip { font-family: var(--ds-font-mono); font-size: 10.5px; font-weight: 800; background: var(--ds-ink); color: var(--ds-surface); border-radius: 5px; padding: 1px 6px; }
.cro .arrow-to { color: var(--ds-muted); }
.cro .date-end { color: var(--ds-muted); }
.cro .ses { color: var(--ds-muted); font-weight: 600; }
.cro .when { font-size: 10.5px; color: var(--ds-muted); white-space: nowrap; }
.cro .when b { color: var(--ds-ink-2); font-weight: 700; }

/* docente */
.docs { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.docs .lbl { font-size: 8.5px; font-weight: 700; letter-spacing: .06em; color: var(--ds-muted); }
.docs .name { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.docs .name.multi { font-weight: 600; font-size: 11.5px; }
.docs .more { font-size: 10.5px; font-weight: 700; color: var(--ds-muted); cursor: default; }

/* popover con la lista completa de docentes (hover sobre la celda) */
td.doc-copy { position: relative; cursor: copy; }
.doc-pop {
  display: none; position: absolute; z-index: 40; top: calc(100% - 6px); left: 10px;
  background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: 10px;
  box-shadow: 0 10px 28px rgb(0 0 0 / 18%);
  padding: 10px 14px; min-width: 210px; max-width: 300px;
}
td.doc-copy:hover .doc-pop { display: block; }
.doc-pop .pop-name { font-size: 12px; font-weight: 600; color: var(--ds-ink); padding: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-pop .pop-hint { margin-top: 6px; font-size: 9.5px; font-weight: 700; letter-spacing: .04em; color: var(--ds-muted); border-top: 1px dashed var(--ds-border); padding-top: 5px; }

/* seguimiento: en una sola línea para compactar la fila */
.segui { display: flex; gap: 10px; }
.segui .item { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: var(--ds-ink-2); white-space: nowrap; }
.segui .g { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.g.ok { background: var(--ds-ok); } .g.no { background: var(--ds-muted); }

/* aula: el color del total lo pone aulaColor(): <15 naranja · 15–34 tinta · 35+ verde */
.aula-cell { display: flex; gap: 8px; justify-content: center; align-items: center; }
.aula-cell .acol { width: 26px; text-align: center; font-family: var(--ds-font-mono); font-size: 12.5px; font-weight: 700; color: var(--ds-ink-2); font-variant-numeric: tabular-nums; }
.aula-cell .acol.zero { color: var(--ds-muted); font-weight: 500; opacity: .6; }
/* becas siempre en gris apagado: no suman al aula, no deben llamar la atención */
.aula-cell .acol.bec { color: var(--ds-muted); font-weight: 500; opacity: .6; }
/* el total AULA es el punto focal de la fila: píldora sólida con el color del
   semáforo (el ojo va primero a las formas rellenas de color).
   Texto en --ds-surface y no blanco: cuando el semáforo devuelve --ds-ink en
   oscuro la píldora queda clara y el texto debe invertirse (igual que .date-chip). */
.aula-cell .acol.total { font-weight: 800; font-size: 12.5px; color: var(--ds-surface); border-radius: 7px; padding: 3px 0; width: 32px; flex: none; }
.aula-cell .acol.total.empty { background: var(--ds-surface-3); color: var(--ds-muted); font-weight: 600; }

/* objetivo */
.obj { display: flex; flex-direction: column; gap: 3px; min-width: 128px; }
/* "orow"/"acol" y no "row"/"col": Bootstrap global del ERP secuestra esas clases */
.obj .orow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.obj .frac { font-size: 12px; font-weight: 700; white-space: nowrap; }
.obj .frac b { font-family: var(--ds-font-mono); }
.obj .frac .t { color: var(--ds-muted); font-weight: 600; font-family: var(--ds-font-mono); }
.obj .pct { font-size: 9.5px; font-weight: 800; font-family: var(--ds-font-mono); border-radius: 20px; padding: 1px 7px; white-space: nowrap; }
.obj .track { height: 4px; border-radius: 20px; background: var(--ds-surface-3); overflow: hidden; }
.obj .track > i { display: block; height: 100%; border-radius: 20px; transition: width .4s; }
.sinmeta-txt { font-size: 11.5px; color: var(--ds-muted); font-style: italic; }

td.cons { text-align: center; font-family: var(--ds-font-mono); font-size: 13px; font-weight: 700; color: var(--ds-ink); }
td.cons.zero { color: var(--ds-muted); font-weight: 500; opacity: .6; }
td.obs { color: var(--ds-muted); font-size: 10.5px; font-style: italic; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ============================================================
   PADRE ↔ HIJO — solo líneas: tinte, fusión y conector (sin etiquetas)
   ============================================================ */
tr.ed.fam td { background: color-mix(in oklab, var(--ds-heading) 4%, var(--ds-surface)); }
tr.ed.fam:hover td { background: color-mix(in oklab, var(--ds-heading) 8%, var(--ds-surface-2)); }

/* Tinte de fila por segmento: SIEMPRE manda el color del tipado (A1 azul, A2 ámbar,
   A3 teal, A4 naranja, A6 violeta, A7 navy). Va después de .fam/.meta/.sinmeta y lleva
   el prefijo table.crono tbody para ganarle también al hover genérico.
   --seg lo pone la fila (segColor); sin segmento (.segrow-none) se queda el tinte meta/sinmeta.
   El hover no oscurece: el tinte ES la identidad del segmento, no un estado. */
table.crono tbody tr.ed:not(.segrow-none) td,
table.crono tbody tr.ed:not(.segrow-none):hover td { background: color-mix(in oklab, var(--seg) 13%, var(--ds-surface)); }
table.crono tbody tr.ed.segrow-a7 td:first-child { box-shadow: inset 3px 0 0 var(--ds-heading); }
/* miembros fusionados: sin línea divisoria dentro de la familia */
tr.ed.fused td { border-bottom-color: transparent; }

/* celda curso de miembros anidados: indentación por nivel + conector de árbol */
.child-wrap { display: flex; align-items: stretch; gap: 12px; padding-left: 6px; }
.child-connector { position: relative; width: 20px; flex: none; }
.child-connector::before { /* vertical */
  content: ""; position: absolute; left: 8px; top: -14px; bottom: 50%; width: 2px; background: var(--ds-heading);
}
.child-connector::after { /* codo horizontal */
  content: ""; position: absolute; left: 8px; top: 50%; width: 12px; height: 2px; background: var(--ds-heading);
}
.child-connector .node { position: absolute; left: 5px; top: calc(50% - 3px); width: 8px; height: 8px; border-radius: 50%;
  background: var(--ds-surface); border: 2px solid var(--ds-heading); }

tr.skrow td { padding: 16px 12px; }

/* ===== leyenda bajo la tabla ===== */
.crono-foot { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--ds-muted); flex-wrap: wrap; }
.crono-foot .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ds-ok); flex: none; }

/* ===== resúmenes del mes ===== */
.sumgrid { display: grid; grid-template-columns: auto 1fr; gap: var(--ds-gap); align-items: start; }
.sumgrid + .sumgrid { grid-template-columns: 1fr 1fr; }
.sumcard { min-width: 0; background: var(--ds-surface); border: 1px solid var(--ds-border); border-radius: var(--ds-radius); padding: 12px 16px; overflow-x: auto; }
.sum-title { margin: 0 0 8px; font-size: 13.5px; font-weight: 700; color: var(--ds-heading); }
.sumtbl { border-collapse: collapse; }
.sumtbl th, .sumtbl td { border: 1px solid var(--ds-border-strong); padding: 3px 12px; text-align: center; white-space: nowrap; }
.sumtbl th { font-size: 10px; font-weight: 700; letter-spacing: .04em; color: var(--ds-ink-2); background: var(--ds-surface-3); }
.sumtbl td { font-family: var(--ds-font-mono); font-size: 12px; font-weight: 700; color: var(--ds-ink); }
.sumtbl .tot { background: var(--ds-surface-3); }
.sumtbl td.tot { font-weight: 800; }
.deftbl { border-collapse: collapse; width: 100%; }
.deftbl th, .deftbl td { border: 1px solid var(--ds-border-strong); padding: 3px 9px; text-align: left; }
.deftbl th { font-size: 9.5px; font-weight: 700; letter-spacing: .05em; color: var(--ds-ink-2); background: var(--ds-surface-3); white-space: nowrap; }
.deftbl td { font-size: 11px; color: var(--ds-ink-2); }
.deftbl td.num { font-family: var(--ds-font-mono); font-weight: 700; text-align: center; color: var(--ds-ink); width: 1%; white-space: nowrap; }
.deftbl td.tag { font-family: var(--ds-font-mono); font-weight: 800; text-align: center; color: var(--ds-ink); width: 1%; white-space: nowrap; }
.deftbl td.def { line-height: 1.35; }

/* ===== modal "¿de dónde sale el AULA?" (dentro de BaseModal) ===== */
.am-head { margin-bottom: 12px; }
.am-title { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; color: var(--ds-heading); }
.am-sub { font-size: 12px; color: var(--ds-muted); font-weight: 500; margin-top: 1px; }
.am-tabs { margin-bottom: 4px; }
.am-body { padding: 4px 0; }
.am-students { max-height: 56vh; overflow: auto; }
.am-loading { padding: 26px 0; text-align: center; color: var(--ds-muted); font-size: 13px; }
.am-tbl { width: 100%; border-collapse: separate; border-spacing: 0; }
.am-tbl th { position: sticky; top: 0; background: var(--ds-surface); text-align: left; font-size: 10.5px; font-weight: 700;
  letter-spacing: .07em; color: var(--ds-muted); padding: 8px 10px; border-bottom: 1px solid var(--ds-border); white-space: nowrap; }
.am-tbl td { padding: 9px 10px; border-bottom: 1px solid var(--ds-border); font-size: 12.5px; vertical-align: middle; }
.am-tbl tr:last-child td { border-bottom: none; }
.am-tbl .am-name { font-weight: 700; color: var(--ds-ink); }
.am-tbl .am-agent { font-family: var(--ds-font-mono); font-weight: 700; color: var(--ds-ink-2); white-space: nowrap; }
.am-tbl .am-mail { color: var(--ds-ink-2); word-break: break-all; }
.am-tbl .am-extra { color: var(--ds-muted); font-size: 12px; }
/* Promo LAPTOP: la misma marca de negocio "laptop" (cian) que usa el panel FICO */
.am-laptop { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; font-size: 10px; font-weight: 800; border-radius: 5px; padding: 2px 7px; margin-right: 6px;
  background: var(--ds-soft-cyan); color: var(--ds-cyan-ink); border: 1px solid color-mix(in oklab, var(--ds-cyan-ink) 30%, transparent); }
.am-laptop i { font-size: 9px; }
.am-tbl tr.row-laptop td { background: var(--ds-soft-cyan); }
.am-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--ds-border); }
.am-row:last-child { border-bottom: none; }

/* Tab Árbol */
.am-tree-grp { margin-bottom: 16px; }
.am-tree-grp:last-child { margin-bottom: 0; }
.am-tree-parent { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ds-ink); padding-bottom: 6px; }
.am-tree-ptag { font-size: 9px; font-weight: 800; font-family: var(--ds-font-mono); letter-spacing: .06em; border-radius: 4px; padding: 1px 6px; background: color-mix(in oklab, var(--ds-heading) 12%, transparent); color: var(--ds-heading); flex: none; }
.am-tree-code { font-family: var(--ds-font-mono); font-size: 11px; color: var(--ds-muted); }
.am-tree-child { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0 6px 10px; margin-left: 6px; border-left: 2px solid var(--ds-border-strong); }
.am-tree-child.cur { background: color-mix(in oklab, var(--ds-heading) 8%, transparent); border-radius: 0 8px 8px 0; border-left-color: var(--ds-heading); }
.am-tree-node { width: 7px; height: 7px; border-radius: 50%; background: var(--ds-muted); margin-top: 5px; flex: none; }
.am-tree-child.cur .am-tree-node { background: var(--ds-heading); }
.am-tree-txt { font-size: 12.5px; color: var(--ds-ink); }
.am-tree-meta { font-size: 10.5px; font-family: var(--ds-font-mono); color: var(--ds-muted); margin-top: 1px; }
.am-tree-curtag { font-size: 9px; font-weight: 800; font-family: var(--ds-font-mono); border-radius: 4px; padding: 1px 6px; margin-left: 6px; background: var(--ds-heading); color: var(--ds-surface); }
.am-tag { flex: none; font-family: var(--ds-font-mono); font-size: 10px; font-weight: 800; border-radius: 5px; padding: 3px 8px; margin-top: 1px; }
.am-txt { min-width: 0; }
.am-t { font-size: 13.5px; font-weight: 700; color: var(--ds-ink); }
.am-t b { font-family: var(--ds-font-mono); margin-left: 4px; }
.am-d { font-size: 12.5px; line-height: 1.5; color: var(--ds-ink-2); margin-top: 2px; }
.am-foot { margin: 8px -16px -16px; padding: 14px 16px 16px; border-top: 1px solid var(--ds-border); background: var(--ds-surface-2); }
.am-formula { font-size: 13px; font-weight: 700; color: var(--ds-ink); }
.am-formula b { font-family: var(--ds-font-mono); font-size: 15px; }
.am-formula span { font-size: 11.5px; color: var(--ds-muted); font-weight: 500; margin-left: 4px; }
.am-note { margin-top: 10px; font-size: 12px; line-height: 1.5; color: var(--ds-heading);
  background: color-mix(in oklab, var(--ds-heading) 8%, transparent); border-radius: 8px; padding: 8px 12px; }

@media (max-width: 900px) {
  .sb-kpi-canales { grid-column: auto; }
  .sumgrid, .sumgrid + .sumgrid { grid-template-columns: minmax(0, 1fr); }
  .sb-search { min-width: 0; flex: 1 1 100%; }
}
</style>
