<template>
  <div class="ef-page">

    <div class="ef-page-header">
      <div class="ef-page-header-left">
        <span class="ef-breadcrumb">Fundación</span>
        <h1 class="ef-page-title">Recursos de Eventos</h1>
      </div>
      <div class="ef-header-actions">
        <button type="button" class="ef-btn-primary" :disabled="!selectedEditionId || saving" @click="guardar">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ saving ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>

    <main class="ef-body">

      <!-- SELECTOR DE EVENTO -->
      <div class="exec-fieldset mb-4">
        <h6 class="fieldset-title"><i class="fa-solid fa-calendar-star me-2"></i> Congreso / Evento</h6>
        <div class="row g-3 align-items-end">
          <div class="col-md-8">
            <label class="exec-label">Selecciona el congreso o evento a gestionar</label>
            <SearchSelect
              v-model="selectedEditionId"
              :items="eventOptions"
              label-field="label"
              value-field="edition_num_id"
              :viewOpen="8"
              placeholder="Buscar congreso o evento..."
              class="exec-select-light w-100"
              @change="onEventChange"
            />
          </div>
          <div class="col-md-4">
            <div v-if="selected" class="ev-flags">
              <span class="ev-flag" :class="selected.has_banner_image ? 'is-on' : 'is-off'">
                <i class="fa-solid" :class="selected.has_banner_image ? 'fa-check' : 'fa-xmark'"></i> Banner
              </span>
              <span class="ev-flag" :class="selected.has_resources ? 'is-on' : 'is-off'">
                <i class="fa-solid" :class="selected.has_resources ? 'fa-check' : 'fa-xmark'"></i> Links y textos
              </span>
            </div>
          </div>
        </div>

        <!-- Un fallo al cargar NO es "no hay eventos": decirlo así mandaba al
             usuario a revisar el tipo de programa por un error del servidor. -->
        <div v-if="loadError" class="ev-empty ev-empty-error mt-3">
          <i class="fa-solid fa-triangle-exclamation me-2"></i>
          No se pudo cargar la lista de eventos. <strong>{{ loadError }}</strong>
          <button type="button" class="ev-retry" @click="loadEvents">
            <i class="fa-solid fa-rotate-right me-1"></i>Reintentar
          </button>
        </div>

        <div v-else-if="!loadingList && eventOptions.length === 0" class="ev-empty mt-3">
          <i class="fa-solid fa-circle-info me-2"></i>
          No hay ediciones de <strong>Congreso / Evento</strong>. Revisa en
          <em>Producto → Programas</em> que el programa tenga ese tipo; también
          aparecen aquí las ediciones que ya tengan recursos o inscritos con
          categoría de entrada.
        </div>
      </div>

      <div v-if="loadingResources" class="ev-loading">
        <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
        <p class="text-muted fw-600">Cargando recursos del evento...</p>
      </div>

      <template v-else-if="selectedEditionId">
        <!-- BANNER -->
        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title"><i class="fa-solid fa-image me-2"></i> Banner del correo</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="exec-label">Imagen</label>
              <input type="file" class="exec-input-light w-100" accept="image/jpeg,image/png" @change="onBannerFile" />
              <div class="ev-hint">JPG o PNG, máximo 2 MB. Viaja incrustado en el correo, así que el peso se multiplica por cada inscrito.</div>
              <button v-if="form.banner_preview" type="button" class="ev-remove" @click="removeBanner">
                <i class="fa-solid fa-xmark me-1"></i>Quitar banner
              </button>
            </div>
            <div class="col-md-6">
              <label class="exec-label">Vista previa</label>
              <div class="ev-preview">
                <img v-if="form.banner_preview" :src="form.banner_preview" alt="Banner del evento" />
                <span v-else class="ev-preview-empty">Sin banner cargado — el correo usará el del programa</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTONES DEL CORREO -->
        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title"><i class="fa-solid fa-link me-2"></i> Botones del correo</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="exec-label"><i class="fa-solid fa-certificate me-1"></i> Datos para el certificado</label>
              <input type="url" class="exec-input-light w-100" v-model="form.certificate_form_link" placeholder="https://forms.gle/..." />
            </div>
            <div class="col-md-6">
              <label class="exec-label"><i class="fa-solid fa-address-card me-1"></i> Tarjeta de presentación</label>
              <input type="url" class="exec-input-light w-100" v-model="form.business_card_link" placeholder="https://forms.gle/..." />
            </div>
            <div class="col-12">
              <div class="ev-hint">
                Cada botón se muestra solo si tiene link. Los que dejes vacíos simplemente no aparecen en el correo.
                El grupo de WhatsApp no está aquí: va por categoría de entrada, más abajo.
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORIAS DE ENTRADA -->
        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title"><i class="fa-solid fa-ticket me-2"></i> Categorías de entrada</h6>
          <div class="ev-hint mb-3">
            Enciende solo las que se venden en este congreso: unos tienen VIP, PREMIUM y VIRTUAL,
            otros suman GENERAL. Las apagadas no aparecen al registrar la inscripción.
            Cada categoría lleva su propio grupo de WhatsApp, que es el que recibe el inscrito en su correo.
          </div>

          <div v-if="loadingCategories" class="text-muted small">
            <i class="fas fa-spinner fa-spin me-2"></i>Cargando categorías...
          </div>

          <div v-else class="ev-cats">
            <div v-for="c in categories" :key="c.cat_event_category"
                 class="ev-cat" :class="{ 'is-off': !c.enabled }">
              <div class="ev-cat-head">
                <label class="ev-switch">
                  <input type="checkbox" v-model="c.enabled" />
                  <span>{{ c.description }}</span>
                </label>
              </div>

              <div class="ev-cat-body">
                <div class="row g-2">
                  <div class="col-6 col-lg-3">
                    <label class="exec-label">Alumno S/.</label>
                    <input type="number" min="0" step="0.01" class="exec-input-light w-100"
                           :disabled="!c.enabled" v-model.number="c.price_student_soles" />
                  </div>
                  <div class="col-6 col-lg-3">
                    <label class="exec-label">Alumno US$</label>
                    <input type="number" min="0" step="0.01" class="exec-input-light w-100"
                           :disabled="!c.enabled" v-model.number="c.price_student_dollars" />
                  </div>
                  <div class="col-6 col-lg-3">
                    <label class="exec-label">Profesional S/.</label>
                    <input type="number" min="0" step="0.01" class="exec-input-light w-100"
                           :disabled="!c.enabled" v-model.number="c.price_profesional_soles" />
                  </div>
                  <div class="col-6 col-lg-3">
                    <label class="exec-label">Profesional US$</label>
                    <input type="number" min="0" step="0.01" class="exec-input-light w-100"
                           :disabled="!c.enabled" v-model.number="c.price_profesional_dollars" />
                  </div>
                  <div class="col-12">
                    <label class="exec-label"><i class="fa-brands fa-whatsapp me-1" style="color:#25d366"></i> Grupo de WhatsApp de {{ c.description }}</label>
                    <input type="url" class="exec-input-light w-100" :disabled="!c.enabled"
                           v-model="c.whatsapp_link" placeholder="https://chat.whatsapp.com/..." />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!loadingCategories && !categories.some(c => c.enabled)" class="ev-empty mt-3">
            <i class="fa-solid fa-circle-info me-2"></i>
            Sin ninguna categoría activa, el formulario de inscripción vuelve a ofrecer las cuatro.
            Enciende al menos una.
          </div>
        </div>

        <!-- DETALLE DE SESIONES -->
        <div class="exec-fieldset mb-4">
          <h6 class="fieldset-title"><i class="fa-solid fa-clock me-2"></i> Detalle de sesiones</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="exec-label"><i class="fa-solid fa-video me-1"></i> Entradas VIRTUAL</label>
              <textarea class="exec-input-light w-100" rows="5" v-model="form.session_detail_virtual"
                        placeholder="Día 1: Viernes 19 de Junio de 5pm a 9:20pm - Vía Zoom (Hora Perú)"></textarea>
            </div>
            <div class="col-md-6">
              <label class="exec-label"><i class="fa-solid fa-location-dot me-1"></i> Entradas VIP, GENERAL y PREMIUM</label>
              <textarea class="exec-input-light w-100" rows="5" v-model="form.session_detail_onsite"
                        placeholder="Día 1: Viernes 19 de Junio de 5pm a 9:20pm - Hotel Marriott, Miraflores"></textarea>
            </div>
            <div class="col-12">
              <div class="ev-hint">El correo pinta el texto que corresponde a la categoría de entrada del inscrito. Si solo cargas uno, se usa ese para todos.</div>
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="!loadingList && eventOptions.length > 0" class="ev-placeholder">
        <i class="fa-solid fa-hand-pointer fa-2x mb-3"></i>
        <p>Selecciona un evento arriba para gestionar su banner, sus links y su detalle de sesiones.</p>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import SearchSelect from '@/components/SearchSelect.vue'
import { compressImage } from '@/utils/imageCompress.js'

// Gestion de los recursos que consume el correo de confirmacion de eventos
// (Backend/src/templates/confirmacion-evento.js): banner, los tres botones y el
// detalle de sesiones por tipo de entrada.
//
// Vive en Fundacion y no en Producto > Cronograma porque es Fundacion quien
// organiza los congresos y quien mantiene estos datos.

const editionService = inject(ServiceKeys.Edition)
const toast = useToast()

// Alineado con el limite del backend (edition.usecases.js): lo que se acepta
// como archivo de entrada.
const MAX_BANNER_BYTES = 2 * 1024 * 1024

// Lo que de verdad se manda por la red, ya recomprimido. Muy por debajo del
// client_max_body_size tipico de un proxy (1 MB), que en base64 se alcanza con
// apenas 750 KB de imagen. El banner ademas se incrusta en CADA correo.
const WIRE_BUDGET_BYTES = 400 * 1024

const eventEditions = ref([])
const selectedEditionId = ref(null)
const loadingList = ref(false)
// Mensaje real del backend. Sin esto un 500 se veía igual que "no hay eventos".
const loadError = ref(null)
const loadingResources = ref(false)
const loadingCategories = ref(false)
const saving = ref(false)

// Las categorias cuelgan de la version del programa, no de la edicion, pero se
// piden por edicion: el backend traduce.
const categories = ref([])

const form = reactive({
  certificate_form_link: null,
  business_card_link: null,
  session_detail_virtual: null,
  session_detail_onsite: null,
  banner_preview: null,
  // null = el usuario no toco el banner (no se manda y el backend deja el que
  // ya estaba). '' = lo quita explicitamente.
  banner_image_base64: null,
  banner_mime: null
})

const selected = computed(() =>
  eventEditions.value.find(e => e.edition_num_id === selectedEditionId.value) || null
)

// El listado incluye ediciones inactivas a proposito (un congreso pasado se
// desactiva y sus recursos siguen siendo editables), por eso van marcadas.
const eventOptions = computed(() => eventEditions.value.map(e => {
  const fecha = e.start_date ? String(e.start_date).slice(0, 10).split('-').reverse().join('/') : 's/f'
  const code = e.global_code || e.specific_code || ''
  const inactivo = e.active === 'N' ? ' · (inactiva)' : ''
  return { ...e, label: `${e.abbreviation || 'Sin nombre'} · ${fecha}${code ? ' · ' + code : ''}${inactivo}` }
}))

function resetForm () {
  Object.keys(form).forEach(k => { form[k] = null })
}

async function loadEvents () {
  loadingList.value = true
  loadError.value = null
  try {
    eventEditions.value = await editionService.eventEditionsList()
  } catch (e) {
    console.error('[loadEvents]', e)
    eventEditions.value = []
    loadError.value = e?.response?.data?.message || e?.message || 'Error desconocido'
    toast.error('No se pudieron cargar los eventos')
  } finally {
    loadingList.value = false
  }
}

async function loadCategories () {
  loadingCategories.value = true
  try {
    const res = await editionService.eventCategoriesGet(selectedEditionId.value)
    categories.value = (res?.items || []).map(c => ({
      ...c,
      price_student_soles: Number(c.price_student_soles || 0),
      price_student_dollars: Number(c.price_student_dollars || 0),
      price_profesional_soles: Number(c.price_profesional_soles || 0),
      price_profesional_dollars: Number(c.price_profesional_dollars || 0)
    }))
  } catch (e) {
    console.error('[loadCategories]', e)
    categories.value = []
    toast.error(e?.response?.data?.message || 'No se pudieron cargar las categorías')
  } finally {
    loadingCategories.value = false
  }
}

async function onEventChange () {
  resetForm()
  categories.value = []
  if (!selectedEditionId.value) return
  loadingResources.value = true
  try {
    const data = await editionService.eventResourcesGet(selectedEditionId.value)
    if (data) {
      form.certificate_form_link = data.certificate_form_link ?? null
      form.business_card_link = data.business_card_link ?? null
      form.session_detail_virtual = data.session_detail_virtual ?? null
      form.session_detail_onsite = data.session_detail_onsite ?? null
      // Los bytes se piden aparte: no viajan en el get general.
      if (data.has_banner_image) {
        const banner = await editionService.eventBannerGet(selectedEditionId.value)
        form.banner_preview = banner?.data_url || null
      }
    }
  } catch (e) {
    console.error('[onEventChange]', e)
    toast.error('No se pudieron cargar los recursos de este evento')
  } finally {
    loadingResources.value = false
  }
  await loadCategories()
}

// El banner no se sube a disco: se lee a base64 y se guarda como bytea. Asi no
// depende de hosting publico ni se pierde en un redeploy del contenedor.
//
// Se recomprime en el navegador antes de mandarlo. Un JPG de 2 MB son ~2.7 MB
// de body en base64, y un proxy con client_max_body_size de 1 MB corta la
// conexion sin responder: el navegador lo reporta como "Network Error" y no
// hay forma de saber que fue el tamano.
async function onBannerFile (event) {
  const file = event.target?.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    toast.error('El banner debe ser JPG o PNG')
    return
  }
  if (file.size > MAX_BANNER_BYTES) {
    toast.error('El banner supera 2 MB. Comprímelo antes de subirlo.')
    return
  }
  try {
    const out = await compressImage(file, { maxSide: 1200, maxBytes: WIRE_BUDGET_BYTES })
    form.banner_preview = out.dataUrl
    form.banner_image_base64 = out.base64
    form.banner_mime = out.mime
    if (out.bytes < file.size * 0.9) {
      toast.info(`Banner optimizado: ${fmtKb(file.size)} → ${fmtKb(out.bytes)}`)
    }
  } catch (e) {
    console.error('[onBannerFile]', e)
    toast.error('No se pudo procesar la imagen')
  }
}

function fmtKb (bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

function removeBanner () {
  form.banner_preview = null
  form.banner_image_base64 = ''
  form.banner_mime = null
}

// Un "no se pudo guardar" pelado no dice si fue validacion, permisos, una ruta
// que no existe todavia o el backend caido. Sin `response` no hubo respuesta:
// eso es red o servidor abajo, no un rechazo del endpoint.
function describeError (e, { hadBanner = false } = {}) {
  const status = e?.response?.status
  const msg = e?.response?.data?.message || e?.response?.data?.error
  if (msg) return `${msg}${status ? ` (HTTP ${status})` : ''}`
  if (status) return `HTTP ${status} sin detalle del servidor`
  // Sin `response` no hubo respuesta HTTP. Con un banner en el payload la causa
  // mas probable es un proxy cortando por tamano; sin el, backend caido o CORS.
  return hadBanner
    ? 'la conexión se cortó al subir el banner. Suele ser el límite de tamaño del servidor: prueba guardar sin cambiar el banner para confirmarlo.'
    : `Sin respuesta del servidor (${e?.message || 'error de red'})`
}

async function guardar () {
  if (!selectedEditionId.value) return
  saving.value = true

  // Dos llamadas, dos catch. Con uno solo, si los recursos se guardaban y
  // fallaban las categorias el toast decia "no se pudieron guardar los
  // recursos", que era falso y mandaba a rehacer trabajo ya hecho.
  try {
    // whatsapp_link NO va aqui: ahora es por categoria. Omitir la clave deja
    // intacto el link de la edicion, que sigue sirviendo de fallback.
    const payload = {
      edition_num_id: Number(selectedEditionId.value),
      certificate_form_link: form.certificate_form_link ?? null,
      business_card_link: form.business_card_link ?? null,
      session_detail_virtual: form.session_detail_virtual ?? null,
      session_detail_onsite: form.session_detail_onsite ?? null
    }
    if (form.banner_image_base64 !== null) {
      payload.banner_image_base64 = form.banner_image_base64
      payload.banner_mime = form.banner_mime
    }
    await editionService.eventResourcesSave(payload)
  } catch (e) {
    console.error('[guardar:recursos]', e)
    toast.error(`Banner y links: ${describeError(e, { hadBanner: form.banner_image_base64 !== null })}`)
    saving.value = false
    return
  }

  try {
    if (categories.value.length) {
      await editionService.eventCategoriesSave({
        edition_num_id: Number(selectedEditionId.value),
        categories: categories.value.map(c => ({
          cat_event_category: Number(c.cat_event_category),
          enabled: !!c.enabled,
          price_student_soles: Number(c.price_student_soles) || 0,
          price_student_dollars: Number(c.price_student_dollars) || 0,
          price_profesional_soles: Number(c.price_profesional_soles) || 0,
          price_profesional_dollars: Number(c.price_profesional_dollars) || 0,
          whatsapp_link: c.whatsapp_link || null
        }))
      })
    }
  } catch (e) {
    console.error('[guardar:categorias]', e)
    toast.error(`Banner y links sí se guardaron. Categorías: ${describeError(e)}`)
    saving.value = false
    return
  }

  toast.success('Recursos del evento guardados')
  saving.value = false
  // Refresca los indicadores de "tiene banner / tiene links" del selector.
  await loadEvents()
}

onMounted(loadEvents)
</script>

<style scoped>
/* Mismo lenguaje visual que el resto de Fundación (ver fundacion/LeadsNew.vue). */
.ef-page {
  background: #FFFFFF;
  padding: 32px 32px 24px;
  font-family: 'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1A1A1A;
  min-height: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.ef-page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; }
.ef-page-header-left { display: flex; flex-direction: column; gap: 2px; }
.ef-breadcrumb { font-size: 11px; color: #A3A3A3; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
.ef-page-title { font-size: 22px; font-weight: 700; color: #1A1A1A; margin: 0; letter-spacing: -0.02em; }
.ef-header-actions { display: flex; align-items: center; gap: 10px; }
.ef-body { padding: 0; }

.ef-btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 22px; font-size: 13px; font-weight: 600; border-radius: 8px;
  cursor: pointer; transition: all .2s ease; font-family: inherit;
  color: #fff; background: var(--we-navy, #002060); border: 1px solid var(--we-navy, #002060);
}
.ef-btn-primary:hover:not(:disabled) { background: var(--we-navy-dark, #001540); }
.ef-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.exec-fieldset { background: #fff; border: 1px solid #F0F0F0; border-radius: 10px; padding: 24px; }
.fieldset-title {
  font-size: 11px; font-weight: 600; color: #8C8C8C; text-transform: uppercase;
  letter-spacing: 0.06em; margin: 0 0 20px 0; padding: 0 0 0 12px;
  border-left: 3px solid #1A1A1A; line-height: 1.4;
}
.exec-label {
  font-size: 12px; font-weight: 600; color: #737373; text-transform: uppercase;
  letter-spacing: 0.03em; display: block; margin-bottom: 6px;
}
.exec-input-light {
  border: 1px solid #E8E8E8; border-radius: 8px; padding: 9px 12px;
  font-size: 13px; font-family: inherit; color: #1A1A1A; background: #fff;
}
.exec-input-light:focus { outline: none; border-color: var(--we-navy, #002060); }
textarea.exec-input-light { resize: vertical; line-height: 1.5; }

.ev-hint { font-size: 11.5px; color: #A3A3A3; margin-top: 6px; line-height: 1.45; }
.ev-remove {
  background: none; border: none; padding: 0; margin-top: 8px;
  font-size: 12px; font-weight: 600; color: #DC2626; cursor: pointer;
}
.ev-preview {
  border: 1px dashed #E8E8E8; border-radius: 8px; padding: 10px;
  min-height: 96px; display: flex; align-items: center; justify-content: center;
}
.ev-preview img { max-width: 100%; max-height: 140px; border-radius: 4px; }
.ev-preview-empty { font-size: 12px; color: #A3A3A3; text-align: center; }

.ev-flags { display: flex; gap: 8px; flex-wrap: wrap; }
.ev-flag {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px;
}
.ev-flag.is-on  { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.ev-flag.is-off { background: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0; }

.ev-empty {
  font-size: 12.5px; color: #92400e; background: #fffbeb;
  border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; line-height: 1.5;
}
/* Una tarjeta por categoria. La apagada se atenua pero sigue visible: hay que
   poder ver su precio antes de decidir si se enciende. */
.ev-cats { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.ev-cat {
  border: 1px solid #E5E5E5; border-radius: 10px; padding: 14px;
  background: #FCFCFC; transition: opacity .15s, border-color .15s;
}
.ev-cat.is-off { opacity: .55; background: #F8F8F8; }
.ev-cat-head { margin-bottom: 10px; }
.ev-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; margin: 0; }
.ev-switch input { width: 16px; height: 16px; cursor: pointer; accent-color: #002060; }
.ev-switch span { font-size: 13px; font-weight: 700; color: #1A1A1A; letter-spacing: .02em; }
.ev-cat .exec-label { font-size: 10.5px; }
.ev-cat input:disabled { background: #F1F1F1; cursor: not-allowed; }

.ev-empty-error { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
.ev-retry {
  display: inline-block; margin-left: 10px; font-size: 11.5px; font-weight: 700;
  padding: 3px 10px; border-radius: 8px; border: 1px solid #fecaca;
  background: #fff; color: #991b1b;
}
.ev-loading, .ev-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 220px; color: #A3A3A3; font-size: 13px; text-align: center;
}

[data-coreui-theme="dark"] .ef-page { background: #1A1A14; color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-page-title { color: #F4F4F0; }
[data-coreui-theme="dark"] .ef-breadcrumb { color: #6F6F66; }
[data-coreui-theme="dark"] .exec-fieldset { background: #201F18; border-color: #2A2A22; }
[data-coreui-theme="dark"] .fieldset-title { border-left-color: #8FAADC; color: #A0A099; }
[data-coreui-theme="dark"] .exec-label { color: #A0A099; }
[data-coreui-theme="dark"] .exec-input-light { background: #1A1A14; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .ev-preview { border-color: #2A2A22; }
[data-coreui-theme="dark"] .ev-hint, [data-coreui-theme="dark"] .ev-preview-empty { color: #6F6F66; }
[data-coreui-theme="dark"] .ev-flag.is-off { background: rgba(148,163,184,.12); color: #94a3b8; border-color: #2A2A22; }
[data-coreui-theme="dark"] .ev-empty { background: rgba(245,158,11,.12); color: #FCD34D; border-color: rgba(245,158,11,.35); }
[data-coreui-theme="dark"] .ev-cat { background: #1F1E17; border-color: #2A2A22; }
[data-coreui-theme="dark"] .ev-cat.is-off { background: #1B1A14; }
[data-coreui-theme="dark"] .ev-switch span { color: #F4F4F0; }
[data-coreui-theme="dark"] .ev-switch input { accent-color: #8FAADC; }
[data-coreui-theme="dark"] .ev-cat input:disabled { background: #17160F; }
[data-coreui-theme="dark"] .ev-empty-error { background: rgba(239,68,68,.12); color: #FCA5A5; border-color: rgba(239,68,68,.35); }
[data-coreui-theme="dark"] .ev-retry { background: transparent; color: #FCA5A5; border-color: rgba(239,68,68,.35); }
</style>
