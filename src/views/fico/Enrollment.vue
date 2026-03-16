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
              <th class="tc" style="width:90px">Acciones</th>
              <th style="min-width:180px">Alumno / Documento</th>
              <th style="min-width:180px">Programa / Edicion</th>
              <th style="min-width:110px">Agente</th>
              <th class="tr" style="min-width:100px">Monto Neto</th>
              <th class="tr" style="min-width:100px">Pagado</th>
              <th class="tr" style="min-width:100px">Saldo</th>
              <th class="tc" style="min-width:100px">Estado FICO</th>
            </tr>
            <tr class="thead-filter">
              <td class="tc">
                <button class="hf-clear" title="Limpiar filtros columna" @click="clearColFilters"><i class="fa-solid fa-eraser"></i></button>
              </td>
              <td><input v-model="colFilters.alumno" class="hf-input" placeholder="Buscar alumno..." /></td>
              <td><input v-model="colFilters.programa" class="hf-input" placeholder="Buscar programa..." /></td>
              <td>
                <select v-model="colFilters.agente" class="hf-select">
                  <option :value="null">Todos</option>
                  <option v-for="a in uniqueAgents" :key="a" :value="a">{{ a }}</option>
                </select>
              </td>
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
                <div class="act-group">
                  <button class="act-btn" title="Ver Detalle" @click="viewDetail(e)"><i class="fa-solid fa-eye"></i></button>
                  <button class="act-btn act-green" title="Pagos" @click="manageInstallments(e)"><i class="fa-solid fa-file-invoice-dollar"></i></button>
                </div>
              </td>
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
                <div class="cell-secondary cell-extra">{{ formatDate(e.registration_date) }}</div>
              </td>
              <td class="tr mono">S/. {{ formatMoney(e.total_to_pay) }}</td>
              <td class="tr mono c-green">S/. {{ formatMoney(e.total_discounted) }}</td>
              <td class="tr mono" :class="calcSaldo(e) > 0 ? 'c-red fw700' : 'c-muted'">S/. {{ formatMoney(calcSaldo(e)) }}</td>
              <td class="tc">
                <span class="pill" :class="statusPill(e.fico_status)">{{ e.fico_status || 'Pendiente' }}</span>
              </td>
            </tr>
            <tr v-if="!filteredEnrollments.length"><td colspan="8" class="empty-row">Sin resultados</td></tr>
          </tbody>
        </table>
      </div>

      <!-- ========== VISTA EXPANDIDA ========== -->
      <div v-if="viewMode === 'expanded'" class="exp-wrap">
        <div class="exp-scroll">
          <table class="tbl-exp">
            <thead>
              <tr class="grp-row">
                <th colspan="2" class="grp grp-actions">ACCIONES</th>
                <th
                  :colspan="cg.identity ? 5 : 1"
                  class="grp grp-identity"
                  :class="{ 'tg-collapsed': !cg.identity }"
                  @click="cg.identity = !cg.identity"
                  :title="cg.identity ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-id-card tg-icon"></i><span class="tg-text">IDENTIDAD</span><i class="fa-solid tg-chev" :class="cg.identity ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.profile ? 6 : 1"
                  class="grp grp-profile"
                  :class="{ 'tg-collapsed': !cg.profile }"
                  @click="cg.profile = !cg.profile"
                  :title="cg.profile ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-user tg-icon"></i><span class="tg-text">PERFIL ALUMNO</span><i class="fa-solid tg-chev" :class="cg.profile ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.program ? 3 : 1"
                  class="grp grp-program"
                  :class="{ 'tg-collapsed': !cg.program }"
                  @click="cg.program = !cg.program"
                  :title="cg.program ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-graduation-cap tg-icon"></i><span class="tg-text">PROGRAMA</span><i class="fa-solid tg-chev" :class="cg.program ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.finance ? 11 : 1"
                  class="grp grp-finance"
                  :class="{ 'tg-collapsed': !cg.finance }"
                  @click="cg.finance = !cg.finance"
                  :title="cg.finance ? 'Colapsar' : 'Expandir'"
                >
                  <div class="tg-label"><i class="fa-solid fa-coins tg-icon"></i><span class="tg-text">FINANZAS</span><i class="fa-solid tg-chev" :class="cg.finance ? 'fa-chevron-up' : 'fa-chevron-right'"></i></div>
                </th>
                <th
                  :colspan="cg.installments ? 16 : 1"
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
                <th class="sticky-col sc-1 tc" style="min-width:36px"></th>
                <!-- Identity -->
                <template v-if="cg.identity">
                  <th class="hd-id" style="min-width:70px">COD</th>
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
                  <th class="hd-pf" style="min-width:65px">MODALID.</th>
                  <th class="hd-pf" style="min-width:70px">TIPO AL.</th>
                </template>
                <th v-else class="tg-ph"></th>
                <!-- Program -->
                <template v-if="cg.program">
                  <th class="hd-pg" style="min-width:100px">TIPO PROG.</th>
                  <th class="hd-pg" style="min-width:100px">MOD. PROG.</th>
                  <th class="hd-pg" style="min-width:180px">PROGRAMA</th>
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
                  <th class="hd-fn" style="min-width:70px">PLAN</th>
                </template>
                <th v-else class="tg-ph"></th>
                <!-- Installments -->
                <template v-if="cg.installments">
                  <th class="hd-qt" style="min-width:78px">FC1</th><th class="hd-qt tr" style="min-width:62px">C1</th>
                  <th class="hd-qt" style="min-width:78px">FC2</th><th class="hd-qt tr" style="min-width:62px">C2</th>
                  <th class="hd-qt" style="min-width:78px">FC3</th><th class="hd-qt tr" style="min-width:62px">C3</th>
                  <th class="hd-qt" style="min-width:78px">FC4</th><th class="hd-qt tr" style="min-width:62px">C4</th>
                  <th class="hd-qt" style="min-width:78px">FC5</th><th class="hd-qt tr" style="min-width:62px">C5</th>
                  <th class="hd-qt" style="min-width:78px">FC6</th><th class="hd-qt tr" style="min-width:62px">C6</th>
                  <th class="hd-qt" style="min-width:78px">FC7</th><th class="hd-qt tr" style="min-width:62px">C7</th>
                  <th class="hd-qt" style="min-width:78px">FC8</th><th class="hd-qt tr" style="min-width:62px">C8</th>
                </template>
                <th v-else class="tg-ph"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in filteredEnrollments" :key="'exp-'+e.enrollment_id" class="tbody-row" :class="rowClass(e)">
                <td class="sticky-col sc-0 tc nw"><button class="act-btn-sm" @click="viewDetail(e)"><i class="fa-solid fa-eye"></i></button></td>
                <td class="sticky-col sc-1 tc nw"><button class="act-btn-sm act-green" @click="manageInstallments(e)"><i class="fa-solid fa-file-invoice-dollar"></i></button></td>
                <!-- Identity -->
                <template v-if="cg.identity">
                  <td class="c-accent fw700">{{ e.edition_code }}</td>
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
                  <td class="tc">{{ e.modality || '—' }}</td>
                  <td class="tc">{{ e.student_type_label || '—' }}</td>
                </template>
                <td v-else class="tg-ph-cell"><div class="tg-hint tg-hint-pf"><i class="fa-solid fa-user"></i></div></td>
                <!-- Program -->
                <template v-if="cg.program">
                  <td class="cell-sm">{{ e.program_type || '—' }}</td>
                  <td class="cell-sm">{{ e.program_modality || '—' }}</td>
                  <td class="cell-prog fw700">{{ e.program_name || '—' }}</td>
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
                  <td class="tr mono">{{ e.total_discounted || '—' }}</td>
                  <td class="tc"><span class="pill pill-sm pill-slate">{{ e.installment_plan || '—' }}</span></td>
                </template>
                <td v-else class="tg-ph-cell"><div class="tg-hint tg-hint-fn"><i class="fa-solid fa-coins"></i></div></td>
                <!-- Installments -->
                <template v-if="cg.installments">
                  <td class="cell-date">{{ e.fc1 || '—' }}</td><td class="tr mono">{{ e.c1 || '—' }}</td>
                  <td class="cell-date">{{ e.fc2 || '—' }}</td><td class="tr mono">{{ e.c2 || '—' }}</td>
                  <td class="cell-date">{{ e.fc3 || '—' }}</td><td class="tr mono">{{ e.c3 || '—' }}</td>
                  <td class="cell-date">{{ e.fc4 || '—' }}</td><td class="tr mono">{{ e.c4 || '—' }}</td>
                  <td class="cell-date">{{ e.fc5 || '—' }}</td><td class="tr mono">{{ e.c5 || '—' }}</td>
                  <td class="cell-date">{{ e.fc6 || '—' }}</td><td class="tr mono">{{ e.c6 || '—' }}</td>
                  <td class="cell-date">{{ e.fc7 || '—' }}</td><td class="tr mono">{{ e.c7 || '—' }}</td>
                  <td class="cell-date">{{ e.fc8 || '—' }}</td><td class="tr mono">{{ e.c8 || '—' }}</td>
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
  <BaseModal v-model="showDetailModal" title="Detalle Financiero" size="xl">
    <div v-if="loadingDetail" class="detail-loader"><div class="loader-ring"></div><p>Cargando detalle...</p></div>
    <div v-else class="det">
      <div class="det-header">
        <div class="det-avatar"><i class="fa-solid fa-user-graduate"></i></div>
        <div class="det-info">
          <h3 class="det-name">{{ selectedDetail.student_full_name || selectedEnrollment?.student_full_name || '---' }}</h3>
          <span class="det-doc"><i class="fa-solid fa-id-card"></i> {{ selectedDetail.document_number || selectedEnrollment?.document_number || '---' }}</span>
        </div>
        <div class="det-total">
          <span class="det-total-label">Total a Pagar</span>
          <span class="det-total-amount">{{ selectedDetail.net_amount ? `S/. ${formatMoney(selectedDetail.net_amount)}` : selectedEnrollment?.total_to_pay || '---' }}</span>
        </div>
      </div>
      <div class="det-cards">
        <div class="det-card"><span class="det-card-icon ic-blue"><i class="fa-solid fa-graduation-cap"></i></span><div><span class="det-card-label">Programa</span><span class="det-card-value">{{ selectedDetail.program_name || selectedEnrollment?.program_name || '---' }}</span></div></div>
        <div class="det-card"><span class="det-card-icon ic-purple"><i class="fa-solid fa-layer-group"></i></span><div><span class="det-card-label">Codigo</span><span class="det-card-value">{{ selectedDetail.edition_code || selectedEnrollment?.edition_code || '---' }}</span></div></div>
        <div class="det-card"><span class="det-card-icon ic-green"><i class="fa-solid fa-user-tie"></i></span><div><span class="det-card-label">Asesor</span><span class="det-card-value">{{ selectedDetail.seller_agent_name || selectedEnrollment?.seller_agent_name || '---' }}</span></div></div>
        <div class="det-card"><span class="det-card-icon ic-amber"><i class="fa-solid fa-calendar-check"></i></span><div><span class="det-card-label">Registro</span><span class="det-card-value">{{ formatDate(selectedDetail.registration_date || selectedEnrollment?.registration_date) }}</span></div></div>
      </div>
      <div class="fin-bar">
        <div class="fin-item"><span class="fin-label">Precio Lista</span><span class="fin-value">S/. {{ formatMoney(selectedDetail.list_price || selectedDetail.net_amount) }}</span></div>
        <div class="fin-sep"></div>
        <div class="fin-item"><span class="fin-label">Descuento</span><span class="fin-value c-red">- S/. {{ formatMoney(selectedDetail.discount_amount) }}</span></div>
        <div class="fin-sep"></div>
        <div class="fin-item"><span class="fin-label">Total</span><span class="fin-value fw700">S/. {{ formatMoney(selectedDetail.net_amount) }}</span></div>
        <div class="fin-sep"></div>
        <div class="fin-item"><span class="fin-label">Pagado</span><span class="fin-value c-green">S/. {{ formatMoney(selectedDetail.amount_paid) }}</span></div>
        <div class="fin-sep"></div>
        <div class="fin-item"><span class="fin-label">Saldo</span><span class="fin-value" :class="Number(selectedDetail.balance_due) > 0 ? 'c-red fw700' : 'c-green'">S/. {{ formatMoney(selectedDetail.balance_due) }}</span></div>
      </div>
      <div class="det-tabs">
        <button :class="['det-tab', { active: activeTab === 'payments' }]" @click="activeTab = 'payments'"><i class="fa-solid fa-receipt"></i> Pagos</button>
        <button v-if="isInstallmentPlan" :class="['det-tab', { active: activeTab === 'installments' }]" @click="activeTab = 'installments'"><i class="fa-solid fa-calendar-days"></i> Plan de Cuotas</button>
      </div>
      <div v-if="activeTab === 'payments'" class="det-tab-body">
        <table v-if="selectedDetail.payment_history?.length" class="tbl tbl-detail">
          <thead><tr class="thead-sub"><th>Fecha Pago</th><th>Metodo</th><th class="tr">Monto</th><th>Cod. Op.</th><th class="tc">Voucher</th><th class="tc">Estado</th></tr></thead>
          <tbody>
            <tr v-for="p in selectedDetail.payment_history" :key="p.payment_id" class="tbody-row row-green">
              <td class="fw700">{{ formatDate(p.payment_date) }}</td>
              <td>{{ p.payment_method }}</td>
              <td class="tr mono fw700">S/. {{ formatMoney(p.amount) }}</td>
              <td><code class="code-tag">{{ p.transaction_code || '---' }}</code></td>
              <td class="tc"><a v-if="p.evidence_url" :href="p.evidence_url" target="_blank" class="voucher-link"><i class="fa-solid fa-image"></i> Ver</a><span v-else class="c-muted">---</span></td>
              <td class="tc"><span class="pill pill-sm" :class="p.settlement_alias === 'we_payment_settlement_conciliated' ? 'pill-green' : 'pill-amber'">{{ p.settlement_status || 'Pendiente' }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><i class="fa-solid fa-inbox"></i><p>Sin pagos registrados</p></div>
      </div>
      <div v-if="activeTab === 'installments'" class="det-tab-body">
        <table v-if="selectedDetail.installments?.length" class="tbl tbl-detail">
          <thead><tr class="thead-sub"><th style="width:80px">N</th><th class="tr">Monto</th><th>Vencimiento</th><th class="tc">Estado</th></tr></thead>
          <tbody>
            <tr v-for="i in selectedDetail.installments" :key="i.installment_id" class="tbody-row" :class="i.status_alias === 'we_installment_status_paid' ? 'row-green' : isOverdue(i.due_date) ? 'row-red' : ''">
              <td class="fw700">{{ i.installment_number === 0 ? 'Inicial' : 'Cuota ' + i.installment_number }}</td>
              <td class="tr mono fw700">S/. {{ formatMoney(i.amount) }}</td>
              <td><span :class="{ 'c-red fw700': isOverdue(i.due_date) && i.status_alias !== 'we_installment_status_paid' }">{{ formatDate(i.due_date) }}</span></td>
              <td class="tc"><span class="pill pill-sm" :class="i.status_alias === 'we_installment_status_paid' ? 'pill-green' : 'pill-amber'">{{ i.status_label || 'Pendiente' }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><i class="fa-solid fa-inbox"></i><p>Sin cuotas programadas</p></div>
      </div>
    </div>
    <template #footer><button class="btn-ghost" @click="showDetailModal = false">Cerrar</button></template>
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
import { useTablePersistence } from '@/composables/useTablePersistence'

const router = useRouter()
const ficoService = inject(ServiceKeys.Fico)
const authService = inject(ServiceKeys.Auth)
const catalog = inject('catalog')

const viewMode = ref('compact')

// Collapsible column groups (expanded view)
const CG_KEY = 'fico_col_groups_v1'
const cg = reactive({ identity: true, profile: true, program: true, finance: true, installments: true })
try {
  const saved = localStorage.getItem(CG_KEY)
  if (saved) { const p = JSON.parse(saved); Object.keys(cg).forEach(k => { if (typeof p[k] === 'boolean') cg[k] = p[k] }) }
} catch {}
watch(cg, val => localStorage.setItem(CG_KEY, JSON.stringify({ ...val })), { deep: true })

const expandedColCount = computed(() => 2 + (cg.identity ? 5 : 1) + (cg.profile ? 6 : 1) + (cg.program ? 3 : 1) + (cg.finance ? 11 : 1) + (cg.installments ? 16 : 1))

const uniqueAgents = computed(() => [...new Set(enrollments.value.map(e => e.seller_agent_name).filter(Boolean))].sort())
const uniqueEstados = computed(() => [...new Set(enrollments.value.map(e => e.fico_status || 'Pendiente').filter(Boolean))].sort())

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
    list = list.filter(e => (e.fico_status || 'Pendiente') === colFilters.estado)
  }
  return list
})

// Detail modal
const showDetailModal = ref(false)
const loadingDetail = ref(false)
const activeTab = ref('payments')
const selectedEnrollment = ref(null)
const selectedDetail = ref({ installments: [], payment_history: [] })

async function openDetail(enrollment, tab = 'payments') {
  selectedEnrollment.value = enrollment
  showDetailModal.value = true
  loadingDetail.value = true
  activeTab.value = tab
  try {
    const response = await ficoService.getPaymentDetail(Number(enrollment.enrollment_id))
    selectedDetail.value = response || { installments: [], payment_history: [] }
  } catch (err) {
    console.error('Error cargando detalle:', err)
    selectedDetail.value = { installments: [], payment_history: [] }
  } finally { loadingDetail.value = false }
}

function viewDetail(enrollment) { openDetail(enrollment, 'payments') }
function manageInstallments(enrollment) { openDetail(enrollment, 'installments') }
function isOverdue(d) { return d ? new Date(d) < new Date() : false }

const isInstallmentPlan = computed(() => {
  const inst = selectedDetail.value?.installments
  return inst && inst.length > 1
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
const formatDate = v => v ? new Date(v).toLocaleDateString('es-PE') : '—'
const statusPill = s => { if (!s) return 'pill-amber'; const sl = s.toLowerCase(); if (sl.includes('confirm') || sl.includes('aprob')) return 'pill-green'; if (sl.includes('rechaz') || sl.includes('anula')) return 'pill-red'; return 'pill-amber' }

function calcSaldo(e) {
  const total = Number(e.total_to_pay) || 0
  const pagado = Number(e.total_discounted) || 0
  return total - pagado
}

function rowClass(e) {
  const saldo = calcSaldo(e)
  if (saldo <= 0) return 'row-green'
  const total = Number(e.total_to_pay) || 1
  return (saldo / total) < 0.5 ? 'row-amber' : 'row-red'
}

onMounted(() => { loadOwners(); fetchEnrollments() })
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

/* Cells */
.cell-primary { font-weight: 700; color: #0f172a; font-size: 12.5px; line-height: 1.3; }
.cell-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.cell-secondary { color: #94a3b8; font-size: 11px; margin-top: 1px; }
.cell-sm { font-size: 12px; color: #475569; }
.cell-date { font-size: 11px; color: #64748b; }
.cell-prog { font-size: 11.5px; color: #334155; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Pills */
.pill { display: inline-flex; align-items: center; justify-content: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .01em; white-space: nowrap; }
.pill-sm { padding: 2px 6px; font-size: 10px; }
.pill-slate { background: #f1f5f9; color: #64748b; }
.pill-green { background: #ecfdf5; color: #065f46; }
.pill-amber { background: #fffbeb; color: #92400e; }
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
.det-doc { font-size: 11.5px; color: #94a3b8; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
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
.tc { text-align: center; }
.tr { text-align: right; }
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
}
</style>
