<template>
  <div class="ds-page">

    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Listado de precios</h1>
        <p class="ds-sub">
          {{ isLoading ? 'Cargando precios…' : `${visiblePrices.length} versiones de programa · edita el precio en la celda y guarda la fila` }}
        </p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-outline" type="button" @click="clearFilters">
          <i class="fa-solid fa-eraser" aria-hidden="true"></i> Limpiar
        </button>
        <button class="btn-exec btn-exec-primary" type="button" @click="fetchPrograms">
          <i class="fa-solid fa-filter" aria-hidden="true"></i> Filtrar
        </button>
      </div>
    </header>

    <section class="ds-panel" aria-label="Filtros">
      <div class="ds-panel-body ds-form-grid">
        <div class="ds-field">
          <label class="ds-label">Línea de negocio</label>
          <SearchSelect
            v-model="filters.cat_category"
            :items="catalogs.categoryList"
            label-field="description"
            value-field="id"
            placeholder="Todas..."
          />
        </div>
        <div class="ds-field">
          <label class="ds-label">Tipo de programa</label>
          <SearchSelect
            v-model="filters.cat_type_program"
            :items="catalogs.programTypeList"
            label-field="description"
            value-field="id"
            placeholder="Todos..."
          />
        </div>
        <div class="ds-field">
          <label class="ds-label">Modalidad</label>
          <SearchSelect
            v-model="filters.cat_model_modality"
            :items="catalogs.modalityList"
            label-field="description"
            value-field="id"
            placeholder="Todas..."
          />
        </div>
      </div>
    </section>

    <section class="ds-panel">
      <!-- Scroll propio (vertical y horizontal) para que el encabezado de dos
           filas y la columna del programa queden fijos al editar muchas filas. -->
      <div class="ds-table-scroll prices-scroll">
        <table class="ds-table ds-table--densa prices-grid">
          <thead>
            <tr class="prices-groups">
              <th rowspan="2" class="col-program">Programa y versión</th>
              <th colspan="2" class="sep group-student">Precio estudiante</th>
              <th colspan="2" class="sep group-professional">Precio profesional</th>
              <th colspan="2" class="sep group-diff">Diferencia (abs.)</th>
              <th rowspan="2" class="sep col-actions">Acciones</th>
            </tr>
            <tr class="prices-subheads">
              <th class="sep num">Soles (S/)</th>
              <th class="num">Dólares ($)</th>
              <th class="sep num">Soles (S/)</th>
              <th class="num">Dólares ($)</th>
              <th class="sep num">Dif. S/</th>
              <th class="num">Dif. $</th>
            </tr>
          </thead>

          <tbody>
            <template v-if="isLoading">
              <tr v-for="n in 8" :key="'sk' + n">
                <td v-for="col in 8" :key="col"><span class="ds-skel"></span></td>
              </tr>
            </template>
            <template v-else>
            <tr
              v-for="e in visiblePrices"
              :key="e.program_version_id"
              :class="{ 'is-modified': isModified(e) }"
            >

              <td class="col-program">
                <span class="program-name">{{ e.program_type_for_iu || e.program_name || '—' }}</span>
                <span class="program-code">
                  <i class="fa-solid fa-code" aria-hidden="true"></i>{{ e.version_code }}
                </span>
              </td>

              <td class="sep">
                <CurrencyInput
                  v-model="e.price_student_soles"
                  :currency="currencySoles"
                  :storeAsMinor="false"
                  placeholder="0.00"
                  class="ds-input price-input"
                  aria-label="Precio estudiante en soles"
                />
              </td>
              <td>
                <CurrencyInput
                  v-model="e.price_student_dollars"
                  :currency="currencyDollars"
                  :storeAsMinor="false"
                  placeholder="0.00"
                  class="ds-input price-input"
                  aria-label="Precio estudiante en dólares"
                />
              </td>

              <td class="sep">
                <CurrencyInput
                  v-model="e.price_professional_soles"
                  :currency="currencySoles"
                  :storeAsMinor="false"
                  placeholder="0.00"
                  class="ds-input price-input"
                  aria-label="Precio profesional en soles"
                />
              </td>
              <td>
                <CurrencyInput
                  v-model="e.price_professional_dollars"
                  :currency="currencyDollars"
                  :storeAsMinor="false"
                  placeholder="0.00"
                  class="ds-input price-input"
                  aria-label="Precio profesional en dólares"
                />
              </td>

              <td class="sep num col-diff">
                <span class="price-diff" :class="getDiffClass(e.price_professional_soles, e.price_student_soles)">
                  S/ {{ calcDiff(e.price_professional_soles, e.price_student_soles) }}
                </span>
              </td>
              <td class="num col-diff">
                <span class="price-diff" :class="getDiffClass(e.price_professional_dollars, e.price_student_dollars)">
                  $ {{ calcDiff(e.price_professional_dollars, e.price_student_dollars) }}
                </span>
              </td>

              <td class="sep col-actions">
                <div class="row-actions">
                  <i v-if="e._saving" class="fa-solid fa-spinner fa-spin row-saving" role="status" aria-label="Guardando"></i>

                  <template v-else-if="isModified(e)">
                    <button
                      class="btn-icon btn-icon-sm row-save"
                      type="button"
                      title="Guardar cambios"
                      aria-label="Guardar cambios"
                      @click="saveRow(e)"
                    >
                      <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
                    </button>
                    <button
                      class="btn-icon btn-icon-sm row-undo"
                      type="button"
                      title="Deshacer cambios"
                      aria-label="Deshacer cambios"
                      @click="revertRow(e)"
                    >
                      <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
                    </button>
                  </template>

                  <i v-else class="fa-solid fa-check row-clean" title="Sin cambios" aria-label="Sin cambios"></i>
                </div>
              </td>

            </tr>

            <tr v-if="visiblePrices.length === 0">
              <td colspan="8" class="ds-empty ds-empty--lista">
                No hay versiones de programa con estos filtros. Pulsa «Limpiar» para ver todas.
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
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

const lPrices = ref([])
const isLoading = ref(false)

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
  isLoading.value = true
  try {
    const response = await programService.programVersionCaller({
      cat_type_program: filters.cat_type_program,
      cat_model_modality: filters.cat_model_modality
    })

    // Mapeo inicial
    lPrices.value = (response || []).map(item => {
      const data = {
        ...item,
        price_student_soles: Number(item.price_student_soles || 0),
        price_student_dollars: Number(item.price_student_dollars || 0),
        // El SP dice "profesional" (una s); el endpoint de guardado, "professional".
        price_professional_soles: Number(item.price_profesional_soles || 0),
        price_professional_dollars: Number(item.price_profesional_dollars || 0),
        _saving: false
      }

      data._originalState = JSON.stringify(getComparableData(data));
      return data;
    })

  } catch (error) {
    console.error('Error al cargar programas:', error)
    toast.error('Error al cargar el listado de precios')
  } finally {
    isLoading.value = false
  }
}

// El caller no filtra por línea de negocio, pero sí la devuelve: se filtra acá.
const visiblePrices = computed(() =>
  filters.cat_category ? lPrices.value.filter(p => p.cat_category === filters.cat_category) : lPrices.value)

onMounted(() => {
  fetchPrograms()
})

// --- Lógica de Comparación y Estado ---
const getComparableData = (row) => ({
  ps_s: row.price_student_soles,
  ps_d: row.price_student_dollars,
  pp_s: row.price_professional_soles,
  pp_d: row.price_professional_dollars
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
}

// --- Lógica de Negocio ---
const calcDiff = (prof, stud) => {
    const p = Number(prof) || 0
    const s = Number(stud) || 0
    return Math.abs(p - s).toFixed(2)
}

const getDiffClass = (prof, stud) => {
    const diff = Number(prof) - Number(stud)
    if (diff > 0) return 'ok'
    if (diff < 0) return 'bad'
    return ''
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
    })

    e._originalState = JSON.stringify(getComparableData(e));
    toast.success(`Precio actualizado correctamente`)

  } catch (error) {
    toast.error(error?.response?.data?.message || 'No se pudo guardar el cambio')
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
/* Grilla de edición: el alto acotado le da al encabezado y a la columna del
   programa un contenedor donde quedarse fijos. */
.prices-scroll { max-height: 70vh; overflow-y: auto; }

/* Encabezado de dos filas fijo. La primera fila mide 32px exactos para que la
   segunda sepa a qué altura pegarse. */
.prices-grid thead th { position: sticky; top: 0; z-index: 2; background: var(--ds-surface); box-shadow: inset 0 -1px 0 var(--ds-border); vertical-align: middle; }
.prices-grid .prices-groups th { height: 32px; text-align: center; font-weight: 700; }
.prices-grid .prices-subheads th { top: 32px; }
.prices-grid .sep { border-left: 1px solid var(--ds-border); }
.prices-grid td { vertical-align: middle; }

/* El color de grupo distingue de un vistazo qué precio se está editando. */
.prices-grid .group-student { background: var(--ds-soft-info); color: var(--ds-info-ink); }
.prices-grid .group-professional { background: var(--ds-soft-ok); color: var(--ds-ok-ink); }
.prices-grid .group-diff { background: var(--ds-surface-2); color: var(--ds-ink-2); }

/* Columna del programa fija al desplazar en horizontal: fondo opaco para que
   los inputs no se vean por debajo. */
.prices-grid .col-program { position: sticky; left: 0; z-index: 1; min-width: 240px; background: var(--ds-surface); box-shadow: inset -1px 0 0 var(--ds-border); }
.prices-grid thead .col-program { z-index: 3; text-align: left; }
.program-name { display: block; font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.program-code { display: block; margin-top: 2px; font-family: var(--ds-font-mono); font-size: 10.5px; font-weight: 500; color: var(--ds-muted); }
.program-code i { margin-right: 4px; opacity: 0.6; }

.prices-grid .price-input { min-width: 110px; height: 32px; text-align: right; font-family: var(--ds-font-mono); font-weight: 600; font-variant-numeric: tabular-nums; }

.prices-grid .col-diff { background: var(--ds-surface-2); }
.price-diff { font-family: var(--ds-font-mono); font-size: 11.5px; font-weight: 700; color: var(--ds-muted); }
.price-diff.ok { color: var(--ds-ok-ink); }
.price-diff.bad { color: var(--ds-bad-ink); }

.prices-grid .col-actions { width: 100px; text-align: center; }
.row-actions { display: flex; justify-content: center; align-items: center; gap: 6px; }
.row-saving { color: var(--ds-accent); }
.row-clean { color: var(--ds-muted); opacity: 0.4; }
.btn-icon.row-save { background: var(--ds-soft-ok); border-color: transparent; color: var(--ds-ok-ink); }
.btn-icon.row-undo { background: var(--ds-soft-bad); border-color: transparent; color: var(--ds-bad-ink); }
.btn-icon.row-save:hover:not(:disabled) { background: var(--ds-ok); color: var(--ds-on-brand); }
.btn-icon.row-undo:hover:not(:disabled) { background: var(--ds-bad); color: var(--ds-on-brand); }

/* Fila con cambios sin guardar. El tinte va sobre un fondo opaco porque en
   oscuro --ds-soft-warn es translúcido y la columna fija dejaría ver el scroll. */
.prices-grid tr.is-modified td { background: linear-gradient(var(--ds-soft-warn), var(--ds-soft-warn)), var(--ds-surface); }
.prices-grid tr.is-modified td.col-program { box-shadow: inset 3px 0 0 var(--ds-warn), inset -1px 0 0 var(--ds-border); }

/* A 400px la columna fija no puede comerse la pantalla: se angosta y el
   nombre del programa parte en varias líneas. */
@media (max-width: 600px) {
  .prices-grid .col-program { min-width: 140px; max-width: 160px; white-space: normal; }
}
</style>
