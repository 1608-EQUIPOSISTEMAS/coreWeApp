<!-- src/views/ProgramForm.vue -->
<template>
  <div class="container-fluid px-3 py-3">
    <div class="card shadow-sm border-0">
      <div class="card-header border-0 pb-3 pt-3 d-flex flex-wrap justify-content-between align-items-start">
        <div class="pe-3">
          <div class="h3">{{ isEdit ? 'Editar programa' : 'Nuevo programa' }}</div>
          <div class="text-muted small" v-if="isEdit">ID: {{ idParam }}</div>
        </div>
      </div>

      <div class="card-body pt-4 pb-4" v-if="loaded">
        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Datos del programa</span>
          </div>

          <div class="row g-3 form-section__body">
            <div class="col-md-6">
              <label class="form-label mb-1">
                Nombre General <span class="required-star">*</span>
              </label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.program_name"
                type="text"
                class="form-control"
                required
                placeholder="NOMBRE PROGRAMA"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">
                Esquema de clasificaciòn <span class="required-star">*</span>
              </label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.skem_clasification"
                type="text"
                class="form-control"
                required
                placeholder="ESQUEMA"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">
                URL Web <span class="required-star">*</span>
              </label>
              <input
                v-restrict="{ transform: 'upper' }"
                v-model.trim="form.link"
                type="text"
                class="form-control"
                placeholder="URL WEB"
              />
            </div>


            <div class="col-md-3">
              <label class="form-label mb-1">
                Tipo de programa <span class="required-star">*</span>
              </label>
              <SearchSelect
                :disabled="isEdit"
                v-model="form.cat_type_program"
                :items="catalogs.programTypeList"
                label-field="description"
                value-field="id"
                placeholder="T. PROGRAMA..."
                :model-label="form.cat_type_program_label"
                required
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">
                Línea de negocio <span class="required-star">*</span>
              </label>
              <SearchSelect
                :disabled="isEdit"
                v-model="form.cat_category"
                :items="catalogs.categoryList"
                label-field="description"
                value-field="id"
                placeholder="L. NEGOCIO..."
                :model-label="form.cat_category_label"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label mb-1">
                Modalidad <span class="required-star">*</span>
              </label>
              <SearchSelect
                :disabled="isEdit"
                v-model="form.cat_model_modality"
                :items="catalogs.modalityList"
                label-field="description"
                value-field="id"
                placeholder="MODALIDAD..."
                required
              />
            </div>


            <div class="col-md-12">
              <label class="form-label mb-1 d-block">Activo</label>
              <label class="form-switch">
                <input type="checkbox" v-model="form.active" />
                <span></span>
              </label>
            </div>
          </div>
        </section>

        <section class="form-section mb-4">
          <div class="form-section__header">
            <span class="form-section__title">Versiones y estructura</span>
          </div>

          <div class="form-section__body">
            <div class="mb-3 d-flex justify-content-between align-items-center">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                @click="agregarVersion"
              >
                Agregar versión
              </button>
            </div>

            <div v-if="form.program_versions.length === 0" class="text-muted small">
              No hay versiones definidas. Agrega al menos una.
            </div>

            <div
              v-for="(ver, idx) in form.program_versions"
              :key="ver._key"
              class="version-block"
            >
              <div class="version-block__header">
                <div class="version-block__title">
                  <span class="version-index">Versión {{ idx + 1 }}</span>
                  <span v-if="ver.version_code" class="version-code-pill">{{ ver.version_code }}</span>
                </div>
                <div class="version-meta">
                  <span v-if="ver.sessions" class="version-meta-pill">{{ ver.sessions }} sesiones</span>
                  <span v-if="ver.abbreviation" class="version-meta-pill">{{ ver.abbreviation }}</span>
                </div>
              </div>
              <div class="row g-2 align-items-end mb-2">
                
                <div class="col-md-4">
                  <label class="form-label mb-1">Certificaciòn <span class="required-star">*</span></label>
                  <input
                    v-model.trim="ver.description"
                    type="text"
                    class="form-control"
                    placeholder="DESCRIPCION"
                    required
                  />
                </div>
                
                <div class="col-md-4">
                  <label class="form-label mb-1">Publicitario <span class="required-star">*</span></label>
                  <input
                    v-model.trim="ver.brand_name"
                    type="text"
                    class="form-control"
                    placeholder="DESCRIPCION"
                    required
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label mb-1">Abreviatura <span class="required-star">*</span></label>
                  <input
                    v-restrict="{ transform: 'upper' }"
                    v-model.trim="ver.abbreviation"
                    type="text"
                    class="form-control"
                    required
                    placeholder="ABREVIATURA"
                  />
                </div>
                <div class="col-md-2">
                  <label class="form-label mb-1">
                    Código <span class="required-star">*</span>
                  </label>
                  <input
                    v-restrict="{ transform: 'upper' }"
                    v-model.trim="ver.version_code"
                    :disabled="isEdit && !ver.new"
                    type="text"
                    class="form-control"
                    placeholder="CODIGO"
                    required
                  />
                </div>

                <div class="col-md-2">
                  <label class="form-label mb-1">
                    Sesiones. <span class="required-star">*</span>
                  </label>
                  <input
                    v-model.number="ver.sessions"
                    type="text"
                    v-restrict="{ only: 'numbers' }"
                    class="form-control mono"
                    placeholder="NRO. SESIONES"
                    required
                  />
                </div>

                
                <div class="col-md-4">
                  <label class="form-label mb-1">URL FICHA</label>
                  <input
                    v-model.trim="ver.expedient_link"
                    type="text"
                    class="form-control"
                    placeholder="URL FICHA"
                  />
                </div>

                 
                    <!--active-->
                
                
                <div class="col-md-2">
                  <label class="form-label mb-1">
                    Categoria <span class="required-star">*</span>
                  </label>
                  <SearchSelect
                    v-model="ver.cat_course_category"
                    :items="catalogs.courseCategoryList"
                    label-field="description"
                    value-field="id"
                    placeholder="Categoria..."
                    required
                    :model-label="ver.cat_course_category_label"
                  />
                </div>

                <div class="col-md-2">
                  <label class="form-label mb-1 d-block">Activo</label>
                  <label class="form-switch" @click="mapActiveChild(ver)">
                    <input type="checkbox" v-model="ver.active" />
                    <span></span>
                  </label>
                </div>

              </div>
              

              <div class="version-block__children">
                <div class="version-block__children-head">
                  <div class="form-label mb-1 mb-md-0">Programas / versiones hijas</div>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0"
                    @click="onAddChildClick(ver)"
                    v-if="form.cat_type_program!='we_program_type_course'"
                    :disabled="!ver.program_version_id"
                  >
                    + Agregar curso hijo
                  </button>
                </div>
                <div
                  v-if="childrenByParent(ver).length"
                  class="vs-chip-list"
                >
                  <SearchSelect
                    v-for="(child, idy)  in ver.childs"
                    v-model="child.program_version_id"
                    :hint="'orden: '+ (idy+1)"
                    mode="remote"
                    showSubValue
                    sublabel-field="version_code"
                    :fetcher="q => programService.programVersionCaller({ q })"
                    label-field="abbreviation"
                    :disabled="child.program_version_id"
                    value-field="program_version_id"
                    placeholder="HIJO…"
                    :minChars="0"
                    :cache="false"
                    :model-label="child.label"
                    required
                  />
                  
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="card-footer bg-white border-top d-flex justify-content-end gap-2 py-3">
        <button type="button" class="btn btn-outline-secondary" @click="cancelar">Cancelar</button>
        <button
          type="button"
          class="btn btn-primary"
          @click="guardar"
          :disabled="saving || !isValid"
        >
          {{ saving ? 'Guardando…' : (isEdit ? 'Actualizar' : 'Crear') }}
        </button>
      </div>
    </div>
  </div>
</template>

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
    debugger
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


<style scoped>
.form-control:required:invalid:not(:disabled):not([readonly]),
.form-select:required:invalid:not(:disabled):not([readonly]),
textarea.form-control:required:invalid:not(:disabled):not([readonly]) {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 .2rem rgba(239, 68, 68, .15);
}

.form-control:required:valid:not(:disabled):not([readonly]),
.form-select:required:valid:not(:disabled):not([readonly]),
textarea.form-control:required:valid:not(:disabled):not([readonly]) {
  border-color: #10b981 !important;
  box-shadow: 0 0 0 .2rem rgba(16, 185, 129, .15);
}

.lead-form {
  font-size: 0.95rem;
  color: #111827;
}

.card-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb !important;
}

.card-title-main {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.2;
}

.card-subtitle {
  font-size: 0.8rem;
  color: #6b7280;
  line-height: 1.2;
  margin-top: .25rem;
}

.timestamp-chip {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.2;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: .4rem;
  padding: .4rem .5rem;
  color: #374151;
  min-width: max-content;
}

.label-chip {
  font-size: .7rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: .03em;
}

.form-section {
  background-color: #ffffff;
}

.form-section__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 1rem;
  position: relative;
  padding-left: .75rem;
  min-height: 1.25rem;
  row-gap: .35rem;
  column-gap: .75rem;
}

.form-section__header::before {
  content: "";
  position: absolute;
  left: 0;
  top: .15rem;
  bottom: .15rem;
  width: 3px;
  border-radius: 2px;
  background-color: #3b82f6;
}

.form-section__title {
  font-size: .8rem;
  font-weight: 600;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: .03em;
  line-height: 1.2;
}

.form-section__note {
  font-size: .7rem;
  font-weight: 400;
  line-height: 1.2;
  color: #6b7280 !important;
}

.form-section__body {
  margin-left: .1rem;
  margin-right: .1rem;
}

.form-label {
  color: #1f2937;
  font-weight: 500;
  font-size: .8rem;
  line-height: 1.2;
  margin-bottom: .25rem;
}

.text-label-aux {
  font-size: .7rem;
  line-height: 1.3;
  color: #6b7280;
  margin-top: .35rem;
}

.form-control,
.form-select,
textarea.form-control {
  font-size: .85rem;
  line-height: 1.4;
  border-color: #d1d5db;
  color: #111827;
}

.form-control:focus,
.form-select:focus,
textarea.form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 .2rem rgba(59, 130, 246, .15);
  outline: 0;
}

.required-star {
  color: #dc2626;
  font-weight: 600;
  margin-left: .15rem;
}

.card-footer {
  border-top: 1px solid #e5e7eb !important;
  background-color: #fff;
}

.btn-outline-secondary {
  border-color: #d1d5db;
  background-color: #fff;
  color: #374151;
  font-size: .85rem;
  font-weight: 500;
}

.btn-outline-secondary:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
  color: #1f2937;
}

.btn-primary {
  font-size: .85rem;
  font-weight: 500;
  line-height: 1.4;
  padding: .45rem .9rem;
  border-radius: .5rem;
}

.gap-2 {
  gap: .5rem;
}

.card-body {
  background-color: #fff;
}

section + section {
  border-top: 1px solid #f3f4f6;
  padding-top: 1.5rem;
}

.form-switch {
  position: relative;
  width: 42px;
  height: 24px;
  display: inline-block;
}

.form-switch input {
  display: none;
}

.form-switch span {
  position: absolute;
  inset: 0;
  background: #e5e7eb;
  border-radius: 9999px;
  transition: .2s;
}

.form-switch span::after {
  content: '';
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: .2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .15);
}

.form-switch input:checked + span {
  background: #3b82f6;
}

.form-switch input:checked + span::after {
  left: 21px;
}

.version-block {
  border-radius: .6rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: .75rem .7rem .8rem;
  margin-bottom: .75rem;
}

.version-block__header {
  display: flex;
  justify-content: space-between;
  gap: .5rem;
  align-items: center;
  margin-bottom: .5rem;
}

.version-block__title {
  display: flex;
  align-items: center;
  gap: .5rem;
}

.version-index {
  font-size: .8rem;
  font-weight: 600;
  color: #111827;
}

.version-code-pill {
  font-size: .75rem;
  font-weight: 600;
  color: #1d4ed8;
  background: #e0edff;
  border-radius: 999px;
  padding: .15rem .55rem;
}

.version-meta {
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
  justify-content: flex-end;
}

.version-meta-pill {
  font-size: .7rem;
  color: #4b5563;
  background: #e5e7eb;
  border-radius: 999px;
  padding: .15rem .5rem;
}

.version-block__children {
  margin-top: .5rem;
  padding-top: .6rem;
  border-top: 1px dashed #e5e7eb;
}

.version-block__children-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
  margin-bottom: .35rem;
}

.vs-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
  margin-bottom: .25rem;
}

.vs-chip {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: .15rem .55rem .15rem .6rem;
  font-size: .75rem;
  line-height: 1.2;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
}

.vs-chip:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .08);
}

.vs-chip-main {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
}

.vs-chip-code {
  font-weight: 600;
  color: #111827;
}

.vs-chip-label {
  font-size: .7rem;
  color: #6b7280;
}

.vs-chip-x {
  font-size: .8rem;
  color: #9ca3af;
  margin-left: .15rem;
}

@media (max-width: 768px) {
  .version-block__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .version-meta {
    justify-content: flex-start;
  }

  .version-block__children-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
