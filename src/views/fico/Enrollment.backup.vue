<template>
  <div class="shell">
    <!-- MASTHEAD -->
    <header class="masthead">
      <div class="mh-left">
        <div class="mh-rule"></div>
        <div>
          <span class="mh-eyebrow">Finanzas / FICO</span>
          <h1 class="mh-title">Inscripciones</h1>
        </div>
      </div>
      <div class="mh-right">
        <div class="view-toggle">
          <button :class="['vt-btn', { active: viewMode === 'compact' }]" @click="viewMode = 'compact'">
            <i class="fa-solid fa-list"></i> Compacta
          </button>
          <button :class="['vt-btn', { active: viewMode === 'expanded' }]" @click="viewMode = 'expanded'">
            <i class="fa-solid fa-table-columns"></i> Expandida
          </button>
        </div>
        <button class="btn-exec" @click="goNew"><i class="fa-solid fa-plus"></i> Nuevo</button>
      </div>
    </header>

    <!-- BODY -->
    <div class="body">
      <BaseFilterChips :items="activeFilterChips" @remove="clearFilter" @clear-all="clearFilters" />
      <div class="toolbar">
        <BasePagination v-model="pagin" @open-filters="openFilterModal" @change="handlePaginationChange" />
      </div>

      <!-- ========== VISTA COMPACTA ========== -->
      <div v-if="viewMode === 'compact'" class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr class="thead-sub">
              <th class="tc" style="width:45px"></th>
              <th style="min-width:125px">F. Registro</th>
              <th style="min-width:170px">Alumno / Documento</th>
              <th style="min-width:170px">Programa / Edicion</th>
              <th style="min-width:80px">Agente</th>
              <th style="min-width:85px">F. Pago</th>
              <th class="tc" style="min-width:85px">Tipo Pago</th>
              <th class="tr" style="min-width:90px">Monto Neto</th>
              <th class="tr" style="min-width:80px">Pagado</th>
              <th class="tr" style="min-width:85px">Saldo</th>
              <th class="tc" style="min-width:95px">Estado FICO</th>
            </tr>
            <tr class="thead-filter">
              <td class="tc">
                <button class="hf-clear" title="Limpiar filtros columna" @click="clearColFilters"><i class="fa-solid fa-eraser"></i></button>
              </td>
              <td></td>
              <td><input v-model="colFilters.alumno" class="hf-input" placeholder="Buscar..." /></td>
              <td><input v-model="colFilters.programa" class="hf-input" placeholder="Buscar..." /></td>
              <td>
                <select v-model="colFilters.agente" class="hf-select">
                  <option :value="null">Todos</option>
                  <option v-for="a in uniqueAgents" :key="a" :value="a">{{ a }}</option>
                </select>
              </td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td>
                <select v-model="colFilters.estado" class="hf-select">
                  <option :value="null">Todos</option>
                  <option v-for="s in uniqueEstados" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in filteredEnrollments" :key="e.enrollment_id" class="tbody-row" :class="rowClass(e)">
              <td class="tc">
                <button class="act-btn act-teal" title="Revisar" @click="openDetail(e)"><i class="fa-solid fa-clipboard-check"></i></button>
              </td>
              <td class="cell-date-sm">{{ formatDateTime(e.registration_date) }}</td>
              <td>
                <div class="cell-primary cell-ellipsis">{{ e.student_full_name }}</div>
                <div class="cell-secondary cell-extra">{{ e.document_number }}</div>
              </td>
              <td>
                <div class="cell-primary cell-ellipsis">{{ e.program_name }}</div>
                <span class="pill pill-slate cell-extra">{{ e.edition_code }}</span>
              </td>
              <td>
                <div class="cell-primary cell-ellipsis">{{ e.seller_agent_name }}</div>
              </td>
              <td class="cell-date-sm">{{ formatDate(e.pay_date) }}</td>
              <td class="tc"><span class="pill pill-sm" :class="isContado(e) ? 'pill-slate' : 'pill-blue'">{{ isContado(e) ? 'Al contado' : 'Cuotas' }}</span></td>
              <td class="tr mono">S/. {{ formatMoney(e.total_to_pay) }}</td>
              <td class="tr mono c-green">S/. {{ formatMoney(getPagado(e)) }}</td>
              <td class="tr mono" :class="calcSaldo(e) > 0 ? 'c-red fw700' : 'c-muted'">S/. {{ formatMoney(calcSaldo(e)) }}</td>
              <td class="tc">
                <span class="pill" :class="statusPill(e.confirmation)">{{ e.confirmation || 'Pendiente' }}</span>
              </td>
            </tr>
            <tr v-if="!filteredEnrollments.length"><td colspan="11" class="empty-row">Sin resultados</td></tr>
          </tbody>
        </table>
      </div>

      <!-- ========== VISTA EXPANDIDA ========== -->
      <div v-if="viewMode === 'expanded'" class="exp-wrap">
        <div class="exp-scroll">
          <table class="tbl-exp">
            <thead>
              <tr class="grp-row">
                <th colspan="1" class="grp grp-actions"></th>
                <th
                  :colspan="cg.identity ? 4 : 1"
                  class="grp grp-identity"
                  :class="{ 'tg-collapsed': !cg.identity }"
                  @click="cg.identity = !cg.identity"
                  :title="cg.identity ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-id-card tg-icon"></i><span class="tg-text">IDENTIDAD</span><i class="fa-solid tg-chev" :class="cg.identity ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.profile ? 5 : 1"
                  class="grp grp-profile"
                  :class="{ 'tg-collapsed': !cg.profile }"
                  @click="cg.profile = !cg.profile"
                  :title="cg.profile ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-user tg-icon"></i><span class="tg-text">PERFIL ALUMNO</span><i class="fa-solid tg-chev" :class="cg.profile ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.program ? 4 : 1"
                  class="grp grp-program"
                  :class="{ 'tg-collapsed': !cg.program }"
                  @click="cg.program = !cg.program"
                  :title="cg.program ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-graduation-cap tg-icon"></i><span class="tg-text">PROGRAMA</span><i class="fa-solid tg-chev" :class="cg.program ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.finance ? 16 : 1"
                  class="grp grp-finance"
                  :class="{ 'tg-collapsed': !cg.finance }"
                  @click="cg.finance = !cg.finance"
                  :title="cg.finance ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-coins tg-icon"></i><span class="tg-text">FINANZAS</span><i class="fa-solid tg-chev" :class="cg.finance ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.installments ? 48 : 1"
                  class="grp grp-installments"
                  :class="{ 'tg-collapsed': !cg.installments }"
                  @click="cg.installments = !cg.installments"
                  :title="cg.installments ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-calendar-days tg-icon"></i><span class="tg-text">PLAN DE CUOTAS</span><i class="fa-solid tg-chev" :class="cg.installments ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
              </tr>
              <tr class="sub-row">
                <th class="sticky-col sc-0 tc" style="min-width:36px"></th>
                <!-- Identity -->
                <template v-if="cg.identity">
                  <th class="hd-id" style="min-width:80px">DNI</th>
                  <th class="hd-id sticky-col sc-name" style="min-width:200px">NOMBRES</th>
                  <th class="hd-id" style="min-width:95px">CELULAR</th>
                  <th class="hd-id" style="min-width:170px">CORREO</th>
                </template>
                <th v-else class="tg-ph"></th>
                <!-- Profile -->
                <template v-if="cg.profile">
                  <th class="hd-pf" style="min-width:50px">OCUP.</th>
                  <th class="hd-pf" style="min-width:65px">TIP. CLI</th>
                  <th class="hd-pf" style="min-width:75px">MEMBER</th>
                  <th class="hd-pf" style="min-width:70px">ESTADO</th>
                  <th class="hd-pf" style="min-width:90px">MOD. / TIPO</th>
                </template>
                <th v-else class="tg-ph"></th>
                <!-- Program -->
                <template v-if="cg.program">
                  <th class="hd-pg" style="min-width:100px">TIPO PROG.</th>
                  <th class="hd-pg" style="min-width:100px">MOD. PROG.</th>
                  <th class="hd-pg" style="min-width:180px">PROGRAMA</th>
                  <th class="hd-pg" style="min-width:90px">EDICION</th>
                </template>
                <th v-else class="tg-ph"></th>
                <!-- Finance -->
                <template v-if="cg.finance">
                  <th class="hd-fn" style="min-width:80px">F. INICIO</th>
                  <th class="hd-fn" style="min-width:80px">F. PAGO</th>
                  <th class="hd-fn" style="min-width:80px">ASESOR</th>
                  <th class="hd-fn" style="min-width:70px">TIPO PAGO</th>
                  <th class="hd-fn" style="min-width:80px">DSCT. PRINC.</th>
                  <th class="hd-fn" style="min-width:80px">DSCT. ADIC.</th>
                  <th class="hd-fn" style="min-width:75px">CANAL</th>
                  <th class="hd-fn tr" style="min-width:80px">P. LISTA</th>
                  <th class="hd-fn tr" style="min-width:80px">TOTAL</th>
                  <th class="hd-fn tr" style="min-width:80px">DESCONTADO</th>
                  <th class="hd-fn" style="min-width:70px">MONEDA</th>
                  <th class="hd-fn" style="min-width:85px">MEDIO PAGO</th>
                  <th class="hd-fn" style="min-width:95px">ENT. EMPRESA</th>
                  <th class="hd-fn" style="min-width:95px">ENT. FINANC.</th>
                  <th class="hd-fn tc" style="min-width:65px">VOUCHER</th>
                  <th class="hd-fn tc" style="min-width:100px">ESTADO FICO</th>
                </template>
                <th v-else class="tg-ph"></th>
                <!-- Installments -->
                <template v-if="cg.installments">
                  <template v-for="n in 8" :key="'qh'+n">
                    <th class="hd-qt" style="min-width:78px">FC{{ n }}</th>
                    <th class="hd-qt tr" style="min-width:62px">C{{ n }}</th>
                    <th class="hd-qt" style="min-width:55px">MON{{ n }}</th>
                    <th class="hd-qt" style="min-width:70px">MPAGO{{ n }}</th>
                    <th class="hd-qt" style="min-width:70px">CTA{{ n }}</th>
                    <th class="hd-qt" style="min-width:70px">TOKP{{ n }}</th>
                  </template>
                </template>
                <th v-else class="tg-ph"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in filteredEnrollments" :key="'exp-'+e.enrollment_id" class="tbody-row" :class="rowClass(e)">
                <td class="sticky-col sc-0 tc nw"><button class="act-btn-sm act-teal" @click="openDetail(e)"><i class="fa-solid fa-clipboard-check"></i></button></td>
                <!-- Identity -->
                <template v-if="cg.identity">
                  <td class="mono">{{ e.document_number }}</td>
                  <td class="sticky-col sc-name fw700">{{ e.student_full_name }}</td>
                  <td class="mono">{{ e.phone || '—' }}</td>
                  <td class="cell-sm">{{ e.email || '—' }}</td>
                </template>
                <td v-else class="tg-ph-cell"><div class="tg-hint tg-hint-id"><i class="fa-solid fa-id-card"></i></div></td>
                <!-- Profile -->
                <template v-if="cg.profile">
                  <td class="tc">{{ e.occupation_label || '—' }}</td>
                  <td class="tc"><span class="pill pill-sm pill-slate">{{ e.client_type_label || '—' }}</span></td>
                  <td class="tc"><span class="pill pill-sm" :class="e.member_type_label ? 'pill-teal' : 'pill-slate'">{{ e.member_type_label || '—' }}</span></td>
                  <td class="tc"><span class="pill pill-sm" :class="statusPill(e.student_status)">{{ e.student_status || '—' }}</span></td>
                  <td class="tc">
                    <div v-if="e.modality" class="cell-sm">{{ e.modality }}</div>
                    <div v-if="e.student_type_label" class="cell-sm">{{ e.student_type_label }}</div>
                    <span v-if="!e.modality && !e.student_type_label">—</span>
                  </td>
                </template>
                <td v-else class="tg-ph-cell"><div class="tg-hint tg-hint-pf"><i class="fa-solid fa-user"></i></div></td>
                <!-- Program -->
                <template v-if="cg.program">
                  <td class="cell-sm">{{ e.program_type || '—' }}</td>
                  <td class="cell-sm">{{ e.program_modality || '—' }}</td>
                  <td class="cell-prog fw700">{{ e.program_name || '—' }}</td>
                  <td class="fw700 c-accent">{{ e.edition_code || '—' }}</td>
                </template>
                <td v-else class="tg-ph-cell"><div class="tg-hint tg-hint-pg"><i class="fa-solid fa-graduation-cap"></i></div></td>
                <!-- Finance -->
                <template v-if="cg.finance">
                  <td class="cell-date">{{ formatDate(e.start_date) }}</td>
                  <td class="cell-date">{{ formatDate(e.pay_date) }}</td>
                  <td class="tc cell-sm">{{ e.seller_agent_name || '—' }}</td>
                  <td class="tc cell-sm">{{ e.payment_type || '—' }}</td>
                  <td class="tc mono">{{ e.main_discount || '—' }}</td>
                  <td class="tc mono">{{ e.additional_discounts || '—' }}</td>
                  <td class="tc cell-sm">{{ e.payment_channel || '—' }}</td>
                  <td class="tr mono">{{ e.list_price || '—' }}</td>
                  <td class="tr mono fw700">{{ e.total_to_pay || '—' }}</td>
                  <td class="tr mono">{{ formatMoney(getPagado(e)) }}</td>
                  <td class="tc cell-sm">{{ e.currency_label || '—' }}</td>
                  <td class="tc cell-sm">{{ e.method_payment_label || '—' }}</td>
                  <td class="tc cell-sm">{{ e.account_label || '—' }}</td>
                  <td class="tc cell-sm">{{ e.token_provider_label || '—' }}</td>
                  <td class="tc"><a v-if="e.payment_vouchers" :href="e.payment_vouchers" target="_blank" class="voucher-link"><i class="fa-solid fa-image"></i></a><span v-else class="c-muted">—</span></td>
                  <td class="tc"><span class="pill pill-sm" :class="statusPill(e.confirmation)">{{ e.confirmation || 'Pendiente' }}</span></td>
                </template>
                <td v-else class="tg-ph-cell"><div class="tg-hint tg-hint-fn"><i class="fa-solid fa-coins"></i></div></td>
                <!-- Installments -->
                <template v-if="cg.installments">
                  <template v-for="n in 8" :key="'qd'+n">
                    <td class="cell-date">{{ e['fc'+n] || '—' }}</td>
                    <td class="tr mono">{{ e['c'+n] || '—' }}</td>
                    <td class="cell-sm">{{ e['mon'+n] || '—' }}</td>
                    <td class="cell-sm">{{ e['mpago'+n] || '—' }}</td>
                    <td class="cell-sm">{{ e['cta'+n] || '—' }}</td>
                    <td class="cell-sm">{{ e['tokp'+n] || '—' }}</td>
                  </template>
                </template>
                <td v-else class="tg-ph-cell"><div class="tg-hint tg-hint-qt"><i class="fa-solid fa-calendar-days"></i></div></td>
              </tr>
              <tr v-if="!filteredEnrollments.length"><td :colspan="expandedColCount" class="empty-row">Sin resultados</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- ========== MODAL FILTROS ========== -->
  <BaseModal v-model="showFilterModal" title="Filtros Avanzados" size="xxl">
    <div class="flt-body">
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-magnifying-glass"></i> Busqueda</legend>
        <div class="flt-grid cols-3">
          <div class="flt-field col-span-2">
            <label>Busqueda global</label>
            <input v-model.trim="filters.q" type="text" class="flt-input" placeholder="Nombre, DNI, Codigo, Correo, Celular..." @keyup.enter="applyFilters" />
          </div>
          <div class="flt-field">
            <label>Ordenar por</label>
            <SearchSelect v-model="filters.order_by" :items="filtroOrden" label-field="description" value-field="value" placeholder="Mas recientes..." />
          </div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-clipboard-check"></i> Estado y Asignacion</legend>
        <div class="flt-grid cols-3">
          <div class="flt-field"><label>Estado Alumno</label><MultiSelect v-model="filters.enrollment_status_ids" :items="filtroStatus" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field"><label>Asesor</label><MultiSelect v-model="filters.seller_agent_ids" :items="filtroOwners" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field"><label>Canal de Pago</label><MultiSelect v-model="filters.payment_channel_ids" :items="filtroPaymentChannel" label-key="description" value-key="id" placeholder="Todos..." /></div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset">
        <legend class="flt-legend"><i class="fa-solid fa-graduation-cap"></i> Academico</legend>
        <div class="flt-grid cols-2">
          <div class="flt-field"><label>Tipo Programa</label><MultiSelect v-model="filters.type_program_ids" :items="filtroTiposPrograma" label-key="description" value-key="id" placeholder="Todos..." /></div>
          <div class="flt-field"><label>Modalidad Programa</label><MultiSelect v-model="filters.model_modality_ids" :items="filtroModalidad" label-key="description" value-key="id" placeholder="Todas..." /></div>
        </div>
      </fieldset>
      <fieldset class="flt-fieldset flt-last">
        <legend class="flt-legend"><i class="fa-solid fa-calendar-days"></i> Rangos de Fecha</legend>
        <div class="flt-grid cols-2">
          <div class="flt-field"><label>Fecha de Registro</label><BaseDatePicker v-model="filters.created_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => handleDateChange(s, 'created')" /></div>
          <div class="flt-field"><label>Fecha de Inicio</label><BaseDatePicker v-model="filters.edition_range_string" :config="{ mode: 'range', dateFormat: 'Y-m-d' }" placeholder="Seleccionar rango..." @on-change="(d, s) => handleDateChange(s, 'edition')" /></div>
        </div>
      </fieldset>
    </div>
    <template #footer>
      <div class="flt-footer">
        <button class="btn-ghost" @click="clearFilters"><i class="fa-solid fa-trash-can"></i> Limpiar</button>
        <div class="flt-actions">
          <button class="btn-ghost" @click="showFilterModal = false">Cancelar</button>
          <button class="btn-exec" @click="applyFilters"><i class="fa-solid fa-filter"></i> Aplicar</button>
        </div>
      </div>
    </template>
  </BaseModal>

  <!-- ========== MODAL DETALLE FINANCIERO ========== -->
  <BaseModal v-model="showDetailModal" :title="modalMode === 'view' ? 'Detalle de Inscripcion' : 'Detalle Financiero'" size="xl">
    <div v-if="loadingDetail" class="detail-loader"><div class="loader-ring"></div><p>Cargando detalle...</p></div>
    <div v-else class="det">

      <!-- TABS PRINCIPALES -->
      <div class="modal-main-tabs">
        <button :class="['modal-main-tab', { active: modalTab === 'detalle' }]" @click="modalTab = 'detalle'">
          <i class="fa-solid fa-file-invoice-dollar"></i> Detalle
        </button>
        <button :class="['modal-main-tab', { active: modalTab === 'historial' }]" @click="modalTab = 'historial'">
          <i class="fa-solid fa-clock-rotate-left"></i> Historial
          <span v-if="auditLog.length" class="tab-badge">{{ auditLog.length }}</span>
        </button>
      </div>

      <!-- TAB: HISTORIAL -->
      <div v-if="modalTab === 'historial'" class="audit-timeline">
        <div v-if="!auditLog.length" class="empty-state"><i class="fa-solid fa-inbox"></i><p>Sin registros de historial</p></div>
        <div v-for="log in auditLog" :key="log.audit_id" class="audit-item">
          <div class="audit-icon" :class="'audit-' + log.action">
            <i :class="auditIcon(log.action)"></i>
          </div>
          <div class="audit-body">
            <div class="audit-head">
              <span class="audit-action">{{ auditLabel(log.action) }}</span>
              <span class="audit-user">{{ log.user_name || 'Sistema' }}</span>
              <span class="audit-date">{{ formatDateTime(log.performed_at) }}</span>
            </div>
            <p v-if="log.details" class="audit-details">{{ log.details }}</p>
            <div v-if="log.justificacion" class="audit-justificacion">
              <i class="fa-solid fa-quote-left"></i> {{ log.justificacion }}
            </div>
            <div v-if="log.changes" class="audit-changes">
              <div v-for="(val, key) in (typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes)" :key="key" class="audit-change-row">
                <span class="audit-change-field">{{ key }}:</span>
                <span v-if="val.old && val.new" class="audit-change-values"><span class="audit-old">{{ val.old }}</span> <i class="fa-solid fa-arrow-right" style="font-size:10px;color:#94a3b8;margin:0 4px"></i> <span class="audit-new">{{ val.new }}</span></span>
                <span v-else-if="val.new" class="audit-new">{{ val.new }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: DETALLE -->
      <div v-show="modalTab === 'detalle'">
      <div class="det-header">
        <div class="det-avatar"><i class="fa-solid fa-user-graduate"></i></div>
        <div class="det-info">
          <h3 class="det-name">{{ selectedDetail.student_full_name || selectedEnrollment?.student_full_name || '---' }}</h3>
          <span class="det-doc"><i class="fa-solid fa-id-card"></i> {{ selectedDetail.document_number || selectedEnrollment?.document_number || '---' }}</span>
          <span class="det-occupation"><i class="fa-solid fa-briefcase"></i> {{ modalOccupation }}</span>
        </div>
        <div class="det-total">
          <span class="det-total-label">Total a Pagar</span>
          <span class="det-total-amount">S/. {{ formatMoney(modalTotal) }}</span>
        </div>
      </div>
      <div class="det-cards">
        <div class="det-card"><span class="det-card-icon ic-blue"><i class="fa-solid fa-graduation-cap"></i></span><div><span class="det-card-label">Programa</span><span class="det-card-value">{{ selectedDetail.program_name || selectedEnrollment?.program_name || '---' }}</span></div></div>
        <div class="det-card"><span class="det-card-icon ic-purple"><i class="fa-solid fa-layer-group"></i></span><div><span class="det-card-label">Codigo</span><span class="det-card-value">{{ selectedDetail.edition_code || selectedEnrollment?.edition_code || '---' }}</span></div></div>
        <div class="det-card"><span class="det-card-icon ic-green"><i class="fa-solid fa-user-tie"></i></span><div><span class="det-card-label">Asesor</span><span class="det-card-value">{{ selectedDetail.seller_agent_name || selectedEnrollment?.seller_agent_name || '---' }}</span></div></div>
        <div class="det-card"><span class="det-card-icon ic-amber"><i class="fa-solid fa-calendar-check"></i></span><div><span class="det-card-label">Registro</span><span class="det-card-value">{{ formatDate(selectedDetail.registration_date || selectedEnrollment?.registration_date) }}</span></div></div>
      </div>
      <div v-if="modalAdditionalInfo" class="det-additional-info">
        <i class="fa-solid fa-circle-info"></i>
        <span>{{ modalAdditionalInfo }}</span>
      </div>
      <div class="fin-bar">
        <div class="fin-item"><span class="fin-label">Precio Lista</span><span class="fin-value">S/. {{ formatMoney(modalListPrice) }}</span></div>
        <div class="fin-sep"></div>
        <div class="fin-item fin-discount-wrap">
          <span class="fin-label">Descuento</span>
          <span class="fin-value c-red fin-has-tip" @mouseenter="showDiscountTip = true" @mouseleave="showDiscountTip = false">
            - S/. {{ formatMoney(modalDescuento) }}
            <i class="fa-solid fa-circle-info fin-tip-icon"></i>
            <div v-if="showDiscountTip && modalDiscountLines.length" class="fin-tooltip">
              <div v-for="(d, i) in modalDiscountLines" :key="i" class="fin-tip-row">{{ d }}</div>
            </div>
          </span>
        </div>
        <div class="fin-sep"></div>
        <div class="fin-item"><span class="fin-label">Total</span><span class="fin-value fw700">S/. {{ formatMoney(modalTotal) }}</span></div>
        <div class="fin-sep"></div>
        <div class="fin-item"><span class="fin-label">Pagado</span><span class="fin-value c-green">S/. {{ formatMoney(modalPagado) }}</span></div>
        <div class="fin-sep"></div>
        <div class="fin-item"><span class="fin-label">Saldo</span><span class="fin-value" :class="modalSaldo > 0 ? 'c-red fw700' : 'c-green'">S/. {{ formatMoney(modalSaldo) }}</span></div>
      </div>

      <!-- ===== AL CONTADO ===== -->
      <div v-if="modalIsContado" class="fico-confirm">
        <h6 class="fico-section-title"><i class="fa-solid fa-money-bill-wave"></i> Pago al Contado</h6>
        <div class="fico-contado-card">
          <div class="fico-contado-amount">
            <span class="fin-label">Monto</span>
            <span class="fw700 mono" style="font-size:16px">S/. {{ formatMoney(modalTotal) }}</span>
          </div>
          <div class="fico-contado-voucher">
            <a v-if="modalVoucher" :href="modalVoucher" target="_blank" class="voucher-link-lg"><i class="fa-solid fa-image"></i> Ver Voucher</a>
            <span v-else class="c-muted" style="font-size:12px">Sin voucher adjunto</span>
          </div>
        </div>

        <!-- VISTA/EDICION: Datos del pago aprobado -->
        <div v-if="modalMode === 'view'" class="fico-form-row fico-form-6 mt12">
          <div class="fico-field">
            <label>Tipo Moneda</label>
            <span v-if="!isEditing" class="fico-readonly">{{ selectedDetail?.currency_symbol || '---' }}</span>
            <select v-else v-model="ficoForm.cat_currency" class="fico-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="c in catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>Medio de Pago</label>
            <span v-if="!isEditing" class="fico-readonly">{{ lastPayment?.payment_method || '---' }}</span>
            <select v-else v-model="ficoForm.cat_payment_medium" class="fico-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="m in catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>Entidad Empresa</label>
            <span v-if="!isEditing" class="fico-readonly">{{ lastPayment?.business_entity || '---' }}</span>
            <select v-else v-model="ficoForm.cat_business_entity" class="fico-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="b in catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>Cuenta Bancaria</label>
            <span v-if="!isEditing" class="fico-readonly">{{ lastPayment ? [lastPayment.bank_name, lastPayment.bank_currency, lastPayment.bank_account_number].filter(Boolean).join(' — ') || '---' : '---' }}</span>
            <select v-else v-model="ficoForm.bank_account_id" class="fico-select" :disabled="!ficoForm.cat_business_entity">
              <option :value="null">{{ ficoForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
              <option v-for="a in contadoAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }} — {{ a.account_number }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>N. Operacion</label>
            <span v-if="!isEditing" class="fico-readonly mono">{{ lastPayment?.transaction_code || '---' }}</span>
            <input v-else v-model="ficoForm.transaction_code" class="fico-input" placeholder="Numero de operacion" />
          </div>
        </div>

        <!-- FORMULARIO: Solo para pendientes -->
        <div v-if="modalMode === 'confirm'" class="fico-form-row fico-form-6 mt12">
          <div class="fico-field">
            <label>Tipo Moneda</label>
            <select v-model="ficoForm.cat_currency" class="fico-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="c in catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>Medio de Pago</label>
            <select v-model="ficoForm.cat_payment_medium" class="fico-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="m in catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>Entidad Empresa</label>
            <select v-model="ficoForm.cat_business_entity" class="fico-select">
              <option :value="null">Seleccionar...</option>
              <option v-for="b in catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>Cuenta Bancaria</label>
            <select v-model="ficoForm.bank_account_id" class="fico-select" :disabled="!ficoForm.cat_business_entity">
              <option :value="null">{{ ficoForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
              <option v-for="a in contadoAccounts" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }} — {{ a.account_number }}</option>
            </select>
          </div>
          <div class="fico-field">
            <label>N. Operacion</label>
            <input v-model="ficoForm.transaction_code" class="fico-input" placeholder="Numero de operacion" />
          </div>
        </div>
      </div>

      <!-- ===== CUOTAS: TABS ===== -->
      <div v-else class="fico-confirm">
        <div class="det-tabs">
          <button :class="['det-tab', { active: cuotaTab === 'inicial' }]" @click="cuotaTab = 'inicial'"><i class="fa-solid fa-receipt"></i> Pago Inicial</button>
          <button :class="['det-tab', { active: cuotaTab === 'cuotas' }]" @click="cuotaTab = 'cuotas'"><i class="fa-solid fa-calendar-days"></i> Cuotas <span v-if="modalCuotas.length" class="tab-badge">{{ modalCuotas.length }}</span></button>
        </div>

        <!-- TAB: PAGO INICIAL -->
        <div v-if="cuotaTab === 'inicial'" class="det-tab-body">
          <div v-if="modalInicial" class="fico-inicial-card">
            <div class="fico-inicial-top">
              <div class="fico-inicial-info">
                <span class="fin-label">Pago Inicial</span>
                <span class="fw700 mono" style="font-size:18px">S/. {{ formatMoney(modalInicial.amount) }}</span>
                <span class="c-muted" style="font-size:11px">Vencimiento: {{ formatDate(modalInicial.due_date) }}</span>
              </div>
              <div class="fico-inicial-actions">
                <span class="pill pill-sm" :class="cuotaStatusPill(modalInicial)">{{ cuotaStatusLabel(modalInicial) }}</span>
                <a v-if="modalVoucher" :href="modalVoucher" target="_blank" class="voucher-link-lg"><i class="fa-solid fa-image"></i> Ver Voucher</a>
              </div>
            </div>
            <div class="fico-form-row fico-form-6 mt12">
              <div class="fico-field">
                <label>Tipo Moneda</label>
                <select v-model="modalInicial._cat_currency" class="fico-select" :disabled="modalInicial.status === 'paid'">
                  <option :value="null">Seleccionar...</option>
                  <option v-for="c in catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
                </select>
              </div>
              <div class="fico-field">
                <label>Medio de Pago</label>
                <select v-model="modalInicial._cat_payment_medium" class="fico-select" :disabled="modalInicial.status === 'paid'">
                  <option :value="null">Seleccionar...</option>
                  <option v-for="m in catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
                </select>
              </div>
              <div class="fico-field">
                <label>Entidad Empresa</label>
                <select v-model="modalInicial._cat_business_entity" class="fico-select" :disabled="modalInicial.status === 'paid'">
                  <option :value="null">Seleccionar...</option>
                  <option v-for="b in catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
                </select>
              </div>
              <div class="fico-field">
                <label>Cuenta Bancaria</label>
                <select v-model="modalInicial._bank_account_id" class="fico-select" :disabled="modalInicial.status === 'paid' || !modalInicial._cat_business_entity">
                  <option :value="null">{{ modalInicial._cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                  <option v-for="a in filteredAccounts(modalInicial._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }} — {{ a.account_number }}</option>
                </select>
              </div>
              <div class="fico-field">
                <label>N. Operacion</label>
                <input v-model="modalInicial._transaction_code" class="fico-input" placeholder="Numero de operacion" :disabled="modalInicial.status === 'paid'" />
              </div>
            </div>
          </div>
          <div v-else class="empty-state"><i class="fa-solid fa-inbox"></i><p>Sin pago inicial registrado</p></div>
        </div>

        <!-- TAB: CUOTAS -->
        <div v-if="cuotaTab === 'cuotas'" class="det-tab-body">
          <div v-if="planStatus === 'borrador'" class="fico-plan-notice fico-notice-draft">
            <i class="fa-solid fa-file-pen"></i>
            <div>
              <strong>Plan en Borrador</strong>
              <p>Comercial envio este plan de cuotas. Confirma el plan para gestionar los pagos.</p>
            </div>
          </div>

          <div class="fico-cuotas-toolbar">
            <span class="c-muted" style="font-size:11px">{{ modalCuotas.length }} cuota{{ modalCuotas.length !== 1 ? 's' : '' }}</span>
            <button class="btn-sm btn-teal" @click="addCuota"><i class="fa-solid fa-plus"></i> Agregar Cuota</button>
          </div>

          <table class="tbl tbl-detail">
            <thead>
              <tr class="thead-sub">
                <th style="width:40px">N</th>
                <th class="tr" style="width:100px">Monto</th>
                <th style="width:105px">Vencimiento</th>
                <th class="tc" style="width:75px">Estado</th>
                <th>Moneda</th>
                <th>Medio Pago</th>
                <th>Ent. Empresa</th>
                <th>Cuenta Bancaria</th>
                <th style="width:100px">N. Operacion</th>
                <th class="tc" style="width:60px">Voucher</th>
                <th class="tc" style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, idx) in modalCuotas" :key="idx" class="tbody-row" :class="cuotaRowClass(c)">
                <td class="fw700 tc">{{ c.installment_number || (idx + 1) }}</td>
                <td v-if="c._isNew"><input v-model.number="c.amount" type="number" step="0.01" class="fico-input tr mono" placeholder="0.00" /></td>
                <td v-else class="tr mono fw700">S/. {{ formatMoney(c.amount) }}</td>
                <td v-if="c._isNew"><input v-model="c.due_date" type="date" class="fico-input" /></td>
                <td v-else :class="{ 'c-red fw700': isOverdue(c.due_date) && c.status !== 'paid' }">{{ formatDate(c.due_date) }}</td>
                <td class="tc"><span class="pill pill-sm" :class="cuotaStatusPill(c)">{{ cuotaStatusLabel(c) }}</span></td>
                <td>
                  <select v-model="c._cat_currency" class="fico-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                    <option :value="null">---</option>
                    <option v-for="cur in catCurrency" :key="cur.id" :value="cur.id">{{ cur.abbreviation || cur.description }}</option>
                  </select>
                </td>
                <td>
                  <select v-model="c._cat_payment_medium" class="fico-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                    <option :value="null">---</option>
                    <option v-for="m in catPaymentMedium" :key="m.id" :value="m.id">{{ m.description }}</option>
                  </select>
                </td>
                <td>
                  <select v-model="c._cat_business_entity" class="fico-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador'">
                    <option :value="null">---</option>
                    <option v-for="b in catBusinessEntity" :key="b.id" :value="b.id">{{ b.description }}</option>
                  </select>
                </td>
                <td>
                  <select v-model="c._bank_account_id" class="fico-select-sm" :disabled="c.status === 'paid' || planStatus === 'borrador' || !c._cat_business_entity">
                    <option :value="null">---</option>
                    <option v-for="a in filteredAccounts(c._cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }}</option>
                  </select>
                </td>
                <td>
                  <input v-model="c._transaction_code" class="fico-input" placeholder="---" :disabled="c.status === 'paid' || planStatus === 'borrador'" />
                </td>
                <td class="tc">
                  <a v-if="c._voucher_url" :href="c._voucher_url" target="_blank" class="voucher-link"><i class="fa-solid fa-image"></i></a>
                  <span v-else class="c-muted">---</span>
                </td>
                <td class="tc">
                  <button v-if="canDeleteCuota(c)" class="act-btn-sm act-red" @click="removeCuota(idx)" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </td>
              </tr>
              <tr v-if="!modalCuotas.length"><td colspan="11" class="empty-row">Sin cuotas programadas</td></tr>
            </tbody>
            <tfoot v-if="modalCuotas.length">
              <tr class="fico-total-row">
                <td class="fw700 tr">Total:</td>
                <td class="tr mono fw700">S/. {{ formatMoney(cuotasTotal) }}</td>
                <td colspan="9"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <!-- ACCIONES FICO (solo en modo view/aprobado) -->
      <div v-if="modalMode === 'view'" class="fico-actions-bar">

        <!-- BOTONES DE ACCION -->
        <div v-if="!isEditing && !isReprogramming && !isCourseChanging" class="fico-action-btns">
          <button class="fico-act-btn fico-act-edit" @click="startEditing">
            <span class="fico-act-icon"><i class="fa-solid fa-pen-to-square"></i></span>
            <span class="fico-act-text">Editar datos financieros</span>
            <i class="fa-solid fa-chevron-right fico-act-arrow"></i>
          </button>
          <button class="fico-act-btn fico-act-rp" @click="startReprogramming">
            <span class="fico-act-icon"><i class="fa-solid fa-calendar-xmark"></i></span>
            <span class="fico-act-text">Reprogramar edicion</span>
            <span class="fico-act-tag">RP</span>
            <i class="fa-solid fa-chevron-right fico-act-arrow"></i>
          </button>
          <button class="fico-act-btn fico-act-cc" @click="startCourseChange">
            <span class="fico-act-icon"><i class="fa-solid fa-right-left"></i></span>
            <span class="fico-act-text">Cambio de Curso</span>
            <span class="fico-act-tag fico-act-tag-cc">CC</span>
            <i class="fa-solid fa-chevron-right fico-act-arrow"></i>
          </button>
        </div>

        <!-- PANEL: EDITAR DATOS -->
        <div v-else-if="isEditing" class="fico-panel fico-panel-edit">
          <div class="fico-panel-head">
            <div class="fico-panel-title"><i class="fa-solid fa-pen-to-square"></i> Editar datos financieros</div>
            <button class="fico-panel-close" @click="isEditing = false; justificacion = ''"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="fico-panel-body">
            <label class="fico-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion del cambio (obligatorio)</label>
            <textarea v-model="justificacion" class="fico-panel-textarea" rows="2" placeholder="Explica el motivo de la edicion..."></textarea>
          </div>
        </div>

        <!-- PANEL: REPROGRAMACION -->
        <div v-else-if="isReprogramming" class="fico-panel fico-panel-rp">
          <div class="fico-panel-head">
            <div class="fico-panel-title"><i class="fa-solid fa-calendar-xmark"></i> Reprogramacion de Edicion</div>
            <button class="fico-panel-close" @click="cancelReprogramming"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="fico-panel-body">
            <div class="fico-panel-grid cols-2">
              <div class="fico-fg">
                <label>Edicion actual</label>
                <div class="fico-fg-static">{{ selectedDetail.edition_code || selectedEnrollment?.edition_code || '---' }}</div>
              </div>
              <div class="fico-fg">
                <label>Nueva edicion<span class="req">*</span></label>
                <select v-model="reprogramEditionId" class="fico-select" :disabled="loadingEditions">
                  <option :value="null">{{ loadingEditions ? 'Cargando ediciones...' : 'Seleccionar nueva edicion...' }}</option>
                  <option v-for="ed in reprogramEditions" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                </select>
              </div>
            </div>
            <div class="fico-fg">
              <label class="fico-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion (obligatorio)</label>
              <textarea v-model="reprogramJustificacion" class="fico-panel-textarea" rows="2" placeholder="Explica el motivo de la reprogramacion..."></textarea>
            </div>
          </div>
        </div>

        <!-- PANEL: CAMBIO DE CURSO -->
        <div v-else-if="isCourseChanging" class="fico-panel fico-panel-cc">
          <div class="fico-panel-head">
            <div class="fico-panel-title"><i class="fa-solid fa-right-left"></i> Cambio de Curso</div>
            <button class="fico-panel-close" @click="cancelCourseChange"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="fico-panel-body">

            <!-- SECCION: Origen -->
            <div class="fico-panel-section">
              <div class="fico-section-label">Inscripcion actual</div>
              <div class="fico-panel-grid cols-2">
                <div class="fico-fg">
                  <label>Programa / Edicion</label>
                  <div class="fico-fg-static">{{ selectedDetail.program_name || selectedEnrollment?.program_name || '---' }} <span class="fico-fg-badge">{{ selectedDetail.edition_code || selectedEnrollment?.edition_code || '---' }}</span></div>
                </div>
                <div class="fico-fg">
                  <label>Pagado hasta ahora</label>
                  <div class="fico-fg-static fico-fg-money c-green">S/. {{ formatMoney(ccPagado) }}</div>
                </div>
              </div>
            </div>

            <!-- SECCION: Destino -->
            <div class="fico-panel-section">
              <div class="fico-section-label">Programa destino</div>
              <div class="fico-panel-grid cols-2">
                <div class="fico-fg">
                  <label>Nuevo programa<span class="req">*</span></label>
                  <SearchSelect v-model="ccProgramVersionId" :items="ccProgramsList" label-field="label" value-field="program_version_id" placeholder="Buscar programa..." @update:modelValue="onCCProgramChange" />
                </div>
                <div class="fico-fg">
                  <label>Nueva edicion<span class="req">*</span></label>
                  <select v-model="ccEditionId" class="fico-select" :disabled="ccLoadingEditions || !ccProgramVersionId" @change="onCCEditionChange">
                    <option :value="null">{{ ccLoadingEditions ? 'Cargando...' : !ccProgramVersionId ? 'Seleccione programa...' : 'Seleccionar edicion...' }}</option>
                    <option v-for="ed in ccEditionsList" :key="ed.id" :value="ed.id">{{ ed.label }}</option>
                  </select>
                </div>
              </div>
              <div class="fico-panel-grid cols-3">
                <div class="fico-fg">
                  <label>Precio lista nuevo</label>
                  <div class="fico-fg-static fico-fg-money">S/. {{ formatMoney(ccEditionListPrice) }}</div>
                </div>
                <div class="fico-fg">
                  <label>Diferencia</label>
                  <div class="fico-fg-static fico-fg-money" :class="ccDiferencia > 0 ? 'c-red' : 'c-green'">S/. {{ formatMoney(ccDiferencia) }}</div>
                </div>
                <div class="fico-fg">
                  <label>Monto a registrar<span class="req">*</span></label>
                  <input v-model.number="ccTotalAmount" type="number" class="fico-select" min="0" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            <!-- SECCION: Datos de pago -->
            <div class="fico-panel-section">
              <div class="fico-section-label">Datos del pago</div>
              <div class="fico-panel-grid cols-3">
                <div class="fico-fg">
                  <label>Moneda</label>
                  <select v-model="ccForm.cat_currency" class="fico-select">
                    <option :value="null">Seleccionar...</option>
                    <option v-for="c in catCurrency" :key="c.id" :value="c.id">{{ c.abbreviation || c.description }}</option>
                  </select>
                </div>
                <div class="fico-fg">
                  <label>Medio de Pago<span class="req">*</span></label>
                  <select v-model="ccForm.cat_method_payment" class="fico-select">
                    <option :value="null">Seleccionar...</option>
                    <option v-for="c in catPaymentMedium" :key="c.id" :value="c.id">{{ c.description }}</option>
                  </select>
                </div>
                <div class="fico-fg">
                  <label>Entidad Empresa</label>
                  <select v-model="ccForm.cat_business_entity" class="fico-select">
                    <option :value="null">Seleccionar...</option>
                    <option v-for="c in catBusinessEntity" :key="c.id" :value="c.id">{{ c.description }}</option>
                  </select>
                </div>
                <div class="fico-fg">
                  <label>Cuenta Bancaria</label>
                  <select v-model="ccForm.bank_account_id" class="fico-select" :disabled="!ccForm.cat_business_entity">
                    <option :value="null">{{ ccForm.cat_business_entity ? 'Seleccionar...' : 'Seleccione empresa...' }}</option>
                    <option v-for="a in filteredAccounts(ccForm.cat_business_entity)" :key="a.account_id" :value="a.account_id">{{ a.bank_name }} — {{ a.currency }} — {{ a.account_number }}</option>
                  </select>
                </div>
                <div class="fico-fg">
                  <label>N. Operacion</label>
                  <input v-model="ccForm.transaction_code" class="fico-select" placeholder="Numero de operacion" />
                </div>
              </div>
              <div class="fico-fg">
                <label>Comprobante(s) de Pago<span class="req">*</span></label>
                <MultiFileUploader v-model="ccForm.ticket_payment_urls" label="Subir comprobante(s)" accept=".png,.jpg,.jpeg,.pdf" :minFiles="1" />
              </div>
            </div>

            <!-- JUSTIFICACION -->
            <div class="fico-fg">
              <label class="fico-warn-label"><i class="fa-solid fa-triangle-exclamation"></i> Justificacion (obligatorio)</label>
              <textarea v-model="ccJustificacion" class="fico-panel-textarea" rows="2" placeholder="Explica el motivo del cambio de curso..."></textarea>
            </div>

          </div>
        </div>

      </div>

      </div><!-- /tab detalle -->

    </div>
    <template #footer>
      <div class="det-footer">
        <button class="btn-ghost" @click="showDetailModal = false">Cerrar</button>

        <!-- FOOTER MODO CONFIRM (pendiente) -->
        <template v-if="modalMode === 'confirm'">
          <button v-if="modalIsContado" class="btn-exec" :disabled="!canConfirmContado || confirmingPayment" @click="handleConfirmPayment">
            <i class="fa-solid" :class="confirmingPayment ? 'fa-spinner fa-spin' : 'fa-check'"></i>
            {{ confirmingPayment ? 'Confirmando...' : 'Confirmar Pago' }}
          </button>
          <button v-else-if="planStatus === 'borrador'" class="btn-exec" :disabled="!modalInstallments.length || confirmingPayment" @click="handleConfirmPlan">
            <i class="fa-solid" :class="confirmingPayment ? 'fa-spinner fa-spin' : 'fa-clipboard-check'"></i>
            {{ confirmingPayment ? 'Confirmando...' : 'Confirmar Plan de Cuotas' }}
          </button>
          <button v-else-if="planStatus === 'pendiente'" class="btn-exec" :disabled="confirmingPayment" @click="handleSaveCuotasData">
            <i class="fa-solid" :class="confirmingPayment ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ confirmingPayment ? 'Guardando...' : 'Guardar Datos Financieros' }}
          </button>
        </template>

        <!-- FOOTER MODO VIEW (aprobado) - Edicion -->
        <template v-if="modalMode === 'view' && isEditing">
          <button class="btn-ghost" @click="isEditing = false; justificacion = ''">Cancelar edicion</button>
          <button class="btn-exec" :disabled="savingEdit || !justificacion.trim()" @click="handleSaveEdit">
            <i class="fa-solid" :class="savingEdit ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
            {{ savingEdit ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </template>

        <!-- FOOTER MODO VIEW (aprobado) - Reprogramacion -->
        <template v-if="modalMode === 'view' && isReprogramming">
          <button class="btn-ghost" @click="cancelReprogramming">Cancelar</button>
          <button class="btn-reprogram-confirm" :disabled="savingReprogram || !reprogramEditionId || !reprogramJustificacion.trim()" @click="handleReprogram">
            <i class="fa-solid" :class="savingReprogram ? 'fa-spinner fa-spin' : 'fa-calendar-xmark'"></i>
            {{ savingReprogram ? 'Reprogramando...' : 'Confirmar Reprogramacion' }}
          </button>
        </template>

        <!-- FOOTER MODO VIEW (aprobado) - Cambio de Curso -->
        <template v-if="modalMode === 'view' && isCourseChanging">
          <button class="btn-ghost" @click="cancelCourseChange">Cancelar</button>
          <button class="btn-cc-confirm" :disabled="savingCC || !ccProgramVersionId || !ccEditionId || !ccJustificacion.trim()" @click="handleCourseChange">
            <i class="fa-solid" :class="savingCC ? 'fa-spinner fa-spin' : 'fa-right-left'"></i>
            {{ savingCC ? 'Procesando...' : 'Confirmar Cambio de Curso' }}
          </button>
        </template>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ServiceKeys } from '@/services'
import BasePagination from '@/components/BasePagination.vue'
import BaseFilterChips from '@/components/BaseFilterChips.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import MultiSelect from '@/components/MultiSelect.vue'
import BaseDatePicker from '@/components/BaseDatePicker.vue'
import BaseModal from '@/components/BaseModal.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'
import { useTablePersistence } from '@/composables/useTablePersistence'
import { useToast } from 'vue-toastification'

const toast = useToast()
const router = useRouter()
const ficoService = inject(ServiceKeys.Fico)
const programService = inject(ServiceKeys.Program)
const editionService = inject(ServiceKeys.Edition)
const authService = inject(ServiceKeys.Auth)
const catalog = inject('catalog')

const catCurrency = ref([])
const catPaymentMedium = ref([])
const catBusinessEntity = ref([])
const catFinancialEntity = ref([])
const allBankAccounts = ref([])

function mapCatalog(alias) {
  const items = catalog.options(alias)
  return items.map(i => ({
    id: i.id ?? i.raw?.id ?? i.raw?.catalogo_id,
    description: i.description ?? i.raw?.abbreviation ?? i.raw?.description ?? i.alias,
    abbreviation: i.raw?.abbreviation || '',
    alias: i.alias
  }))
}

async function loadCatalogs() {
  await catalog.ensureLoaded()
  catCurrency.value = mapCatalog('we_currency')
  catPaymentMedium.value = mapCatalog('we_payment_medium')
  catBusinessEntity.value = mapCatalog('we_business_entity')
  catFinancialEntity.value = mapCatalog('we_financial_entity')
  try {
    allBankAccounts.value = await ficoService.getBankAccounts()
  } catch (err) { console.error('Error cargando cuentas:', err) }
}

const viewMode = ref('compact')

// Collapsible column groups (expanded view)
const CG_KEY = 'fico_col_groups_v1'
const cg = reactive({ identity: true, profile: true, program: true, finance: true, installments: true })
try {
  const saved = localStorage.getItem(CG_KEY)
  if (saved) { const p = JSON.parse(saved); Object.keys(cg).forEach(k => { if (typeof p[k] === 'boolean') cg[k] = p[k] }) }
} catch {}
watch(cg, val => localStorage.setItem(CG_KEY, JSON.stringify({ ...val })), { deep: true })

const expandedColCount = computed(() => 1 + (cg.identity ? 4 : 1) + (cg.profile ? 5 : 1) + (cg.program ? 4 : 1) + (cg.finance ? 16 : 1) + (cg.installments ? 48 : 1))

const uniqueAgents = computed(() => [...new Set(enrollments.value.map(e => e.seller_agent_name).filter(Boolean))].sort())
const uniqueEstados = computed(() => [...new Set(enrollments.value.map(e => e.confirmation || 'Pendiente').filter(Boolean))].sort())

// Inline column filters (local, client-side)
const colFilters = reactive({ alumno: '', programa: '', agente: null, estado: null })
function clearColFilters() { Object.assign(colFilters, { alumno: '', programa: '', agente: null, estado: null }) }

const filteredEnrollments = computed(() => {
  let list = enrollments.value
  const has = v => v && v.trim().length > 0
  if (has(colFilters.alumno)) {
    const q = colFilters.alumno.toLowerCase()
    list = list.filter(e => (e.student_full_name || '').toLowerCase().includes(q) || (e.document_number || '').includes(q))
  }
  if (has(colFilters.programa)) {
    const q = colFilters.programa.toLowerCase()
    list = list.filter(e => (e.program_name || '').toLowerCase().includes(q) || (e.edition_code || '').toLowerCase().includes(q))
  }
  if (colFilters.agente) {
    list = list.filter(e => (e.seller_agent_name || '') === colFilters.agente)
  }
  if (colFilters.estado) {
    list = list.filter(e => (e.confirmation || 'Pendiente') === colFilters.estado)
  }
  return list
})

// Detail modal
const showDetailModal = ref(false)
const loadingDetail = ref(false)
const selectedEnrollment = ref(null)
const selectedDetail = ref({ installments: [], payment_history: [] })

// Modal mode: 'confirm' (pendiente) vs 'view' (aprobado)
const modalMode = computed(() => {
  const s = (selectedEnrollment.value?.confirmation || selectedEnrollment.value?.student_status || '').toLowerCase()
  if (s.includes('aprob') || s.includes('confirm')) return 'view'
  return 'confirm'
})

// Edit mode (dentro del modal view)
const isEditing = ref(false)
const justificacion = ref('')
const savingEdit = ref(false)

// Reprogramacion de edicion
const isReprogramming = ref(false)
const reprogramEditionId = ref(null)
const reprogramJustificacion = ref('')
const reprogramEditions = ref([])
const loadingEditions = ref(false)
const savingReprogram = ref(false)

async function startReprogramming () {
  isReprogramming.value = true
  reprogramEditionId.value = null
  reprogramJustificacion.value = ''
  reprogramEditions.value = []
  const eid = Number(selectedEnrollment.value.enrollment_id)
  loadingEditions.value = true
  try {
    const items = await ficoService.getAvailableEditions(eid)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    reprogramEditions.value = (items || [])
      .filter(e => e.start_date && new Date(e.start_date) >= today)
      .map(e => ({
        id: e.edition_num_id || e.id,
        label: `${new Date(e.start_date).toLocaleDateString('es-PE')} — ${e.global_code || e.edition_code || ''}`
      }))
  } catch (err) { console.error('Error cargando ediciones:', err) }
  finally { loadingEditions.value = false }
}

function cancelReprogramming () {
  isReprogramming.value = false
  reprogramEditionId.value = null
  reprogramJustificacion.value = ''
  reprogramEditions.value = []
}

async function handleReprogram () {
  if (!reprogramEditionId.value || !reprogramJustificacion.value.trim()) return
  savingReprogram.value = true
  try {
    const eid = Number(selectedEnrollment.value.enrollment_id)
    await ficoService.reprogramEdition({
      enrollment_id: eid,
      new_edition_id: reprogramEditionId.value,
      justificacion: reprogramJustificacion.value.trim()
    })
    toast.success('Edicion reprogramada correctamente.')
    cancelReprogramming()
    const response = await ficoService.getPaymentDetail(eid)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    ficoService.getAuditLog(eid).then(r => { auditLog.value = r || [] }).catch(() => {})
    fetchEnrollments()
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al reprogramar edicion.')
  } finally { savingReprogram.value = false }
}

// Cambio de curso (CC)
const isCourseChanging = ref(false)
const ccProgramVersionId = ref(null)
const ccEditionId = ref(null)
const ccTotalAmount = ref(0)
const ccJustificacion = ref('')
const ccProgramsList = ref([])
const ccEditionsList = ref([])
const ccEditionListPrice = ref(0)
const ccLoadingEditions = ref(false)
const savingCC = ref(false)
const ccForm = reactive({
  cat_currency: null,
  cat_method_payment: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: '',
  ticket_payment_urls: []
})

const ccPagado = computed(() => {
  const e = selectedEnrollment.value
  if (!e) return Number(selectedDetail.value?.amount_paid) || 0
  return Number(e.total_to_pay) || 0
})

const ccDiferencia = computed(() => {
  return Math.max(0, ccEditionListPrice.value - ccPagado.value)
})

async function startCourseChange () {
  isCourseChanging.value = true
  ccProgramVersionId.value = null
  ccEditionId.value = null
  ccTotalAmount.value = 0
  ccJustificacion.value = ''
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  ccForm.cat_currency = selectedDetail.value?.cat_currency_id || null
  ccForm.cat_method_payment = null
  ccForm.cat_business_entity = null
  ccForm.bank_account_id = null
  ccForm.transaction_code = ''
  try {
    const items = await programService.programVersionCaller({ active: 'Y' })
    ccProgramsList.value = (items || []).map(p => ({
      ...p,
      program_version_id: p.program_version_id || p.id,
      label: `${p.abbreviation || ''} — ${p.version_code || ''}`
    }))
  } catch (err) { console.error('Error cargando programas:', err) }
}

async function onCCProgramChange () {
  ccEditionId.value = null
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  ccTotalAmount.value = 0
  if (!ccProgramVersionId.value) return
  ccLoadingEditions.value = true
  try {
    const items = await editionService.editionCaller({ program_version_id: ccProgramVersionId.value })
    const today = new Date(); today.setHours(0, 0, 0, 0)
    ccEditionsList.value = (items || [])
      .filter(e => e.start_date && new Date(e.start_date) >= today)
      .map(e => ({
        ...e,
        id: e.edition_num_id || e.id,
        label: `${new Date(e.start_date).toLocaleDateString('es-PE')} — ${e.global_code || e.edition_code || ''}`
      }))
  } catch (err) { console.error('Error cargando ediciones CC:', err) }
  finally { ccLoadingEditions.value = false }
}

function onCCEditionChange () {
  const ed = ccEditionsList.value.find(e => e.id === ccEditionId.value)
  ccEditionListPrice.value = Number(ed?.list_price || 0)
  ccTotalAmount.value = Math.max(0, ccEditionListPrice.value - ccPagado.value)
}

function cancelCourseChange () {
  isCourseChanging.value = false
  ccProgramVersionId.value = null
  ccEditionId.value = null
  ccTotalAmount.value = 0
  ccJustificacion.value = ''
  ccProgramsList.value = []
  ccEditionsList.value = []
  ccEditionListPrice.value = 0
  Object.assign(ccForm, { cat_currency: null, cat_method_payment: null, cat_business_entity: null, bank_account_id: null, transaction_code: '', ticket_payment_urls: [] })
}

async function handleCourseChange () {
  if (!ccProgramVersionId.value || !ccEditionId.value || !ccJustificacion.value.trim()) return
  savingCC.value = true
  try {
    const eid = Number(selectedEnrollment.value.enrollment_id)
    await ficoService.courseChange({
      enrollment_id: eid,
      new_program_version_id: ccProgramVersionId.value,
      new_edition_id: ccEditionId.value,
      total_amount: ccTotalAmount.value,
      justificacion: ccJustificacion.value.trim(),
      cat_currency: ccForm.cat_currency,
      cat_method_payment: ccForm.cat_method_payment,
      cat_business_entity: ccForm.cat_business_entity,
      bank_account_id: ccForm.bank_account_id,
      transaction_code: ccForm.transaction_code,
      ticket_payment_urls: (ccForm.ticket_payment_urls || []).map(f => ({ url: f.url || f, name: f.name || 'Comprobante', type: f.type || null }))
    })
    toast.success('Cambio de curso realizado correctamente.')
    cancelCourseChange()
    showDetailModal.value = false
    fetchEnrollments()
  } catch (err) {
    console.error(err)
    toast.error(err?.response?.data?.error || 'Error al realizar el cambio de curso.')
  } finally { savingCC.value = false }
}

// Audit log
const auditLog = ref([])
const modalTab = ref('detalle') // 'detalle' | 'historial'

// FICO confirmation form
const confirmingPayment = ref(false)
const ficoForm = reactive({
  cat_currency: null,
  cat_payment_medium: null,
  cat_business_entity: null,
  bank_account_id: null,
  transaction_code: ''
})

function resetFicoForm() {
  ficoForm.cat_currency = null
  ficoForm.cat_payment_medium = null
  ficoForm.cat_business_entity = null
  ficoForm.bank_account_id = null
  ficoForm.transaction_code = ''
}

const cuotaTab = ref('inicial')

const modalIsContado = computed(() => {
  return selectedEnrollment.value ? isContado(selectedEnrollment.value) : true
})

const modalInstallments = ref([])

function buildInstallments() {
  const inst = selectedDetail.value?.installments || []
  modalInstallments.value = inst.map(i => ({
    ...i,
    status: resolveInstallmentStatus(i),
    _cat_currency: i.cat_currency || null,
    _cat_payment_medium: i.cat_payment_medium || null,
    _cat_business_entity: i.cat_business_entity || null,
    _bank_account_id: i.bank_account_id || null,
    _transaction_code: i.transaction_code || '',
    _voucher_url: i.evidence_url || null,
    _isNew: false
  }))
}

const modalInicial = computed(() => {
  return modalInstallments.value.find(i => i.installment_number === 0 || i.is_reserva) || null
})

const modalCuotas = computed(() => {
  return modalInstallments.value.filter(i => i.installment_number !== 0 && !i.is_reserva)
})

function addCuota() {
  const nextNum = modalCuotas.value.length + 1
  modalInstallments.value.push({
    installment_number: nextNum,
    amount: 0,
    due_date: '',
    status: 'pending',
    _currency_type: '',
    _payment_medium: '',
    _business_entity: '',
    _cat_currency: null,
    _cat_payment_medium: null,
    _cat_business_entity: null,
    _bank_account_id: null,
    _transaction_code: '',
    _voucher_url: null,
    _isNew: true
  })
}

function canDeleteCuota(c) {
  if (c.status === 'paid') return false
  if (planStatus.value === 'borrador') return true
  if (c._isNew) return true
  return false
}

function removeCuota(idx) {
  const cuota = modalCuotas.value[idx]
  const realIdx = modalInstallments.value.indexOf(cuota)
  if (realIdx !== -1) modalInstallments.value.splice(realIdx, 1)
}

function resolveInstallmentStatus(i) {
  const alias = i.status_alias || ''
  if (alias.includes('paid')) return 'paid'
  if (alias.includes('pending')) return 'pending'
  return 'draft'
}

const planStatus = computed(() => {
  const conf = (selectedEnrollment.value?.confirmation || '').toLowerCase()
  if (conf.includes('confirm') || conf.includes('aprob')) return 'pendiente'
  return 'borrador'
})

const cuotasTotal = computed(() => {
  return modalCuotas.value.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
})

function filteredAccounts(entityId) {
  if (!entityId) return []
  return allBankAccounts.value.filter(a => a.business_entity_catalog_id === entityId)
}

const contadoAccounts = computed(() => filteredAccounts(ficoForm.cat_business_entity))

const canConfirmContado = computed(() => {
  return ficoForm.cat_currency && ficoForm.cat_payment_medium
})

function cuotaRowClass(c) {
  if (c.status === 'paid') return 'row-green'
  if (c.status === 'pending' && isOverdue(c.due_date)) return 'row-red'
  if (c.status === 'draft') return 'row-draft'
  return ''
}

function cuotaStatusPill(c) {
  if (c.status === 'paid') return 'pill-green'
  if (c.status === 'pending') return 'pill-amber'
  return 'pill-slate'
}

function cuotaStatusLabel(c) {
  if (c.status === 'paid') return 'Pagado'
  if (c.status === 'pending') return 'Pendiente'
  return 'Borrador'
}

async function handleConfirmPayment() {
  if (!canConfirmContado.value || confirmingPayment.value) return
  confirmingPayment.value = true
  try {
    const enrollmentId = Number(selectedEnrollment.value.enrollment_id)
    await ficoService.confirmPayment({
      enrollment_id: enrollmentId,
      action: 'confirm_contado',
      cat_currency: ficoForm.cat_currency,
      cat_payment_medium: ficoForm.cat_payment_medium,
      cat_business_entity: ficoForm.cat_business_entity,
      bank_account_id: ficoForm.bank_account_id,
      transaction_code: ficoForm.transaction_code
    })
    const odoo = await ficoService.enrollInOdoo(enrollmentId)
    if (odoo?.error) {
      toast.warning('Pago registrado, pero no se pudo inscribir en Odoo: ' + odoo.error, { timeout: 6000 })
    } else {
      toast.success('Pago registrado e inscripcion en Odoo completada.', { timeout: 4000 })
    }
    const emailResult = await ficoService.sendConfirmationEmail(enrollmentId)
    if (emailResult?.success) {
      toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
    } else if (emailResult?.error) {
      toast.warning('No se pudo enviar el correo: ' + emailResult.error, { timeout: 5000 })
    }
    showDetailModal.value = false
    fetchEnrollments()
  } catch (err) {
    console.error('Error confirmando pago:', err)
    toast.error('Error al confirmar el pago.')
  } finally { confirmingPayment.value = false }
}

async function handleConfirmPlan() {
  if (confirmingPayment.value) return
  confirmingPayment.value = true
  try {
    const keepInstallments = modalInstallments.value.map(c => ({
      installment_id: c.installment_id || null,
      installment_number: c.installment_number,
      amount: Number(c.amount) || 0,
      due_date: c.due_date || null,
      is_new: c._isNew || false
    }))
    const enrollmentId = Number(selectedEnrollment.value.enrollment_id)
    await ficoService.confirmPayment({
      enrollment_id: enrollmentId,
      action: 'confirm_plan',
      installments: keepInstallments
    })
    const odoo = await ficoService.enrollInOdoo(enrollmentId)
    if (odoo?.error) {
      toast.warning('Plan confirmado, pero no se pudo inscribir en Odoo: ' + odoo.error, { timeout: 6000 })
    } else {
      toast.success('Plan de cuotas confirmado e inscripcion en Odoo completada.', { timeout: 4000 })
    }
    const emailResult = await ficoService.sendConfirmationEmail(enrollmentId)
    if (emailResult?.success) {
      toast.info('Correo de confirmacion enviado al estudiante.', { timeout: 4000 })
    } else if (emailResult?.error) {
      toast.warning('No se pudo enviar el correo: ' + emailResult.error, { timeout: 5000 })
    }
    const response = await ficoService.getPaymentDetail(enrollmentId)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    buildInstallments()
    fetchEnrollments()
  } catch (err) {
    console.error('Error confirmando plan:', err)
    toast.error('Error al confirmar el plan.')
  } finally { confirmingPayment.value = false }
}

async function handleSaveCuotasData() {
  if (confirmingPayment.value) return
  confirmingPayment.value = true
  try {
    const allInst = [...(modalInicial.value ? [modalInicial.value] : []), ...modalCuotas.value]
    const installments = allInst
      .filter(c => c.status !== 'paid')
      .map(c => ({
        installment_id: c.installment_id || null,
        installment_number: c.installment_number,
        amount: Number(c.amount) || 0,
        due_date: c.due_date || null,
        cat_currency: c._cat_currency,
        cat_payment_medium: c._cat_payment_medium,
        cat_business_entity: c._cat_business_entity,
        bank_account_id: c._bank_account_id,
        transaction_code: c._transaction_code,
        is_new: c._isNew || false
      }))
    const eid = Number(selectedEnrollment.value.enrollment_id)
    await ficoService.confirmPayment({
      enrollment_id: eid,
      action: 'update_installments_data',
      installments
    })
    toast.success('Datos financieros guardados correctamente.', { timeout: 3000 })
    ficoService.sendPaymentConfirmationEmail(eid).then(r => {
      if (r?.success) toast.info('Correo de confirmacion de cuota enviado.', { timeout: 4000 })
    }).catch(() => {})
    ficoService.syncInstallmentPayment(eid).then(r => {
      if (r?.success) toast.info('Cuota sincronizada con Odoo.', { timeout: 4000 })
    }).catch(() => {})
    const response = await ficoService.getPaymentDetail(eid)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    buildInstallments()
    fetchEnrollments()
  } catch (err) {
    console.error('Error guardando datos:', err)
    toast.error('Error al guardar los datos financieros.')
  } finally { confirmingPayment.value = false }
}

async function openDetail(enrollment) {
  selectedEnrollment.value = enrollment
  resetFicoForm()
  cuotaTab.value = 'inicial'
  isEditing.value = false
  justificacion.value = ''
  cancelReprogramming()
  cancelCourseChange()
  modalTab.value = 'detalle'
  auditLog.value = []
  showDetailModal.value = true
  loadingDetail.value = true
  try {
    const response = await ficoService.getPaymentDetail(Number(enrollment.enrollment_id))
    selectedDetail.value = response || { installments: [], payment_history: [] }
  } catch (err) {
    console.error('Error cargando detalle:', err)
    selectedDetail.value = { installments: [], payment_history: [] }
  } finally {
    loadingDetail.value = false
    buildInstallments()
  }
  ficoService.getAuditLog(Number(enrollment.enrollment_id)).then(r => { auditLog.value = r || [] }).catch(() => {})
}

function startEditing () {
  const p = lastPayment.value
  ficoForm.cat_currency = selectedDetail.value?.cat_currency_id || null
  ficoForm.cat_payment_medium = p?.cat_payment_medium_id || null
  ficoForm.cat_business_entity = p?.cat_business_entity_id || null
  ficoForm.bank_account_id = p?.bank_account_id || null
  ficoForm.transaction_code = p?.transaction_code || ''
  isEditing.value = true
}

async function handleSaveEdit () {
  if (!justificacion.value.trim()) { toast.error('Debes ingresar una justificacion para guardar cambios.'); return }
  savingEdit.value = true
  try {
    const eid = Number(selectedEnrollment.value.enrollment_id)
    const fields = {}
    if (ficoForm.cat_payment_medium) fields.cat_payment_medium = ficoForm.cat_payment_medium
    if (ficoForm.cat_business_entity) fields.cat_business_entity = ficoForm.cat_business_entity
    if (ficoForm.bank_account_id) fields.bank_account_id = ficoForm.bank_account_id
    if (ficoForm.transaction_code) fields.transaction_code = ficoForm.transaction_code
    if (ficoForm.cat_currency) fields.cat_currency = ficoForm.cat_currency
    fields.notes = selectedDetail.value?.notes || null

    await ficoService.enrollmentUpdate({
      enrollment_id: eid,
      justificacion: justificacion.value.trim(),
      fields
    })
    toast.success('Cambios guardados correctamente.')
    isEditing.value = false
    justificacion.value = ''
    const response = await ficoService.getPaymentDetail(eid)
    selectedDetail.value = response || { installments: [], payment_history: [] }
    ficoService.getAuditLog(eid).then(r => { auditLog.value = r || [] }).catch(() => {})
    fetchEnrollments()
  } catch (err) {
    console.error(err)
    toast.error('Error al guardar cambios.')
  } finally { savingEdit.value = false }
}

function isOverdue(d) { return d ? new Date(d) < new Date() : false }

const isInstallmentPlan = computed(() => {
  const inst = selectedDetail.value?.installments
  return inst && inst.length > 1
})

const showDiscountTip = ref(false)

const modalListPrice = computed(() => {
  return Number(selectedEnrollment.value?.list_price) || Number(selectedDetail.value?.list_price) || 0
})

const modalDescuento = computed(() => {
  return Number(selectedEnrollment.value?.total_discounted) || Number(selectedDetail.value?.discount_amount) || 0
})

const modalTotal = computed(() => {
  return Number(selectedEnrollment.value?.total_to_pay) || Number(selectedDetail.value?.net_amount) || 0
})

const modalPagado = computed(() => {
  const e = selectedEnrollment.value
  if (!e) return Number(selectedDetail.value?.amount_paid) || 0
  return getPagado(e)
})

const modalSaldo = computed(() => {
  const e = selectedEnrollment.value
  if (!e) return Number(selectedDetail.value?.balance_due) || 0
  return calcSaldo(e)
})

const modalVoucher = computed(() => {
  return selectedEnrollment.value?.payment_vouchers || null
})

const modalDiscountLines = computed(() => {
  const e = selectedEnrollment.value
  if (!e) return []
  const lines = []
  if (e.main_discount) lines.push(e.main_discount)
  if (e.additional_discounts) lines.push(e.additional_discounts)
  return lines
})

const modalOccupation = computed(() => {
  const val = selectedEnrollment.value?.occupation_label || ''
  const map = { 'P': 'Profesional', 'E': 'Estudiante' }
  return map[val] || val || '---'
})

const modalAdditionalInfo = computed(() => {
  return selectedEnrollment.value?.additional_info || null
})

// State
const enrollments = ref([])
const showFilterModal = ref(false)
const pagin = ref({ size: 25, page: 1, total: 0 })

const filters = reactive({
  q: '', order_by: 0,
  enrollment_status_ids: [], seller_agent_ids: [],
  type_program_ids: [], model_modality_ids: [],
  payment_channel_ids: [],
  date_from: null, date_to: null, created_range_string: null,
  edition_start_from: null, edition_start_to: null, edition_range_string: null
})

const filtroStatus = ref(catalog.options('we_enrollment_status') || [])
const filtroTiposPrograma = ref(catalog.options('we_program_type') || [])
const filtroModalidad = ref(catalog.options('we_modality') || [])
const filtroPaymentChannel = ref(catalog.options('we_payment_channel') || [])
const filtroOwners = ref([])
const activeFilterChips = ref([])
const filtroOrden = ref([{ value: 0, description: 'Mas recientes' }, { value: 1, description: 'Inicio de Edicion' }])

const { saveState } = useTablePersistence('fico_enrollments_state_v3', filters, pagin)

function getLabels(items) {
  if (!items || items.length === 0) return []
  if (typeof items[0] === 'object') return items.map(i => i.description || i.label || i.abbreviation || String(i.id))
  return items.map(String)
}

async function fetchEnrollments() {
  try {
    const params = { page: pagin.value.page, size: pagin.value.size }
    if (filters.q) params.q = filters.q
    if (filters.order_by) params.order_by = filters.order_by
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.edition_start_from) params.edition_start_from = filters.edition_start_from
    if (filters.edition_start_to) params.edition_start_to = filters.edition_start_to

    const tf = (arr, key) => { const labels = getLabels(arr); if (labels.length) params[key] = labels }
    tf(filters.enrollment_status_ids, 'student_statuses')
    tf(filters.seller_agent_ids, 'advisors')
    tf(filters.type_program_ids, 'program_types')
    tf(filters.model_modality_ids, 'modalities')
    tf(filters.payment_channel_ids, 'payment_channels')

    const { items, total } = await ficoService.enrollmentList(params)
    enrollments.value = items || []
    pagin.value.total = Number(total || 0)
    rebuildChips()
  } catch (err) { console.error(err); enrollments.value = [] }
}

function handlePaginationChange() { saveState(); fetchEnrollments() }
function openFilterModal() { showFilterModal.value = true }
function applyFilters() { showFilterModal.value = false; pagin.value.page = 1; saveState(); fetchEnrollments() }

function handleDateChange(dateStr, type) {
  if (!dateStr) { if (type === 'created') { filters.date_from = null; filters.date_to = null } if (type === 'edition') { filters.edition_start_from = null; filters.edition_start_to = null } return }
  const p = dateStr.split(' to ')
  if (type === 'created') { filters.date_from = p[0] || null; filters.date_to = p[1] || p[0] || null }
  if (type === 'edition') { filters.edition_start_from = p[0] || null; filters.edition_start_to = p[1] || p[0] || null }
}

function rebuildChips() {
  const chips = []
  const mc = (key, lbl, items) => { if (!items || !items.length) return; const ls = items.map(i => i.label || i.description || i.abbreviation || i.value || i); chips.push({ key, label: ls.length === 1 ? `${lbl}: ${ls[0]}` : `${lbl}: ${ls.length} sel.`, text: `${lbl}: ${ls.join(', ')}`, details: ls }) }
  if (filters.q) chips.push({ key: 'q', text: `Busqueda: ${filters.q}`, label: `Busqueda: ${filters.q}` })
  mc('enrollment_status_ids', 'Estado', filters.enrollment_status_ids)
  mc('seller_agent_ids', 'Asesor', filters.seller_agent_ids)
  mc('type_program_ids', 'Tipo', filters.type_program_ids)
  mc('model_modality_ids', 'Modalidad', filters.model_modality_ids)
  mc('payment_channel_ids', 'Canal', filters.payment_channel_ids)
  if (filters.created_range_string) chips.push({ key: 'created_range', text: `Registro: ${filters.created_range_string}`, label: `Registro: ${filters.created_range_string}` })
  if (filters.edition_range_string) chips.push({ key: 'edition_range', text: `Inicio: ${filters.edition_range_string}`, label: `Inicio: ${filters.edition_range_string}` })
  activeFilterChips.value = chips
}

function clearFilter(key) {
  const ak = ['enrollment_status_ids','seller_agent_ids','type_program_ids','model_modality_ids','payment_channel_ids']
  if (key === 'q') filters.q = ''
  else if (key === 'created_range') { filters.date_from = null; filters.date_to = null; filters.created_range_string = null }
  else if (key === 'edition_range') { filters.edition_start_from = null; filters.edition_start_to = null; filters.edition_range_string = null }
  else if (ak.includes(key)) filters[key] = []
  applyFilters()
}

function clearFilters() {
  Object.assign(filters, { q: '', order_by: 0, enrollment_status_ids: [], seller_agent_ids: [], type_program_ids: [], model_modality_ids: [], payment_channel_ids: [], date_from: null, date_to: null, created_range_string: null, edition_start_from: null, edition_start_to: null, edition_range_string: null })
  pagin.value.page = 1; saveState(); fetchEnrollments()
}

async function loadOwners() {
  try {
    const arr = await authService.userList({})
    filtroOwners.value = arr.map(u => { const f = (u.first_name||'').trim(), l = (u.last_name||'').trim(); let n = f; if (l) n += ` ${l.charAt(0)}.`; return { id: u.user_id, description: n.trim() || `Usuario ${u.user_id}` } })
  } catch (e) { console.error(e) }
}

function goNew() { router.push({ name: 'enrollmentForm' }) }

const formatMoney = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
const formatDate = v => {
  if (!v) return '—'
  const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[1]}/${m[2]}/${m[3]}`
  const d = new Date(v)
  return isNaN(d) ? '—' : d.toLocaleDateString('es-PE')
}
const formatDateTime = v => {
  if (!v) return '—'
  const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/)
  if (m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}`
  const m2 = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`
  const d = new Date(v)
  if (!isNaN(d)) return d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + d.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })
  return String(v)
}
const statusPill = s => { if (!s) return 'pill-amber'; const sl = s.toLowerCase(); if (sl.includes('confirm') || sl.includes('aprob')) return 'pill-green'; if (sl.includes('rechaz') || sl.includes('anula')) return 'pill-red'; return 'pill-amber' }

function isPendiente(e) {
  const s = (e.confirmation || '').toLowerCase()
  return !s || s.includes('pendiente')
}

function isContado(e) {
  return e.payment_type === 'PT'
}

function getPagado(e) {
  if (isPendiente(e)) return 0
  return Number(e.total_to_pay) || 0
}

function calcSaldo(e) {
  if (isContado(e)) return 0
  const total = Number(e.total_to_pay) || 0
  return total - getPagado(e)
}

function rowClass(e) {
  const saldo = calcSaldo(e)
  if (saldo <= 0) return 'row-green'
  const total = Number(e.total_to_pay) || 1
  return (saldo / total) < 0.5 ? 'row-amber' : 'row-red'
}

const lastPayment = computed(() => {
  const hist = selectedDetail.value?.payment_history
  if (!hist || !Array.isArray(hist) || !hist.length) return null
  return hist[0]
})

function auditIcon (action) {
  const map = { created: 'fa-solid fa-circle-plus', approved: 'fa-solid fa-circle-check', edited: 'fa-solid fa-pen', odoo_enrolled: 'fa-solid fa-graduation-cap', email_sent: 'fa-solid fa-envelope', edition_reprogrammed: 'fa-solid fa-calendar-xmark', course_changed: 'fa-solid fa-right-left', created_from_cc: 'fa-solid fa-right-to-bracket' }
  return map[action] || 'fa-solid fa-circle-info'
}
function auditLabel (action) {
  const map = { created: 'Inscripcion creada', approved: 'Pago aprobado', edited: 'Datos editados', odoo_enrolled: 'Inscrito en Odoo', email_sent: 'Correo enviado', edition_reprogrammed: 'Edicion reprogramada', course_changed: 'Cambio de curso', created_from_cc: 'Creado por cambio de curso' }
  return map[action] || action
}

onMounted(() => { loadOwners(); fetchEnrollments(); loadCatalogs() })
</script>

<style scoped>
/* ================================================
   FICO ENROLLMENT
   ================================================ */
.shell { display: flex; flex-direction: column; min-height: 100vh; background: #f8fafc; }

/* MASTHEAD */
.masthead { position: sticky; top: 0; z-index: 100; display: flex; justify-content: space-between; align-items: center; padding: 14px 24px; background: #0f172a; border-bottom: 1px solid rgba(255,255,255,.06); }
.mh-left { display: flex; align-items: center; gap: 14px; }
.mh-rule { width: 4px; height: 36px; border-radius: 2px; background: #14b8a6; }
.mh-eyebrow { display: block; font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #14b8a6; }
.mh-title { margin: 0; font-size: 17px; font-weight: 700; color: #f1f5f9; letter-spacing: -.02em; }
.mh-right { display: flex; align-items: center; gap: 10px; }

.view-toggle { display: flex; background: rgba(255,255,255,.07); border-radius: 6px; padding: 3px; gap: 2px; }
.vt-btn { border: none; background: transparent; padding: 6px 12px; border-radius: 4px; cursor: pointer; color: #94a3b8; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 5px; transition: all .15s; }
.vt-btn:hover { color: #e2e8f0; }
.vt-btn.active { background: rgba(255,255,255,.12); color: #fff; }

.btn-exec { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: #14b8a6; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s; }
.btn-exec:hover { background: #0d9488; }
.btn-ghost { display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px; background: #fff; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .15s; }
.btn-ghost:hover { background: #f8fafc; border-color: #94a3b8; }

/* BODY */
.body { flex: 1; padding: 20px 24px; }
.toolbar { margin-bottom: 12px; }

/* TABLE */
.tbl-wrap { background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.02); border: 1px solid #e2e8f0; }
.tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; color: #334155; }
.thead-sub th { background: #fafbfc; padding: 10px 12px; text-align: left; font-weight: 600; color: #64748b; border-bottom: 2px solid #e2e8f0; font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }

/* Inline filter row */
.thead-filter { background: #f0f4f8; }
.thead-filter td { padding: 6px 8px; border-bottom: 2px solid #14b8a6; }
.hf-input { width: 100%; height: 28px; padding: 0 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px; color: #334155; background: #fff; transition: border-color .15s; }
.hf-input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20,184,166,.1); }
.hf-input::placeholder { color: #94a3b8; }
.hf-select { width: 100%; height: 28px; padding: 0 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px; color: #334155; background: #fff; cursor: pointer; transition: border-color .15s; appearance: auto; }
.hf-select:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20,184,166,.1); }
.hf-clear { width: 28px; height: 28px; border: 1px solid #fecaca; background: #fff; border-radius: 4px; cursor: pointer; color: #ef4444; font-size: 10px; display: inline-flex; align-items: center; justify-content: center; transition: all .15s; }
.hf-clear:hover { background: #fef2f2; }

.tbody-row td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.tbody-row:hover td { background: rgba(248,250,252,.6); }
.tbody-row:last-child td { border-bottom: none; }

/* Row status */
.row-green { border-left: 3px solid #10b981; }
.row-green td:first-child { padding-left: 9px; }
.row-amber { border-left: 3px solid #f59e0b; }
.row-amber td:first-child { padding-left: 9px; }
.row-red { border-left: 3px solid #ef4444; }
.row-red td:first-child { padding-left: 9px; }

/* Action buttons group */
.act-group { display: inline-flex; gap: 6px; }
.act-btn { width: 28px; height: 28px; border: 1px solid #e2e8f0; background: #fff; border-radius: 5px; cursor: pointer; color: #64748b; font-size: 11px; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; }
.act-btn:hover { background: #f0f9ff; border-color: #93c5fd; color: #2563eb; }
.act-btn.act-green:hover { background: #ecfdf5; border-color: #86efac; color: #059669; }
.act-btn-sm { width: 24px; height: 24px; border: 1px solid #e2e8f0; background: #fff; border-radius: 4px; cursor: pointer; color: #64748b; font-size: 10px; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; }
.act-btn-sm:hover { background: #f0f9ff; border-color: #93c5fd; color: #2563eb; }
.act-btn-sm.act-green:hover { background: #ecfdf5; border-color: #86efac; color: #059669; }
.act-btn.act-teal, .act-btn-sm.act-teal { border-color: #99f6e4; color: #0d9488; }
.act-btn.act-teal:hover, .act-btn-sm.act-teal:hover { background: #f0fdfa; border-color: #5eead4; color: #0f766e; }

/* Cells */
.cell-primary { font-weight: 700; color: #0f172a; font-size: 12.5px; line-height: 1.3; }
.cell-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.cell-secondary { color: #94a3b8; font-size: 11px; margin-top: 1px; }
.cell-sm { font-size: 12px; color: #475569; }
.cell-date { font-size: 11px; color: #64748b; }
.cell-date-sm { font-size: 11px; color: #64748b; white-space: nowrap; }
.cell-prog { font-size: 11.5px; color: #334155; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Pills */
.pill { display: inline-flex; align-items: center; justify-content: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .01em; white-space: nowrap; }
.pill-sm { padding: 2px 6px; font-size: 10px; }
.pill-slate { background: #f1f5f9; color: #64748b; }
.pill-green { background: #ecfdf5; color: #065f46; }
.pill-amber { background: #fffbeb; color: #92400e; }
.pill-blue { background: #eff6ff; color: #1e40af; }
.pill-red { background: #fef2f2; color: #991b1b; }
.pill-teal { background: #f0fdfa; color: #115e59; }

/* ========== EXPANDED TABLE ========== */
.exp-wrap { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.exp-scroll { width: 100%; overflow-x: auto; max-height: 74vh; overflow-y: auto; }

.tbl-exp { width: max-content; border-collapse: collapse; font-size: 11.5px; color: #334155; }
.tbl-exp th, .tbl-exp td { padding: 7px 8px; white-space: nowrap; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f8fafc; vertical-align: middle; }
.tbl-exp .tbody-row:hover td { background: rgba(248,250,252,.6); }
.tbl-exp .tbody-row:nth-child(even) td { background: #fcfcfe; }
.tbl-exp .tbody-row:nth-child(even):hover td { background: #f5f7ff; }

/* Group headers */
.grp-row th { text-align: center; font-size: 9.5px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; padding: 7px 8px; border-bottom: 2px solid; cursor: pointer; user-select: none; transition: opacity .15s; }
.grp-row th:hover { opacity: .85; }
.grp-actions { background: #0f172a; color: #94a3b8; border-color: #334155 !important; cursor: default !important; }
.grp-identity { background: #0c4a6e; color: #bae6fd; border-color: #0284c7 !important; }
.grp-profile { background: #4c1d95; color: #ddd6fe; border-color: #7c3aed !important; }
.grp-program { background: #064e3b; color: #a7f3d0; border-color: #059669 !important; }
.grp-finance { background: #78350f; color: #fde68a; border-color: #d97706 !important; }
.grp-installments { background: #7f1d1d; color: #fecaca; border-color: #dc2626 !important; }

/* Collapsible group label */
.tg-label { display: flex; align-items: center; justify-content: center; gap: 6px; }
.tg-icon { font-size: 10px; opacity: .7; }
.tg-chev { font-size: 8px; opacity: .6; }

/* Collapsed state */
.tg-collapsed { width: 36px !important; min-width: 36px !important; max-width: 36px !important; }
.tg-collapsed .tg-text { writing-mode: vertical-rl; text-orientation: mixed; font-size: 9px; max-height: 80px; overflow: hidden; }
.tg-collapsed .tg-label { flex-direction: column; padding: 6px 2px; gap: 4px; }

/* Sub headers */
.sub-row th { background: #fafbfc; font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; padding: 7px 8px; border-bottom: 2px solid #e2e8f0; }
.hd-id { background: #f0f9ff !important; }
.hd-pf { background: #faf5ff !important; }
.hd-pg { background: #f0fdf4 !important; }
.hd-fn { background: #fffbeb !important; }
.hd-qt { background: #fff5f5 !important; }
.tg-ph { width: 36px !important; min-width: 36px !important; max-width: 36px !important; padding: 0 !important; background: #fafbfc !important; }

/* Placeholder cells in body */
.tg-ph-cell { width: 36px !important; min-width: 36px !important; max-width: 36px !important; padding: 0 !important; border: none !important; background: transparent !important; }
.tg-hint { display: flex; align-items: center; justify-content: center; width: 28px; height: 100%; min-height: 28px; margin: 0 auto; border-radius: 3px; font-size: 10px; opacity: .45; }
.tg-hint-id { color: #0284c7; background: #f0f9ff; }
.tg-hint-pf { color: #7c3aed; background: #faf5ff; }
.tg-hint-pg { color: #059669; background: #f0fdf4; }
.tg-hint-fn { color: #d97706; background: #fffbeb; }
.tg-hint-qt { color: #dc2626; background: #fff5f5; }

/* Sticky */
.sticky-col { position: sticky; z-index: 2; background: #fff; }
.sticky-head { position: sticky; z-index: 3; }
.sc-0 { left: 0; min-width: 36px; }
.sc-1 { left: 36px; min-width: 36px; box-shadow: 2px 0 4px rgba(0,0,0,.03); }
.sc-name { left: 72px; box-shadow: 3px 0 6px rgba(0,0,0,.05); min-width: 200px; }
.tbl-exp .tbody-row:hover .sticky-col { background: #fafbff; }
.tbl-exp .tbody-row:nth-child(even) .sticky-col { background: #fcfcfe; }

/* ========== FILTER MODAL ========== */
.flt-body { padding: 0 4px; }
.flt-fieldset { border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin-bottom: 14px; }
.flt-fieldset.flt-last { margin-bottom: 0; }
.flt-legend { font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: .04em; padding: 0 6px; display: flex; align-items: center; gap: 6px; }
.flt-legend i { color: #14b8a6; font-size: 11px; }
.flt-grid { display: grid; gap: 12px; }
.flt-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.flt-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.col-span-2 { grid-column: span 2; }
.flt-field label { display: block; font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
.flt-input { width: 100%; height: 36px; padding: 0 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12.5px; color: #334155; background: #fff; transition: border-color .15s; }
.flt-input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.flt-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.flt-actions { display: flex; gap: 8px; }

/* ========== DETAIL MODAL ========== */
.detail-loader { display: flex; flex-direction: column; align-items: center; padding: 48px; color: #94a3b8; gap: 10px; }
.loader-ring { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #14b8a6; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.det { padding: 0 4px; }
.det-header { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 8px; margin-bottom: 14px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
.det-avatar { width: 42px; height: 42px; border-radius: 50%; background: #14b8a6; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; flex-shrink: 0; }
.det-info { flex: 1; }
.det-name { font-size: 15px; font-weight: 800; color: #f1f5f9; margin: 0; }
.det-doc { font-size: 11.5px; color: #94a3b8; display: inline-flex; align-items: center; gap: 5px; margin-top: 2px; }
.det-occupation { font-size: 11px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; font-weight: 600; }
.det-additional-info { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; margin-bottom: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e; line-height: 1.4; }
.det-additional-info i { margin-top: 2px; flex-shrink: 0; }

/* FICO Confirm */
.fico-confirm { margin-top: 8px; }
.fico-section-title { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; padding-bottom: 8px; border-bottom: 2px solid #14b8a6; }
.fico-form-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
.fico-form-5 { grid-template-columns: repeat(5, 1fr); }
.fico-form-6 { grid-template-columns: repeat(6, 1fr); }
.fico-field label { display: block; font-size: 9.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
.fico-select { width: 100%; height: 32px; padding: 0 8px; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 12px; color: #334155; background: #fff; cursor: pointer; }
.fico-select:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20,184,166,.12); }
.fico-select-sm { width: 100%; height: 28px; padding: 0 6px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px; color: #334155; background: #fff; cursor: pointer; }
.fico-select-sm:focus { outline: none; border-color: #14b8a6; }
.fico-input { width: 100%; height: 28px; padding: 0 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 12px; color: #334155; background: #fff; }
.fico-input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 2px rgba(20,184,166,.12); }
.fico-contado-card { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; }
.fico-contado-amount { display: flex; flex-direction: column; gap: 2px; }
.voucher-link-lg { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #fff; border: 1px solid #99f6e4; border-radius: 5px; color: #0d9488; font-size: 12px; font-weight: 600; text-decoration: none; transition: all .15s; }
.voucher-link-lg:hover { background: #f0fdfa; border-color: #5eead4; }
.mt12 { margin-top: 12px; }
.fico-plan-notice { display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; border-radius: 6px; margin-bottom: 12px; font-size: 12px; line-height: 1.4; }
.fico-plan-notice strong { display: block; font-size: 12.5px; margin-bottom: 2px; }
.fico-plan-notice p { margin: 0; opacity: .8; }
.fico-plan-notice i { margin-top: 2px; font-size: 16px; flex-shrink: 0; }
.fico-notice-draft { background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; }
.fico-notice-active { background: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; }
.row-draft { border-left: 3px solid #cbd5e1; }
.row-draft td:first-child { padding-left: 9px; }
.fico-inicial-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
.fico-inicial-top { display: flex; align-items: center; justify-content: space-between; }
.fico-inicial-info { display: flex; flex-direction: column; gap: 2px; }
.fico-inicial-actions { display: flex; align-items: center; gap: 10px; }
.fico-cuotas-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; background: #14b8a6; color: #fff; border-radius: 9px; font-size: 10px; font-weight: 700; margin-left: 5px; }
.btn-sm { padding: 5px 12px; font-size: 11px; border: none; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-weight: 600; transition: all .15s; }
.btn-teal { background: #14b8a6; color: #fff; }
.btn-teal:hover { background: #0d9488; }
.fico-total-row td { padding: 10px 12px; background: #f8fafc; border-top: 2px solid #e2e8f0; font-size: 12px; }
.act-btn-sm.act-red { border-color: #fecaca; color: #ef4444; }
.act-btn-sm.act-red:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
.det-footer { display: flex; justify-content: flex-end; gap: 8px; }

/* Odoo */
.odoo-section { margin-bottom: 14px; }
.odoo-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 6px; font-size: 12px; }
.odoo-bar-left { display: flex; align-items: flex-start; gap: 10px; }
.odoo-bar-left i { font-size: 18px; margin-top: 1px; }
.odoo-bar-left strong { display: block; font-size: 12.5px; }
.odoo-bar-left p { margin: 0; }
.odoo-detail { font-size: 11px; margin-top: 2px !important; opacity: .85; }
.odoo-pending { background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; }
.odoo-pending i { color: #94a3b8; }
.odoo-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.odoo-success i { color: #16a34a; }
.odoo-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.odoo-error i { color: #dc2626; }
.btn-odoo { background: #7c3aed; color: #fff; border: none; padding: 6px 14px; border-radius: 5px; font-size: 11.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all .15s; }
.btn-odoo:hover { background: #6d28d9; }
.btn-odoo:disabled { opacity: .5; cursor: not-allowed; }
.odoo-done { color: #16a34a; font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 5px; }
.btn-exec:disabled { opacity: .5; cursor: not-allowed; }
.det-total { text-align: right; }
.det-total-label { display: block; font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
.det-total-amount { font-size: 22px; font-weight: 800; color: #14b8a6; font-variant-numeric: tabular-nums; }

.det-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
.det-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; }
.det-card-icon { width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; flex-shrink: 0; }
.ic-blue { background: #2563eb; }
.ic-purple { background: #7c3aed; }
.ic-green { background: #059669; }
.ic-amber { background: #d97706; }
.det-card-label { display: block; font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
.det-card-value { display: block; font-size: 12.5px; font-weight: 700; color: #0f172a; line-height: 1.25; }

.fin-bar { display: flex; align-items: center; gap: 0; padding: 12px 16px; margin-bottom: 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
.fin-item { flex: 1; text-align: center; padding: 4px 8px; }
.fin-label { display: block; font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; font-weight: 700; margin-bottom: 3px; }
.fin-value { font-size: 13px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
.fin-sep { width: 1px; height: 32px; background: #e2e8f0; flex-shrink: 0; }
.fin-discount-wrap { position: relative; }
.fin-has-tip { cursor: pointer; position: relative; }
.fin-tip-icon { font-size: 9px; margin-left: 3px; color: #94a3b8; }
.fin-tooltip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #1e293b; color: #f1f5f9; border-radius: 6px; padding: 8px 12px; font-size: 11px; font-weight: 500; white-space: nowrap; z-index: 20; box-shadow: 0 4px 12px rgba(0,0,0,.15); }
.fin-tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #1e293b; }
.fin-tip-row { padding: 2px 0; }
.fin-voucher { display: flex; align-items: center; gap: 8px; padding: 8px 14px; margin-bottom: 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; font-size: 12px; color: #0d9488; }
.fin-voucher .voucher-link { color: #0d9488; font-weight: 600; text-decoration: none; }
.fin-voucher .voucher-link:hover { text-decoration: underline; }

.det-tabs { display: flex; gap: 2px; border-bottom: 2px solid #e2e8f0; }
.det-tab { border: none; background: none; padding: 10px 16px; font-size: 12px; font-weight: 700; color: #94a3b8; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .15s; display: flex; align-items: center; gap: 6px; }
.det-tab:hover { color: #14b8a6; }
.det-tab.active { color: #14b8a6; border-bottom-color: #14b8a6; }
.det-tab-body { padding: 12px 0; }

.tbl-detail td, .tbl-detail th { padding: 8px 10px; font-size: 12px; }
.voucher-link { display: inline-flex; align-items: center; gap: 4px; color: #059669; font-size: 11px; font-weight: 700; text-decoration: none; padding: 3px 8px; border: 1px solid #d1fae5; border-radius: 4px; transition: all .15s; }
.voucher-link:hover { background: #ecfdf5; }
.code-tag { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; color: #475569; font-size: 11px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 32px; color: #94a3b8; }
.empty-state i { font-size: 24px; margin-bottom: 8px; opacity: .5; }
.empty-state p { font-size: 12.5px; margin: 0; }

/* UTILITIES */
.tc { text-align: center !important; }
.tr { text-align: right !important; }
.nw { white-space: nowrap; }
.mono { font-variant-numeric: tabular-nums; letter-spacing: -.01em; }
.fw700 { font-weight: 700; }
.c-green { color: #059669; }
.c-red { color: #dc2626; }
.c-muted { color: #94a3b8; }
.c-accent { color: #0284c7; }
.empty-row { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; font-size: 12.5px; }

@media (max-width: 1100px) {
  .cell-extra { display: none; }
  .cell-ellipsis { max-width: 140px; }
  .thead-sub th { font-size: 10px; padding: 8px 8px; }
  .tbody-row td { padding: 8px 8px; }
}
@media (max-width: 768px) {
  .masthead { flex-direction: column; gap: 10px; padding: 12px 16px; }
  .body { padding: 16px 12px; }
  .cell-ellipsis { max-width: 100px; }
  .flt-grid.cols-3 { grid-template-columns: repeat(2, 1fr); }
  .col-span-2 { grid-column: span 1; }
  .det-cards { grid-template-columns: repeat(2, 1fr); }
  .fin-bar { flex-wrap: wrap; }
  .fin-item { min-width: 33%; }
  .det-header { flex-wrap: wrap; }
  .fico-form-row { grid-template-columns: repeat(2, 1fr); }
}

/* MODAL MAIN TABS */
.modal-main-tabs { display: flex; gap: 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px; }
.modal-main-tab {
  padding: 8px 18px; font-size: 13px; font-weight: 600; color: #64748b;
  background: none; border: none; cursor: pointer; position: relative;
  display: flex; align-items: center; gap: 6px; transition: color 0.15s;
}
.modal-main-tab.active { color: #0f172a; }
.modal-main-tab.active::after {
  content: ''; position: absolute; bottom: -2px; left: 0; right: 0;
  height: 2px; background: #0f172a; border-radius: 2px 2px 0 0;
}
.modal-main-tab:hover:not(.active) { color: #334155; }

/* AUDIT TIMELINE */
.audit-timeline { padding: 8px 0; max-height: 500px; overflow-y: auto; }
.audit-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.audit-item:last-child { border-bottom: none; }
.audit-icon {
  width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; font-size: 13px; color: #fff;
}
.audit-created { background: #3b82f6; }
.audit-approved { background: #22c55e; }
.audit-edited { background: #f59e0b; }
.audit-odoo_enrolled { background: #8b5cf6; }
.audit-email_sent { background: #06b6d4; }
.audit-body { flex: 1; min-width: 0; }
.audit-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.audit-action { font-weight: 600; font-size: 13px; color: #0f172a; }
.audit-user { font-size: 12px; color: #64748b; }
.audit-date { font-size: 11px; color: #94a3b8; margin-left: auto; }
.audit-details { font-size: 12px; color: #475569; margin: 4px 0 0; }
.audit-justificacion {
  margin-top: 6px; padding: 6px 10px; background: #fffbeb; border-left: 3px solid #f59e0b;
  font-size: 12px; color: #92400e; border-radius: 0 4px 4px 0; font-style: italic;
}
.audit-changes { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.audit-change-row {
  display: flex; align-items: center; gap: 4px; font-size: 12px;
  padding: 3px 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #e2e8f0;
}
.audit-change-field { font-weight: 600; color: #334155; white-space: nowrap; }
.audit-old { color: #dc2626; text-decoration: line-through; }
.audit-new { color: #16a34a; font-weight: 600; }

/* EDIT BAR */
/* FICO ACTIONS BAR */
.fico-actions-bar { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e2e8f0; }

.fico-action-btns { display: flex; flex-direction: column; gap: 6px; }
.fico-act-btn {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
  background: #fff; cursor: pointer; transition: all .15s; text-align: left;
}
.fico-act-btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateX(2px); }
.fico-act-icon {
  width: 30px; height: 30px; border-radius: 7px; display: flex;
  align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;
}
.fico-act-edit .fico-act-icon { background: #f1f5f9; color: #475569; }
.fico-act-rp .fico-act-icon { background: #eef2ff; color: #4338ca; }
.fico-act-cc .fico-act-icon { background: #fdf2f8; color: #be185d; }
.fico-act-text { flex: 1; font-size: 12.5px; font-weight: 600; color: #334155; }
.fico-act-tag {
  padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800;
  letter-spacing: .04em; background: #eef2ff; color: #4338ca;
}
.fico-act-tag-cc { background: #fdf2f8; color: #be185d; }
.fico-act-arrow { font-size: 10px; color: #cbd5e1; transition: color .15s; }
.fico-act-btn:hover .fico-act-arrow { color: #64748b; }

/* FICO PANELS */
.fico-panel {
  border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.fico-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid #e2e8f0;
}
.fico-panel-edit .fico-panel-head { background: #f8fafc; }
.fico-panel-rp .fico-panel-head { background: #eef2ff; }
.fico-panel-cc .fico-panel-head { background: #fdf2f8; }
.fico-panel-title {
  font-size: 12.5px; font-weight: 700; display: flex; align-items: center; gap: 8px;
}
.fico-panel-edit .fico-panel-title { color: #334155; }
.fico-panel-rp .fico-panel-title { color: #4338ca; }
.fico-panel-cc .fico-panel-title { color: #be185d; }
.fico-panel-close {
  width: 26px; height: 26px; border-radius: 6px; border: none; background: transparent;
  color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 13px; transition: all .15s;
}
.fico-panel-close:hover { background: #f1f5f9; color: #475569; }
.fico-panel-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }

.fico-panel-grid { display: grid; gap: 10px; }
.fico-panel-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.fico-panel-grid.cols-3 { grid-template-columns: 1fr 1fr 1fr; }

.fico-fg label {
  display: block; font-size: 10.5px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .03em; margin-bottom: 4px;
}
.fico-fg-static {
  font-size: 13px; font-weight: 700; color: #0f172a; padding: 6px 0; line-height: 1.3;
}
.fico-fg-money { font-variant-numeric: tabular-nums; font-size: 14px; }
.fico-fg-badge {
  display: inline-block; padding: 1px 7px; background: #f1f5f9; border-radius: 4px;
  font-size: 11px; font-weight: 700; color: #475569; margin-left: 4px;
}

.fico-panel-section { padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0; }
.fico-panel-section:last-of-type { border-bottom: none; padding-bottom: 0; }
.fico-section-label {
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em;
  color: #94a3b8; margin-bottom: 10px; padding-left: 1px;
}

.fico-warn-label {
  font-size: 11px !important; font-weight: 600 !important; color: #92400e !important;
  text-transform: none !important; letter-spacing: 0 !important;
  display: flex; align-items: center; gap: 6px;
}
.fico-panel-textarea {
  width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #fbbf24;
  border-radius: 6px; font-size: 12.5px; resize: vertical; background: #fffbeb;
  font-family: inherit;
}
.fico-panel-textarea:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.1); }

/* FOOTER BUTTONS */
.btn-reprogram-confirm {
  background: #4338ca; color: #fff; border: none; padding: 8px 18px;
  border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px; transition: all 0.15s;
}
.btn-reprogram-confirm:hover { background: #3730a3; }
.btn-reprogram-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cc-confirm {
  background: #be185d; color: #fff; border: none; padding: 8px 18px;
  border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 6px; transition: all 0.15s;
}
.btn-cc-confirm:hover { background: #9d174d; }
.btn-cc-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* Keep edit-justification-input for backward compat */
.edit-justification-label {
  font-size: 12px; font-weight: 600; color: #92400e;
  display: flex; align-items: center; gap: 6px;
}
.edit-justification-input {
  width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #fbbf24;
  border-radius: 5px; font-size: 12.5px; resize: vertical; background: #fffbeb;
  font-family: inherit;
}
.edit-justification-input:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }

/* legacy compat */
.reprogram-current { display: block; font-size: 13px; font-weight: 700; color: #0f172a; padding: 6px 0; }

/* AUDIT - edition_reprogrammed / course_changed */
.audit-edition_reprogrammed { background: #eef2ff; color: #4338ca; }
.audit-course_changed { background: #fdf2f8; color: #be185d; }
.audit-created_from_cc { background: #fdf2f8; color: #be185d; }

/* READONLY FIELDS */
.fico-readonly {
  display: block; padding: 6px 0; font-size: 13px; font-weight: 600; color: #0f172a;
}
.fico-payment-summary { background: #f8fafc; border-radius: 6px; padding: 12px 16px; border: 1px solid #e2e8f0; }
</style>
