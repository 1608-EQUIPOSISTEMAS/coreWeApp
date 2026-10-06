<template>
  <div class="ds-page">

    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Recursos de eventos</h1>
        <p class="ds-sub">Banner, botones, categorías de entrada y sesiones que lleva el correo de confirmación de cada congreso.</p>
      </div>
      <div class="ds-head-actions">
        <button type="button" class="btn-exec btn-exec-primary" :disabled="!selectedEditionId || saving" @click="guardar">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" aria-hidden="true"></i>
          {{ saving ? 'Guardando…' : 'Guardar recursos' }}
        </button>
      </div>
    </header>

    <!-- SELECTOR DE EVENTO -->
    <section class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title"><i class="fa-solid fa-calendar-star" aria-hidden="true"></i> Congreso o evento</h3>
        <div v-if="selected" class="ev-flags">
          <span class="ds-pill" :class="{ ok: selected.has_banner_image }">
            <i class="fa-solid" :class="selected.has_banner_image ? 'fa-check' : 'fa-xmark'" aria-hidden="true"></i> Banner
          </span>
          <span class="ds-pill" :class="{ ok: selected.has_resources }">
            <i class="fa-solid" :class="selected.has_resources ? 'fa-check' : 'fa-xmark'" aria-hidden="true"></i> Links y textos
          </span>
        </div>
      </header>
      <div class="ds-panel-body ds-stack">
        <div class="ds-field">
          <label class="ds-label">Selecciona el congreso o evento a gestionar</label>
          <SearchSelect
            v-model="selectedEditionId"
            :items="eventOptions"
            label-field="label"
            value-field="edition_num_id"
            :viewOpen="8"
            placeholder="Buscar congreso o evento..."
            class="w-100"
            @change="onEventChange"
          />
        </div>

        <!-- Un fallo al cargar NO es "no hay eventos": decirlo así mandaba al
             usuario a revisar el tipo de programa por un error del servidor. -->
        <p v-if="loadError" class="ds-alert ev-alert">
          <span>
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            No se pudo cargar la lista de eventos. {{ loadError }}
          </span>
          <button type="button" class="btn-exec btn-exec-outline btn-sm" @click="loadEvents">
            <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Reintentar
          </button>
        </p>

        <p v-else-if="!loadingList && eventOptions.length === 0" class="ds-callout info">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>
            No hay ediciones de <strong>Congreso / Evento</strong>. Revisa en
            <em>Producto → Programas</em> que el programa tenga ese tipo; también
            aparecen aquí las ediciones que ya tengan recursos o inscritos con
            categoría de entrada.
          </span>
        </p>
      </div>
    </section>

    <!-- Skeleton con la forma de los paneles que vienen: no una pantalla en blanco. -->
    <section v-if="loadingResources" class="ds-panel" aria-busy="true" aria-label="Cargando recursos del evento">
      <div class="ds-panel-body ds-stack">
        <span v-for="n in 5" :key="n" class="ds-skel"></span>
      </div>
    </section>

    <template v-else-if="selectedEditionId">
      <!-- BANNER -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title"><i class="fa-solid fa-image" aria-hidden="true"></i> Banner del correo</h3>
        </header>
        <div class="ds-panel-body ds-form-grid">
          <div class="ds-field">
            <label class="ds-label" for="ev-banner">Imagen</label>
            <input id="ev-banner" type="file" class="ds-input ev-file" accept="image/jpeg,image/png" @change="onBannerFile" />
            <span class="ds-help">JPG o PNG, máximo 2 MB. Viaja incrustado en el correo, así que el peso se multiplica por cada inscrito.</span>
            <button v-if="form.banner_preview" type="button" class="btn-exec btn-exec-outline btn-sm ev-remove" @click="removeBanner">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i> Quitar banner
            </button>
          </div>
          <div class="ds-field">
            <span class="ds-label">Vista previa</span>
            <div class="ev-preview">
              <img v-if="form.banner_preview" :src="form.banner_preview" alt="Banner del evento" />
              <span v-else class="ds-empty">Sin banner cargado: el correo usará el del programa.</span>
            </div>
          </div>
        </div>
      </section>

      <!-- BOTONES DEL CORREO -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title"><i class="fa-solid fa-link" aria-hidden="true"></i> Botones del correo</h3>
        </header>
        <div class="ds-panel-body ds-form-grid">
          <div class="ds-field">
            <label class="ds-label" for="ev-cert"><i class="fa-solid fa-certificate" aria-hidden="true"></i> Datos para el certificado</label>
            <input id="ev-cert" type="url" class="ds-input" v-model="form.certificate_form_link" placeholder="https://forms.gle/..." />
          </div>
          <div class="ds-field">
            <label class="ds-label" for="ev-card"><i class="fa-solid fa-address-card" aria-hidden="true"></i> Tarjeta de presentación</label>
            <input id="ev-card" type="url" class="ds-input" v-model="form.business_card_link" placeholder="https://forms.gle/..." />
          </div>
          <span class="ds-help ev-span">
            Cada botón se muestra solo si tiene link. Los que dejes vacíos simplemente no aparecen en el correo.
            El grupo de WhatsApp no está aquí: va por categoría de entrada, más abajo.
          </span>
        </div>
      </section>

      <!-- CATEGORIAS DE ENTRADA -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <div>
            <h3 class="ds-panel-title"><i class="fa-solid fa-ticket" aria-hidden="true"></i> Categorías de entrada</h3>
            <p class="ds-panel-sub">
              Enciende solo las que se venden en este congreso: unos tienen VIP, PREMIUM y VIRTUAL,
              otros suman GENERAL. Las apagadas no aparecen al registrar la inscripción.
              Cada categoría lleva su propio grupo de WhatsApp, que es el que recibe el inscrito en su correo.
            </p>
          </div>
        </header>
        <div class="ds-panel-body ds-stack">
          <div v-if="loadingCategories" class="ev-cats" aria-busy="true" aria-label="Cargando categorías">
            <div v-for="n in 4" :key="n" class="ev-cat ds-stack">
              <span class="ds-skel"></span>
              <span class="ds-skel"></span>
            </div>
          </div>

          <div v-else class="ev-cats">
            <div v-for="c in categories" :key="c.cat_event_category"
                 class="ev-cat" :class="{ 'is-off': !c.enabled }">
              <label class="ev-cat-head">
                <span class="exec-switch">
                  <input type="checkbox" v-model="c.enabled" />
                  <span></span>
                </span>
                <span class="ev-cat-name">{{ c.description }}</span>
              </label>

              <div class="ev-prices">
                <div class="ds-field">
                  <label class="ds-label">Alumno S/.</label>
                  <input type="number" min="0" step="0.01" class="ds-input"
                         :disabled="!c.enabled" v-model.number="c.price_student_soles" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Alumno US$</label>
                  <input type="number" min="0" step="0.01" class="ds-input"
                         :disabled="!c.enabled" v-model.number="c.price_student_dollars" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Profesional S/.</label>
                  <input type="number" min="0" step="0.01" class="ds-input"
                         :disabled="!c.enabled" v-model.number="c.price_profesional_soles" />
                </div>
                <div class="ds-field">
                  <label class="ds-label">Profesional US$</label>
                  <input type="number" min="0" step="0.01" class="ds-input"
                         :disabled="!c.enabled" v-model.number="c.price_profesional_dollars" />
                </div>
                <div class="ds-field ev-span">
                  <label class="ds-label"><i class="fa-brands fa-whatsapp ev-wa" aria-hidden="true"></i> Grupo de WhatsApp de {{ c.description }}</label>
                  <input type="url" class="ds-input" :disabled="!c.enabled"
                         v-model="c.whatsapp_link" placeholder="https://chat.whatsapp.com/..." />
                </div>
              </div>
            </div>
          </div>

          <p v-if="!loadingCategories && !categories.some(c => c.enabled)" class="ds-callout warn">
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>
              Sin ninguna categoría activa, el formulario de inscripción vuelve a ofrecer las cuatro.
              Enciende al menos una.
            </span>
          </p>
        </div>
      </section>

      <!-- DETALLE DE SESIONES -->
      <section class="ds-panel">
        <header class="ds-panel-head">
          <h3 class="ds-panel-title"><i class="fa-solid fa-clock" aria-hidden="true"></i> Detalle de sesiones</h3>
        </header>
        <div class="ds-panel-body ds-form-grid">
          <div class="ds-field">
            <label class="ds-label" for="ev-virtual"><i class="fa-solid fa-video" aria-hidden="true"></i> Entradas VIRTUAL</label>
            <textarea id="ev-virtual" class="ds-input" rows="5" v-model="form.session_detail_virtual"
                      placeholder="Día 1: Viernes 19 de Junio de 5pm a 9:20pm - Vía Zoom (Hora Perú)"></textarea>
          </div>
          <div class="ds-field">
            <label class="ds-label" for="ev-onsite"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> Entradas VIP, GENERAL y PREMIUM</label>
            <textarea id="ev-onsite" class="ds-input" rows="5" v-model="form.session_detail_onsite"
                      placeholder="Día 1: Viernes 19 de Junio de 5pm a 9:20pm - Hotel Marriott, Miraflores"></textarea>
          </div>
          <span class="ds-help ev-span">El correo pinta el texto que corresponde a la categoría de entrada del inscrito. Si solo cargas uno, se usa ese para todos.</span>
        </div>
      </section>
    </template>

    <section v-else-if="!loadingList && eventOptions.length > 0" class="ds-panel">
      <p class="ds-empty ds-empty--lista">
        <i class="fa-solid fa-hand-pointer" aria-hidden="true"></i>
        Selecciona un evento arriba para gestionar su banner, sus links y su detalle de sesiones.
      </p>
    </section>

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
/* Solo lo propio de esta pantalla: estructura, colores y controles salen de
   ds-* (DESIGN_SYSTEM.md). */
.ev-flags { display: flex; gap: 6px; flex-wrap: wrap; }
.ev-alert { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 12px; }
.ev-span { grid-column: 1 / -1; }
/* El input file nativo trae su propio botón: con el alto fijo de .ds-input se corta. */
.ev-file { height: auto; }
.ev-remove { align-self: flex-start; margin-top: 8px; }

.ev-preview {
  display: flex; align-items: center; justify-content: center;
  min-height: 96px; padding: 10px;
  border: 1px dashed var(--ds-border-strong); border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-2);
}
.ev-preview img { max-width: 100%; max-height: 140px; border-radius: var(--ds-radius-control); }

/* Una tarjeta por categoria (bloque repetible, §5.5). La apagada se atenua pero
   sigue visible: hay que poder ver su precio antes de decidir si se enciende. */
.ev-cats { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
.ev-cat {
  padding: 14px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius);
  background: var(--ds-surface-2); transition: opacity .15s;
}
.ev-cat.is-off { opacity: .55; }
.ev-cat-head { display: inline-flex; align-items: center; gap: 10px; margin: 0 0 12px; cursor: pointer; }
.ev-cat-name { font-size: 13px; font-weight: 700; color: var(--ds-heading); }
.ev-prices { display: grid; gap: 10px 12px; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
.ev-wa { color: var(--ds-ok); }

@media (prefers-reduced-motion: reduce) {
  .ev-cat { transition: none; }
}
</style>
