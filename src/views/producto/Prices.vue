<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Gestión Académica</span>
            <h1 class="brand-title">Listado de Precios</h1>
          </div>
        </div>

        <div class="masthead-actions">
          <button class="btn-exec btn-exec-outline" style="border-color: rgba(255,255,255,0.2); color: white;" @click="fetchPrograms" title="Recargar datos">
            <i class="fa-solid fa-rotate-right me-1"></i> Recargar
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div class="exec-fieldset mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-md-3">
            <label class="exec-label">Línea de Negocio</label>
            <SearchSelect
              v-model="filters.cat_category"
              :items="catalogs.categoryList"
              label-field="description"
              value-field="id"
              placeholder="Todas..."
              class="exec-select-light w-100"
            />
          </div>
          <div class="col-md-3">
            <label class="exec-label">Tipo de Programa</label>
            <SearchSelect
              v-model="filters.cat_type_program"
              :items="catalogs.programTypeList"
              label-field="description"
              value-field="id"
              placeholder="Todos..."
              class="exec-select-light w-100"
            />
          </div>
          <div class="col-md-3">
            <label class="exec-label">Modalidad</label>
            <SearchSelect
              v-model="filters.cat_model_modality"
              :items="catalogs.modalityList"
              label-field="description"
              value-field="id"
              placeholder="Todas..."
              class="exec-select-light w-100"
            />
          </div>
          <div class="col-md-3 d-flex gap-2">
            <button class="btn-exec btn-exec-outline w-100" @click="clearFilters">
              <i class="fa-solid fa-eraser"></i> Limpiar
            </button>
            <button class="btn-exec btn-exec-primary w-100" @click="fetchPrograms">
              <i class="fa-solid fa-filter"></i> Filtrar
            </button>
          </div>
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom table-container">
          <table class="exec-table" :class="{ dense }">
            <thead class="sticky-header">
              <tr class="thead-group">
                <th rowspan="2" class="th-cat sticky-col" style="min-width: 280px; left: 0; z-index: 30;">Programa y Versión</th>
                <th colspan="2" class="th-group th-group-a text-center">P. Estudiante</th>
                <th colspan="2" class="th-group th-group-b text-center">P. Profesional</th>
                <th colspan="2" class="th-group text-center" style="background: var(--navy-800); color: white;">Diferencia (Abs)</th>
                <th rowspan="2" class="th-cat text-center" style="width: 80px;">Estado</th>
                <th rowspan="2" class="th-cat text-center" style="width: 100px;">Acciones</th>
              </tr>
              <tr class="thead-sub">
                <th class="ts ts-a text-center">Soles (S/)</th>
                <th class="ts ts-a text-center">Dólares ($)</th>
                <th class="ts ts-b text-center">Soles (S/)</th>
                <th class="ts ts-b text-center">Dólares ($)</th>
                <th class="ts text-center" style="background: var(--slate-100);">Diff S/</th>
                <th class="ts text-center" style="background: var(--slate-100);">Diff $</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="e in lPrices"
                :key="e.program_version_id"
                class="tbody-row"
                :class="{ 'row-modified': isModified(e) }"
              >

                <td class="td-cat sticky-col bg-white">
                  <div class="d-flex flex-column">
                    <span class="fw-700 text-dark" style="font-size: 13px;">{{ e.program_type_for_iu || e.program_name || '—' }}</span>
                    <span class="text-muted x-small text-mono mt-1">
                      <i class="fa-solid fa-code me-1 opacity-50"></i>{{ e.version_code }}
                    </span>
                  </div>
                </td>

                <td class="td-a px-2">
                  <CurrencyInput
                    v-model="e.price_student_soles"
                    :currency="currencySoles"
                    :storeAsMinor="false"
                    placeholder="0.00"
                    class="exec-input-light input-price text-end text-mono fw-600 w-100"
                  />
                </td>
                <td class="td-a px-2">
                  <CurrencyInput
                    v-model="e.price_student_dollars"
                    :currency="currencyDollars"
                    :storeAsMinor="false"
                    placeholder="0.00"
                    class="exec-input-light input-price text-end text-mono fw-600 w-100"
                  />
                </td>

                <td class="td-b px-2">
                  <CurrencyInput
                    v-model="e.price_professional_soles"
                    :currency="currencySoles"
                    :storeAsMinor="false"
                    placeholder="0.00"
                    class="exec-input-light input-price text-end text-mono fw-600 w-100"
                  />
                </td>
                <td class="td-b px-2">
                  <CurrencyInput
                    v-model="e.price_professional_dollars"
                    :currency="currencyDollars"
                    :storeAsMinor="false"
                    placeholder="0.00"
                    class="exec-input-light input-price text-end text-mono fw-600 w-100"
                  />
                </td>

                <td class="text-end" style="background: var(--slate-50);">
                  <span class="fw-700 small text-mono" :class="getDiffClass(e.price_professional_soles, e.price_student_soles)">
                    S/ {{ calcDiff(e.price_professional_soles, e.price_student_soles) }}
                  </span>
                </td>
                <td class="text-end" style="background: var(--slate-50);">
                  <span class="fw-700 small text-mono" :class="getDiffClass(e.price_professional_dollars, e.price_student_dollars)">
                    $ {{ calcDiff(e.price_professional_dollars, e.price_student_dollars) }}
                  </span>
                </td>

                <td class="text-center align-middle">
                  <label class="exec-switch">
                    <input type="checkbox" v-model="e.active" />
                    <span></span>
                  </label>
                </td>

                <td class="text-center align-middle">
                  <div class="d-flex justify-content-center gap-2">
                    <div v-if="e._saving" class="text-primary">
                      <i class="fa-solid fa-spinner fa-spin"></i>
                    </div>

                    <template v-else-if="isModified(e)">
                      <button
                        class="btn-icon btn-save"
                        title="Guardar cambios"
                        @click="saveRow(e)"
                      >
                        <i class="fa-solid fa-floppy-disk"></i>
                      </button>
                      <button
                        class="btn-icon btn-undo"
                        title="Deshacer cambios"
                        @click="revertRow(e)"
                      >
                        <i class="fa-solid fa-rotate-left"></i>
                      </button>
                    </template>

                    <span v-else class="text-muted opacity-25" title="Sin cambios">
                      <i class="fa-solid fa-check"></i>
                    </span>
                  </div>
                </td>

              </tr>

              <tr v-if="lPrices.length === 0">
                <td colspan="9" class="empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <p class="mb-0">No hay versiones de programas cargadas o no coinciden con los filtros.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification'
import CurrencyInput from '@/components/CurrencyInput.vue'
import SearchSelect from '@/components/SearchSelect.vue'

const toast = useToast()
const programService = inject(ServiceKeys.Program)
const catalog = inject('catalog')

const dense = ref(false)
const lPrices = ref([])

// --- Filtros & Catálogos ---
const filters = reactive({
  cat_category: null,
  cat_type_program: null,
  cat_model_modality: null
})

const catalogs = reactive({
  categoryList: catalog?.options('we_program_category') || [],
  programTypeList: catalog?.options('we_program_type') || [],
  modalityList: catalog?.options('we_modality') || []
})

const clearFilters = () => {
  filters.cat_category = null
  filters.cat_type_program = null
  filters.cat_model_modality = null
  fetchPrograms()
}

// --- Carga Inicial ---
const fetchPrograms = async () => {
  try {
    // Aquí puedes pasar los filtros si tu backend ya los soporta en este endpoint
    // ej: programService.programVersionCaller({ ...filters })
    const response = await programService.programVersionCaller({
      cat_category: filters.cat_category,
      cat_type_program: filters.cat_type_program,
      cat_model_modality: filters.cat_model_modality
    })

    // Mapeo inicial
    lPrices.value = (response || []).map(item => {
      const data = {
        ...item,
        price_student_soles: Number(item.price_student_soles || 0),
        price_student_dollars: Number(item.price_student_dollars || 0),
        price_professional_soles: Number(item.price_professional_soles || 0),
        price_professional_dollars: Number(item.price_professional_dollars || 0),
        active: item.active === 'Y' || item.active === true,
        _saving: false
      }

      data._originalState = JSON.stringify(getComparableData(data));
      return data;
    })

  } catch (error) {
    console.error('Error al cargar programas:', error)
    toast.error('Error al cargar el listado de precios')
  }
}

onMounted(() => {
  fetchPrograms()
})

// --- Lógica de Comparación y Estado ---
const getComparableData = (row) => ({
  ps_s: row.price_student_soles,
  ps_d: row.price_student_dollars,
  pp_s: row.price_professional_soles,
  pp_d: row.price_professional_dollars,
  act:  row.active
})

const isModified = (row) => {
  const current = JSON.stringify(getComparableData(row));
  return current !== row._originalState;
}

const revertRow = (row) => {
  if (!row._originalState) return;
  const original = JSON.parse(row._originalState);

  row.price_student_soles = original.ps_s;
  row.price_student_dollars = original.ps_d;
  row.price_professional_soles = original.pp_s;
  row.price_professional_dollars = original.pp_d;
  row.active = original.act;
}

// --- Lógica de Negocio ---
const calcDiff = (prof, stud) => {
    const p = Number(prof) || 0
    const s = Number(stud) || 0
    return Math.abs(p - s).toFixed(2)
}

const getDiffClass = (prof, stud) => {
    const diff = Number(prof) - Number(stud)
    if (diff > 0) return 'text-success'
    if (diff < 0) return 'text-danger'
    return 'text-muted'
}

const saveRow = async (e) => {
  if (e._saving) return
  e._saving = true

  try {
    await programService.programVersionUpdate({
      program_version_id: e.program_version_id,
      price_student_soles: e.price_student_soles,
      price_student_dollars: e.price_student_dollars,
      price_professional_soles: e.price_professional_soles,
      price_professional_dollars: e.price_professional_dollars,
      active: e.active,
    })

    e._originalState = JSON.stringify(getComparableData(e));
    toast.success(`Precio actualizado correctamente`)

  } catch (error) {
    console.error('Error al guardar:', error)
    toast.error('No se pudo guardar el cambio')
  } finally {
    e._saving = false
  }
}

// --- Configuración de Moneda ---
const currencyCatalog = ref(
    catalog?.options('we_currency', {
      mapItem: x => ({
        id: x.id, alias: x.alias,
        raw: {
          code: x.code ?? x.abbreviation,
          symbol: x.symbol ?? x.prefix,
          minorUnit: 2,
          locale: x.locale ?? (x.abbreviation === 'USD' ? 'en-US' : 'es-PE'),
        }
      })
    }) || []
)

const currencySoles = computed(() => {
    const c = currencyCatalog.value.find(i => i.alias === 'we_currency_pen')
    return c ? c.raw : { symbol: 'S/', code: 'PEN' }
})

const currencyDollars = computed(() => {
    const c = currencyCatalog.value.find(i => i.alias === 'we_currency_usd')
    return c ? c.raw : { symbol: '$', code: 'USD' }
})
</script>

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

/* ═══════════════════════════════════════════════
   MASTHEAD
═══════════════════════════════════════════════ */
.exec-masthead { background: var(--navy-900); color: var(--white); border-bottom: 1px solid var(--navy-700); }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: var(--white); }

.masthead-actions { display: flex; gap: 10px; align-items: center; }
.btn-exec { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 8px 16px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; height: 38px;}
.btn-exec-primary { background: var(--teal-600); color: var(--white); }
.btn-exec-primary:hover:not(:disabled) { background: var(--teal-500); }
.btn-exec-outline { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-exec-outline:hover { background: var(--slate-50); color: var(--text-primary); }

/* ═══════════════════════════════════════════════
   BODY & FORMS
═══════════════════════════════════════════════ */
.exec-body { flex: 1; padding: 24px 28px; }
.exec-fieldset { background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: 16px 20px; }
.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px; }
.exec-input-light, .exec-select-light { background: var(--white); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary); transition: border-color 0.15s; }
.exec-input-light:focus, .exec-select-light:focus { outline: none; border-color: var(--teal-500); box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1); }

/* Custom Switch */
.exec-switch { position: relative; width: 40px; height: 22px; display: inline-block; cursor: pointer; margin: 0;}
.exec-switch input { display: none; }
.exec-switch span { position: absolute; inset: 0; background: var(--slate-300); border-radius: 9999px; transition: .2s; }
.exec-switch span::after { content: ''; width: 16px; height: 16px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.exec-switch input:checked + span { background: var(--teal-500); }
.exec-switch input:checked + span::after { left: 21px; }

/* ═══════════════════════════════════════════════
   DATA GRID (TABLA & STICKY HEADERS)
═══════════════════════════════════════════════ */
.table-shell { background: var(--white); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.table-container { width: 100%; max-height: 70vh; overflow-y: auto; overflow-x: auto;}
.exec-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; }

/* Sticky Cabeceras Generales */
.sticky-header th { position: sticky; z-index: 20; border-bottom: 1px solid var(--border); }
.sticky-header tr:first-child th { top: 0; height: 38px; }
.sticky-header tr:nth-child(2) th { top: 38px; z-index: 21; }

/* Columna Fija (Programa) */
.sticky-col { position: sticky; left: 0; z-index: 25 !important; border-right: 1px solid var(--border) !important; box-shadow: 2px 0 5px -2px rgba(0,0,0,0.1); }
.thead-group .sticky-col { z-index: 30 !important; }

/* Cabeceras Agrupadas */
.thead-group .th-cat { background: var(--navy-900); color: var(--slate-300); padding: 0 14px; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
.th-group { padding: 8px 10px; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid var(--border) !important;}
.th-group-a { background: #eff6ff; color: #1e40af; border-left: 1px solid #bfdbfe; }
.th-group-b { background: #f0fdf4; color: #166534; border-left: 1px solid #bbf7d0; }

/* Sub Cabeceras */
.thead-sub .ts { padding: 6px 10px; font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; border-bottom: 2px solid var(--border) !important;}
.ts-a { background: #f8fbff; color: #3b82f6; border-left: 1px solid #dbeafe; }
.ts-b { background: #f7fdf9; color: #16a34a; border-left: 1px solid #d1fae5; }

/* Celdas Body */
.tbody-row td { padding: 8px 12px; border-bottom: 1px solid var(--slate-100); vertical-align: middle; color: var(--text-primary); transition: background 0.15s;}
.td-a { border-left: 1px solid #eff6ff; }
.td-b { border-left: 1px solid #f0fdf4; }
.row-modified td { background-color: #fffbeb !important; } /* Highlight amarillo suave */

/* Utilidades Texto */
.text-mono { font-family: 'IBM Plex Mono', monospace; }
.fw-600 { font-weight: 600; } .fw-700 { font-weight: 700; }
.text-muted { color: var(--text-muted); } .accent-text { color: var(--teal-600); }
.small { font-size: 11.5px; } .x-small { font-size: 10px; }
.text-success { color: #15803d !important; }
.text-danger { color: #dc2626 !important; }

/* Botones Icono Tabla */
.btn-icon { border: none; background: transparent; width: 30px; height: 30px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.btn-save { background-color: #dcfce7; color: #166534; }
.btn-save:hover { background-color: #16a34a; color: white; transform: translateY(-1px); }
.btn-undo { background-color: #fee2e2; color: #991b1b; }
.btn-undo:hover { background-color: #ef4444; color: white; }

/* Empty state */
.empty-state { padding: 40px; text-align: center; color: var(--slate-400); font-size: 13px; font-weight: 500; }
.empty-state svg { display: block; margin: 0 auto 10px auto; }
</style>
