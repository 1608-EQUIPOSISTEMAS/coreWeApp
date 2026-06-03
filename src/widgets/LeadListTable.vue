<template>
  <div class="table-shell">
    <div class="table-responsive-custom">
      <table class="exec-table" :class="{ 'compact-table': isCompact }">
        <thead>
          <tr v-if="!isCompact" class="thead-sub">
            <th class="ts ts-c text-center" style="width: 80px;">Acciones</th>
            <th class="ts ts-c">Status</th>
            <th class="ts ts-c">Contacto</th>
            <th class="ts ts-c">Situación</th>
            <th class="ts ts-c" style="min-width: 160px!important;">T. Consulta</th>
            <th class="ts ts-c">Programa / Interés</th>
            <th class="ts ts-c">Ini. Edición</th>
            <th class="ts ts-c">F. Pago</th>
            <th class="ts ts-c">Nivel Interés</th>
            <th class="ts ts-c">Registro</th>
            <th class="ts ts-c">Cel. Origen</th>
            <th class="ts ts-c">Canal Pago</th>
            <th class="ts ts-c text-center">Seguimiento</th>
          </tr>
          <tr v-if="!isCompact" class="thead-filter">
            <slot name="filters-normal" />
          </tr>

          <!-- ══ COMPACT: FILA DE GRUPOS COLAPSABLES ═══════════════════════════ -->
          <tr v-if="isCompact" class="thead-colgroup">
            <!-- Acciones: fija, sin grupo -->
            <th class="tg-fixed"></th>

            <!-- D. PROGRAMA -->
            <th
              :colspan="colGroups.programa ? 6 : 1"
              class="tg-header tg-programa"
              :class="{ 'tg-collapsed': !colGroups.programa }"
              @click="emit('toggle-col-group', 'programa')"
              :title="colGroups.programa ? 'Colapsar D. PROGRAMA' : 'Expandir D. PROGRAMA'"
            >
              <div class="tg-label">
                <i class="fa-solid fa-film tg-icon"></i>
                <span class="tg-text">D. PROGRAMA</span>
                <i class="fa-solid tg-chevron" :class="colGroups.programa ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
              </div>
            </th>

            <!-- D. CLIENTE -->
            <th
              :colspan="colGroups.cliente ? 5 : 1"
              class="tg-header tg-cliente"
              :class="{ 'tg-collapsed': !colGroups.cliente }"
              @click="emit('toggle-col-group', 'cliente')"
              :title="colGroups.cliente ? 'Colapsar D. CLIENTE' : 'Expandir D. CLIENTE'"
            >
              <div class="tg-label">
                <i class="fa-solid fa-user tg-icon"></i>
                <span class="tg-text">D. CLIENTE</span>
                <i class="fa-solid tg-chevron" :class="colGroups.cliente ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
              </div>
            </th>

            <!-- D. LEAD -->
            <th
              :colspan="colGroups.lead ? 8 : 1"
              class="tg-header tg-lead"
              :class="{ 'tg-collapsed': !colGroups.lead }"
              @click="emit('toggle-col-group', 'lead')"
              :title="colGroups.lead ? 'Colapsar D. LEAD' : 'Expandir D. LEAD'"
            >
              <div class="tg-label">
                <i class="fa-solid fa-chart-line tg-icon"></i>
                <span class="tg-text">D. LEAD</span>
                <i class="fa-solid tg-chevron" :class="colGroups.lead ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
              </div>
            </th>

            <th
              :colspan="colGroups.asesor ? 5 : 1"
              class="tg-header tg-asesor"
              :class="{ 'tg-collapsed': !colGroups.asesor }"
              @click="emit('toggle-col-group', 'asesor')"
              :title="colGroups.asesor ? 'Colapsar D. ASESOR' : 'Expandir D. ASESOR'"
            >
              <div class="tg-label">
                <i class="fa-solid fa-user-tie tg-icon"></i>
                <span class="tg-text">D. ASESOR</span>
                <i class="fa-solid tg-chevron" :class="colGroups.asesor ? 'fa-chevron-up' : 'fa-chevron-right'"></i>
              </div>
            </th>
          </tr>

          <!-- ══ COMPACT: FILA DE CABECERAS CON v-show ════════════════════════ -->
          <tr v-if="isCompact" class="thead-sub">
            <th class="ts ts-c text-center">Acciones</th>

            <!-- D. PROGRAMA -->
            <th v-show="colGroups.programa" class="ts ts-c">F. Contacto</th>
            <th v-show="colGroups.programa" class="ts ts-c">Categoría</th>
            <th v-show="colGroups.programa" class="ts ts-c">Modalidad</th>
            <th v-show="colGroups.programa" class="ts ts-c">Programa</th>
            <th v-show="colGroups.programa" class="ts ts-c">Edición</th>
            <th v-show="colGroups.programa" class="ts ts-c" style="min-width: 140px!important;">T. Consulta</th>
            <th v-if="!colGroups.programa" class="ts ts-c tg-placeholder-cell"></th>

            <!-- D. CLIENTE -->
            <th v-show="colGroups.cliente" class="ts ts-c">Nombre</th>
            <th v-show="colGroups.cliente" class="ts ts-c">Teléfono</th>
            <th v-show="colGroups.cliente" class="ts ts-c">Situación</th>
            <th v-show="colGroups.cliente" class="ts ts-c">E. Cliente</th>
            <th v-show="colGroups.cliente" class="ts ts-c">Member</th>
            <th v-if="!colGroups.cliente" class="ts ts-c tg-placeholder-cell"></th>
            <!-- D. LEAD (8 cols) -->
            <th v-show="colGroups.lead" class="ts ts-c">Status</th>
            <th v-show="colGroups.lead" class="ts ts-c">F. Pago</th>
            <th v-show="colGroups.lead" class="ts ts-c">Interés</th>
            <th v-show="colGroups.lead" class="ts ts-c">Canal origen</th>
            <th v-show="colGroups.lead" class="ts ts-c">Medio</th>
            <th v-show="colGroups.lead" class="ts ts-c">Palabra MKT</th>
            <th v-show="colGroups.lead" class="ts ts-c">Estrategia</th>
            <th v-show="colGroups.lead" class="ts ts-c">Observaciones</th>
            <th v-if="!colGroups.lead" class="ts ts-c tg-placeholder-cell"></th>

            <!-- D. ASESOR (5 cols) -->
            <th v-show="colGroups.asesor" class="ts ts-c">Asesor/Usuario</th>
            <th v-show="colGroups.asesor" class="ts ts-c">F. Registro</th>
            <th v-show="colGroups.asesor" class="ts ts-c">Cel. Origen</th>
            <th v-show="colGroups.asesor" class="ts ts-c">Canal Pago</th>
            <th v-show="colGroups.asesor" class="ts ts-c text-center">Seguimiento</th>
            <th v-if="!colGroups.asesor" class="ts ts-c tg-placeholder-cell"></th>
          </tr>

          <!-- ══ COMPACT: FILA DE FILTROS ══════════════════════════════════════ -->
          <tr v-if="isCompact" class="thead-filter">
            <slot name="filters-compact" />
          </tr>
        </thead>

        <tbody v-if="!isCompact">
          <template v-if="isLoading">
            <tr v-for="n in 10" :key="'sk-'+n" class="skeleton-row">
              <td><div class="sk-cell" style="width:52px"></div></td>
              <td><div class="sk-cell" style="width:70px"></div></td>
              <td><div class="sk-cell" style="width:120px"></div><div class="sk-cell mt-1" style="width:80px;height:8px"></div></td>
              <td><div class="sk-cell" style="width:80px"></div></td>
              <td><div class="sk-cell" style="width:60px"></div></td>
              <td><div class="sk-cell" style="width:180px"></div><div class="sk-cell mt-1" style="width:100px;height:8px"></div></td>
              <td><div class="sk-cell" style="width:70px"></div></td>
              <td><div class="sk-cell" style="width:60px"></div></td>
              <td><div class="sk-cell" style="width:55px"></div></td>
              <td><div class="sk-cell" style="width:90px"></div></td>
              <td><div class="sk-cell" style="width:80px"></div></td>
              <td><div class="sk-cell" style="width:70px"></div></td>
              <td><div class="sk-cell" style="width:80px;margin:0 auto"></div></td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="l in leads"
              :key="l.id"
              class="tbody-row"
              :class="rowClassForStatus(l.cat_status_alias)"
              @click="emit('row-click', l)"
            >
              <td class="td-a text-center nowrap">
                <button class="btn-icon" @click.stop="l.enrollment_id ? emit('action:enrollment', l) : emit('action:edit', { lead: l, event: $event })" :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'">
                  <i class="fa-solid" :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'"></i>
                </button>
                <button class="btn-icon ms-1" @click.stop="emit('action:clone', { lead: l, event: $event })" title="Clonar/Ver">
                  <i class="fa-solid fa-clone text-primary"></i>
                </button>
              </td>
              <td class="td-a fw-600 text-dark">{{ maps.pipeline[l.cat_status_alias] || l.cat_status_lead_label || '—' }}</td>
              <td class="td-a" style="min-width:160px">
                <div class="d-flex flex-column">
                  <span class="fw-700 text-dark">{{ l.origin_phone }}</span>
                  <span class="small text-muted">{{ l.full_name_label || 'Sin nombre' }}</span>
                </div>
              </td>
              <td class="td-a small">{{ l.cat_prospect_situation || '—' }}</td>
              <td class="td-a minW">
                <span class="pill pill-slate border">{{ maps.query[l.cat_promotion_alias] || '—' }}</span>
              </td>
              <td class="td-a" style="min-width:280px">
                <div v-if="l.program_label">
                  <div class="fw-600 text-dark">{{ l.program_label }}</div>
                  <div class="small text-muted mt-1">
                    {{ l.cat_type_program_label }}
                    <span v-if="l.cat_model_modality_label"> • {{ l.cat_model_modality_label }}</span>
                  </div>
                </div>
                <div v-else class="text-muted small">—</div>
              </td>
              <td class="td-a nowrap">
                <div class="text-mono small fw-600 accent-text">{{ l.edition_label || '—' }}</div>
              </td>
              <td class="td-a small nowrap fw-700 pay-date-cell">{{ l.pay_date || '—' }}</td>
              <td class="td-a">
                <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">{{ maps.interest[l.cat_interest_alias] }}</span>
                <span v-else class="text-muted small">—</span>
              </td>
              <td class="td-a" style="min-width:120px">
                <div v-if="l.user_registration_label">
                  <div class="small fw-600 text-dark">{{ l.user_registration_label }}</div>
                  <div class="text-muted x-small">{{ l.system_registration_date }}</div>
                </div>
              </td>
              <td class="td-a small nowrap fw-600 text-dark">{{ l.origin_seller_phone || '—' }}</td>
              <td class="td-a small text-muted">{{ l.description || '—' }}</td>
              <td class="td-a text-center" style="min-width:140px">
                <div v-if="l.cat_last_follow_alias" class="pill d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
                  <span>{{ maps.follow[l.cat_last_follow_alias] }}</span>
                  <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75 ms-1"></i>
                </div>
                <span v-else class="text-muted small">—</span>
              </td>
            </tr>
            <tr v-if="!leads.length">
              <td colspan="13" class="empty-state">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <p>No se encontraron leads con los filtros actuales.</p>
              </td>
            </tr>
          </template>
        </tbody>

        <!-- ══ COMPACT TBODY ══════════════════════════════════════════════════ -->
        <tbody v-else>
          <template v-if="isLoading">
            <tr v-for="n in 10" :key="'skc-'+n" class="skeleton-row">
              <td><div class="sk-cell" style="width:52px"></div></td>
              <td v-show="colGroups.programa" v-for="c in 6" :key="'p'+c"><div class="sk-cell"></div></td>
              <td v-if="!colGroups.programa"></td>
              <td v-show="colGroups.cliente" v-for="c in 5" :key="'cl'+c"><div class="sk-cell"></div></td>
              <td v-if="!colGroups.cliente"></td>
              <td v-show="colGroups.lead" v-for="c in 8" :key="'l'+c"><div class="sk-cell"></div></td>
              <td v-if="!colGroups.lead"></td>
              <td v-show="colGroups.asesor" v-for="c in 5" :key="'a'+c"><div class="sk-cell"></div></td>
              <td v-if="!colGroups.asesor"></td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="l in leads"
              :key="l.id"
              class="tbody-row"
              :class="rowClassForStatus(l.cat_status_alias)"
              @click="emit('row-click', l)"
            >
              <!-- Acciones (siempre visible) -->
              <td class="td-a text-center nowrap">
                <button class="btn-icon" @click.stop="l.enrollment_id ? emit('action:enrollment', l) : emit('action:edit', { lead: l, event: $event })" :title="l.enrollment_id ? 'Ver Matrícula' : 'Editar'">
                  <i class="fa-solid" :class="l.enrollment_id ? 'fa-user-check text-success' : 'fa-pen-to-square text-warning'"></i>
                </button>
                <button class="btn-icon ms-1" @click.stop="emit('action:clone', { lead: l, event: $event })" title="Clonar/Ver">
                  <i class="fa-solid fa-clone text-primary"></i>
                </button>
              </td>

              <!-- ── D. PROGRAMA ──────────────────────────────────────── -->
              <td v-show="colGroups.programa" class="td-a small nowrap">{{ l.first_contact_date || '—' }}</td>
              <td v-show="colGroups.programa" class="td-a small" style="min-width:120px">{{ l.cat_type_program_label || '—' }}</td>
              <td v-show="colGroups.programa" class="td-a small" style="min-width:120px">{{ l.cat_model_modality_label || '—' }}</td>
              <td v-show="colGroups.programa" class="td-a small fw-600 accent-text">{{ l.program_label || '—' }}</td>
              <td v-show="colGroups.programa" class="td-a nowrap small text-mono">{{ l.edition_label || '—' }}</td>
              <td v-show="colGroups.programa" class="td-a small" style="min-width:140px">{{ l.cat_promotion_description || '—' }}</td>
              <td v-if="!colGroups.programa" class="td-a tg-placeholder-cell">
                <div class="tg-collapsed-hint tg-hint-programa">
                  <span class="tg-hint-line tg-hint-muted">{{ l.first_contact_date || '—' }}</span>
                  <span class="tg-hint-line tg-hint-main" :title="l.program_label">{{ l.program_label || '—' }}</span>
                </div>
              </td>

              <!-- ── D. CLIENTE ───────────────────────────────────────── -->
              <td v-show="colGroups.cliente" class="td-a nowrap" style="min-width:120px">{{ l.full_name_label }}</td>
              <td v-show="colGroups.cliente" class="td-a nowrap fw-700 text-dark">{{ l.origin_phone }}</td>
              <td v-show="colGroups.cliente" class="td-a small">{{ l.cat_prospect_situation || '—' }}</td>
              <td v-show="colGroups.cliente" class="td-a nowrap fw-600 text-dark">{{ l.cat_client_moment_description }}</td>
              <td v-show="colGroups.cliente" class="td-a nowrap fw-600 text-dark">{{ l.membership_moment }}</td>
              <td v-if="!colGroups.cliente" class="td-a tg-placeholder-cell">
                <div class="tg-collapsed-hint tg-hint-cliente">
                  <span class="tg-hint-line tg-hint-strong">{{ l.origin_phone }}</span>
                  <span class="tg-hint-line tg-hint-muted">{{ l.cat_client_moment_description || '—' }}</span>
                  <span class="tg-hint-line tg-hint-muted">{{ l.membership_moment || '—' }}</span>
                </div>
              </td>

              <!-- ── D. LEAD ── -->
              <td v-show="colGroups.lead" class="td-a">
                <span class="pill pill-slate border">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
              </td>
              <td v-show="colGroups.lead" class="td-a">
                <div class="small fw-700 pay-date-cell">{{ l.pay_date || '—' }}</div>
              </td>
              <td v-show="colGroups.lead" class="td-a">
                <span v-if="l.cat_interest_alias" class="pill" :class="badgeForInterest(l.cat_interest_alias)">{{ l.cat_interest_description }}</span>
                <span v-else class="text-muted small">—</span>
              </td>
              <td v-show="colGroups.lead" class="td-a small text-muted">{{ l.cat_channel_description || '—' }}</td>
              <td v-show="colGroups.lead" class="td-a small text-muted">{{ l.cat_medium_contact_description || '—' }}</td>
              <td v-show="colGroups.lead" class="td-a small text-muted">{{ l.cat_word_description || '—' }}</td>
              <td v-show="colGroups.lead" class="td-a small text-info fw-500">{{ l.cat_strategy_description || '—' }}</td>
              <td v-show="colGroups.lead" class="td-a small text-muted obs-cell" :title="l.observations || ''">{{ l.observations || '—' }}</td>
              <td v-if="!colGroups.lead" class="td-a tg-placeholder-cell">
                <div class="tg-collapsed-hint tg-hint-lead">
                  <span class="tg-hint-line tg-hint-main">{{ l.cat_status_description || l.cat_status_lead_label || '—' }}</span>
                  <span class="tg-hint-line tg-hint-strong pay-date-cell">{{ l.pay_date || '—' }}</span>
                </div>
              </td>

              <!-- ── D. ASESOR ── -->
              <td v-show="colGroups.asesor" class="td-a small">{{ l.user_registration_label }}</td>
              <td v-show="colGroups.asesor" class="td-a small nowrap text-muted">{{ l.system_registration_date || '—' }}</td>
              <td v-show="colGroups.asesor" class="td-a small nowrap fw-600 text-dark">{{ l.origin_seller_phone || '—' }}</td>
              <td v-show="colGroups.asesor" class="td-a small text-muted">{{ l.description || '—' }}</td>
              <td v-show="colGroups.asesor" class="td-a text-center" style="min-width:140px">
                <div v-if="l.cat_last_follow_alias" class="pill d-inline-flex align-items-center gap-1" :class="badgeForFollow(l.cat_last_follow_alias)">
                  <span>{{ maps.follow[l.cat_last_follow_alias] }}</span>
                  <i v-if="l.follow_details" class="fa-solid fa-circle-info opacity-75 ms-1"></i>
                </div>
                <span v-else class="text-muted small">—</span>
              </td>
              <td v-if="!colGroups.asesor" class="td-a tg-placeholder-cell">
                <div class="tg-collapsed-hint tg-hint-asesor">
                  <span class="tg-hint-line tg-hint-main">{{ l.user_registration_label || '—' }}</span>
                  <span class="tg-hint-line tg-hint-muted">{{ l.system_registration_date || '—' }}</span>
                </div>
              </td>
            </tr>

            <tr v-if="!leads.length">
              <td colspan="20" class="empty-state">No se encontraron leads con los filtros actuales.</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  leads: { type: Array, default: () => [] },
  isCompact: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  colGroups: { type: Object, required: true },
  maps: { type: Object, required: true },
  isComercial: { type: Boolean, default: false }
})

const emit = defineEmits([
  'row-click',
  'action:edit',
  'action:clone',
  'action:follow',
  'action:enrollment',
  'toggle-col-group'
])

function rowClassForStatus(s) {
  const map = {
    'we_lead_status_interesado': 'row-blue',
    'we_lead_status_bought': 'row-inscrito',
    'we_lead_status_will_pay': 'row-emerald',
    'we_lead_status_proximo': 'row-yellow',
    'we_lead_status_indiferente': 'row-gray',
    'we_lead_status_closed': 'row-red',
    'we_lead_status_desestimado': 'row-red'
  }
  return map[s] || ''
}

function badgeForInterest(s) {
  const map = { 'we_lead_interest_high': 'pill-red', 'we_lead_interest_medium': 'pill-amber', 'we_lead_interest_low': 'pill-slate' }
  return map[s] || 'pill-slate'
}

function badgeForFollow(s) {
  const map = { 'we_calling_pending': 'pill-slate', 'we_calling_answered': 'pill-teal', 'we_calling_no_answer': 'pill-red' }
  return map[s] || 'pill-slate'
}
</script>
