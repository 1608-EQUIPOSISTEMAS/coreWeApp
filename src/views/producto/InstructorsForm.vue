<template>
  <div ref="instructorForm" class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <div class="if-title-row">
          <h1 class="ds-title">{{ isEdit ? 'Editar docente' : 'Nuevo docente' }}</h1>
          <span v-if="isEdit" class="ds-pill" :class="form.instructor_active ? 'ok' : 'bad'">
            <i class="fa-solid" :class="form.instructor_active ? 'fa-circle-check' : 'fa-circle-xmark'" aria-hidden="true"></i>
            {{ form.instructor_active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <p class="ds-sub">
          <template v-if="isEdit">Docente <span class="if-mono">#{{ idParam }}</span> · datos, accesos, programas y cuentas de pago</template>
          <template v-else>Registra los datos del docente; foto, CV, accesos, programas y cuentas se completan al editarlo</template>
        </p>
      </div>
      <div class="ds-head-actions">
        <button type="button" class="btn-exec btn-exec-outline" @click="cancelar">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Cancelar
        </button>
        <button
          type="button"
          class="btn-exec btn-exec-primary"
          @click="guardar"
          :disabled="saving || isUploadingAny || !isValid"
        >
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
          {{ saving ? 'Guardando…' : (isEdit ? 'Actualizar datos' : 'Registrar instructor') }}
        </button>
      </div>
    </header>

    <template v-if="loaded">
      <!-- ── Datos personales ── -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title"><i class="fa-solid fa-user if-title-icon" aria-hidden="true"></i> Datos personales</h3>
        </header>
        <div class="ds-panel-body ds-stack">
          <div class="ds-form-grid">
            <div class="ds-field">
              <label class="ds-label">Nombre<span class="ds-req">*</span></label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.first_name" type="text" class="ds-input" required placeholder="NOMBRES" />
            </div>
            <div class="ds-field">
              <label class="ds-label">Apellido paterno<span class="ds-req">*</span></label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.last_name" type="text" class="ds-input" required placeholder="APELLIDO PATERNO" />
            </div>
            <div class="ds-field">
              <label class="ds-label">Apellido materno</label>
              <input v-restrict="{ transform: 'upper' }" v-model.trim="form.mother_last_name" type="text" class="ds-input" placeholder="APELLIDO MATERNO" />
            </div>
            <div class="ds-field">
              <label class="ds-label">Tipo de documento<span class="ds-req">*</span></label>
              <SearchSelect
                v-model="form.cat_type_document"
                :items="catalogs.documentTypeList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar..."
                required
              />
            </div>
            <div class="ds-field">
              <label class="ds-label">N° documento<span class="ds-req">*</span></label>
              <input v-model.trim="form.document_number" type="text" class="ds-input if-mono" v-restrict="{ only: 'numbers' }" required placeholder="NÚMERO" />
            </div>
            <div class="ds-field">
              <label class="ds-label">Fecha de nacimiento</label>
              <input v-model="form.birthday" type="date" class="ds-input" />
            </div>
            <div class="ds-field">
              <label class="ds-label">País</label>
              <SearchSelect
                v-model="form.cat_country"
                :items="catalogs.countryList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar país..."
              />
            </div>
            <div class="ds-field">
              <label class="ds-label">Correo<span class="ds-req">*</span></label>
              <input v-model.trim="form.email" type="email" class="ds-input" placeholder="correo@ejemplo.com" required />
            </div>
            <div class="ds-field">
              <label class="ds-label">Teléfono</label>
              <input v-model.trim="form.phone" type="text" class="ds-input if-mono" placeholder="Ej. +51 999 999 999" />
            </div>
          </div>

          <div class="if-divider if-switch-row">
            <span class="ds-label if-inline-label">Estado del instructor</span>
            <label class="exec-switch exec-switch-lg">
              <input type="checkbox" v-model="form.instructor_active" aria-label="Docente activo" />
              <span></span>
            </label>
            <span class="if-switch-text">{{ form.instructor_active ? 'Activo en el sistema' : 'Inactivo' }}</span>
          </div>
        </div>
      </section>

      <!-- ── Información profesional ──
           Visible siempre: linkedin y notas viajan a Odoo al registrar. -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title"><i class="fa-solid fa-briefcase if-title-icon" aria-hidden="true"></i> Información profesional</h3>
        </header>
        <div class="ds-panel-body ds-stack">
          <div class="ds-form-grid">
            <div class="ds-field">
              <label class="ds-label">Puesto relevante</label>
              <input v-model.trim="form.relevant_work" type="text" class="ds-input" placeholder="Ej. Gerente de TI" />
            </div>
            <div class="ds-field">
              <label class="ds-label">Empresa relevante</label>
              <input v-model.trim="form.relevant_company" type="text" class="ds-input" placeholder="Ej. Microsoft" />
            </div>
            <div class="ds-field">
              <label class="ds-label">LinkedIn</label>
              <div class="if-icon-wrap">
                <i class="fa-brands fa-linkedin if-icon if-icon--linkedin" aria-hidden="true"></i>
                <input v-model.trim="form.linkedin" type="url" class="ds-input if-icon-input" placeholder="https://linkedin.com/in/..." />
              </div>
            </div>
            <div class="ds-field if-span-all">
              <label class="ds-label">Resumen de perfil / notas internas</label>
              <textarea v-model="form.profile_resume" class="ds-input" rows="3" placeholder="Breve resumen profesional..."></textarea>
            </div>
          </div>

          <!-- Foto y CV, solo en edición: sp_instructor_register no los conoce -->
          <div v-if="isEdit" class="ds-field if-divider">
            <label class="ds-label">Foto del docente</label>
            <div class="if-photo-row">
              <img v-if="form.photo_url" :src="form.photo_url" class="if-photo" alt="Foto del docente" />
              <div v-else class="if-photo if-photo--empty" aria-hidden="true">
                <i class="fa-solid fa-user"></i>
              </div>
              <div class="if-photo-input">
                <div class="if-icon-wrap">
                  <i class="fa-brands fa-google-drive if-icon if-icon--drive" aria-hidden="true"></i>
                  <input
                    v-model.trim="form.photo_url"
                    type="url"
                    class="ds-input if-icon-input"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                <span class="ds-help">
                  Link de la carpeta DOCENTES de Drive. Se convierte al guardar;
                  hasta entonces el preview puede verse vacío.
                </span>
              </div>
            </div>
          </div>

          <div v-if="isEdit" class="ds-row ds-row--mitad">
            <div class="ds-field">
              <label class="ds-label">Currículum simplificado (CV)</label>
              <FileUploader
                label="Clic para subir CV Simplificado"
                v-model="form.cv_url"
                accept=".pdf,.doc,.docx"
                @uploading="v => (uploading.cv = v)"
              />
            </div>
            <div class="ds-field">
              <label class="ds-label">Currículum documentado</label>
              <FileUploader
                label="Clic para subir CV Documentado"
                v-model="form.cv_documents_url"
                accept=".pdf,.doc,.docx"
                @uploading="v => (uploading.cv_doc = v)"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- ── Accesos y carpetas de clase ──
           Solo en edición: sp_instructor_register no los conoce. -->
      <section v-if="isEdit" class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title"><i class="fa-solid fa-key if-title-icon" aria-hidden="true"></i> Accesos y carpetas de clase</h3>
        </header>
        <div class="ds-panel-body ds-stack">
          <div class="ds-form-grid">
            <template v-for="acceso in ACCESOS" :key="acceso.user">
              <div class="ds-field">
                <label class="ds-label">Usuario {{ acceso.label }}</label>
                <div class="if-icon-wrap">
                  <i :class="[acceso.icon, 'if-icon']" :style="{ color: acceso.color }" aria-hidden="true"></i>
                  <!-- autocomplete off: el navegador ofrece las credenciales de
                       quien esta editando, no las del docente. -->
                  <input v-model.trim="form[acceso.user]" type="text" autocomplete="off" class="ds-input if-icon-input" :placeholder="acceso.placeholder" />
                </div>
              </div>
              <div class="ds-field">
                <label class="ds-label">Contraseña {{ acceso.label }}</label>
                <div class="if-icon-wrap">
                  <input
                    v-model.trim="form[acceso.pass]"
                    :type="claveVisible[acceso.pass] ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="ds-input if-eye-input"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    class="if-eye"
                    @click="claveVisible[acceso.pass] = !claveVisible[acceso.pass]"
                    :title="claveVisible[acceso.pass] ? 'Ocultar' : 'Mostrar'"
                    :aria-label="claveVisible[acceso.pass] ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  >
                    <i :class="claveVisible[acceso.pass] ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </template>
          </div>

          <div class="if-divider ds-stack">
            <div class="if-subhead">
              <span class="ds-label if-inline-label">
                Carpetas de clase <span class="if-count">· {{ form.class_folders.length }} agregada(s)</span>
              </span>
              <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="addClassFolder">
                <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar carpeta
              </button>
            </div>

            <p v-if="form.class_folders.length === 0" class="ds-empty">
              Sin carpetas de clase. Usa "Agregar carpeta" para sumar las que necesite el docente.
            </p>

            <div v-for="(folder, index) in form.class_folders" :key="'folder-'+index" class="if-folder-row">
              <div class="ds-field">
                <label class="ds-label" v-if="index === 0">Nombre</label>
                <input v-model.trim="folder.label" type="text" class="ds-input" :placeholder="`Carpeta ${index + 1}`" />
              </div>
              <div class="ds-field">
                <label class="ds-label" v-if="index === 0">Link</label>
                <input v-model.trim="folder.folder_url" type="url" class="ds-input" placeholder="https://drive.google.com/..." />
              </div>
              <div class="if-folder-actions">
                <a
                  v-if="folder.folder_url"
                  :href="folder.folder_url"
                  target="_blank"
                  class="btn-icon btn-icon-sm"
                  title="Abrir carpeta"
                  aria-label="Abrir carpeta"
                >
                  <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                </a>
                <button type="button" class="btn-icon btn-icon-sm if-danger" @click="form.class_folders.splice(index, 1)" title="Quitar carpeta" aria-label="Quitar carpeta">
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Programas y cuentas de pago ── (solo en edición) -->
      <div v-if="isEdit" class="ds-row ds-row--mitad">
        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-chalkboard-user if-title-icon" aria-hidden="true"></i> Programas personalizados</h3>
            <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="addProgramItem">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Asignar programa
            </button>
          </header>
          <div class="ds-panel-body ds-stack">
            <p v-if="form.programs.length === 0" class="ds-empty">
              No tiene programas personalizados. Usa "Asignar programa" para agregar uno.
            </p>

            <div v-for="(prog, index) in form.programs" :key="'prog-'+index" class="if-item ds-stack">
              <div class="ds-field">
                <label class="ds-label">Programa asignado</label>
                <SearchSelect
                  v-model="prog.program_id"
                  mode="remote"
                  :fetcher="q => programService.programCaller({ q })"
                  label-field="description"
                  value-field="id"
                  sublabel-field="label_ui"
                  placeholder="Buscar programa..."
                  :cache="false"
                  :view-open="6"
                  :model-label="prog.program_name"
                />
              </div>
              <div class="ds-field">
                <label class="ds-label">Perfil específico</label>
                <textarea class="ds-input" rows="2" v-model.trim="prog.profile_summary" placeholder="Expertise en este programa..."></textarea>
              </div>
            </div>
          </div>
        </section>

        <section class="ds-panel">
          <header class="ds-panel-head">
            <h3 class="ds-panel-title"><i class="fa-solid fa-wallet if-title-icon" aria-hidden="true"></i> Información financiera</h3>
            <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="addFinancialItem">
              <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar cuenta
            </button>
          </header>
          <div class="ds-panel-body ds-stack">
            <p v-if="form.financials.length === 0" class="ds-empty">
              No hay cuentas registradas. Usa "Agregar cuenta" para cargar la primera.
            </p>

            <div v-for="(item, index) in form.financials" :key="'fin-'+index" class="if-item ds-form-grid">
              <div class="ds-field">
                <label class="ds-label">Banco (nombre)</label>
                <input v-model="item.bank_name" type="text" class="ds-input" placeholder="Ej. BCP, Interbank..." />
              </div>
              <div class="ds-field">
                <label class="ds-label">Tipo de pago</label>
                <SearchSelect
                  :disabled="!!item.instructor_financial_id"
                  v-model="item.cat_payment_type"
                  :items="catalogs.paymentTypeList"
                  label-field="description"
                  value-field="id"
                  placeholder="Seleccionar..."
                />
              </div>
              <div class="ds-field">
                <label class="ds-label">Tipo de tarifa</label>
                <SearchSelect
                  :disabled="!!item.instructor_financial_id"
                  v-model="item.cat_rate_pay_id"
                  :items="catalogs.ratePayList"
                  label-field="description"
                  value-field="id"
                  placeholder="Seleccionar..."
                />
              </div>
              <div class="ds-field">
                <label class="ds-label">Moneda</label>
                <SearchSelect
                  :disabled="!!item.instructor_financial_id"
                  v-model="item.cat_currency"
                  :items="catalogs.currencyList"
                  label-field="description"
                  value-field="id"
                  placeholder="Seleccionar..."
                />
              </div>
              <div class="ds-field if-span-all">
                <label class="ds-label">Observaciones</label>
                <textarea class="ds-input" rows="2" v-model.trim="item.observations" placeholder="Cta, CCI, etc."></textarea>
              </div>
              <div class="ds-field if-span-all">
                <label class="ds-label">Constancias / adjuntos</label>
                <MultiFileUploader v-model="item.attachments" label="Agregar Constancia" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <section v-else class="ds-panel" aria-busy="true" aria-label="Cargando información del docente">
      <div class="ds-panel-body ds-stack">
        <span v-for="n in 6" :key="n" class="ds-skel"></span>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Estado pegado al título (DESIGN_SYSTEM §5.4): arriba a la derecha no se ve. */
.if-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.if-title-icon { margin-right: 6px; color: var(--ds-muted); }
.if-mono { font-family: var(--ds-font-mono); }
.if-span-all { grid-column: 1 / -1; }

/* Separa un sub-bloque dentro del mismo panel sin abrir otro panel. */
.if-divider { padding-top: var(--ds-gap); border-top: 1px solid var(--ds-border); }
.if-inline-label { margin-bottom: 0; }

.if-switch-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.if-switch-text { font-size: 12.5px; font-weight: 600; color: var(--ds-ink-2); }

/* Input con icono a la izquierda: el padding deja lugar al icono. */
.if-icon-wrap { position: relative; display: flex; align-items: center; }
.if-icon { position: absolute; left: 11px; font-size: 13px; color: var(--ds-muted); pointer-events: none; }
.if-icon--linkedin { color: var(--ds-accent); }
.if-icon--drive { color: var(--ds-ok-ink); }
.if-icon-input { padding-left: 32px; }

/* Mostrar / ocultar contraseña: se guardan en claro para dictárselas al docente. */
.if-eye-input { padding-right: 38px; }
.if-eye {
  position: absolute; right: 3px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border: 0; border-radius: var(--ds-radius-control); background: transparent;
  color: var(--ds-muted); font-size: 13px; cursor: pointer;
}
.if-eye:hover { color: var(--ds-heading); background: var(--ds-surface-3); }
.if-eye:focus-visible { outline: 2px solid var(--ds-accent); outline-offset: 1px; }

.if-photo-row { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
.if-photo-input { flex: 1 1 220px; min-width: 0; }
.if-photo {
  width: 96px; height: 96px; flex: 0 0 96px;
  border-radius: 50%; object-fit: cover;
  border: 1px solid var(--ds-border);
  background: var(--ds-surface-2);
}
.if-photo--empty {
  display: flex; align-items: center; justify-content: center;
  border-style: dashed; color: var(--ds-border-strong); font-size: 32px;
}

.if-subhead { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.if-count { font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--ds-muted); }

/* Carpeta: nombre | link | acciones. Bajo 600 px nombre y link se apilan. */
.if-folder-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto; align-items: end; gap: 8px; }
.if-folder-actions { display: flex; gap: 4px; padding-bottom: 5px; }
.if-danger { color: var(--ds-bad-ink); }

/* Cada programa / cuenta es una tarjeta dentro del panel. */
.if-item { padding: 12px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-sm); background: var(--ds-surface-2); }

@media (max-width: 600px) {
  .if-folder-row { grid-template-columns: minmax(0, 1fr); }
}
</style>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'

import SearchSelect from '@/components/SearchSelect.vue'
import FileUploader from '@/components/FileUploader.vue'
import MultiFileUploader from '@/components/MultiFileUploader.vue'

import { ServiceKeys } from '@/services'

/* ── DI & Utils ── */
const toast              = useToast()
const router             = useRouter()
const route              = useRoute()
const instructorService  = inject(ServiceKeys.Instructor)
const integrationService = inject(ServiceKeys.Integration)
const programService     = inject(ServiceKeys.Program)
const catalog            = inject('catalog')

/* ── Estado de ruta ── */
const idParam = computed(() => {
  const n = Number(route.params?.id)
  return Number.isFinite(n) ? n : null
})
const isEdit  = computed(() => !!idParam.value)
const loaded  = ref(false)
const saving  = ref(false)

const uploading = reactive({ financials: {} })

const isUploadingAny = computed(() =>
  uploading.cv ||
  uploading.cv_doc ||
  Object.values(uploading.financials).some(v => v)
)

/* ── Formulario ── */
const form = reactive({
  person_id:         null,
  first_name:        null,
  last_name:         null,
  mother_last_name:  null,
  document_number:   null,
  cat_type_document: null,
  cat_occupation:    null,
  cat_person_status: null,
  cat_country:       null,
  birthday:          null,
  email:             null,   // requerido para crear usuario Odoo
  phone:             null,
  person_active:     true,
  instructor_active: true,
  profile_resume:    null,   // notas internas → Odoo comment
  resume:            null,
  relevant_company:  null,
  relevant_work:     null,
  profile_summary:   null,
  linkedin:          null,   // → Odoo social_linkedin
  cv_url:            null,
  cv_documents_url:  null,
  photo_url:         null,   // URL, no bytes: la foto vive en Drive
  odoo_username:     null,   // usuario con el que entra a Odoo, no la FK odoo_user_id
  odoo_password:     null,
  teams_username:    null,
  teams_password:    null,
  class_folders:     [],     // lista variable: el guardado reemplaza la lista completa
  financials:        [],
  programs:          []
})

/* ── Catálogos ── */
const catalogs = ref({
  documentTypeList: catalog.options('we_type_document') || [],
  countryList:      catalog.options('we_country')       || [],
  paymentTypeList:  catalog.options('we_way_billing')   || [],
  programList:      catalog.options('we_educational_program') || [],
  ratePayList:      catalog.options('we_rate')          || [],
  currencyList: catalog.options('we_currency', {
    mapItem: x => ({
      id:          x.id,
      description: `${x.code || x.abbreviation} (${x.symbol || x.prefix})`,
      raw:         { ...x }
    })
  }) || []
})

/* ── Validación ── */
const isValid = computed(() =>
  !!form.first_name        &&
  !!form.last_name         &&
  !!form.document_number   &&
  !!form.cat_type_document &&
  !!form.email
)

/* ── Accesos del docente ──
   Las contraseñas se guardan y se muestran en claro a proposito: sirven para
   dictarselas al docente, no para autenticarlo contra este sistema.
   El color del icono es un token y no el hex de la marca (Odoo morado, Teams
   índigo): así se lee también en modo oscuro. */
const ACCESOS = [
  { user: 'odoo_username',  pass: 'odoo_password',  label: 'Odoo',  icon: 'fa-solid fa-cube',  color: 'var(--ds-violet-ink)', placeholder: 'usuario.odoo' },
  { user: 'teams_username', pass: 'teams_password', label: 'Teams', icon: 'fa-solid fa-video', color: 'var(--ds-info-ink)',   placeholder: 'docente@weeducacion.com' }
]
const claveVisible = reactive({ odoo_password: false, teams_password: false })

/* ── Gestión de listas dinámicas ── */
function addFinancialItem () {
  form.financials.push({
    instructor_financial_id: null,
    attachments:     [],
    bank_name:       '',
    cat_payment_type: null,
    cat_rate_pay_id:  null,
    cat_currency:    null,
    observations:    ''
  })
  uploading.financials[form.financials.length - 1] = false
}

function addClassFolder () {
  form.class_folders.push({ label: '', folder_url: '' })
}

function addProgramItem () {
  form.programs.push({
    instructor_program_id: null,
    program_id:            null,
    program_name:          null,
    profile_summary:       '',
    active:                true
  })
}

/* ── Carga de datos (edición) ── */
async function loadData (id) {
  try {
    const data = await instructorService.instructorGet({ id })
    if (!data) throw new Error('No se encontraron datos')

    Object.assign(form, {
      person_id:         data.person_id         ?? null,
      first_name:        data.first_name        ?? '',
      last_name:         data.last_name         ?? '',
      mother_last_name:  data.mother_last_name  ?? '',
      document_number:   data.document_number   ?? '',
      cat_type_document: data.cat_type_document ?? null,
      cat_country:       data.cat_country       ?? null,
      birthday:          data.birthday ? String(data.birthday).substring(0, 10) : null,
      email:             data.email             ?? null,
      phone:             data.phone             ?? null,
      person_active:     data.person_active     !== 'N',
      instructor_active: data.instructor_active !== 'N',
      profile_resume:    data.profile_resume    ?? null,
      resume:            data.resume            ?? null,
      relevant_company:  data.relevant_company  ?? null,
      relevant_work:     data.relevant_work     ?? null,
      profile_summary:   data.profile_summary   ?? null,
      linkedin:          data.linkedin          ?? null,
      cv_url:            data.cv_url            || null,
      cv_documents_url:  data.cv_documents_url  || null,
      photo_url:         data.photo_url         || null,
      odoo_username:     data.odoo_username     ?? null,
      odoo_password:     data.odoo_password     ?? null,
      teams_username:    data.teams_username    ?? null,
      teams_password:    data.teams_password    ?? null
    })

    if (Array.isArray(data.class_folders)) {
      form.class_folders = data.class_folders.map(f => ({
        label:      f.label      || '',
        folder_url: f.folder_url || ''
      }))
    }

    if (Array.isArray(data.financials)) {
      form.financials = data.financials.map(f => ({
        instructor_financial_id: f.instructor_financial_id,
        attachments:     Array.isArray(f.attachments) ? f.attachments : [],
        bank_name:       f.bank_name       || '',
        cat_payment_type: f.cat_payment_type,
        cat_rate_pay_id:  f.cat_rate_pay_id,
        observations:    f.observations,
        cat_currency:    f.cat_currency
      }))
    }

    if (Array.isArray(data.programs)) {
      form.programs = data.programs.map(p => ({
        instructor_program_id: p.instructor_program_id,
        program_id:            p.program_id,
        program_name:          p.program_name,
        profile_summary:       p.profile_summary,
        active:                p.active === 'Y'
      }))
    }

  } catch (error) {
    console.error(error)
    toast.error('Error cargando instructor')
    router.push({ name: 'Instructor' })
  }
}

/* ── Payload ── */
function buildPayload () {
  const payload = {
    instructor: {
      person_id:           form.person_id         ?? null,
      first_name:          form.first_name?.trim(),
      last_name:           form.last_name?.trim(),
      mother_last_name:    form.mother_last_name?.trim(),
      document_number:     form.document_number?.trim(),
      cat_type_document:   form.cat_type_document,
      cat_country:         form.cat_country,
      birthday:            form.birthday           || null,
      person_active:       form.person_active      ? 'Y' : 'N',
      instructor_active:   form.instructor_active  ? 'Y' : 'N',
      email:               form.email              ?? null,
      phone:               form.phone              ?? null,
      linkedin:            form.linkedin           ?? null,
      relevant_company:    form.relevant_company   ?? null,
      relevant_work:       form.relevant_work      ?? null,
      profile_resume:      form.profile_resume     ?? null,
      cv_url:              form.cv_url             ?? null,
      cv_documents_url:    form.cv_documents_url   ?? null,
      photo_url:           form.photo_url          ?? null,
      odoo_username:       form.odoo_username      ?? null,
      odoo_password:       form.odoo_password      ?? null,
      teams_username:      form.teams_username     ?? null,
      teams_password:      form.teams_password     ?? null,
      // Se manda la lista completa (el SP la reemplaza) y sin las filas a medio
      // llenar: una carpeta sin link no es una carpeta.
      class_folders: form.class_folders
        .filter(f => f.folder_url?.trim())
        .map(f => ({ label: f.label?.trim() || null, folder_url: f.folder_url.trim() })),
      financials: form.financials.map(f => ({
        instructor_financial_id: f.instructor_financial_id || null,
        attachments:             f.attachments             || [],
        bank_name:               f.bank_name,
        cat_payment_type:        f.cat_payment_type,
        cat_rate_pay_id:         f.cat_rate_pay_id,
        observations:            f.observations,
        cat_currency:            f.cat_currency
      })),
      programs: form.programs.map(p => ({
        instructor_program_id: p.instructor_program_id || null,
        program_id:            p.program_id,
        profile_summary:       p.profile_summary,
        active:                p.active ? 'Y' : 'N'
      }))
    }
  }

  if (isEdit.value) payload.id = idParam.value
  return payload
}

const instructorForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(instructorForm)

/* ── Guardar ── */
async function guardar () {
  if (!requiredFieldsFilled()) return
  if (!isValid.value) {
    toast.warning('Complete los campos obligatorios (*)')
    return
  }

  saving.value = true
  try {
    const payload  = buildPayload()
    const response = isEdit.value
      ? await instructorService.instructorUpdate(payload)
      : await instructorService.instructorRegister(payload)

    if (response) {
      toast.success(isEdit.value ? 'Actualizado correctamente' : 'Registrado correctamente')
      // El docente quedó guardado en el ERP aunque Odoo falle: avisarlo, no esconderlo.
      if (response.odoo_error) toast.warning(`No se pudo crear su usuario en Odoo: ${response.odoo_error}`, { timeout: false })
      router.push({ name: 'Instructor' })
    }
  } catch (e) {
    console.error(e)
    toast.error('Error al guardar: ' + (e.response?.data?.message || e.message || 'Error desconocido'))
  } finally {
    saving.value = false
  }
}

function cancelar () { router.back() }

/* ── Lifecycle ── */
onMounted(async () => {
  if (isEdit.value) {
    await loadData(idParam.value)
  } else {
    form.cat_country = catalogs.value.countryList.find(c => c.description?.includes('PERU'))?.id || null
  }
  loaded.value = true
})
</script>