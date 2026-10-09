<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Planificación</h1>
        <p v-if="plan" class="ds-sub">
          {{ plan.name }} · {{ plan.year }} · {{ pendingCount }} por pasar al cronograma real · {{ publishedCount - carryOverCount }} ya publicadas
        </p>
        <p v-else class="ds-sub">Escenarios de programación en borrador, antes de crear las ediciones reales.</p>
      </div>

      <!-- Guardar es la acción de todos los días; publicar se hace una vez por
           escenario y ya pide confirmación, por eso va como secundaria. -->
      <div v-if="plan" class="ds-head-actions">
        <button type="button" class="btn-exec btn-exec-outline" :disabled="busy" @click="showSeed = true">
          <i class="fa-solid fa-clone" aria-hidden="true"></i> Duplicar año
        </button>
        <!-- La vista de presentación real, comiendo del plan. Pestaña aparte. -->
        <button type="button" class="btn-exec btn-exec-outline" :disabled="busy" @click="openPreview">
          <i class="fa-solid fa-eye" aria-hidden="true"></i> Ver cómo se vería
        </button>
        <button type="button" class="btn-exec btn-exec-outline" :disabled="busy || !pendingCount" @click="confirmPublish">
          <i class="fa-solid fa-arrow-right-to-bracket" aria-hidden="true"></i> Pasar al cronograma real ({{ pendingCount }})
        </button>
        <!-- saveOnly y no save(): save() relanza el error para cortar la
             cadena de "Guardar y ver", y desde un @click eso queda como
             promesa sin capturar en la consola. -->
        <button type="button" class="btn-exec btn-exec-primary" :disabled="!dirty || busy" @click="saveOnly">
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Guardar
          <span v-if="dirty" class="unsaved-dot" title="Hay cambios sin guardar"></span>
        </button>
      </div>
    </header>

    <!-- Escenario y periodo a la izquierda, conteos a la derecha: mismo reparto
         que el cronograma real. -->
    <section v-if="plan" class="ds-panel">
      <div class="ds-panel-body plan-toolbar">
        <div class="ds-field">
          <label class="ds-label" for="pl-escenario">Escenario</label>
          <div class="plan-inline">
            <select id="pl-escenario" class="ds-input plan-select-scenario" :value="planId" @change="selectPlan($event.target.value, $event.target)">
              <option v-for="p in plans" :key="p.plan_id" :value="p.plan_id">{{ p.name }} · {{ p.year }}</option>
            </select>
            <button type="button" class="btn-exec btn-exec-outline" title="Nuevo escenario" aria-label="Nuevo escenario" @click="showNewPlan = true">
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="ds-field">
          <label class="ds-label" for="pl-mes">Mes</label>
          <div class="plan-inline">
            <button type="button" class="btn-exec btn-exec-outline" title="Mes anterior" aria-label="Mes anterior" @click="changeMonth(-1)">
              <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <select id="pl-mes" v-model.number="month" class="ds-input plan-select-month">
              <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
            </select>
            <!-- El año no se elige: lo fija el escenario. Va pegado al mes para
                 que se lea "Agosto 2027" de un vistazo. -->
            <span class="plan-year">{{ plan.year }}</span>
            <button type="button" class="btn-exec btn-exec-outline" title="Mes siguiente" aria-label="Mes siguiente" @click="changeMonth(1)">
              <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <dl class="plan-stats">
          <div>
            <dt>Semanas</dt>
            <dd>{{ filteredWeeks.filter(w => w.items.length).length }}</dd>
          </div>
          <div>
            <dt>En el mes</dt>
            <dd class="is-accent">{{ monthItems.length }}</dd>
          </div>
          <div>
            <dt>En el año</dt>
            <dd>{{ planItemCount }}</dd>
          </div>
          <div v-if="carryOversThisMonth.length">
            <dt>En curso</dt>
            <dd>{{ carryOversThisMonth.length }}</dd>
          </div>
          <div v-if="publishedCount - carryOverCount > 0">
            <dt>Publicadas</dt>
            <dd class="is-ok">{{ publishedCount - carryOverCount }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <section v-if="plan" class="ds-panel">
      <header class="ds-panel-head">
        <div>
          <h3 class="ds-panel-title">Ediciones de {{ MONTHS[month - 1] }} {{ plan.year }}</h3>
          <p class="ds-panel-sub">D.A. y D.P. en rojo: menos de {{ DIAS_MINIMOS_ENTRE_EDICIONES }} días con la edición vecina del mismo programa.</p>
        </div>
        <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="openItem(null)">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nueva edición
        </button>
      </header>

      <div class="ds-table-scroll plan-scroll">
        <table class="ds-table ds-table--densa plan-grid">
          <thead>
            <!-- FILA 1: Grupos. Sin Académica: los links del aula son de una
                 edición que existe, y en un borrador no hay aula todavía. -->
            <tr class="plan-groups">
              <th class="col-act" rowspan="2"><span class="visually-hidden">Acciones</span></th>
              <th colspan="2" class="sep grp-a">Identificación</th>
              <th colspan="6" class="sep grp-b">Cronograma</th>
              <th colspan="3" class="sep grp-c">Seguimiento</th>
              <th colspan="2" class="sep grp-d">Referencia</th>
            </tr>

            <!-- FILA 2: Columnas -->
            <tr>
              <th class="sep">Programa</th>
              <th>Detalle</th>

              <th class="sep text-center" title="Días desde la edición anterior del mismo programa">D.A.</th>
              <th class="text-center">F. inicio</th>
              <th class="text-center" title="Días hasta la siguiente edición del mismo programa">D.P.</th>
              <th class="text-center">F. fin</th>
              <th>Horario</th>
              <th>Docente</th>

              <th class="sep text-center col-ficha">Ficha / mejora</th>
              <th class="text-center col-confirm">Confirm.</th>
              <th class="text-center col-met" title="Nueva Metodología">N. met.</th>

              <th class="sep">Observación</th>
              <th>Edición</th>
            </tr>

            <!-- FILA 3: Filtros de columna -->
            <tr class="plan-filters">
              <td></td>
              <td class="sep">
                <ColumnFilterDropdown column-label="Programa" :all-items="monthItems" :value-extractor="(i) => i.program_abreviature || i.abbreviation" v-model="columnFilters.program" />
              </td>
              <td>
                <ColumnFilterDropdown column-label="Detalle" :all-items="monthItems" :value-extractor="(i) => `${i.version_code || ''} ${i.cat_segment_label || i.cat_segment || ''}`" v-model="columnFilters.detail" />
              </td>
              <td class="sep"></td><!-- D.A. -->
              <td></td>
              <td></td><!-- D.P. -->
              <td></td>
              <td></td>
              <td>
                <ColumnFilterDropdown column-label="Docente" :all-items="monthItems" :value-extractor="(i) => i.instructor_label || i.instructor" v-model="columnFilters.instructor" />
              </td>
              <td class="sep"></td>
              <td></td>
              <td></td>
              <td class="sep">
                <ColumnFilterDropdown column-label="Observación" :all-items="monthItems" :value-extractor="(i) => i.notes" v-model="columnFilters.notes" />
              </td>
              <td></td>
            </tr>
          </thead>

          <tbody>
            <!-- Vienen del año anterior y siguen dictándose este mes. No son
                 del plan: existen de verdad, por eso no tienen acciones. -->
            <template v-if="carryOversThisMonth.length">
              <tr class="week-row week-row--carry" @click="carryOpen = !carryOpen">
                <td :colspan="COL_COUNT">
                  <div class="week-row-inner">
                    <i class="fa-solid fa-chevron-down week-chevron" :class="{ 'is-open': carryOpen }" aria-hidden="true"></i>
                    <span>En curso · vienen de {{ plan.year - 1 }}</span>
                    <span class="ds-pill warn week-count">{{ carryOversThisMonth.length }} ediciones</span>
                  </div>
                </td>
              </tr>
              <tr v-for="e in carryOversThisMonth" :key="e.uid" v-show="carryOpen"
                  class="plan-row row-published" :class="segClass(e) ? 'row-segment-' + segClass(e) : ''">
                <td class="col-act">
                  <div class="row-actions">
                    <button type="button" class="btn-icon btn-icon-sm" :disabled="!isPackage(e)" @click.stop="openTree(e)" title="Módulos" aria-label="Ver módulos">
                      <i class="fa-solid fa-book-bookmark" aria-hidden="true"></i>
                    </button>
                  </div>
                </td>
                <td class="sep col-prog">
                  <span class="prog-name">{{ e.program_abreviature || e.abbreviation || '—' }}</span>
                  <div class="cell-sub prog-sub">
                    <span class="mono">{{ e.version_code }}</span>
                    <span>Seg: {{ e.cat_segment_label || e.cat_segment || '—' }}</span>
                  </div>
                </td>
                <td class="col-detail">
                  <div class="cell-sub">{{ e.program_type ? 'Tipo: ' + e.program_type : '' }}</div>
                  <div class="cell-sub">{{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}</div>
                </td>
                <td class="sep text-center"><span class="ds-pill" :class="TONO_BRECHA[brechaClass(e, 'antes')]">{{ brecha(e, 'antes') }}</span></td>
                <td>
                  <div class="cell-date">{{ formatDate(e.start_date) }}</div>
                  <div class="cell-sub">{{ dayLabel(e.start_date) }}</div>
                </td>
                <td class="text-center"><span class="ds-pill" :class="TONO_BRECHA[brechaClass(e, 'despues')]">{{ brecha(e, 'despues') }}</span></td>
                <td class="text-center"><span class="mono">{{ formatDate(e.end_date) }}</span></td>
                <td>
                  <div class="cell-strong">{{ dayCombLabel(e) || '—' }}</div>
                  <div class="cell-sub">{{ hourCombLabel(e) }}</div>
                </td>
                <td class="col-teacher">
                  <div class="text-truncate" :title="e.instructor_label || e.instructor">
                    {{ e.instructor_label || e.instructor || '—' }}
                  </div>
                </td>
                <td class="sep text-center">
                  <span class="status-dot" :class="{ 'is-on': e.expedient }" title="Ficha"></span>
                  <span class="status-dot" :class="{ 'is-on': e.upgrade }" title="Mejora"></span>
                </td>
                <td class="text-center">
                  <span class="status-dot" :class="{ 'is-on': e.preconfirmation }" title="Pre-Confirmación"></span>
                  <span class="status-dot" :class="{ 'is-on': e.confirmation }" title="Confirmación"></span>
                </td>
                <td class="text-center">
                  <span class="status-dot" :class="{ 'is-on': e.new_methodology }" title="Nueva Metodología"></span>
                </td>
                <td class="sep"><div class="text-truncate col-note-ro" :title="e.notes">{{ e.notes }}</div></td>
                <td>
                  <div class="mono cell-strong">{{ e.global_code }}</div>
                  <span class="ds-pill warn">Viene de {{ plan.year - 1 }}</span>
                </td>
              </tr>
            </template>

            <template v-for="week in filteredWeeks" :key="week.schedule">
              <tr v-if="week.items.length > 0" class="week-row" @click="toggleWeek(week.schedule)">
                <td :colspan="COL_COUNT">
                  <div class="week-row-inner">
                    <i class="fa-solid fa-chevron-down week-chevron" :class="{ 'is-open': week.isOpen }" aria-hidden="true"></i>
                    <span>Semana {{ week.number }}</span>
                    <span class="ds-pill info week-count">{{ week.items.length }} ediciones</span>
                  </div>
                </td>
              </tr>

              <tr
                v-for="e in week.items"
                :key="e.uid"
                v-show="week.isOpen"
                class="plan-row"
                :class="[
                  segClass(e) ? 'row-segment-' + segClass(e) : '',
                  { 'row-published': e.published_edition_id }
                ]"
              >
                <!-- ACCIONES -->
                <td class="col-act">
                  <div class="row-actions">
                    <button type="button" class="btn-icon btn-icon-sm" :disabled="!isPackage(e)" @click.stop="openTree(e)" title="Módulos" aria-label="Ver módulos">
                      <i class="fa-solid fa-book-bookmark" aria-hidden="true"></i>
                    </button>
                    <template v-if="!e.published_edition_id">
                      <button type="button" class="btn-icon btn-icon-sm" @click.stop="move(e, -7)" title="Una semana antes" aria-label="Mover una semana antes">
                        <i class="fa-solid fa-backward-step" aria-hidden="true"></i>
                      </button>
                      <button type="button" class="btn-icon btn-icon-sm" @click.stop="move(e, 7)" title="Una semana después" aria-label="Mover una semana después">
                        <i class="fa-solid fa-forward-step" aria-hidden="true"></i>
                      </button>
                      <button type="button" class="btn-icon btn-icon-sm" @click.stop="openItem(e)" title="Editar" aria-label="Editar edición del plan">
                        <i v-if="!isPackage(e)" class="fa-solid fa-file-pen" aria-hidden="true"></i>
                        <i v-else class="fa-solid fa-sitemap" aria-hidden="true"></i>
                      </button>
                      <button type="button" class="btn-icon btn-icon-sm" @click.stop="duplicate(e)" title="Duplicar en el plan" aria-label="Duplicar en el plan">
                        <i class="fa-solid fa-clone" aria-hidden="true"></i>
                      </button>
                      <button type="button" class="btn-icon btn-icon-sm act-remove" @click.stop="removeItem(e)" title="Quitar del plan" aria-label="Quitar del plan">
                        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                      </button>
                    </template>
                  </div>
                </td>

                <!-- IDENTIFICACIÓN -->
                <td class="sep col-prog">
                  <span class="prog-name">{{ e.program_abreviature || e.abbreviation || '—' }}</span>
                  <div class="cell-sub prog-sub">
                    <span>
                      <span class="mono">{{ e.version_code }}</span>
                      <b v-if="e.program_sessions || e.sessions">{{ ' (' + (e.program_sessions || e.sessions) + ')' }}</b>
                    </span>
                    <span>Seg: {{ e.cat_segment_label || e.cat_segment || '—' }}</span>
                  </div>
                </td>

                <td class="col-detail">
                  <div class="cell-sub">{{ e.program_type ? 'Tipo: ' + e.program_type : '' }}</div>
                  <div class="cell-sub">{{ e.program_line_business ? 'Línea: ' + e.program_line_business : '—' }}</div>
                </td>

                <!-- CRONOGRAMA -->
                <td class="sep text-center"><span class="ds-pill" :class="TONO_BRECHA[brechaClass(e, 'antes')]">{{ brecha(e, 'antes') }}</span></td>
                <td>
                  <div class="cell-date">{{ formatDate(e.start_date) }}</div>
                  <div class="cell-sub">{{ dayLabel(e.start_date) }}</div>
                </td>
                <td class="text-center"><span class="ds-pill" :class="TONO_BRECHA[brechaClass(e, 'despues')]">{{ brecha(e, 'despues') }}</span></td>
                <td class="text-center"><span class="mono">{{ formatDate(e.end_date) }}</span></td>
                <td>
                  <div class="cell-strong">{{ dayCombLabel(e) || '—' }}</div>
                  <div class="cell-sub">{{ hourCombLabel(e) }}</div>
                </td>
                <td class="col-teacher">
                  <div class="text-truncate" :title="e.instructor_label || e.instructor">
                    {{ e.instructor_label || e.instructor || '—' }}
                  </div>
                </td>

                <!-- SEGUIMIENTO: en el plan los switches solo marcan el
                     borrador, no llaman a ningún endpoint. -->
                <td class="sep text-center">
                  <label class="exec-switch scale-75" title="Ficha / Expediente">
                    <input type="checkbox" v-model="e.expedient" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                  </label>
                  <label class="exec-switch scale-75" title="Mejora / Upgrade">
                    <input type="checkbox" v-model="e.upgrade" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                  </label>
                </td>
                <td class="text-center">
                  <label class="exec-switch scale-75" title="Pre-Confirmación">
                    <input type="checkbox" v-model="e.preconfirmation" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                  </label>
                  <label class="exec-switch scale-75" title="Confirmación">
                    <input type="checkbox" v-model="e.confirmation" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                  </label>
                </td>
                <td class="text-center">
                  <label class="exec-switch scale-75" title="Nueva Metodología">
                    <input type="checkbox" v-model="e.new_methodology" :disabled="!!e.published_edition_id" @change="touch" /><span></span>
                  </label>
                </td>

                <!-- REFERENCIA -->
                <td class="sep">
                  <textarea class="cell-note" rows="2" v-model="e.notes" aria-label="Observación"
                            :readonly="!!e.published_edition_id" @change="touch" placeholder="…"></textarea>
                </td>
                <td>
                  <!-- Un arrastre y una publicada por el plan se ven parecido
                       (las dos existen en el cronograma real) pero no son lo
                       mismo: la primera viene del año anterior y nunca fue
                       decisión de este plan. -->
                  <template v-if="e.carry_over">
                    <div class="mono cell-strong">{{ e.global_code }}</div>
                    <span class="ds-pill warn">Viene de {{ plan.year - 1 }}</span>
                  </template>
                  <template v-else-if="e.published_edition_id">
                    <span class="ds-pill ok">Ed. {{ e.published_edition_id }}</span>
                  </template>
                  <template v-else>
                    <!-- El código lo numera el cronograma al publicar: es único
                         por versión de programa y el del año anterior no sirve. -->
                    <span class="ds-pill" title="El código se asigna al publicar">Pendiente</span>
                  </template>
                </td>
              </tr>
            </template>

            <tr v-if="!monthItems.length && !carryOversThisMonth.length">
              <td :colspan="COL_COUNT" class="ds-empty ds-empty--lista">
                {{ MONTHS[month - 1] }} de {{ plan.year }} está vacío. Duplica el año anterior o agrega una edición con "Nueva edición".
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Sin escenarios no se ve la barra de filtros (ni su "+"), así que el vacío
         trae el único botón que deja salir de él. -->
    <section v-else class="ds-panel">
      <div class="ds-panel-body plan-empty">
        <p class="ds-empty">Todavía no hay escenarios. Crea uno para empezar a planificar el año.</p>
        <button type="button" class="btn-exec btn-exec-primary" @click="showNewPlan = true">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo escenario
        </button>
      </div>
    </section>

    <!-- ════ MODAL: NUEVO ESCENARIO ════ -->
    <BaseModal v-model="showNewPlan" title="Nuevo escenario" size="sm">
      <div class="ds-stack modal-stack">
        <div class="ds-field">
          <label class="ds-label" for="np-nombre">Nombre</label>
          <input id="np-nombre" class="ds-input" v-model.trim="newPlan.name" placeholder="Programación 2028" />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="np-anio">Año</label>
          <input id="np-anio" class="ds-input" type="number" v-model.number="newPlan.year" />
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn-exec btn-exec-outline" @click="showNewPlan = false">Cancelar</button>
        <button type="button" class="btn-exec btn-exec-primary" :disabled="busy" @click="createPlan">Crear escenario</button>
      </template>
    </BaseModal>

    <!-- ════ MODAL: DUPLICAR ════ -->
    <BaseModal v-model="showSeed" title="Duplicar un año al escenario" size="sm">
      <div class="ds-stack modal-stack">
        <div class="ds-field">
          <label class="ds-label" for="sd-anio">Año de origen</label>
          <input id="sd-anio" class="ds-input" type="number" v-model.number="seed.sourceYear" />
        </div>

        <label class="choice" for="sd-todo">
          <input type="checkbox" id="sd-todo" v-model="seed.todoElAnio" />
          <span>
            <strong>Los 12 meses</strong>
            <span class="choice-help">Sin marcar, trae solo {{ MONTHS[month - 1] }}.</span>
          </span>
        </label>

        <fieldset class="choice-group">
          <legend class="ds-label">Cómo correr las fechas</legend>
          <label class="choice" for="md-wd">
            <input type="radio" id="md-wd" value="weekday" v-model="seed.mode" />
            <span>
              <strong>Mismo día de la semana</strong>
              <span class="choice-help">Un miércoles sigue siendo miércoles: respeta el horario de la edición.</span>
            </span>
          </label>
          <label class="choice" for="md-sd">
            <input type="radio" id="md-sd" value="same_date" v-model="seed.mode" />
            <span>
              <strong>Misma fecha exacta</strong>
              <span class="choice-help">El 3 de junio sigue siendo 3 de junio, aunque caiga otro día.</span>
            </span>
          </label>
        </fieldset>

        <p class="ds-callout warn">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <span v-if="seed.todoElAnio">Reemplaza el escenario completo. Lo ya publicado no se toca.</span>
          <span v-else>Reemplaza ese mes si ya lo habías traído. Lo ya publicado no se toca.</span>
        </p>
      </div>
      <template #footer>
        <button type="button" class="btn-exec btn-exec-outline" @click="showSeed = false">Cancelar</button>
        <button type="button" class="btn-exec btn-exec-primary" :disabled="busy" @click="runSeed">
          {{ busy ? 'Copiando…' : 'Duplicar' }}
        </button>
      </template>
    </BaseModal>

    <!-- ════ MODAL: MÓDULOS DEL PAQUETE ════ -->
    <BaseModal v-model="showTree" :title="`Módulos · ${treeItem?.abbreviation || treeItem?.program_abreviature || ''}`" size="lg">
      <div class="ds-table-scroll">
        <table class="ds-table">
          <thead><tr><th class="col-order">#</th><th>Módulo</th><th>Docente</th><th class="col-date">Inicio</th><th class="col-date">Fin</th></tr></thead>
          <tbody>
            <tr v-for="(child, i) in (treeItem?.children || [])" :key="i">
              <td class="num">{{ child.sort_order }}</td>
              <td>{{ child.abbreviation }}</td>
              <td>{{ child.instructor_label || '—' }}</td>
              <td class="mono">{{ formatDate(child.start_date) }}</td>
              <td class="mono">{{ formatDate(child.end_date) }}</td>
            </tr>
            <tr v-if="!(treeItem?.children || []).length">
              <td colspan="5" class="ds-empty">Este paquete no tiene módulos en el plan.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <button type="button" class="btn-exec btn-exec-outline" @click="showTree = false">Cerrar</button>
      </template>
    </BaseModal>

    <!-- ════ MODAL: EDITAR ════ -->
    <BaseModal v-model="showItem" :title="form.uid ? 'Editar edición del plan' : 'Nueva edición del plan'" size="lg">
      <div class="ds-form-grid">
        <div class="ds-field span-all" v-if="!form.uid">
          <label class="ds-label">Programa</label>
          <SearchSelect
            v-model="form.program_version_id" mode="remote"
            :fetcher="q => programService.programVersionCaller({ q, active: 'Y' })"
            label-field="program_type_for_iu" value-field="program_version_id"
            :model-label="form.abbreviation" placeholder="Buscar programa…"
            :minChars="0" :cache="false" @change="onProgramChange" />
        </div>
        <!-- El programa de una edición ya armada no se cambia: se muestra como
             dato, no como un input gris que no se lee. -->
        <dl class="ds-field span-all field-static" v-else>
          <dt class="ds-label">Programa</dt>
          <dd>{{ form.abbreviation }}</dd>
        </dl>

        <div class="ds-field">
          <label class="ds-label">Docente</label>
          <SearchSelect
            v-model="form.instructor_id" mode="remote"
            :fetcher="q => instructorService.instructorCaller({ q })"
            label-field="full_name" value-field="instructor_id"
            :model-label="form.instructor_label" placeholder="Buscar docente…"
            :minChars="0" :cache="false" @change="o => form.instructor_label = o?.full_name || ''" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Segmento</label>
          <SearchSelect
            v-model="form.cat_segment_id" :items="catalogs.catSegments"
            label-field="description" value-field="id" placeholder="Opcional"
            @change="o => form.cat_segment_label = o?.description || ''" />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="it-vacantes">Vacantes</label>
          <input id="it-vacantes" class="ds-input" type="number" v-model.number="form.vacant" />
        </div>

        <div class="ds-field">
          <label class="ds-label">Inicio</label>
          <BaseDatePicker v-model="form.start_date" placeholder="dd/mm/aaaa" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Fin</label>
          <BaseDatePicker v-model="form.end_date" placeholder="dd/mm/aaaa" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Días</label>
          <SearchSelect
            v-model="form.cat_day_combination_id" :items="catalogs.dayCombinationList"
            label-field="description" value-field="id" placeholder="Días"
            @change="o => form.day_combination_label = o?.description || ''" />
        </div>
        <div class="ds-field">
          <label class="ds-label">Horario</label>
          <SearchSelect
            v-model="form.cat_hour_combination_id" :items="catalogs.hourCombinationList"
            label-field="description" value-field="id" placeholder="Horario"
            @change="o => form.hour_combination_label = o?.description || ''" />
        </div>

        <div class="ds-field span-all">
          <label class="ds-label" for="it-notas">Observación</label>
          <input id="it-notas" class="ds-input" v-model.trim="form.notes" />
        </div>

        <div class="ds-field span-all" v-if="form.isPackage && form.children.length">
          <span class="ds-label">Módulos</span>
          <div class="ds-table-scroll">
            <table class="ds-table">
              <thead>
                <tr><th class="col-order">#</th><th>Módulo</th><th class="col-date-edit">Inicio</th><th class="col-date-edit">Fin</th></tr>
              </thead>
              <tbody>
                <tr v-for="(child, i) in form.children" :key="i">
                  <td class="num">{{ child.sort_order }}</td>
                  <td>{{ child.abbreviation }}</td>
                  <td><BaseDatePicker v-model="child.start_date" placeholder="dd/mm/aaaa" /></td>
                  <td><BaseDatePicker v-model="child.end_date" placeholder="dd/mm/aaaa" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn-exec btn-exec-outline" @click="showItem = false">Cancelar</button>
        <button type="button" class="btn-exec btn-exec-outline" :disabled="busy" @click="saveAndPreview">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Guardar y ver cómo se vería
        </button>
        <button type="button" class="btn-exec btn-exec-primary" @click="applyItem">Guardar en el plan</button>
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
// La grilla repite a propósito la estructura de Producto > Cronograma (grupos de
// columnas, semanas plegables): planificar y ejecutar se leen igual, y el que
// arma el 2027 no tiene que aprender una segunda pantalla. El aspecto ya es el
// del sistema de diseño (ds-*). Lo único que NO se copió es el bloque
// ACADÉMICA (links de WhatsApp/Teams/Ficha/Notas): esos links son de un aula que
// existe, y en un borrador no hay aula.
import { ref, reactive, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import ColumnFilterDropdown from '@/components/ColumnFilterDropdown.vue'
import { confirmAction } from '@/composables/useConfirm'
import { editionGapsByUid, DIAS_MINIMOS_ENTRE_EDICIONES } from '@/features/schedule-plan/editionGaps'
import { numeradorDeSemanas } from '@/shared/lib/cronograma'

const planService = inject(ServiceKeys.SchedulePlan)
const programService = inject(ServiceKeys.Program)
const instructorService = inject(ServiceKeys.Instructor)
const catalog = inject('catalog')
const toast = useToast()

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
// Acciones + IDENTIFICACIÓN(2) + CRONOGRAMA(6) + SEGUIMIENTO(3) + REFERENCIA(2)
const COL_COUNT = 14
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

// D.A. / D.P.: los días entre ediciones del mismo programa que el cronograma real
// muestra desde calc_da/calc_dp. Se recalculan solos al mover una edición.
const brechasPorUid = computed(() => editionGapsByUid(plan.value?.items || []))

// Sin edición vecina no hay brecha: "—" y no 0, que se leería como "el mismo día".
const brecha = (item, lado) => brechasPorUid.value[item.uid]?.[lado] ?? '—'

const brechaClass = (item, lado) => {
  const dias = brechasPorUid.value[item.uid]?.[lado]
  if (dias == null) return 'gap-none'
  return dias < DIAS_MINIMOS_ENTRE_EDICIONES ? 'gap-tight' : 'gap-ok'
}

// Traduce la brecha al tono de .ds-pill: rojo = las dos ediciones se pisan;
// sin vecina queda neutro.
const TONO_BRECHA = { 'gap-tight': 'bad', 'gap-ok': 'ok', 'gap-none': '' }

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

// Sin filtros de pantalla: buscar no debe renumerar el mes (ver numeradorDeSemanas).
const numeroDeSemana = computed(() => numeradorDeSemanas(
  monthItems.value.map(item => ({ schedule: weekOfMonth(item.start_date), items: [item] }))
))

const filteredWeeks = computed(() => {
  const semanas = Array.from({ length: SEMANAS_POR_MES }, (_, i) => ({
    schedule: i + 1, number: numeroDeSemana.value(i + 1), isOpen: openWeeks.value[i + 1] !== false, items: []
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

// Cambiar de escenario o salir con cambios sin guardar los perdía en silencio.
async function confirmDiscardChanges () {
  if (!dirty.value) return true
  return confirmAction({
    title: 'Hay cambios sin guardar',
    text: 'Si sigues, se pierden los cambios de este escenario.',
    confirmText: 'Descartar cambios', cancelText: 'Seguir editando', icon: 'warning', danger: true
  })
}

onBeforeRouteLeave(() => confirmDiscardChanges())

const warnBeforeUnload = e => { if (dirty.value) e.preventDefault() }
window.addEventListener('beforeunload', warnBeforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload))

async function selectPlan (id, selectEl = null) {
  if (!(await confirmDiscardChanges())) {
    // El <select> ya cambió en pantalla: devolverlo al escenario actual.
    if (selectEl) selectEl.value = planId.value
    return
  }
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
/* Planificación en ds-*: solo lo propio de la grilla del plan. Tarjetas, tablas,
   pills y botones salen de design-system.css; aquí no se redefinen. */

/* ── Barra de escenario y periodo ── */
.plan-toolbar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 24px; }
.plan-inline { display: flex; align-items: center; gap: 6px; }
.plan-select-scenario { min-width: 220px; }
.plan-select-month { width: 130px; }
.plan-year { padding: 0 4px; font-size: 13px; font-weight: 700; color: var(--ds-heading); font-variant-numeric: tabular-nums; }

/* Conteos del mes a la derecha: compactos, porque arriba de una grilla de
   cientos de filas una fila de tarjetas KPI se come la pantalla. */
.plan-stats { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0 0 0 auto; }
.plan-stats > div { text-align: right; }
.plan-stats dt { font-size: 11.5px; font-weight: 600; color: var(--ds-muted); }
.plan-stats dd { margin: 0; font-size: 18px; font-weight: 800; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.plan-stats dd.is-accent { color: var(--ds-accent); }
.plan-stats dd.is-ok { color: var(--ds-ok-ink); }

/* Punto de "cambios sin guardar" dentro del botón primario. */
.unsaved-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--ds-warn); }

/* ── Grilla ── */
/* Alto acotado: le da al encabezado un contenedor donde quedarse fijo y el
   scroll horizontal vive aquí, nunca en la página (400 px). */
.plan-scroll { max-height: 70vh; overflow: auto; }
.plan-grid { min-width: 1150px; }
.plan-grid td { vertical-align: middle; }

/* El thead entero queda fijo (grupos + columnas + filtros): la fila de filtros
   cambia de alto según el dropdown y no se puede anclar por píxeles. Fondo
   opaco para que las filas no se vean por debajo al hacer scroll. */
.plan-grid thead { position: sticky; top: 0; z-index: 2; }
.plan-grid thead th,
.plan-grid thead td { background: var(--ds-surface); box-shadow: inset 0 -1px 0 var(--ds-border); vertical-align: middle; }
.plan-grid thead td { padding: 5px 6px; border-top: 0; }
.plan-groups th { text-align: center; font-weight: 700; }
.plan-grid .sep { border-left: 1px solid var(--ds-border); }

/* Grupos de columnas: el color va solo en la cabecera (§5.5.1). El tinte va
   sobre un fondo opaco porque en oscuro los --ds-soft-* son translúcidos. */
.plan-groups .grp-a { background: linear-gradient(var(--ds-soft-info), var(--ds-soft-info)), var(--ds-surface); color: var(--ds-info-ink); }
.plan-groups .grp-b { background: linear-gradient(var(--ds-soft-ok), var(--ds-soft-ok)), var(--ds-surface); color: var(--ds-ok-ink); }
.plan-groups .grp-c { background: linear-gradient(var(--ds-soft-orange), var(--ds-soft-orange)), var(--ds-surface); color: var(--ds-orange-ink); }
.plan-groups .grp-d { background: var(--ds-surface-2); color: var(--ds-ink-2); }

.col-act { width: 1%; white-space: nowrap; }
.col-prog { min-width: 170px; max-width: 220px; }
.col-detail { min-width: 80px; max-width: 120px; }
.col-teacher { min-width: 100px; max-width: 150px; }
.col-ficha { min-width: 110px; }
.col-confirm { min-width: 100px; }
.col-met { min-width: 64px; }
.col-note-ro { max-width: 200px; }

.row-actions { display: flex; justify-content: center; gap: 4px; }
/* Quitar es la única acción que pierde trabajo: se distingue por color. */
.act-remove { color: var(--ds-bad-ink); }

.prog-name { font-weight: 700; color: var(--ds-accent); }
.prog-sub { display: flex; justify-content: space-between; gap: 6px; }
.cell-sub { font-size: 11px; line-height: 1.35; color: var(--ds-muted); }
.cell-strong { font-weight: 600; color: var(--ds-ink); }
.cell-date { font-family: var(--ds-font-mono); font-weight: 600; color: var(--ds-heading); }
.mono { font-family: var(--ds-font-mono); }

/* Observación editable en la celda: sin marco hasta que se toca, para que la
   grilla se lea como tabla y no como formulario. */
.cell-note { display: block; width: 100%; min-width: 160px; padding: 3px 5px; resize: none; font: inherit; font-size: 11.5px; line-height: 1.4; color: var(--ds-ink); background: transparent; border: 1px solid transparent; border-radius: var(--ds-radius-control); }
.cell-note:hover { border-color: var(--ds-border); }
.cell-note:focus { outline: none; border-color: var(--ds-accent); background: var(--ds-surface); }
.cell-note::placeholder { color: var(--ds-muted); }

/* Seguimiento de un arrastre: solo lectura, un punto en vez de un switch. */
.status-dot { display: inline-block; width: 8px; height: 8px; margin: 0 3px; border-radius: 50%; vertical-align: middle; background: var(--ds-border-strong); }
.status-dot.is-on { background: var(--ds-ok); }

/* ── Encabezado de semana (fila plegable) ── */
.week-row { cursor: pointer; }
.week-row > td { padding: 0; background: var(--ds-surface-3); }
.week-row:hover > td { background: var(--ds-surface-2); }
.week-row-inner { display: flex; align-items: center; gap: 10px; padding: 7px 12px; font-size: 12px; font-weight: 700; color: var(--ds-heading); }
.week-chevron { font-size: 10px; color: var(--ds-muted); transform: rotate(-90deg); transition: transform 0.2s ease; }
.week-chevron.is-open { transform: none; }
.week-count { margin-left: auto; }
/* El grupo de arrastres se distingue del de semanas: no es programación del
   plan, es el calendario que ya viene ocupado. */
.week-row--carry > td,
.week-row--carry:hover > td { background: linear-gradient(var(--ds-soft-warn), var(--ds-soft-warn)), var(--ds-surface); }
.week-row--carry .week-row-inner { color: var(--ds-warn-ink); }

/* ── Filas del plan ── */
.plan-row:hover > td { background-color: var(--ds-surface-2); }

/* Ya publicada = existe en el cronograma real: se atenúa y pierde las acciones
   destructivas, para que nadie siga jugando con una edición que ya es de verdad. */
.row-published > td { opacity: 0.6; }

/* Color de segmento: misma paleta que el cronograma (styles/cronograma-fila.css)
   y Aulas (A1 azul, A2 ámbar, A3 turquesa, A4 naranja, A6 violeta) para que un
   segmento se lea igual en todo el ERP. A5 = cancelado (rojo) y A7 = cerrado (neutro con barra de marca). El
   tinte va como imagen sobre el background-color, así el hover sigue visible. */
tr.row-segment-a1 { --seg-tint: var(--ds-soft-info); --seg-bar: var(--ds-accent); }
tr.row-segment-a2 { --seg-tint: var(--ds-soft-warn); --seg-bar: var(--ds-warn); }
tr.row-segment-a3 { --seg-tint: var(--ds-soft-cyan); --seg-bar: var(--ds-cyan-ink); }
tr.row-segment-a4 { --seg-tint: var(--ds-soft-orange); --seg-bar: var(--ds-orange-ink); }
tr.row-segment-a5 { --seg-tint: var(--ds-soft-bad); --seg-bar: var(--ds-bad); }
tr.row-segment-a6 { --seg-tint: var(--ds-soft-violet); --seg-bar: var(--ds-violet-ink); }
tr.row-segment-a7 { --seg-tint: var(--ds-soft-neutral); --seg-bar: var(--ds-heading); }
.plan-grid tr[class*="row-segment-"] > td:not(.col-act) { background-image: linear-gradient(var(--seg-tint), var(--seg-tint)); }
.plan-grid tr[class*="row-segment-"] > td.col-prog { box-shadow: inset 3px 0 0 var(--seg-bar); }

/* ── Modales ── */
.modal-stack { gap: 14px; }
.span-all { grid-column: 1 / -1; }
.field-static { margin: 0; }
.field-static dd { margin: 0; font-size: 13px; font-weight: 600; color: var(--ds-heading); }
.col-order { width: 40px; }
.col-date { width: 110px; }
.col-date-edit { width: 150px; }

.choice-group { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 8px; }
.choice-group legend { float: none; width: auto; padding: 0; }
.choice { display: flex; align-items: flex-start; gap: 8px; margin: 0; font-size: 12.5px; color: var(--ds-ink); cursor: pointer; }
.choice input { margin-top: 3px; accent-color: var(--ds-brand); }
.choice-help { display: block; font-size: 11.5px; color: var(--ds-muted); }

.plan-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px 18px; }

/* A 400 px los selectores ocupan el ancho y los conteos bajan alineados a la
   izquierda; la grilla sigue con su propio scroll horizontal. */
@media (max-width: 600px) {
  .plan-toolbar > .ds-field { flex: 1 1 100%; }
  .plan-select-scenario { min-width: 0; flex: 1; }
  .plan-select-month { flex: 1; width: auto; }
  .plan-stats { margin-left: 0; }
  .plan-stats > div { text-align: left; }
}
</style>
