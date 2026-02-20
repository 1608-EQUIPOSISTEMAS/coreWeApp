<template>
  <div class="exec-shell form-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text d-flex align-items-center gap-3">
            <div>
              <span class="brand-eyebrow">Gestión Académica</span>
              <h1 class="brand-title">{{ isEdit ? 'Editar Programa' : 'Nuevo Programa' }}</h1>
            </div>
            <span v-if="isEdit" class="pill pill-slate border mt-3">ID: {{ idParam }}</span>
          </div>
        </div>

        <div class="masthead-actions">
          <button type="button" class="btn-exec btn-exec-ghost" @click="cancelar">
            <i class="fa-solid fa-arrow-left"></i> Cancelar
          </button>
          <button
            type="button"
            class="btn-exec btn-exec-primary px-4"
            @click="guardar"
            :disabled="saving || !isValid"
          >
            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
            {{ saving ? 'Guardando…' : (isEdit ? 'Actualizar Programa' : 'Crear Programa') }}
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body pb-5 d-flex justify-content-center" v-if="loaded">
      <div class="exec-form-wrapper w-100" style="max-width: 1100px;">

        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title"><i class="fa-solid fa-cube me-2 text-primary"></i> Datos Generales del Programa</h6>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="exec-label">Nombre General <span class="c-red">*</span></label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.program_name"
                type="text"
                class="exec-input-light w-100"
                required
                placeholder="Ej. DIPLOMADO EN GESTIÓN PÚBLICA"
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Esquema <span class="c-red">*</span></label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.skem_clasification"
                type="text"
                class="exec-input-light w-100"
                required
                placeholder="ESQUEMA"
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">URL Web</label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.link"
                type="text"
                class="exec-input-light w-100"
                placeholder="https://..."
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Tipo de programa <span class="c-red">*</span></label>
              <SearchSelect
                :disabled="isEdit"
                v-model="form.cat_type_program"
                :items="catalogs.programTypeList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar..."
                :model-label="form.cat_type_program_label"
                class="exec-select-light w-100"
                required
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Línea de negocio <span class="c-red">*</span></label>
              <SearchSelect
                :disabled="isEdit"
                v-model="form.cat_category"
                :items="catalogs.categoryList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar..."
                :model-label="form.cat_category_label"
                class="exec-select-light w-100"
              />
            </div>

            <div class="col-md-3">
              <label class="exec-label">Modalidad <span class="c-red">*</span></label>
              <SearchSelect
                :disabled="isEdit"
                v-model="form.cat_model_modality"
                :items="catalogs.modalityList"
                label-field="description"
                value-field="id"
                placeholder="Seleccionar..."
                class="exec-select-light w-100"
                required
              />
            </div>

            <div class="col-md-3 d-flex flex-column justify-content-center align-items-center border-start ps-3">
              <label class="exec-label mb-2">Estado del Programa</label>
              <label class="exec-switch">
                <input type="checkbox" v-model="form.active" />
                <span></span>
              </label>
              <span class="x-small text-muted mt-1 fw-600">{{ form.active ? 'ACTIVO' : 'INACTIVO' }}</span>
            </div>
          </div>
        </div>

        <div class="exec-fieldset">
          <div class="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
            <h6 class="fieldset-title mb-0 border-0 pb-0"><i class="fa-solid fa-layer-group me-2 text-info"></i> Versiones y Estructura</h6>
            <button type="button" class="btn-exec btn-exec-outline text-primary border-primary" @click="agregarVersion">
              <i class="fa-solid fa-plus me-1"></i> Agregar Versión
            </button>
          </div>

          <div v-if="form.program_versions.length === 0" class="empty-state">
            <i class="fa-solid fa-inbox fa-2x mb-2 text-slate-300"></i>
            <p class="mb-0">No hay versiones definidas. Agrega al menos una para continuar.</p>
          </div>

          <div
            v-for="(ver, idx) in form.program_versions"
            :key="ver._key"
            class="exec-version-card mb-4"
          >
            <div class="version-header d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center gap-2">
                <span class="version-badge">V{{ idx + 1 }}</span>
                <span v-if="ver.version_code" class="text-mono fw-700 accent-text">{{ ver.version_code }}</span>
              </div>
              <div class="d-flex gap-2">
                <span v-if="ver.sessions" class="pill pill-slate border"><i class="fa-solid fa-calendar-days me-1"></i> {{ ver.sessions }} sesiones</span>
                <span v-if="ver.abbreviation" class="pill pill-slate border">{{ ver.abbreviation }}</span>
              </div>
            </div>

            <div class="version-body p-3 row g-3">
              <div class="col-md-4">
                <label class="exec-label">Certificación <span class="c-red">*</span></label>
                <input
                  v-model.trim="ver.description"
                  type="text"
                  class="exec-input-light w-100"
                  placeholder="Descripción de certificación..."
                  required
                />
              </div>

              <div class="col-md-4">
                <label class="exec-label">Nombre Publicitario <span class="c-red">*</span></label>
                <input
                  v-model.trim="ver.brand_name"
                  type="text"
                  class="exec-input-light w-100"
                  placeholder="Nombre comercial..."
                  required
                />
              </div>

              <div class="col-md-4">
                <label class="exec-label">Abreviatura <span class="c-red">*</span></label>
                <input
                  v-restrict="{ transform: 'upper' }"
                  v-model.trim="ver.abbreviation"
                  type="text"
                  class="exec-input-light w-100"
                  required
                  placeholder="Ej. DGP-01"
                />
              </div>

              <div class="col-md-2">
                <label class="exec-label">Código <span class="c-red">*</span></label>
                <input
                  v-restrict="{ transform: 'upper' }"
                  v-model.trim="ver.version_code"
                  :disabled="isEdit && !ver.new"
                  type="text"
                  class="exec-input-light w-100 text-mono fw-600"
                  placeholder="CÓDIGO"
                  required
                />
              </div>

              <div class="col-md-2">
                <label class="exec-label">Nro. Sesiones <span class="c-red">*</span></label>
                <input
                  v-model.number="ver.sessions"
                  type="text"
                  v-restrict="{ only: 'numbers' }"
                  class="exec-input-light w-100 text-mono"
                  placeholder="0"
                  required
                />
              </div>

              <div class="col-md-4">
                <label class="exec-label">URL Ficha Técnica</label>
                <div class="input-group-custom">
                  <i class="fa-solid fa-link input-icon"></i>
                  <input
                    v-model.trim="ver.expedient_link"
                    type="url"
                    class="exec-input-light w-100 icon-padded"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div class="col-md-2">
                <label class="exec-label">Categoría Curso <span class="c-red">*</span></label>
                <SearchSelect
                  v-model="ver.cat_course_category"
                  :items="catalogs.courseCategoryList"
                  label-field="description"
                  value-field="id"
                  placeholder="Categoría..."
                  required
                  :model-label="ver.cat_course_category_label"
                  class="exec-select-light w-100"
                />
              </div>

              <div class="col-md-2 d-flex flex-column align-items-center justify-content-center">
                <label class="exec-label mb-2">Estado Activo</label>
                <label class="exec-switch" @click="mapActiveChild(ver)">
                  <input type="checkbox" v-model="ver.active" />
                  <span></span>
                </label>
              </div>
            </div>

            <div class="version-footer p-3 bg-slate-50 border-top">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="exec-label mb-0" style="color: var(--teal-600);">Programas / Versiones Hijas</div>
                <button
                  type="button"
                  class="btn-exec btn-exec-ghost text-teal-600 btn-sm p-1"
                  @click="onAddChildClick(ver)"
                  v-if="form.cat_type_program != 'we_program_type_course'"
                  :disabled="!ver.program_version_id"
                >
                  <i class="fa-solid fa-plus-circle me-1"></i> Agregar curso hijo
                </button>
              </div>

              <div v-if="childrenByParent(ver).length" class="row g-2">
                <div class="col-md-4" v-for="(child, idy) in ver.childs" :key="idy">
                  <div class="child-select-wrapper">
                    <span class="child-order">{{ idy + 1 }}</span>
                    <SearchSelect
                      v-model="child.program_version_id"
                      mode="remote"
                      showSubValue
                      sublabel-field="version_code"
                      :fetcher="q => programService.programVersionCaller({ q })"
                      label-field="abbreviation"
                      :disabled="child.program_version_id"
                      value-field="program_version_id"
                      placeholder="Buscar hijo..."
                      :minChars="0"
                      :cache="false"
                      :model-label="child.label"
                      class="exec-select-light w-100"
                      required
                    />
                  </div>
                </div>
              </div>
              <div v-else class="text-muted small fst-italic">
                No hay cursos hijos vinculados a esta versión.
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   TOKENS & BASE (Mismos que el listado)
═══════════════════════════════════════════════ */
:root {
  --navy-900: #0f172a; --navy-800: #1e293b; --navy-700: #334155;
  --slate-400: #94a3b8; --slate-300: #cbd5e1; --slate-100: #f1f5f9; --slate-50:  #f8fafc;
  --teal-600:  #12274e; --teal-500:  #12274e;
  --blue-600:  #2563eb;
  --amber-500: #f59e0b;
  --red-600:   #dc2626;
  --white:     #ffffff;
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --border:         #e2e8f0;
}

@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

.exec-shell {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  background: var(--slate-50);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

/* Masthead */
.exec-masthead { background: var(--navy-900); color: var(--white); border-bottom: 1px solid var(--navy-700); position: sticky; top: 0; z-index: 100;}
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: var(--white); }

.masthead-actions { display: flex; gap: 10px; align-items: center; }
.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
.btn-exec-ghost { background: transparent; color: var(--slate-300); border: 1px solid transparent; }
.btn-exec-ghost:hover { background: rgba(255,255,255,0.07); color: var(--white); }
.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-primary:disabled { background: var(--slate-400); cursor: not-allowed; opacity: 0.8;}
.btn-exec-outline { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-exec-outline:hover { background: var(--slate-50); color: var(--text-primary); }
.btn-sm { padding: 4px 10px; font-size: 11px; }

/* Wrapper Central */
.exec-body { padding: 32px 28px; }
.exec-form-wrapper { background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 32px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }

/* Fieldsets y Labels */
.exec-fieldset { background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: 20px 24px; margin-bottom: 24px; }
.fieldset-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); font-weight: 700; margin-bottom: 20px; border-bottom: 1px solid var(--slate-100); padding-bottom: 10px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px; }
.c-red { color: var(--red-600); }

/* Inputs estándar */
.exec-input-light, .exec-select-light { background: var(--white); border: 1px solid var(--border); border-radius: 4px; padding: 8px 12px; font-size: 13px; font-family: inherit; color: var(--text-primary); transition: all 0.15s; height: 38px; }
.exec-input-light:focus, .exec-select-light:focus { outline: none; border-color: var(--teal-500); box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1); }
.exec-input-light:disabled, .exec-select-light:disabled { background-color: var(--slate-50); color: var(--slate-400); cursor: not-allowed; }
.input-group-custom { position: relative; display: flex; align-items: center; }
.input-icon { position: absolute; left: 12px; color: var(--slate-400); font-size: 12px; }
.icon-padded { padding-left: 32px; }

/* Switch Toggle Custom */
.exec-switch { position: relative; width: 44px; height: 24px; display: inline-block; cursor: pointer; }
.exec-switch input { display: none; }
.exec-switch span { position: absolute; inset: 0; background: var(--slate-300); border-radius: 9999px; transition: .2s; }
.exec-switch span::after { content: ''; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.exec-switch input:checked + span { background: var(--teal-500); }
.exec-switch input:checked + span::after { left: 23px; }

/* Text Utils */
.text-mono { font-family: 'IBM Plex Mono', monospace; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted); } .accent-text { color: var(--teal-600); }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }

/* Pills */
.pill { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; }
.pill-slate { background: var(--slate-50); color: var(--text-secondary); }
.pill-teal  { background: #ccfbf1; color: #0f766e; border-color: #99f6e4 !important;}
.pill-red   { background: #fee2e2; color: #b91c1c; border-color: #fecaca !important;}

/* Bloques de Versión */
.exec-version-card { border: 1px solid var(--border); border-radius: 6px; background: var(--white); overflow: hidden;}
.version-header { background: var(--slate-50); border-bottom: 1px solid var(--border); padding: 10px 16px; }
.version-badge { background: var(--navy-900); color: var(--white); font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; }
.empty-state { text-align: center; color: var(--slate-400); font-size: 13px; font-style: italic; padding: 20px; background: var(--slate-50); border-radius: 6px; border: 1px dashed var(--slate-300);}

/* Selector de hijos */
.child-select-wrapper { display: flex; align-items: center; gap: 8px; }
.child-order { background: var(--teal-600); color: var(--white); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 4px; font-size: 11px; font-weight: 700; flex-shrink: 0;}
</style>
<script setup>
  import { ref, reactive, computed, onMounted, inject } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import SearchSelect from '@/components/SearchSelect.vue'
  import { ServiceKeys } from '@/services'
  import { useToast } from 'vue-toastification'

import FileUploader from '@/components/FileUploader.vue'
  const toast = useToast()
  const router = useRouter()
  const route = useRoute()
  const programService = inject(ServiceKeys.Program)
  const catalog = inject('catalog')

  const idParam = computed(() => {
    const n = Number(route.params?.id)
    return Number.isFinite(n) ? n : null
  })
  const isEdit = computed(() => !!idParam.value)

  const loaded = ref(false)
  const saving = ref(false)

  const form = reactive({
    program_name: null,
    skem_clasification: null,
    cat_type_program: null,
    cat_category: null,
    cat_model_modality: null,
    link: null,
    active: true,
    program_versions: []
  })

  const catalogs = ref({
    programTypeList: catalog?.options('we_program_type') || [],
    categoryList: catalog?.options('we_program_category') || [],
    modalityList: catalog?.options('we_modality') || [],
    courseCategoryList: catalog?.options('we_course_category') || []
  })

  const typeProgramLabel = computed(() => {
    const f = catalogs.value.programTypeList.find(i => i.id === form.cat_type_program)
    return f ? f.description : ''
  })

  let localKeyCounter = 1
  function makeVersionRow(partial = {}) {
    return {
      program_version_id: partial.program_version_id ?? null,
      version_code: partial.version_code ?? '',
      sessions: partial.sessions ?? 0,
      description: partial.description ?? '',
      abbreviation: partial.abbreviation ?? '',
      expedient_link: partial.expedient_link ?? null,
      active: partial.active ?? true,
      brand_name: partial.brand_name ?? null,
      cat_course_category: partial.cat_course_category ?? null,
      cat_course_category_label: partial.cat_course_category_label ?? null,
      new:partial.new,
      observations: partial.observations ?? '',
      // arreglo reactivo con los hijos de esta versión
      childs: partial.childs ? [...partial.childs] : [],
      _key: partial._key ?? `ver-${localKeyCounter++}`
    }
  }

  function agregarVersion() {
    form.program_versions.push(
      makeVersionRow({
        version_code: '',
        sessions: 0,
        description: '',
        abbreviation: '',
        brand_name: '',
        cat_course_category: null,
        expedient_link: null,
        new: true
      })
    )
  }

  const hasAtLeastOneValidVersion = computed(() => {
    return form.program_versions.some(v =>
      v.version_code &&
      v.version_code.trim() !== '' &&
      v.sessions !== null &&
      v.sessions !== '' &&

      !Number.isNaN(Number(v.sessions))
    )
  })

  const isValid = computed(() => {
    return (
      !!form.program_name &&
      !!form.cat_type_program &&
      !!form.cat_model_modality &&
      !!form.cat_category &&
      hasAtLeastOneValidVersion.value
    )
  })

  /**
   * Helpers de hijos por versión (para la vista)
   */
  function parentKey(ver) {
    return ver.program_version_id ?? ver._key
  }

  function childrenByParent(ver) {
    return Array.isArray(ver.childs) ? ver.childs : []
  }

  function removeChildVersion(pKey, childId) {
    const parent = form.program_versions.find(v => parentKey(v) === pKey)
    if (!parent || !Array.isArray(parent.childs)) return
    parent.childs = parent.childs.filter(c => c.id !== childId)
  }

  function onAddChildClick(ver) {
    if (!ver.program_version_id) {
      toast.info('Guarda el programa para poder vincular cursos hijos.')
      return
    }

    if (!Array.isArray(ver.childs)) {
      ver.childs = []
    }

    // Placeholder: aquí deberías setear un ID real cuando elijas una versión hija
    ver.childs.push({
      program_version_id: null, // Este se llenará con la selección del SearchSelect
      label: '', // Este se llenará con la descripción del SearchSelect
    })
  }

  /**
   * Normaliza lo que venga del backend en children_detail
   * a la forma que usa el frontend: { id, code, label }
   */
  function normalizeChildrenDetail(childrenDetail) {
    console.log(childrenDetail)
    if (!Array.isArray(childrenDetail)) return []
    return childrenDetail
      .map(ch => {
        return {
          program_version_id: ch.child_program_version_id,
          version_code: ch.version_code,
          label: ch.label,
          expedient_link: ch.expedient_link,

          label: ch.abbreviation
        }
      })
  }

  /**
   * Carga datos de /programget
   * (el backend ahora expone program_versions con children_ids / children_detail)
   */
  async function loadData(id) {
    const data = await programService.programGet({ id })

    form.program_name = data.program_name ?? null
    form.cat_type_program = data.cat_type_program ?? null
    form.cat_category = data.cat_category ?? null
    form.link = data.link ?? null

    form.cat_model_modality = data.cat_model_modality ?? null
    form.active = data.active === 'N' ? false : true
    form.cat_type_program_label = data.cat_type_program_label
    form.cat_category_label = data.cat_category_label
    form.skem_clasification = data.skem_clasification ?? ''
    const versions = Array.isArray(data.program_versions) ? data.program_versions : []
    console.log(versions)
    form.program_versions = versions.map(v =>
      makeVersionRow({
        program_version_id: v.program_version_id ?? null,
        version_code: v.version_code ?? '',
        sessions: v.sessions ?? 0,
        new:false,
        expedient_link: v.expedient_link ?? null,
        description: v.description ?? '',
        active: v.active === 'N' ? false : true,
        brand_name: v.brand_name ?? null,
        cat_course_category: v.cat_course_category ?? null,
        cat_course_category_label: v.cat_course_category_label ?? null,
        abbreviation: v.abbreviation ?? '',
        observations: v.observations ?? '',
        childs: normalizeChildrenDetail(v.children_detail ?? v.children ?? [])
      })
    )
    console.log(form.program_versions)
  }

  /**
   * De un row de versión arma el array children_ids
   * que espera el SP (solo IDs numéricos válidos).
   */
  function buildChildrenIdsFromRow(v) {
    console.log("data: \n")

    if (!Array.isArray(v.childs)) return null
    const ids = v.childs
      .map(c => Number(c.program_version_id))

    console.log(ids.length)
    // si quieres diferenciar "sin cambios" vs "deja sin hijos", puedes
    // devolver null cuando no haya ids; por ahora devolvemos [] para
    // que el SP limpie vínculos si corresponde.
    return ids.length>0 ? ids : []
  }


  /**
   * Payload para /programregister
   * (program_versions sin ID, pero ya alineado con el schema del backend)
   */
  function buildPayloadForRegister() {
    return {
      program: {
        program_name: form.program_name || null,
        cat_type_program: form.cat_type_program ?? null,
        link: form.link || null,

        skem_clasification: form.skem_clasification || null,
        cat_category: form.cat_category ?? null,
        cat_model_modality: form.cat_model_modality ?? null,
        active: form.active ? 'Y' : 'N',
        program_versions: form.program_versions.map(v => ({
          version_code: v.version_code || null,
          sessions: v.sessions != null ? Number(v.sessions) : null,
          description: v.description || null,
          expedient_link: v.expedient_link ?? null,
          active: v.active ? 'Y' : 'N',
          brand_name: v.brand_name || null,

          abbreviation: v.abbreviation || null,
          observations: v.observations || null,
          cat_course_category: v.cat_course_category || null,

          // opcional: el SP puede usarlo para estructura si algún día
          // permites hijos en alta
          children_ids: buildChildrenIdsFromRow(v)
        }))
      }
    }
  }

  /**
   * Payload para /programupdate
   * (program_versions con ID + children_ids, ya no se envía version_structure)
   */
  function buildPayloadForUpdate() {
    return {
      id: idParam.value,
      program: {
        program_name: form.program_name || null,
        link: form.link || null,
        cat_type_program: form.cat_type_program ?? null,
        cat_category: form.cat_category ?? null,
        cat_model_modality: form.cat_model_modality ?? null,
        active: form.active ? 'Y' : 'N',
        skem_clasification: form.skem_clasification || null,
        new_active_version_id: form.program_versions.find(v => v.active=='Y')?.program_version_id ?? null,
        program_versions: form.program_versions
          // .filter(v => v.program_version_id != null)
          .map(v => ({
            program_version_id: v.program_version_id,
            version_code: v.version_code || null,
            expedient_link: v.expedient_link ?? null,
            brand_name: v.brand_name || null,
            sessions: v.sessions != null ? Number(v.sessions) : null,
            description: v.description || null,
            abbreviation: v.abbreviation || null,
            observations: v.observations || null,
            active: v.active ? 'Y' : 'N',
            cat_course_category: v.cat_course_category || null,
            children_ids: buildChildrenIdsFromRow(v)
          }))
      }
    }
  }

  async function guardar() {
    if (!isValid.value) return
    saving.value = true
    try {
      if (isEdit.value) {
        const payload = buildPayloadForUpdate()
        const r = await programService.programUpdate(payload)
        if (r.program_id) {
          toast.success('Programa actualizado correctamente.')
          router.push({ name: 'program' })
        } else {
          toast.error('Problemas al intentar actualizar el programa.')
        }
      } else {
        const payload = buildPayloadForRegister()
        const r = await programService.programRegister(payload)
        if (r.program_id) {
          toast.success('Programa creado correctamente.')
          router.push({ name: 'program' })
        } else {
          toast.error('Problemas al intentar crear el programa.')
        }
      }
    } catch (e) {
      console.error('Error guardando programa:', e)
      toast.error('Ocurrió un error al guardar.')
    } finally {
      saving.value = false
    }
  }

  function cancelar() {
    router.back()
  }

  onMounted(async () => {
    if (isEdit.value) {
      await loadData(idParam.value)
    } else {
      form.active = true
      agregarVersion()
    }
    loaded.value = true
  })

  function mapActiveChild(child){
    form.program_versions.forEach(ver => {
      if (ver.program_version_id != child.program_version_id) {
        ver.active = false
      }
    })

  }
</script>
