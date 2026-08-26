<template>
  <div class="exec-shell">

    <!-- ══════════════ MASTHEAD ══════════════ -->
    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Escenario de programación · Borrador</span>
            <h1 class="brand-title">{{ plan ? `${plan.name}` : 'Planificación' }}</h1>
          </div>
        </div>

        <div class="masthead-actions" v-if="plan">
          <button type="button" class="btn-exec btn-exec-ghost" :disabled="busy" @click="showSeed = true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Duplicar año
          </button>
          <!-- La vista de presentación real, comiendo del plan. Pestaña aparte. -->
          <button type="button" class="btn-exec btn-exec-teal" :disabled="busy" @click="openPreview">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Ver cómo se vería
          </button>
          <!-- saveOnly y no save(): save() relanza el error para cortar la
               cadena de "Guardar y ver", y desde un @click eso queda como
               promesa sin capturar en la consola. -->
          <button type="button" class="btn-exec btn-exec-primary" :disabled="!dirty || busy" @click="saveOnly">
            Guardar<span v-if="dirty" class="btn-exec-dot"></span>
          </button>
          <button type="button" class="btn-exec btn-exec-danger" :disabled="busy || !pendingCount" @click="confirmPublish">
            Pasar al cronograma real ({{ pendingCount }})
          </button>
        </div>
      </div>

      <!-- Segunda fila del masthead: mismo reparto que el cronograma real
           (filtros a la izquierda, KPIs a la derecha). -->
      <div class="masthead-filters" v-if="plan">
        <div class="filter-group">
          <label class="filter-label">PERÍODO</label>
          <div class="filter-period-nav">
            <button type="button" class="filter-nav-btn" @click="changeMonth(-1)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <select v-model.number="month" class="exec-select" style="min-width:110px;">
              <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
            </select>
            <!-- El año no se elige: lo fija el escenario. -->
            <span class="exec-year">{{ plan.year }}</span>
            <button type="button" class="filter-nav-btn" @click="changeMonth(1)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <div class="filter-sep"></div>

        <div class="filter-group">
          <label class="filter-label">ESCENARIO</label>
          <div class="filter-period-nav">
            <select class="exec-select" style="min-width:200px;" :value="planId" @change="selectPlan($event.target.value)">
              <option v-for="p in plans" :key="p.plan_id" :value="p.plan_id">{{ p.name }} · {{ p.year }}</option>
            </select>
            <button type="button" class="btn-exec btn-exec-ghost btn-exec-xs" @click="showNewPlan = true" title="Nuevo escenario">+</button>
          </div>
        </div>

        <div class="filter-spacer"></div>

        <div class="masthead-kpis">
          <div class="inline-kpi">
            <span class="inline-kpi-label">SEMANAS</span>
            <span class="inline-kpi-value">{{ filteredWeeks.filter(w => w.items.length).length }}</span>
          </div>
          <div class="inline-kpi">
            <span class="inline-kpi-label">EN EL MES</span>
            <span class="inline-kpi-value accent">{{ monthItems.length }}</span>
          </div>
          <div class="inline-kpi">
            <span class="inline-kpi-label">EN EL AÑO</span>
            <span class="inline-kpi-value">{{ planItemCount }}</span>
          </div>
          <div class="inline-kpi" v-if="carryOversThisMonth.length">
            <span class="inline-kpi-label">EN CURSO</span>
            <span class="inline-kpi-value">{{ carryOversThisMonth.length }}</span>
          </div>
          <div class="inline-kpi" v-if="publishedCount - carryOverCount > 0">
            <span class="inline-kpi-label">PUBLICADAS</span>
            <span class="inline-kpi-value" style="color:var(--gold-400)">{{ publishedCount - carryOverCount }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- ══════════════ CUERPO ══════════════ -->
    <main class="exec-body pb-5 mb-5">
      <div class="view-table" v-if="plan">
        <div class="table-shell">
          <div class="table-responsive-custom">

            <table class="exec-table">
              <thead>
                <!-- FILA 1: Grupos. Sin ACADÉMICA: los links del aula son de una
                     edición que existe, y en un borrador no hay aula todavía. -->
                <tr class="thead-group">
                  <th class="th-act" rowspan="2">
                    <div class="d-flex justify-content-center">
                      <button type="button" class="btn-exec btn-exec-primary btn-exec-xs" @click="openItem(null)">+ Nueva</button>
                    </div>
                  </th>
                  <th colspan="2" class="th-group th-group-a">IDENTIFICACIÓN</th>
                  <th colspan="4" class="th-group th-group-b">CRONOGRAMA</th>
                  <th colspan="3" class="th-group th-group-c">SEGUIMIENTO</th>
                  <th colspan="2" class="th-group th-group-d">REFERENCIA</th>
                </tr>

                <!-- FILA 2: Columnas -->
                <tr class="thead-sub">
                  <th class="ts ts-a">PROGRAMA</th>
                  <th class="ts ts-a">DETALLE</th>

                  <th class="ts ts-b text-center">F. INICIO</th>
                  <th class="ts ts-b text-center">F. FIN</th>
                  <th class="ts ts-b">HORARIO</th>
                  <th class="ts ts-b">DOCENTE</th>

                  <th class="ts ts-c text-center" style="min-width:120px;max-width:200px">FICHA / MEJORA</th>
                  <th class="ts ts-c text-center" style="min-width:100px;max-width:180px">CONFIRM.</th>
                  <th class="ts ts-c text-center" style="min-width:64px;" title="Nueva Metodología">N. MET.</th>

                  <th class="ts ts-d">OBSERVACIÓN</th>
                  <th class="ts ts-d">EDICIÓN</th>
                </tr>

                <!-- FILA 3: Filtros de columna -->
                <tr class="thead-filter">
                  <td class="tf"></td>
                  <td class="tf">
                    <ColumnFilterDropdown column-label="Programa" :all-items="monthItems" :value-extractor="(i) => i.program_abreviature || i.abbreviation" v-model="columnFilters.program" />
                  </td>
                  <td class="tf">
                    <ColumnFilterDropdown column-label="Detalle" :all-items="monthItems" :value-extractor="(i) => `${i.version_code || ''} ${i.cat_segment_label || i.cat_segment || ''}`" v-model="columnFilters.detail" />
                  </td>
                  <td class="tf"></td>
                  <td class="tf"></td>
                  <td class="tf"></td>
                  <td class="tf">
                    <ColumnFilterDropdown column-label="Docente" :all-items="monthItems" :value-extractor="(i) => i.instructor_label || i.instructor" v-model="columnFilters.instructor" />
                  </td>
                  <td class="tf"></td>
                  <td class="tf"></td>
                  <td class="tf"></td>
                  <td class="tf">
                    <ColumnFilterDropdown column-label="Observación" :all-items="monthItems" :value-extractor="(i) => i.notes" v-model="columnFilters.notes" />
                  </td>
                  <td class="tf"></td>
                </tr>
              </thead>

              <tbody>
                <!-- Vienen del año anterior y siguen dictándose este mes. No son
                     del plan: existen de verdad, por eso no tienen acciones. -->
                <template v-if="carryOversThisMonth.length">
                  <tr class="week-header-row week-header-carry" :class="{ 'is-collapsed': !carryOpen }" @click="carryOpen = !carryOpen">
                    <td :colspan="COL_COUNT" class="week-header-cell">
                      <div class="week-header-inner">
                        <svg class="week-chevron" :class="{ 'week-chevron-open': carryOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        <span class="week-label">En curso · vienen de {{ plan.year - 1 }}</span>
                        <span class="week-badge">{{ carryOversThisMonth.length }} Ediciones</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-for="e in carryOversThisMonth" :key="e.uid" v-show="carryOpen"
                      class="tbody-row row-published" :class="segClass(e) ? 'row-segment-' + segClass(e) : ''">
                    <td class="td-act">
                      <div class="action-btns">
                        <button class="action-btn" :class="isPackage(e) ? 'action-btn-tree' : 'action-btn-neutral'"
                                :disabled="!isPackage(e)" @click.stop="openTree(e)" title="Módulos">
                          <i class="fa-solid fa-book-bookmark"></i>
                        </button>
                      </div>
                    </td>
                    <td class="td-a td-prog">
                      <div class="prog-name"><span class="prog-link">{{ e.program_abreviature || e.abbreviation || '—' }}</span></div>
                      <div class="prog-sub text-muted small">
                        <span class="text-mono">{{ e.version_code }}</span>
                        <span class="float-end">Seg: {{ e.cat_segment_label || e.cat_segment || '—' }}</span>
                      </div>
                    </td>
                    <td class="td-a" style="min-width:80px;max-width:120px;">
                      <div class="small text-muted">{{ e.program_type ? 'Tipo: ' + e.program_type : '' }}</div>
                      <div class="small text-muted">{{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}</div>
                    </td>
                    <td class="td-b">
                      <div class="date-link">{{ formatDate(e.start_date) }}</div>
                      <div class="small text-muted">{{ dayLabel(e.start_date) }}</div>
                    </td>
                    <td class="td-b text-center"><div class="small text-mono">{{ formatDate(e.end_date) }}</div></td>
                    <td class="td-b">
                      <div class="small fw-600 text-dark">{{ dayCombLabel(e) || '—' }}</div>
                      <div class="small text-muted">{{ hourCombLabel(e) }}</div>
                    </td>
                    <td class="td-b" style="min-width:100px;max-width:130px;">
                      <div class="small text-truncate" style="max-width:160px;" :title="e.instructor_label || e.instructor">
                        {{ e.instructor_label || e.instructor || '—' }}
                      </div>
                    </td>
                    <td class="td-c text-center">
                      <span class="status-dot-ro" :class="e.expedient ? 'dot-ro-on' : 'dot-ro-off'" title="Ficha"></span>
                      <span class="status-dot-ro" :class="e.upgrade ? 'dot-ro-on' : 'dot-ro-off'" title="Mejora"></span>
                    </td>
                    <td class="td-c text-center">
                      <span class="status-dot-ro" :class="e.preconfirmation ? 'dot-ro-on' : 'dot-ro-off'" title="Pre-Confirmación"></span>
                      <span class="status-dot-ro" :class="e.confirmation ? 'dot-ro-on' : 'dot-ro-off'" title="Confirmación"></span>
                    </td>
                    <td class="td-c text-center">
                      <span class="status-dot-ro" :class="e.new_methodology ? 'dot-ro-on' : 'dot-ro-off'" title="Nueva Metodología"></span>
                    </td>
                    <td class="td-d"><div class="small text-truncate" style="max-width:200px;" :title="e.notes">{{ e.notes }}</div></td>
                    <td class="td-d">
                      <div class="text-mono fw-600 small"><b>{{ e.global_code }}</b></div>
                      <div class="pill pill-amber">Viene de {{ plan.year - 1 }}</div>
                    </td>
                  </tr>
                </template>

                <template v-for="week in filteredWeeks" :key="week.schedule">
                  <tr v-if="week.items.length > 0" class="week-header-row" :class="{ 'is-collapsed': !week.isOpen }" @click="toggleWeek(week.schedule)">
                    <td :colspan="COL_COUNT" class="week-header-cell">
                      <div class="week-header-inner">
                        <svg class="week-chevron" :class="{ 'week-chevron-open': week.isOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        <span class="week-label">Semana {{ week.schedule }}</span>
                        <span class="week-badge">{{ week.items.length }} Ediciones</span>
                      </div>
                    </td>
                  </tr>

                  <tr
                    v-for="e in week.items"
                    :key="e.uid"
                    v-show="week.isOpen"
                    class="tbody-row"
                    :class="[
                      segClass(e) ? 'row-segment-' + segClass(e) : '',
                      { 'row-published': e.published_edition_id }
                    ]"
                  >
                    <!-- ACCIONES -->
                    <td class="td-act">
                      <div class="action-btns">
                        <button class="action-btn" :class="isPackage(e) ? 'action-btn-tree' : 'action-btn-neutral'"
                                :disabled="!isPackage(e)" @click.stop="openTree(e)" title="Módulos">
                          <i class="fa-solid fa-book-bookmark"></i>
                        </button>
                        <template v-if="!e.published_edition_id">
                          <button class="action-btn action-btn-view" @click.stop="move(e, -7)" title="Una semana antes">
                            <i class="fa-solid fa-backward-step"></i>
                          </button>
                          <button class="action-btn action-btn-view" @click.stop="move(e, 7)" title="Una semana después">
                            <i class="fa-solid fa-forward-step"></i>
                          </button>
                          <button class="action-btn" :class="isPackage(e) ? 'action-btn-hier' : 'action-btn-edit'" @click.stop="openItem(e)" title="Editar">
                            <i v-if="!isPackage(e)" class="fa-solid fa-file-pen"></i>
                            <i v-else class="fa-solid fa-sitemap"></i>
                          </button>
                          <button class="action-btn action-btn-audit" @click.stop="duplicate(e)" title="Duplicar en el plan">
                            <i class="fa-solid fa-clone"></i>
                          </button>
                          <button class="action-btn action-btn-tree" @click.stop="removeItem(e)" title="Quitar del plan">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </template>
                      </div>
                    </td>

                    <!-- IDENTIFICACIÓN -->
                    <td class="td-a td-prog">
                      <div class="prog-name">
                        <span class="prog-link">{{ e.program_abreviature || e.abbreviation || '—' }}</span>
                      </div>
                      <div class="prog-sub text-muted small">
                        <span class="text-mono">{{ e.version_code }}</span>
                        <b v-if="e.program_sessions || e.sessions">{{ ' (' + (e.program_sessions || e.sessions) + ')' }}</b>
                        <span class="float-end">Seg: {{ e.cat_segment_label || e.cat_segment || '—' }}</span>
                      </div>
                    </td>

                    <td class="td-a" style="min-width:80px;max-width:120px;">
                      <div class="small text-muted">{{ e.program_type ? 'Tipo: ' + e.program_type : '' }}</div>
                      <div class="small text-muted">{{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}</div>
                    </td>

                    <!-- CRONOGRAMA -->
                    <td class="td-b">
                      <div class="date-link">{{ formatDate(e.start_date) }}</div>
                      <div class="small text-muted">{{ dayLabel(e.start_date) }}</div>
                    </td>
                    <td class="td-b text-center">
                      <div class="small text-mono">{{ formatDate(e.end_date) }}</div>
                    </td>
                    <td class="td-b">
                      <div class="small fw-600 text-dark">{{ dayCombLabel(e) || '—' }}</div>
                      <div class="small text-muted">{{ hourCombLabel(e) }}</div>
                    </td>
                    <td class="td-b" style="min-width:100px;max-width:130px;">
                      <div class="small text-truncate" style="max-width:160px;" :title="e.instructor_label || e.instructor">
                        {{ e.instructor_label || e.instructor || '—' }}
                      </div>
                    </td>

                    <!-- SEGUIMIENTO: en el plan los switches solo marcan el
                         borrador, no llaman a ningún endpoint. -->
                    <td class="td-c text-center">
                      <label class="exec-switch scale-75" title="Ficha / Expediente">
                        <input type="checkbox" v-model="e.expedient" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                      </label>
                      <label class="exec-switch scale-75" title="Mejora / Upgrade">
                        <input type="checkbox" v-model="e.upgrade" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                      </label>
                    </td>
                    <td class="td-c text-center">
                      <label class="exec-switch scale-75" title="Pre-Confirmación">
                        <input type="checkbox" v-model="e.preconfirmation" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                      </label>
                      <label class="exec-switch scale-75" title="Confirmación">
                        <input type="checkbox" v-model="e.confirmation" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                      </label>
                    </td>
                    <td class="td-c text-center">
                      <label class="exec-switch scale-75" title="Nueva Metodología">
                        <input type="checkbox" v-model="e.new_methodology" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                      </label>
                    </td>

                    <!-- REFERENCIA -->
                    <td class="td-d">
                      <textarea class="exec-textarea" rows="2" v-model="e.notes"
                                :readonly="!!e.published_edition_id" @change="touch" placeholder="…"></textarea>
                    </td>
                    <td class="td-d">
                      <!-- Un arrastre y una publicada por el plan se ven parecido
                           (las dos existen en el cronograma real) pero no son lo
                           mismo: la primera viene del año anterior y nunca fue
                           decisión de este plan. -->
                      <template v-if="e.carry_over">
                        <div class="text-mono fw-600 small"><b>{{ e.global_code }}</b></div>
                        <div class="pill pill-amber">Viene de {{ plan.year - 1 }}</div>
                      </template>
                      <template v-else-if="e.published_edition_id">
                        <div class="pill pill-green">Ed. {{ e.published_edition_id }}</div>
                      </template>
                      <template v-else>
                        <!-- El código lo numera el cronograma al publicar: es único
                             por versión de programa y el del año anterior no sirve. -->
                        <div class="text-muted small">Al publicar</div>
                      </template>
                    </td>
                  </tr>
                </template>

                <tr v-if="!monthItems.length && !carryOversThisMonth.length">
                  <td :colspan="COL_COUNT" class="text-center text-muted py-5">
                    {{ MONTHS[month - 1] }} de {{ plan.year }} está vacío. Duplica el año anterior o agrega una edición.
                  </td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>
      </div>

      <div v-else class="pl-empty">Crea un escenario para empezar a planificar.</div>
    </main>

    <!-- ════ MODAL: NUEVO ESCENARIO ════ -->
    <BaseModal v-model="showNewPlan" title="Nuevo escenario" size="sm">
      <div class="p-3">
        <label class="form-label small">Nombre</label>
        <input class="form-control form-control-sm mb-2" v-model.trim="newPlan.name" placeholder="Programación 2028" />
        <label class="form-label small">Año</label>
        <input class="form-control form-control-sm" type="number" v-model.number="newPlan.year" />
      </div>
      <template #footer>
        <button class="btn btn-sm btn-secondary" @click="showNewPlan = false">Cancelar</button>
        <button class="btn btn-sm btn-primary" :disabled="busy" @click="createPlan">Crear</button>
      </template>
    </BaseModal>

    <!-- ════ MODAL: DUPLICAR ════ -->
    <BaseModal v-model="showSeed" title="Duplicar un año al escenario" size="sm">
      <div class="p-3">
        <label class="form-label small">Año de origen</label>
        <input class="form-control form-control-sm mb-2" type="number" v-model.number="seed.sourceYear" />

        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="sd-todo" v-model="seed.todoElAnio" />
          <label class="form-check-label small" for="sd-todo">
            <strong>Los 12 meses</strong>
            <span class="d-block text-muted">Sin marcar, trae solo {{ MONTHS[month - 1] }}.</span>
          </label>
        </div>

        <label class="form-label small d-block">Cómo correr las fechas</label>
        <div class="form-check">
          <input class="form-check-input" type="radio" id="md-wd" value="weekday" v-model="seed.mode" />
          <label class="form-check-label small" for="md-wd">
            <strong>Mismo día de la semana</strong>
            <span class="d-block text-muted">Un miércoles sigue siendo miércoles: respeta el horario de la edición.</span>
          </label>
        </div>
        <div class="form-check mt-2">
          <input class="form-check-input" type="radio" id="md-sd" value="same_date" v-model="seed.mode" />
          <label class="form-check-label small" for="md-sd">
            <strong>Misma fecha exacta</strong>
            <span class="d-block text-muted">El 3 de junio sigue siendo 3 de junio, aunque caiga otro día.</span>
          </label>
        </div>

        <p class="small text-muted mt-3 mb-0">
          <template v-if="seed.todoElAnio">Reemplaza el escenario completo. Lo ya publicado no se toca.</template>
          <template v-else>Reemplaza ese mes si ya lo habías traído. Lo ya publicado no se toca.</template>
        </p>
      </div>
      <template #footer>
        <button class="btn btn-sm btn-secondary" @click="showSeed = false">Cancelar</button>
        <button class="btn btn-sm btn-primary" :disabled="busy" @click="runSeed">
          {{ busy ? 'Copiando…' : 'Duplicar' }}
        </button>
      </template>
    </BaseModal>

    <!-- ════ MODAL: MÓDULOS DEL PAQUETE ════ -->
    <BaseModal v-model="showTree" :title="`Módulos · ${treeItem?.abbreviation || treeItem?.program_abreviature || ''}`" size="lg">
      <div class="p-3">
        <table class="table table-sm align-middle mb-0">
          <thead><tr><th style="width:40px">#</th><th>Módulo</th><th>Docente</th><th style="width:110px">Inicio</th><th style="width:110px">Fin</th></tr></thead>
          <tbody>
            <tr v-for="(child, i) in (treeItem?.children || [])" :key="i">
              <td class="small text-muted">{{ child.sort_order }}</td>
              <td class="small">{{ child.abbreviation }}</td>
              <td class="small text-muted">{{ child.instructor_label || '—' }}</td>
              <td class="small text-mono">{{ formatDate(child.start_date) }}</td>
              <td class="small text-mono">{{ formatDate(child.end_date) }}</td>
            </tr>
            <tr v-if="!(treeItem?.children || []).length">
              <td colspan="5" class="text-center text-muted py-3">Sin módulos.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <button class="btn btn-sm btn-secondary" @click="showTree = false">Cerrar</button>
      </template>
    </BaseModal>

    <!-- ════ MODAL: EDITAR ════ -->
    <BaseModal v-model="showItem" :title="form.uid ? 'Editar edición del plan' : 'Nueva edición del plan'" size="lg">
      <div class="p-3">
        <div class="row g-2">
          <div class="col-12" v-if="!form.uid">
            <label class="form-label small">Programa</label>
            <SearchSelect
              v-model="form.program_version_id" mode="remote"
              :fetcher="q => programService.programVersionCaller({ q, active: 'Y' })"
              label-field="program_type_for_iu" value-field="program_version_id"
              :model-label="form.abbreviation" placeholder="Buscar programa…"
              :minChars="0" :cache="false" @change="onProgramChange" />
          </div>
          <div class="col-12" v-else>
            <label class="form-label small">Programa</label>
            <input class="form-control form-control-sm" :value="form.abbreviation" disabled />
          </div>

          <div class="col-6">
            <label class="form-label small">Docente</label>
            <SearchSelect
              v-model="form.instructor_id" mode="remote"
              :fetcher="q => instructorService.instructorCaller({ q })"
              label-field="full_name" value-field="instructor_id"
              :model-label="form.instructor_label" placeholder="Buscar docente…"
              :minChars="0" :cache="false" @change="o => form.instructor_label = o?.full_name || ''" />
          </div>
          <div class="col-3">
            <label class="form-label small">Segmento</label>
            <SearchSelect
              v-model="form.cat_segment_id" :items="catalogs.catSegments"
              label-field="description" value-field="id" placeholder="OPCIONAL"
              @change="o => form.cat_segment_label = o?.description || ''" />
          </div>
          <div class="col-3">
            <label class="form-label small">Vacantes</label>
            <input class="form-control form-control-sm" type="number" v-model.number="form.vacant" />
          </div>

          <div class="col-3">
            <label class="form-label small">Inicio</label>
            <BaseDatePicker v-model="form.start_date" placeholder="dd/mm/aaaa" />
          </div>
          <div class="col-3">
            <label class="form-label small">Fin</label>
            <BaseDatePicker v-model="form.end_date" placeholder="dd/mm/aaaa" />
          </div>
          <div class="col-3">
            <label class="form-label small">Días</label>
            <SearchSelect
              v-model="form.cat_day_combination_id" :items="catalogs.dayCombinationList"
              label-field="description" value-field="id" placeholder="Días"
              @change="o => form.day_combination_label = o?.description || ''" />
          </div>
          <div class="col-3">
            <label class="form-label small">Horario</label>
            <SearchSelect
              v-model="form.cat_hour_combination_id" :items="catalogs.hourCombinationList"
              label-field="description" value-field="id" placeholder="Horario"
              @change="o => form.hour_combination_label = o?.description || ''" />
          </div>

          <div class="col-12">
            <label class="form-label small">Observación</label>
            <input class="form-control form-control-sm" v-model.trim="form.notes" />
          </div>
        </div>

        <div class="mt-3" v-if="form.isPackage && form.children.length">
          <div class="form-label small">Módulos</div>
          <table class="table table-sm align-middle">
            <thead>
              <tr><th style="width:40px">#</th><th>Módulo</th><th style="width:140px">Inicio</th><th style="width:140px">Fin</th></tr>
            </thead>
            <tbody>
              <tr v-for="(child, i) in form.children" :key="i">
                <td class="small text-muted">{{ child.sort_order }}</td>
                <td class="small">{{ child.abbreviation }}</td>
                <td><BaseDatePicker v-model="child.start_date" placeholder="dd/mm/aaaa" /></td>
                <td><BaseDatePicker v-model="child.end_date" placeholder="dd/mm/aaaa" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-sm btn-secondary" @click="showItem = false">Cancelar</button>
        <button class="btn btn-sm btn-dark" :disabled="busy" @click="saveAndPreview">Guardar y ver cómo se vería ↗</button>
        <button class="btn btn-sm btn-primary" @click="applyItem">Guardar en el plan</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
// Producto > Planificación: el cronograma de mentira.
//
// Existe para armar la programación de un año que todavía no empieza sin
// ensuciar program_editions. Todo el escenario vive en un JSONB (schedule_plans)
// y solo cruza a la vida real cuando alguien aprieta "Pasar al cronograma real",
// que llama a los MISMOS stored procedures que el modal de Producto > Cronograma
// y no toca Odoo.
//
// El diseño es a propósito el mismo de Producto > Cronograma (`exec-table`):
// planificar y ejecutar se miran igual, y el que arma el 2027 no tiene que
// aprender una segunda pantalla. Lo único que NO se copió es el bloque
// ACADÉMICA (links de WhatsApp/Teams/Ficha/Notas): esos links son de un aula que
// existe, y en un borrador no hay aula.
import { ref, reactive, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import { confirmAction } from '@/composables/useConfirm'

const planService = inject(ServiceKeys.SchedulePlan)
const programService = inject(ServiceKeys.Program)
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')
const toast = useToast()

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
// Acciones + IDENTIFICACIÓN(2) + CRONOGRAMA(4) + SEGUIMIENTO(3) + REFERENCIA(2)
const COL_COUNT = 12
const SEMANAS_POR_MES = 6

const catalogs = {
  catSegments: (catalog && catalog.options('we_segment')) || [],
  dayCombinationList: (catalog && catalog.options('we_day_combination')) || [],
  hourCombinationList: (catalog && catalog.options('we_hour_combination')) || []
}

const plans = ref([])
const planId = ref(null)
const plan = ref(null)
const month = ref(new Date().getMonth() + 1)
const dirty = ref(false)
const busy = ref(false)
const openWeeks = ref({})
const carryOpen = ref(true)

const showNewPlan = ref(false)
const showSeed = ref(false)
const showItem = ref(false)
const showTree = ref(false)
const treeItem = ref(null)

const newPlan = reactive({ name: '', year: new Date().getFullYear() + 1 })
const seed = reactive({ sourceYear: new Date().getFullYear(), mode: 'weekday', todoElAnio: true })
const columnFilters = reactive({ program: [], detail: [], instructor: [], notes: [] })

// ── Fechas ────────────────────────────────────────────────────────────────
// Aritmética en UTC: en Lima (UTC-5) leer con getters locales una fecha creada
// en UTC corre el día hacia atrás. Misma regla que scheduleplan.entity.js.
const DIA_MS = 86400000
const partes = iso => String(iso || '').slice(0, 10).split('-').map(Number)

function shiftIso (iso, days) {
  if (!iso) return null
  const [y, m, d] = partes(iso)
  if (!y) return null
  return new Date(Date.UTC(y, m - 1, d) + days * DIA_MS).toISOString().slice(0, 10)
}

function formatDate (iso) {
  const [y, m, d] = partes(iso)
  return y ? `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}` : '—'
}

function dayLabel (iso) {
  const [y, m, d] = partes(iso)
  return y ? DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] : ''
}

// Semana del mes tal como la numera el cronograma: semanas de lunes a domingo,
// la 1 es la que contiene al día 1. Espeja weekOfMonth del backend.
function weekOfMonth (iso) {
  const [y, m, d] = partes(iso)
  if (!y) return null
  const lunesCero = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  return Math.floor((d - 1 + lunesCero) / 7) + 1
}

// ── Derivados ─────────────────────────────────────────────────────────────

const monthKey = computed(() => `${plan.value?.year}-${String(month.value).padStart(2, '0')}`)

const porFecha = (a, b) => String(a.start_date).localeCompare(String(b.start_date))

// Lo que el plan programa para el mes: arranca dentro de él, igual que en el
// cronograma real (una edición vive en el mes en que empieza).
const monthItems = computed(() =>
  (plan.value?.items || [])
    .filter(i => !i.carry_over && String(i.start_date || '').slice(0, 7) === monthKey.value)
    .sort(porFecha))

// Los arrastres arrancaron el año anterior, así que por fecha de inicio NO caen
// en ningún mes del plan y serían invisibles. Van en su propio grupo, y aparecen
// en cada mes que siguen dictándose: para planificar lo que importa no es cuándo
// empezaron sino que en marzo ese docente y esa aula siguen ocupados.
const carryOversThisMonth = computed(() => {
  const desde = `${monthKey.value}-01`
  const hasta = `${monthKey.value}-31`
  return (plan.value?.items || [])
    .filter(i => i.carry_over)
    .filter(i => String(i.start_date || '') <= hasta && String(i.end_date || '') >= desde)
    .filter(pasaFiltros)
    .sort(porFecha)
})

// Solo lo que este plan programa. Los arrastres no se cuentan: no son decisión
// del plan y sumarlos haría creer que hay 635 ediciones que planificar.
const planItemCount = computed(() => (plan.value?.items || []).filter(i => !i.carry_over).length)

// Los ColumnFilterDropdown devuelven la lista de valores marcados; vacía = todo.
function pasaFiltros (item) {
  const pares = [
    [columnFilters.program, item.program_abreviature || item.abbreviation],
    [columnFilters.detail, `${item.version_code || ''} ${item.cat_segment_label || item.cat_segment || ''}`],
    [columnFilters.instructor, item.instructor_label || item.instructor],
    [columnFilters.notes, item.notes]
  ]
  return pares.every(([sel, valor]) => !sel?.length || sel.includes(valor))
}

const filteredWeeks = computed(() => {
  const semanas = Array.from({ length: SEMANAS_POR_MES }, (_, i) => ({
    schedule: i + 1, isOpen: openWeeks.value[i + 1] !== false, items: []
  }))
  for (const item of monthItems.value) {
    if (!pasaFiltros(item)) continue
    const s = weekOfMonth(item.start_date)
    if (s >= 1 && s <= SEMANAS_POR_MES) semanas[s - 1].items.push(item)
  }
  return semanas
})

const publishedCount = computed(() => (plan.value?.items || []).filter(i => i.published_edition_id).length)
const carryOverCount = computed(() => (plan.value?.items || []).filter(i => i.carry_over).length)
// Pendiente = lo que este plan todavía tiene que crear. Un arrastre ya existe.
const pendingCount = computed(() => planItemCount.value - (publishedCount.value - carryOverCount.value))

// Mismo criterio que el backend (scheduleplan.entity.js) y que `isCourse` del
// cronograma real: un congreso/evento tiene fechas propias y NO es un paquete,
// aunque su tipo no sea "curso".
const TIPOS_SIN_MODULOS = ['we_program_type_course', 'we_program_type_event']
const isPackage = item =>
  !TIPOS_SIN_MODULOS.includes(item?.cat_type_program_alias || item?.program_type_alias)

const segClass = e => String(e.cat_segment_label || e.cat_segment || '').toLowerCase()

const primerHorario = e => (e.schedules || [])[0] || {}
const dayCombLabel = e => e.day_combination_label || primerHorario(e).day_combination_label || ''
const hourCombLabel = e => e.hour_combination_label || primerHorario(e).hour_combination_label || ''

function toggleWeek (semana) {
  openWeeks.value = { ...openWeeks.value, [semana]: openWeeks.value[semana] === false }
}

function changeMonth (delta) {
  const m = month.value + delta
  month.value = m < 1 ? 12 : m > 12 ? 1 : m
}

// ── Carga ─────────────────────────────────────────────────────────────────

async function loadPlans () {
  plans.value = await planService.list()
  if (!planId.value && plans.value.length) await selectPlan(plans.value[0].plan_id)
}

async function selectPlan (id) {
  planId.value = Number(id) || null
  if (!planId.value) { plan.value = null; return }
  plan.value = await planService.get(planId.value)
  plan.value.items = Array.isArray(plan.value.items) ? plan.value.items : []
  dirty.value = false
  seed.sourceYear = plan.value.year - 1
}

async function createPlan () {
  if (!newPlan.name.trim()) return toast.warning('El escenario necesita un nombre')
  busy.value = true
  try {
    const creado = await planService.create({ name: newPlan.name, year: newPlan.year })
    showNewPlan.value = false
    newPlan.name = ''
    await loadPlans()
    await selectPlan(creado.plan_id)
  } finally { busy.value = false }
}

// ── Guardado ──────────────────────────────────────────────────────────────

// El plan se guarda entero, no item por item: es un borrador de unos cientos de
// filas y una sola escritura evita mezclar dos pestañas editando el mismo plan.
async function save () {
  if (!plan.value) return
  busy.value = true
  try {
    await planService.save({ planId: plan.value.plan_id, items: plan.value.items })
    dirty.value = false
    toast.success('Plan guardado')
  } catch (err) {
    console.error('Error guardando el plan:', err)
    // El motivo importa: un 413 (escenario demasiado grande) y un fallo de BD
    // se arreglan de forma distinta, y "no se pudo guardar" a secas no deja
    // avanzar a nadie.
    const motivo = err?.response?.status === 413
      ? 'el escenario es demasiado grande para enviarlo'
      : err?.response?.data?.message || err.message
    toast.error(`No se pudo guardar el plan: ${motivo}`)
    throw err
  } finally { busy.value = false }
}

// El error ya se le mostró al usuario en el toast; acá solo se evita la promesa
// sin capturar que deja el @click.
const saveOnly = () => { save().catch(() => {}) }

const touch = () => { dirty.value = true }

// ── Duplicar del año anterior ─────────────────────────────────────────────

async function runSeed () {
  if (dirty.value) await save()
  busy.value = true
  try {
    const res = seed.todoElAnio
      ? await planService.seedYear({ planId: plan.value.plan_id, sourceYear: seed.sourceYear, mode: seed.mode })
      : await planService.seedMonth({ planId: plan.value.plan_id, month: month.value, sourceYear: seed.sourceYear, mode: seed.mode })

    showSeed.value = false
    await selectPlan(plan.value.plan_id)
    const alcance = seed.todoElAnio ? `${seed.sourceYear} completo` : `${MONTHS[month.value - 1]} ${seed.sourceYear}`
    // Los módulos de paquete descartados se informan: si no, el conteo final no
    // cuadra con el del cronograma de origen y parece que se perdió algo.
    const nota = res.dropped_modules ? ` (${res.dropped_modules} módulos de paquete van dentro de su paquete)` : ''
    toast.success(`${res.total} ediciones traídas de ${alcance}${nota}`)
  } catch (err) {
    console.error('Error duplicando:', err)
    toast.error(err?.response?.data?.message || 'No se pudo duplicar')
  } finally { busy.value = false }
}

// ── Mover, duplicar, quitar ───────────────────────────────────────────────

function move (item, days) {
  Object.assign(item, {
    start_date: shiftIso(item.start_date, days),
    end_date: shiftIso(item.end_date, days),
    children: (item.children || []).map(c => ({
      ...c, start_date: shiftIso(c.start_date, days), end_date: shiftIso(c.end_date, days)
    }))
  })
  touch()
}

let uidSeq = 0
const nextUid = () => `n${Date.now()}${uidSeq++}`

// Copia profunda de un item del plan.
//
// NO structuredClone: los items viven dentro de un ref de Vue, así que llegan
// envueltos en el proxy reactivo, y structuredClone no sabe clonar un Proxy
// (DataCloneError). El bug no se veía al crear —ahí se clona un objeto plano—
// solo al editar, duplicar o guardar uno existente.
//
// El round-trip por JSON es exacto acá: el item es dato JSON puro, tal cual sale
// del JSONB, sin fechas ni funciones que se pierdan.
const clonar = valor => JSON.parse(JSON.stringify(valor))

function duplicate (item) {
  plan.value.items.push({
    ...clonar(item), uid: nextUid(), published_edition_id: null, source_edition_id: null
  })
  touch()
}

function removeItem (item) {
  plan.value.items = plan.value.items.filter(i => i.uid !== item.uid)
  touch()
}

function openTree (item) {
  treeItem.value = item
  showTree.value = true
}

// ── Modal de item ─────────────────────────────────────────────────────────

const FORM_VACIO = {
  uid: null, isPackage: false, program_version_id: null, abbreviation: '',
  cat_type_program_alias: 'we_program_type_course', instructor_id: null, instructor_label: '',
  cat_segment_id: null, cat_segment_label: '', vacant: null,
  start_date: '', end_date: '', cat_day_combination_id: null, day_combination_label: '',
  cat_hour_combination_id: null, hour_combination_label: '', notes: '', children: []
}

const form = reactive({ ...FORM_VACIO })

function openItem (item) {
  Object.assign(form, clonar(FORM_VACIO))
  if (item) {
    const s = primerHorario(item)
    Object.assign(form, clonar(item), {
      isPackage: isPackage(item),
      abbreviation: item.abbreviation || item.program_abreviature || '',
      instructor_label: item.instructor_label || item.instructor || '',
      cat_segment_label: item.cat_segment_label || item.cat_segment || '',
      children: clonar(item.children || []),
      cat_day_combination_id: item.cat_day_combination_id ?? s.cat_day_combination_id ?? null,
      cat_hour_combination_id: item.cat_hour_combination_id ?? s.cat_hour_combination_id ?? null,
      day_combination_label: dayCombLabel(item),
      hour_combination_label: hourCombLabel(item)
    })
  } else {
    // Un item nuevo cae en el mes que se está mirando: es donde el usuario está
    // pensando, y así no aparece "en ningún lado" al cerrar el modal.
    form.start_date = `${plan.value.year}-${String(month.value).padStart(2, '0')}-01`
  }
  showItem.value = true
}

// Los módulos salen del catálogo del programa (el caller ya los devuelve con su
// child_program_version_id), igual que en el modal de Producto > Cronograma:
// sin ese id el paquete no se puede publicar después.
function onProgramChange (opcion) {
  form.abbreviation = opcion?.program_type_for_iu || opcion?.abbreviation || ''
  form.cat_type_program_alias = opcion?.cat_type_program_alias || 'we_program_type_course'
  form.isPackage = !TIPOS_SIN_MODULOS.includes(form.cat_type_program_alias)
  form.children = form.isPackage
    ? (opcion?.children || []).map((child, i) => ({
        sort_order: i + 1,
        child_program_version_id: child.child_program_version_id,
        abbreviation: child.abbreviation,
        instructor_id: null,
        start_date: null,
        end_date: null,
        cat_day_combination_id: null,
        cat_hour_combination_id: null,
        new: true,
        active: true,
        edition_id: null,
        expedient: true,
        upgrade: false,
        preconfirmation: false,
        confirmation: false
      }))
    : []
}

// Vuelca el formulario al item del plan. Devuelve una promesa porque el botón
// "Guardar y ver" encadena el preview, que necesita el plan ya persistido.
async function applyItem () {
  if (!form.program_version_id) { toast.warning('Falta el programa'); throw new Error('sin programa') }
  if (!form.start_date) { toast.warning('Falta la fecha de inicio'); throw new Error('sin fecha') }
  if (form.isPackage && !form.children.length) {
    toast.warning('El paquete no trajo módulos: revisa el programa elegido')
    throw new Error('paquete vacio')
  }

  const { isPackage: _omit, ...campos } = form
  const item = {
    ...clonar(campos),
    // Se normaliza a las claves que lee el preview y el backend, para que un
    // item creado a mano y uno duplicado sean indistinguibles.
    schedules: [{
      cat_day_combination_id: form.cat_day_combination_id,
      day_combination_label: form.day_combination_label,
      cat_hour_combination_id: form.cat_hour_combination_id,
      hour_combination_label: form.hour_combination_label
    }],
    program_abreviature: form.abbreviation,
    cat_segment: form.cat_segment_label,
    instructor: form.instructor_label,
    active: true,
    edition_num_id: null
  }

  const i = plan.value.items.findIndex(x => x.uid === form.uid)
  if (i >= 0) plan.value.items[i] = { ...plan.value.items[i], ...item }
  else plan.value.items.push({ ...item, uid: nextUid(), published_edition_id: null })

  showItem.value = false
  touch()
  await save()
}

// ── Preview ───────────────────────────────────────────────────────────────

// Abre la vista de solo lectura del cronograma apuntando al plan. Guarda antes
// porque el preview lee de la BD: sin esto mostraría el escenario anterior y el
// usuario creería que su cambio no funcionó.
async function openPreview () {
  if (!plan.value) return
  if (dirty.value) await save()
  const url = `/producto/cronograma-vista?plan=${plan.value.plan_id}&m=${month.value}&y=${plan.value.year}`
  window.open(url, '_blank', 'noopener')
}

// Desde el modal: si el formulario no valida, applyItem corta y no se abre nada.
function saveAndPreview () {
  applyItem().then(openPreview).catch(() => {})
}

// ── Publicar ──────────────────────────────────────────────────────────────

async function confirmPublish () {
  // Es la única acción del módulo que escribe en el cronograma real y no se
  // deshace desde acá, así que el aviso dice qué se crea y qué NO se toca.
  const ok = await confirmAction({
    title: 'Pasar al cronograma real',
    html: `
      <p>Se van a <b>crear ${pendingCount.value} ediciones reales</b> del año
         ${plan.value.year} en el cronograma.</p>
      <p>No se crean aulas en Odoo, pero las ediciones sí quedan creadas
         y <b>esto no se deshace desde acá</b>.</p>`,
    confirmText: `Sí, crear ${pendingCount.value}`,
    cancelText: 'Cancelar',
    icon: 'warning',
    danger: true
  })
  if (!ok) return

  if (dirty.value) await save()
  busy.value = true
  try {
    const res = await planService.publish({ planId: plan.value.plan_id })
    await selectPlan(plan.value.plan_id)

    if (res.published.length) toast.success(`${res.published.length} ediciones creadas`)
    // Los rechazos se muestran uno por uno: son corregibles en el planner y un
    // "fallaron 7" no dice cuál ni por qué.
    res.failed.forEach(f => toast.error(`${f.label || f.uid}: ${f.message}`, { timeout: 12000 }))
    if (!res.published.length && !res.failed.length) toast.info('No había nada pendiente de publicar')
  } catch (err) {
    console.error('Error publicando el plan:', err)
    toast.error(err?.response?.data?.message || 'No se pudo publicar el plan')
  } finally { busy.value = false }
}

onMounted(loadPlans)
</script>

<style scoped>
/* Diseño "exec" del cronograma real (views/producto/Editions.vue).
   El repo replica este design system con <style scoped> propio en cada vista
   (Leads, B2B, reportes…), sin hoja compartida; se sigue esa convención en vez
   de extraer una global, que tocaría ~20 archivos.
   Lo NO copiado a propósito: el bloque ACADÉMICA (chips de WhatsApp/Teams/Ficha/
   Notas) — son links de un aula que existe, y un borrador no tiene aula. */
/* @@@ tokens (1-56) */
/* ═══════════════════════════════════════════════
   TOKENS DE DISEÑO
═══════════════════════════════════════════════ */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.exec-shell {
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  background: #f8fafc;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #0f172a;

  --navy-900: #0f172a;
  --navy-800: #1e293b;
  --navy-700: #334155;
  --slate-400: #94a3b8;
  --slate-300: #cbd5e1;
  --slate-100: #f1f5f9;
  --teal-600:  #002060; /* navy WE */
  --teal-500:  #12274e;
  --blue-600:  #2563eb;
  --gold-400:  #fbbf24;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;

  /* Color de grupos de columna */
  --col-a-bg:     #eff6ff;
  --col-a-head:   #1e40af;
  --col-a-border: #bfdbfe;
  --col-a-td:     #f8fbff;
  --col-a-tdbdr:  #e0eeff;

  --col-b-bg:     #f0fdf4;
  --col-b-head:   #166534;
  --col-b-border: #bbf7d0;
  --col-b-td:     #f7fdf9;
  --col-b-tdbdr:  #d5f5e0;

  --col-c-bg:     #fff7ed;
  --col-c-head:   #92400e;
  --col-c-border: #fed7aa;
  --col-c-td:     #fffbf5;
  --col-c-tdbdr:  #fde8c8;

  --col-d-bg:     #fafafa;
  --col-d-head:   #374151;
  --col-d-border: #e5e7eb;
  --col-d-td:     #fdfdfd;
  --col-d-tdbdr:  #ebebeb;
}

/* @@@ masthead (57-156) */
/* ═══════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════ */
.exec-masthead {
  background: var(--navy-900);
  color: var(--white);
  border-bottom: 1px solid var(--navy-700);
  flex-shrink: 0;
}

.masthead-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.masthead-brand { display: flex; align-items: center; gap: 16px; }

.brand-rule {
  width: 3px; height: 42px;
  background: var(--teal-500);
  border-radius: 2px; flex-shrink: 0;
}

.brand-eyebrow {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px;
}

.brand-title {
  font-size: 18px; font-weight: 700; margin: 0;
  letter-spacing: -0.01em; color: var(--white);
  transition: opacity 0.15s;
}
.brand-title:hover { opacity: 0.85; }

.masthead-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Controles inline para ACADEMICA (una sola fila junto al brand) */
.masthead-inline-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  margin-left: auto;
}

/* Filtros */
.masthead-filters {
  display: flex; align-items: center; gap: 0;
  padding: 0 28px; min-height: 50px;
}

.filter-group { display: flex; flex-direction: column; gap: 2px; padding: 8px 20px 8px 0; }

.filter-label {
  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 600; cursor: default;
}

.filter-period-nav { display: flex; align-items: center; gap: 4px; }

.filter-nav-btn {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
  color: var(--slate-300); width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 3px; cursor: pointer; transition: all 0.15s;
}
.filter-nav-btn:hover { background: rgba(255,255,255,0.16); color: var(--white); }

.exec-select {
  background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  color: var(--white); font-family: 'Hanken Grotesk', inherit;
  font-size: 12.5px; font-weight: 500; padding: 3px 0;
  outline: none; cursor: pointer; min-width: 110px; appearance: auto;
}
.exec-select option { color: var(--text-primary); background: var(--white); }

.filter-sep { width: 1px; height: 30px; background: rgba(255,255,255,0.1); margin: 0 20px 0 0; }
.filter-spacer { flex: 1; }

/* KPIs inline */
.masthead-kpis { display: flex; gap: 28px; align-items: center; }
.inline-kpi { text-align: right; }
.inline-kpi-label {
  display: block; font-size: 9px; letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--slate-400); font-weight: 600; margin-bottom: 2px;
}
.inline-kpi-value {
  font-size: 15px; font-weight: 700; color: var(--white);
  font-variant-numeric: tabular-nums; font-family: 'IBM Plex Mono', monospace;
}
.inline-kpi-value.accent { color: #6366f1; }

/* Filtros activos en masthead */
.filter-chips-bar { flex: 1; padding: 8px 0; }

/* @@@ botones (157-189) */
/* ═══════════════════════════════════════════════
   BOTONES EJECUTIVOS
═══════════════════════════════════════════════ */
.btn-exec {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 4px;
  border: solid 1px white;
  font-size: 12px; font-weight: 600; letter-spacing: 0.01em;
  cursor: pointer; border: none; font-family: inherit;
  transition: background 0.15s, opacity 0.15s; position: relative;
}

.btn-exec-ghost {
  background: rgba(255,255,255,0.07); color: var(--slate-300);
  border: 1px solid rgba(206, 206, 206, 0.784);
}
.btn-exec-ghost:hover { background: rgba(255,255,255,0.13); color: var(--white); }

.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-primary:disabled { opacity: 0.55; cursor: default; }

.btn-exec-teal { background: rgba(13,148,136,0.28); color: #5eead4; border: 1px solid rgba(13,148,136,0.4); }
.btn-exec-teal:hover { background: rgba(13,148,136,0.4); }

.btn-exec-xs { padding: 4px 10px; font-size: 11px; }

.btn-exec-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gold-400); display: inline-block;
  margin-left: 2px;
}

/* @@@ body-tabla (190-227) */
/* ═══════════════════════════════════════════════
   CUERPO
═══════════════════════════════════════════════ */
.exec-body {
  flex: 1;
  padding: 12px 24px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.view-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.table-shell {
  flex: 1;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-responsive-custom {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

/* @@@ tabla (228-373) */
/* ═══════════════════════════════════════════════
   TABLA EJECUTIVA
═══════════════════════════════════════════════ */
.exec-table {
  width: 100%; border-collapse: collapse;
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 12.5px; min-width: 1200px;
}

.exec-table-dense td { padding: 5px 8px !important; }

/* ── Fila 1: Grupos principales ── */
.exec-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

.thead-group th {
  padding: 8px 10px; font-size: 10px;
  letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 700; border-bottom: 1px solid var(--border);
}

.th-act {
  background:rgb(217, 217, 237);
  width: 86px; padding: 8px 10px;
  border-right: 2px solid var(--navy-700);
}

.th-group { text-align: center; }

.th-group-a { background: var(--col-a-bg); color: var(--col-a-head); border-left: 2px solid var(--col-a-border); }
.th-group-b { background: var(--col-b-bg); color: var(--col-b-head); border-left: 2px solid var(--col-b-border); }
.th-group-c { background: var(--col-c-bg); color: var(--col-c-head); border-left: 2px solid var(--col-c-border); }
.th-group-d { background: var(--col-d-bg); color: var(--col-d-head); border-left: 2px solid var(--col-d-border); }
.th-group-e { background: #ede9fe; color: #5b21b6; border-left: 2px solid #c4b5fd; }

/* ── Fila 2: Columnas individuales ── */
.thead-sub .ts {
  padding: 6px 10px; font-size: 10px;
  letter-spacing: 0.07em; text-transform: uppercase;
  font-weight: 600; border-bottom: 2px solid var(--border);
}

.ts-a { background: var(--col-a-bg); color: var(--col-a-head); border-left: 1px solid var(--col-a-border); }
.ts-b { background: var(--col-b-bg); color: var(--col-b-head); border-left: 1px solid var(--col-b-border); }
.ts-c { background: var(--col-c-bg); color: var(--col-c-head); border-left: 1px solid var(--col-c-border); }
.ts-d { background: var(--col-d-bg); color: var(--col-d-head); border-left: 1px solid var(--col-d-border); }

/* ── Fila 3: Filtros de columna ── */
.thead-filter .tf {
  padding: 5px 6px;
  background: var(--bg-subtle, #f8fafc);
  border-bottom: 2px solid var(--border);
  vertical-align: middle;
}
/* flatpickr renderiza su propio input (altInput), fuera del alcance de los
   estilos del trigger: hay que igualarlo a mano o la fila queda despareja. */
.thead-filter :deep(.exec-flatpickr-input) {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  color: #1e293b;
  background: #fff;
  box-sizing: border-box;
  outline: none;
}
.thead-filter :deep(.exec-flatpickr-input:focus) { border-color: #002060; }

/* ── Encabezado de Semana ── */
.week-header-row { cursor: pointer; }
.week-header-row:hover .week-header-cell { filter: brightness(0.97); }

.week-header-cell {
  padding: 0 !important;
  background: var(--navy-800) !important;
  border-bottom: 1px solid var(--navy-700) !important;
}

.week-header-inner {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px;
}

.week-chevron {
  color: var(--slate-400); transition: transform 0.2s ease; flex-shrink: 0;
}
.week-chevron-open { transform: rotate(180deg); }

.week-label {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--slate-300);
}

.week-badge {
  margin-left: auto; background: var(--teal-600); color: var(--white);
  font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 10px;
  letter-spacing: 0.04em; border: solid 1px white;
}

/* ── Skeleton Loading ── */
.skeleton-row td { padding: 8px 12px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
.sk-cell {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.4s ease-in-out infinite;
}
@keyframes sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Filas de datos ── */
.tbody-row td {
  padding: 1px 4px; border-bottom: 1px solid #f8fafc;
  vertical-align: middle;
}
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background-color: #f0f9ff !important; transition: background 0.1s; }

.td-act {
  background: var(--navy-900) !important;
  border-right: 2px solid var(--navy-800) !important;
  padding: 0px 8px !important;
}
.tbody-row:hover .td-act { background: #152c711d !important; }

.td-a { background: var(--col-a-td); border-left: 1px solid var(--col-a-tdbdr); }
.td-b { background: var(--col-b-td); border-left: 1px solid var(--col-b-tdbdr); }
.td-c { background: var(--col-c-td); border-left: 1px solid var(--col-c-tdbdr); }
.td-d { background: var(--col-d-td); border-left: 1px solid var(--col-d-tdbdr); }
.td-e { background: #faf5ff; border-left: 1px solid #e9d5ff; }
.ts-e { background: #f5f3ff; color: #6d28d9; border-left: 1px solid #ddd6fe; }
.link-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 14px; text-decoration: none; transition: all .15s; }
.link-wa { background: #dcfce7; color: #16a34a; }
.link-wa:hover { background: #25d366; color: #fff; }
.link-teams { background: #ede9fe; color: #6264a7; }
.link-teams:hover { background: #6264a7; color: #fff; }

/* @@@ seguimiento (503-643) */
/* ── Dots read-only para SEGUIMIENTO ── */
.status-dot-ro {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0 3px;
  vertical-align: middle;
}
.dot-ro-on  { background: #22c55e; box-shadow: 0 0 0 2px #dcfce7; }
.dot-ro-off { background: #cbd5e1; }

.td-prog { max-width: 200px; }

/* ── Botones de Acción en tabla ── */
.action-btns { display: flex; justify-content: center; gap: 4px; }

.action-btn {
  width: 26px; height: 26px; border-radius: 4px; border: none;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0; border: solid 1px #0a0a1e32;
}

.action-btn-view   { background: rgba(14,165,233,0.12); color: #0284c7; }
.action-btn-view:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-tree   { background: rgba(239,68,68,0.1); color: #dc2626; }
.action-btn-tree:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-neutral { background: rgba(148,163,184,0.12); color: #64748b; }
.action-btn-neutral:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-edit  { background: rgba(245,158,11,0.12); color: #d97706; }
.action-btn-edit:hover { background: rgba(244, 243, 243, 0.767); }

.action-btn-hier  { background: rgba(99,102,241,0.12); color: #6366f1; }
.action-btn-hier:hover {  background: rgba(244, 243, 243, 0.767); }

/* ── Botón descarga PDF (modal jerarquía) ── */
.btn-pdf-dl {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer;
  background: rgba(220,38,38,0.08); color: #dc2626;
  transition: background 0.15s, transform 0.1s;
}
.btn-pdf-dl:hover:not(:disabled) { background: rgba(220,38,38,0.18); transform: scale(1.08); }
.btn-pdf-dl:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Programa ── */
.prog-name { font-weight: 600; }
.prog-link { color: #1d4ed8; }
.prog-link:hover { text-decoration: underline; }
.prog-sub { font-size: 11px; line-height: 1.3; }

/* ── Fecha / Date link ── */
.date-link {
  color: #0369a1; font-weight: 600; font-family: 'IBM Plex Mono', monospace;
  font-size: 12px; cursor: pointer;
}
.date-link:hover { text-decoration: underline; }

/* ── Badges y Pills ── */
.pill {
  display: inline-block; padding: 2px 8px; border-radius: 3px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
}
.pill-blue   { background: #dbeafe; color: #1d4ed8; }
.pill-violet { background: #ede9fe; color: #6d28d9; }
.pill-amber  { background: #fef3c7; color: #92400e; }
.pill-teal   { background: #ccfbf1; color: #0f766e; }
.pill-slate  { background: #f1f5f9; color: #475569; }

/* Segmento pill */
.seg-pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  font-size: 10px; font-weight: 800; letter-spacing: 0;
}
.seg-a1 { background: #dbeafe; color: #1e40af; }
.seg-a2 { background: #fed7aa; color: #92400e; }
.seg-a3 { background: #fef9c3; color: #854d0e; }
.seg-a4 { background: #fde8c8; color: #9a3412; }
.seg-a5 { background: #fecdd3; color: #9f1239; }
.seg-a6 { background: #e6d5fa; color: #6d28d9; }
.seg-a7 { background: #ccd8ed; color: #1e3a8a; }

/* Tipo tag */
.tipo-tag {
  display: inline-block; padding: 2px 7px;
  border: 1px solid var(--border); border-radius: 3px;
  font-size: 10px; font-weight: 500; color: var(--text-secondary);
  background: var(--white);
}

/* ── Textarea ── */
.exec-textarea {
  width: 100%; resize: none; background-color: transparent;
  border: 1px solid transparent; border-radius: 3px;
  font-size: 11.5px; font-family: inherit;
  line-height: 1.4; transition: all 0.2s;
  padding: 3px 5px; color: var(--text-primary);
}
.exec-textarea:hover { background-color: #f8fafc; border-color: var(--border); }
.exec-textarea:focus { background-color: var(--white); border-color: #3b82f6; outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
.exec-textarea::placeholder { color: var(--text-muted); }

/* ── Segmento colores de fila ── */
tr.row-segment-a1 { --seg-bg: #eff6ff; --seg-border: #93c5fd; }
tr.row-segment-a2 { --seg-bg: #fbebd8; --seg-border: #fbb56a; }
tr.row-segment-a3 { --seg-bg: #f9f6d8; --seg-border: #fde047; }
tr.row-segment-a4 { --seg-bg: #f8f4c9; --seg-border: #edce33; }
tr.row-segment-a5 { --seg-bg: #f9d5d8; --seg-border: #fb7185; }
tr.row-segment-a6 { --seg-bg: #ecdcfa; --seg-border: #a855f7; } /* A6 = morado pastel (aplica también a hijos) */
tr.row-segment-a7 { --seg-bg: #d9e2f2; --seg-border: #1e3a8a; } /* A7 = CERRADO: pastel azul acero, el borde navy marca el cierre */

tr[class*="row-segment-"] .td-a,
tr[class*="row-segment-"] .td-b,
tr[class*="row-segment-"] .td-c,
tr[class*="row-segment-"] .td-d {
  background-color: var(--seg-bg) !important;
}
tr[class*="row-segment-"] .td-a {
  border-left: 3px solid var(--seg-border) !important;
}
tr[class*="row-segment-"]:hover .td-a,
tr[class*="row-segment-"]:hover .td-b,
tr[class*="row-segment-"]:hover .td-c,
tr[class*="row-segment-"]:hover .td-d {
  filter: brightness(0.97);
}

/* ── Long press ── */
.row-pressing .td-a,
.row-pressing .td-b,
.row-pressing .td-c,
.row-pressing .td-d {
  background-color: #dbeafe !important;
  cursor: progress !important;
  transition: background-color 0.3s;
}


/* ── Propios de Planificación ── */
/* Ya publicada = existe en el cronograma real: se atenúa y pierde las acciones
   destructivas, para que nadie siga jugando con una edición que ya es de verdad. */
.row-published td { opacity: .6; }

/* El grupo de arrastres se distingue del de semanas: no es programación del
   plan, es el calendario que ya viene ocupado. */
.week-header-carry .week-header-cell { background: #78350f; }
.week-header-carry .week-badge { background: rgba(255,255,255,.18); }
.pill-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
[data-coreui-theme="dark"] .week-header-carry .week-header-cell { background: #3F2E12; }
[data-coreui-theme="dark"] .pill-amber { background: rgba(252,211,77,.14); color: #FCD34D; border-color: rgba(252,211,77,.3); }
/* El año no es un selector: lo fija el escenario. Se muestra igual que el mes
   para que se lea "Agosto 2027" de un vistazo.
   El color sale del mismo token que usa styles/style.scss para el masthead
   claro: con var(--white) quedaba blanco sobre blanco. */
.exec-year {
  font-size: 12px; font-weight: 700; letter-spacing: .02em;
  color: var(--text-primary, #0f172a); padding: 0 10px;
}
/* Los KPIs y los botones son bloques distintos: sin este margen se tocan
   cuando la fila se parte. */
.masthead-kpis { margin-right: 24px; }
.btn-exec-danger { background: rgba(220,38,38,.85); color: #fff; }
.btn-exec-danger:hover:not(:disabled) { background: rgba(220,38,38,1); }
.btn-exec-danger:disabled { opacity: .45; cursor: default; }
.pl-empty { padding: 64px; text-align: center; opacity: .6; }
.action-btn:disabled { opacity: .35; cursor: default; }


/* ── Modo oscuro ── */
[data-coreui-theme="dark"] .exec-masthead .btn-exec-ghost { background: #24241E !important; border-color: #2A2A22 !important; }
[data-coreui-theme="dark"] .exec-masthead .btn-exec-teal { background: rgba(143,170,220,.15) !important; color: #8FAADC !important; border-color: rgba(143,170,220,.4) !important; }
[data-coreui-theme="dark"] .exec-masthead .btn-exec-teal:hover { background: rgba(143,170,220,.25) !important; }
[data-coreui-theme="dark"] .inline-kpi-value.accent { color: #8FAADC !important; }
[data-coreui-theme="dark"] .thead-filter .tf { background: #1F1F1A; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .skeleton-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .sk-cell {
  background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%);
  background-size: 200% 100%;
}
[data-coreui-theme="dark"] .tbody-row td { border-bottom-color: #24241E; }
[data-coreui-theme="dark"] .tbody-row:hover td { background-color: #252B33 !important; }
[data-coreui-theme="dark"] .dot-ro-on { box-shadow: 0 0 0 2px rgba(34,197,94,.25); }
[data-coreui-theme="dark"] .dot-ro-off { background: #3A3A33; }
[data-coreui-theme="dark"] .action-btn { border-color: rgba(255,255,255,.14); }
[data-coreui-theme="dark"] .action-btn-view { color: #38BDF8; }
[data-coreui-theme="dark"] .action-btn-tree { color: #F87171; }
[data-coreui-theme="dark"] .action-btn-neutral { color: #A0A099; }
[data-coreui-theme="dark"] .action-btn-edit { color: #FBBF24; }
[data-coreui-theme="dark"] .action-btn-hier,
[data-coreui-theme="dark"] .action-btn-audit { color: #A5B4FC; }
[data-coreui-theme="dark"] .action-btn-view:hover,
[data-coreui-theme="dark"] .action-btn-tree:hover,
[data-coreui-theme="dark"] .action-btn-neutral:hover,
[data-coreui-theme="dark"] .action-btn-edit:hover,
[data-coreui-theme="dark"] .action-btn-hier:hover,
[data-coreui-theme="dark"] .action-btn-audit:hover { background: rgba(255,255,255,.15); }
[data-coreui-theme="dark"] .prog-link { color: #7BA3F0; }
[data-coreui-theme="dark"] .date-link { color: #7DD3FC; }
[data-coreui-theme="dark"] .pill-blue { background: rgba(59,130,246,.2); color: #93C5FD; }
[data-coreui-theme="dark"] .pill-violet { background: rgba(139,92,246,.2); color: #C4B5FD; }
[data-coreui-theme="dark"] .pill-amber { background: rgba(245,158,11,.18); color: #FCD34D; }
[data-coreui-theme="dark"] .pill-teal { background: rgba(45,212,191,.18); color: #5EEAD4; }
[data-coreui-theme="dark"] .pill-slate { background: #24241E; color: #A0A099; }
[data-coreui-theme="dark"] .pill-red { background: rgba(239,68,68,.16); color: #F87171; }
[data-coreui-theme="dark"] .seg-a1 { background: rgba(59,130,246,.25); color: #93C5FD; }
[data-coreui-theme="dark"] .seg-a2 { background: rgba(249,115,22,.25); color: #FDBA74; }
[data-coreui-theme="dark"] .seg-a3 { background: rgba(234,179,8,.25); color: #FDE047; }
[data-coreui-theme="dark"] .seg-a4 { background: rgba(217,119,6,.25); color: #FCD34D; }
[data-coreui-theme="dark"] .seg-a5 { background: rgba(244,63,94,.25); color: #FDA4AF; }
[data-coreui-theme="dark"] .seg-a6 { background: rgba(168,85,247,.25); color: #C4B5FD; }
[data-coreui-theme="dark"] .seg-a7 { background: rgba(143,170,220,.25); color: #A5C0E8; }
[data-coreui-theme="dark"] .exec-textarea:hover { background-color: #1F1F1A; }
[data-coreui-theme="dark"] tr.row-segment-a2 { --seg-bg: #332413; }
[data-coreui-theme="dark"] tr.row-segment-a3 { --seg-bg: #302B12; }
[data-coreui-theme="dark"] tr.row-segment-a4 { --seg-bg: #2E2710; }
[data-coreui-theme="dark"] tr.row-segment-a5 { --seg-bg: #331A1E; }
[data-coreui-theme="dark"] tr.row-segment-a6 { --seg-bg: #2A2038; }
[data-coreui-theme="dark"] tr.row-segment-a7 { --seg-bg: #232B3B; --seg-border: #8FAADC; }
[data-coreui-theme="dark"] .row-pressing .td-a,
[data-coreui-theme="dark"] .row-pressing .td-b,
[data-coreui-theme="dark"] .row-pressing .td-c,
[data-coreui-theme="dark"] .row-pressing .td-d { background-color: #2A3A55 !important; }
[data-coreui-theme="dark"] .exec-switch span::after { background: #F4F4F0; }
[data-coreui-theme="dark"] .exec-switch input:checked + span { background: #8FAADC; }
[data-coreui-theme="dark"] .row-highlight { background-color: rgba(59,130,246,.18) !important; }
[data-coreui-theme="dark"] .row-highlight td:first-child { border-left-color: #60A5FA; }
[data-coreui-theme="dark"] .section-label { background: #1A1A14; color: #60A5FA; }
[data-coreui-theme="dark"] .form-label-sm { color: #A0A099; }
[data-coreui-theme="dark"] .hierarchy-container { border-color: #2A2A22; }
[data-coreui-theme="dark"] .status-card { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .switch-label { color: #D0D0C8; }
[data-coreui-theme="dark"] .accordion-header:hover { background-color: #24241E; }
[data-coreui-theme="dark"] .line-item { background: #1F1F1A; border-color: #2A2A22; }
[data-coreui-theme="dark"] .line-item:hover { border-color: #3A3A33; }
[data-coreui-theme="dark"] .line-item.is-zero { background: #1A1A14; }
[data-coreui-theme="dark"] .line-item__name { color: #8A8A80; }
[data-coreui-theme="dark"] .line-item__count { color: #F4F4F0; }
[data-coreui-theme="dark"] .line-item.is-zero .line-item__count { color: #4A4A42; }
[data-coreui-theme="dark"] .segment-circle { background: rgba(99,102,241,.25); color: #C7D2FE; }
[data-coreui-theme="dark"] .row-segment-a1 td { background-color: #202A3D !important; }
[data-coreui-theme="dark"] .row-segment-a2 td { background-color: #332413 !important; }
[data-coreui-theme="dark"] .row-segment-a3 td { background-color: #302B12 !important; }
[data-coreui-theme="dark"] .row-segment-a4 td { background-color: #2E2710 !important; }
[data-coreui-theme="dark"] .row-segment-a5 td { background-color: #331A1E !important; }
[data-coreui-theme="dark"] .row-segment-a6 td { background-color: #2A2038 !important; }
[data-coreui-theme="dark"] .row-segment-a7 td { background-color: #232B3B !important; }
[data-coreui-theme="dark"] .kpi-card { background: #1A1A14; border-color: #2A2A22; }
[data-coreui-theme="dark"] .kpi-header { color: #D0D0C8; border-bottom-color: #2A2A22; }
[data-coreui-theme="dark"] .field-name { color: #A0A099; }
[data-coreui-theme="dark"] .field-old { color: #F87171; }
[data-coreui-theme="dark"] .field-new { color: #34D399; }
[data-coreui-theme="dark"] .btn-exec-outline { border-color: #3A3A33; color: #A0A099; }
[data-coreui-theme="dark"] .btn-exec-outline:hover:not(:disabled) { background: #24241E; color: #F4F4F0; border-color: #3A3A33; }
[data-coreui-theme="dark"] .form-control::placeholder { color: #6A6A60; }
[data-coreui-theme="dark"] .form-control:focus,
[data-coreui-theme="dark"] .form-select:focus {
  background-color: #1A1A14 !important;
  border-color: #8FAADC !important;
  box-shadow: 0 0 0 3px rgba(143,170,220,0.15) !important;
}
[data-coreui-theme="dark"] .bg-white { background-color: #1A1A14 !important; }
[data-coreui-theme="dark"] .text-dark { color: #F4F4F0 !important; }
[data-coreui-theme="dark"] .bg-warning.text-dark { color: #14140F !important; }
[data-coreui-theme="dark"] .table-light { --cui-table-bg: #24241E; --cui-table-color: #A0A099; border-color: #2A2A22; }
[data-coreui-theme="dark"] .table-light th { background-color: #24241E !important; color: #A0A099; }
[data-coreui-theme="dark"] .alert-light { background-color: #1F1F1A; border-color: #2A2A22 !important; color: #D0D0C8; }
[data-coreui-theme="dark"] .border-light { border-color: #2A2A22 !important; }

</style>
