<template>
  <div ref="programForm" class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <!-- El estado va pegado al título (DESIGN_SYSTEM §5.4): arriba a la derecha no se ve -->
        <div class="pf-title-row">
          <h1 class="ds-title">{{ isEdit ? (form.program_name || 'Programa') : 'Nuevo programa' }}</h1>
          <span v-if="isEdit && loaded" class="ds-pill" :class="form.active ? 'ok' : ''">
            <i class="fa-solid" :class="form.active ? 'fa-circle-check' : 'fa-circle-pause'" aria-hidden="true"></i>
            {{ form.active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <p class="ds-sub">
          <template v-if="isEdit">
            <span class="mono">#{{ idParam }}</span> · {{ form.program_versions.length }} {{ form.program_versions.length === 1 ? 'versión' : 'versiones' }}
          </template>
          <template v-else>Completa los datos generales y al menos una versión.</template>
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
          :disabled="saving || !isValid"
        >
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
          {{ saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear programa') }}
        </button>
      </div>
    </header>

    <template v-if="loaded">
      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">Datos generales del programa</h3>
        </header>
        <div class="ds-panel-body pf-grid">
          <div class="ds-field pf-span-2">
            <label class="ds-label" for="pf-name">Nombre general<span class="ds-req">*</span></label>
            <input
              id="pf-name"
              v-restrict="{ transform: 'upper' }"
              v-model.trim="form.program_name"
              type="text"
              class="ds-input"
              required
              placeholder="Ej. DIPLOMADO EN GESTIÓN PÚBLICA"
            />
          </div>

          <div class="ds-field">
            <label class="ds-label" for="pf-skem">Esquema<span class="ds-req">*</span></label>
            <input
              id="pf-skem"
              v-restrict="{ transform: 'upper' }"
              v-model.trim="form.skem_clasification"
              type="text"
              class="ds-input"
              required
              placeholder="ESQUEMA"
            />
          </div>

          <div class="ds-field">
            <label class="ds-label" for="pf-link">URL web</label>
            <div class="pf-icon-input">
              <i class="fa-solid fa-link" aria-hidden="true"></i>
              <input
                id="pf-link"
                v-model.trim="form.link"
                type="url"
                class="ds-input"
                placeholder="https://..."
              />
            </div>
          </div>

          <div class="ds-field">
            <label class="ds-label">Tipo de programa<span class="ds-req">*</span></label>
            <SearchSelect
              :disabled="isCatLocked('cat_type_program')"
              v-model="form.cat_type_program"
              :items="catalogs.programTypeList"
              label-field="description"
              value-field="id"
              placeholder="Seleccionar..."
              :model-label="form.cat_type_program_label"
              required
            />
          </div>

          <div class="ds-field">
            <label class="ds-label">Categoría del programa<span class="ds-req">*</span></label>
            <SearchSelect
              :disabled="isCatLocked('cat_category')"
              v-model="form.cat_category"
              :items="catalogs.categoryList"
              label-field="description"
              value-field="id"
              placeholder="Seleccionar..."
              :model-label="form.cat_category_label"
              required
            />
          </div>

          <div class="ds-field">
            <label class="ds-label">Línea de negocio<span class="ds-req">*</span></label>
            <SearchSelect
              :disabled="isCatLocked('cat_business_line_id')"
              v-model="form.cat_business_line_id"
              :items="catalogs.businessLineList"
              label-field="description"
              value-field="id"
              placeholder="Seleccionar..."
              required
            />
          </div>

          <div class="ds-field">
            <label class="ds-label">Modalidad<span class="ds-req">*</span></label>
            <SearchSelect
              :disabled="isCatLocked('cat_model_modality')"
              v-model="form.cat_model_modality"
              :items="catalogs.modalityList"
              label-field="description"
              value-field="id"
              placeholder="Seleccionar..."
              required
            />
          </div>

          <div class="ds-field">
            <label class="ds-label">Estado del programa</label>
            <div class="pf-switch">
              <label class="exec-switch exec-switch-lg">
                <input type="checkbox" v-model="form.active" />
                <span></span>
              </label>
              <span>{{ form.active ? 'Activo en el sistema' : 'Inactivo' }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title">Versiones y estructura</h3>
          <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="agregarVersion">
            <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar versión
          </button>
        </header>

        <div class="ds-panel-body pf-versions">
          <p v-if="form.program_versions.length === 0" class="ds-empty">
            No hay versiones definidas. Usa "Agregar versión" para crear al menos una.
          </p>

          <article
            v-for="(ver, idx) in form.program_versions"
            :key="ver._key"
            class="pf-version"
          >
            <header class="pf-version-head">
              <div class="pf-version-id">
                <span class="pf-version-badge">V{{ idx + 1 }}</span>
                <span v-if="ver.version_code" class="mono pf-version-code">{{ ver.version_code }}</span>
              </div>
              <div class="pf-version-tags">
                <span v-if="ver.sessions" class="ds-pill"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i> {{ ver.sessions }} sesiones</span>
                <span v-if="ver.abbreviation" class="ds-pill">{{ ver.abbreviation }}</span>
                <button
                  v-if="form.program_versions.length > 1 && ver.new"
                  type="button"
                  class="btn-icon btn-icon-sm"
                  title="Eliminar versión"
                  aria-label="Eliminar versión"
                  @click="form.program_versions.splice(idx, 1)"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            </header>

            <div class="pf-grid pf-grid--version">
              <div class="ds-field pf-span-2">
                <label class="ds-label">Certificación<span class="ds-req">*</span></label>
                <input
                  v-model.trim="ver.description"
                  type="text"
                  class="ds-input"
                  placeholder="Descripción de certificación..."
                  required
                />
              </div>

              <div class="ds-field pf-span-2">
                <label class="ds-label">Nombre publicitario<span class="ds-req">*</span></label>
                <input
                  v-model.trim="ver.brand_name"
                  type="text"
                  class="ds-input"
                  placeholder="Nombre comercial..."
                  required
                />
              </div>

              <div class="ds-field pf-span-2">
                <label class="ds-label">Abreviatura<span class="ds-req">*</span></label>
                <input
                  v-restrict="{ transform: 'upper' }"
                  v-model.trim="ver.abbreviation"
                  type="text"
                  class="ds-input"
                  required
                  placeholder="Ej. DGP-01"
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Código<span class="ds-req">*</span></label>
                <input
                  v-restrict="{ transform: 'upper' }"
                  v-model.trim="ver.version_code"
                  :disabled="isEdit && !ver.new"
                  type="text"
                  class="ds-input mono"
                  placeholder="CÓDIGO"
                  required
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Nro. sesiones<span class="ds-req">*</span></label>
                <input
                  v-model.number="ver.sessions"
                  type="text"
                  v-restrict="{ only: 'numbers' }"
                  class="ds-input mono"
                  placeholder="0"
                  required
                />
              </div>

              <div class="ds-field pf-span-2">
                <label class="ds-label">URL ficha técnica</label>
                <div class="pf-icon-input">
                  <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>
                  <input
                    v-model.trim="ver.expedient_link"
                    type="url"
                    class="ds-input"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div class="ds-field">
                <label class="ds-label">Categoría curso<span class="ds-req">*</span></label>
                <SearchSelect
                  v-model="ver.cat_course_category"
                  :items="catalogs.courseCategoryList"
                  label-field="description"
                  value-field="id"
                  placeholder="Categoría..."
                  required
                  :model-label="ver.cat_course_category_label"
                />
              </div>

              <div class="ds-field">
                <label class="ds-label">Estado activo</label>
                <div class="pf-switch">
                  <label class="exec-switch">
                    <input type="checkbox" v-model="ver.active" />
                    <span></span>
                  </label>
                  <span>{{ ver.active ? 'Activa' : 'Inactiva' }}</span>
                </div>
              </div>
            </div>

            <div v-if="!isCourseType" class="pf-children">
              <div class="pf-children-head">
                <span class="ds-label pf-children-title"><i class="fa-solid fa-link" aria-hidden="true"></i> Programas / versiones hijas</span>
                <button
                  type="button"
                  class="btn-exec btn-exec-ghost btn-sm"
                  @click="onAddChildClick(ver)"
                  :disabled="!ver.program_version_id"
                >
                  <i class="fa-solid fa-circle-plus" aria-hidden="true"></i> Agregar curso hijo
                </button>
              </div>

              <div v-if="childrenByParent(ver).length" class="pf-children-grid">
                <div v-for="(child, idy) in ver.childs" :key="idy" class="pf-child">
                  <span class="pf-child-order">{{ idy + 1 }}</span>
                  <SearchSelect
                    v-model="child.program_version_id"
                    mode="remote"
                    showSubValue
                    sublabel-field="version_code"
                    :fetcher="q => programService.programVersionCaller({ q })"
                    label-field="abbreviation"
                    :disabled="child.program_version_id && !child.isNewAssigned"
                    value-field="program_version_id"
                    placeholder="Buscar hijo..."
                    :minChars="0"
                    :cache="false"
                    :model-label="child.label"
                    class="pf-child-select"
                    required
                    @change="(val) => { if(val) child.isNewAssigned = true; }"
                  />
                  <button type="button" class="btn-icon btn-icon-sm" title="Quitar curso hijo" aria-label="Quitar curso hijo" @click="ver.childs.splice(idy, 1)">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              <p v-else class="ds-help pf-children-empty">
                No hay cursos hijos vinculados a esta versión. Guarda el programa primero para asignarlos.
              </p>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- Carga: esqueleto con la forma de los dos paneles en vez de un spinner suelto -->
    <template v-else>
      <section v-for="n in 2" :key="'sk' + n" class="ds-panel" aria-busy="true">
        <header class="ds-panel-head"><span class="ds-skel pf-skel-title"></span></header>
        <div class="ds-panel-body pf-grid">
          <span v-for="c in 8" :key="c" class="ds-skel pf-skel-field"></span>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.pf-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.mono { font-family: var(--ds-font-mono); }

/* Grilla del formulario: 4 columnas (6 en la versión) para que el nombre y los
   textos largos ocupen el doble; baja a 2 y luego a 1 en pantallas chicas. */
.pf-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px 16px; }
.pf-grid--version { grid-template-columns: repeat(6, minmax(0, 1fr)); padding: 16px; }
.pf-span-2 { grid-column: span 2; }

/* Icono dentro del input de URL */
.pf-icon-input { position: relative; }
.pf-icon-input > i { position: absolute; top: 50%; left: 11px; transform: translateY(-50%); font-size: 12px; color: var(--ds-muted); pointer-events: none; }
.pf-icon-input > input { padding-left: 30px; }

.pf-switch { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: 12.5px; color: var(--ds-ink-2); }

/* Tarjeta de versión: bloque repetible dentro del panel de versiones */
.pf-versions { display: flex; flex-direction: column; gap: var(--ds-gap); }
.pf-version { border: 1px solid var(--ds-border); border-radius: var(--ds-radius); overflow: hidden; }
.pf-version-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 16px; background: var(--ds-surface-2); border-bottom: 1px solid var(--ds-border); }
.pf-version-id, .pf-version-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pf-version-badge { padding: 3px 8px; border-radius: var(--ds-radius-control); background: var(--ds-brand); color: var(--ds-on-brand); font-size: 11px; font-weight: 700; }
.pf-version-code { font-weight: 700; color: var(--ds-accent); }

/* Hijos de la versión (solo programas compuestos, no cursos) */
.pf-children { padding: 14px 16px; background: var(--ds-surface-2); border-top: 1px solid var(--ds-border); }
.pf-children-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.pf-children-title { margin: 0; color: var(--ds-accent); }
.pf-children-empty { margin: 0; }
.pf-children-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px 16px; }
.pf-child { display: flex; align-items: center; gap: 8px; min-width: 0; }
.pf-child-select { flex: 1; min-width: 0; }
.pf-child-order { display: grid; place-items: center; flex: none; width: 22px; height: 22px; border-radius: var(--ds-radius-control); background: var(--ds-surface-3); color: var(--ds-ink-2); font-size: 11px; font-weight: 700; }

.pf-skel-title { width: 180px; }
.pf-skel-field { height: 36px; }

@media (max-width: 900px) {
  .pf-grid, .pf-grid--version { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 500px) {
  .pf-grid, .pf-grid--version { grid-template-columns: 1fr; }
  .pf-span-2 { grid-column: auto; }
}
</style>

<script setup>
  import { ref, reactive, computed, onMounted, inject } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import SearchSelect from '@/components/SearchSelect.vue'
  import { ServiceKeys } from '@/services'
  import { useToast } from 'vue-toastification'
  import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'

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

  // ponytail: catálogos que vinieron NULL de la BD quedan editables para poder
  // completar el dato faltante (si no, isValid nunca se cumple y el botón muere)
  const missingCatsAtLoad = ref(new Set())
  function isCatLocked(field) {
    return isEdit.value && !missingCatsAtLoad.value.has(field)
  }

  const form = reactive({
    program_name: null,
    skem_clasification: null,
    cat_type_program: null,
    cat_category: null,
    cat_business_line_id: null,
    cat_model_modality: null,
    link: null,
    active: true,
    program_versions: []
  })

  const catalogs = ref({
    programTypeList: catalog?.options('we_program_type') || [],
    categoryList: catalog?.options('we_program_category') || [],
    modalityList: catalog?.options('we_modality') || [],
    courseCategoryList: catalog?.options('we_course_category') || [],
    businessLineList: catalog?.options('we_business_line') || []
  })

  // cat_type_program es el id del catálogo: compararlo con el alias daba
  // siempre distinto y la sección de hijos salía también en cursos.
  const isCourseType = computed(() =>
    catalogs.value.programTypeList.find(i => i.id === form.cat_type_program)?.alias === 'we_program_type_course')


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
      !!form.cat_business_line_id &&
      hasAtLeastOneValidVersion.value
    )
  })

  /**
   * Helpers de hijos por versión (para la vista)
   */
  function childrenByParent(ver) {
    return Array.isArray(ver.childs) ? ver.childs : []
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
    if (!Array.isArray(childrenDetail)) return []
    return childrenDetail
      .map(ch => {
        return {
          program_version_id: ch.child_program_version_id,
          version_code: ch.version_code,
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

    missingCatsAtLoad.value = new Set(
      ['cat_type_program', 'cat_category', 'cat_business_line_id', 'cat_model_modality']
        .filter(k => data[k] == null)
    )

    form.program_name = data.program_name ?? null
    form.cat_type_program = data.cat_type_program ?? null
    form.cat_category = data.cat_category ?? null
    form.cat_business_line_id = data.cat_business_line_id ?? null
    form.link = data.link ?? null

    form.cat_model_modality = data.cat_model_modality ?? null
    form.active = data.active === 'N' ? false : true
    form.cat_type_program_label = data.cat_type_program_label
    form.cat_category_label = data.cat_category_label
    form.skem_clasification = data.skem_clasification ?? ''
    const versions = Array.isArray(data.program_versions) ? data.program_versions : []
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
  }

  /**
   * De un row de versión arma el array children_ids
   * que espera el SP (solo IDs numéricos válidos).
   */
  function buildChildrenIdsFromRow(v) {
    if (!Array.isArray(v.childs)) return null
    // Una fila agregada sin elegir programa es Number(null) = 0: el FK tumbaba
    // todo el guardado. [] hace que el SP limpie los vínculos.
    return v.childs.map(c => Number(c.program_version_id)).filter(id => id > 0)
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
        cat_business_line_id: form.cat_business_line_id ?? null,
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
        cat_business_line_id: form.cat_business_line_id ?? null,
        cat_model_modality: form.cat_model_modality ?? null,
        active: form.active ? 'Y' : 'N',
        skem_clasification: form.skem_clasification || null,
        program_versions: form.program_versions
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

  const programForm = ref(null)
  const requiredFieldsFilled = useRequiredFieldsGuard(programForm)

  async function guardar() {
    if (!requiredFieldsFilled()) return
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
      toast.error(e?.response?.data?.message || 'Ocurrió un error al guardar.')
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

</script>
