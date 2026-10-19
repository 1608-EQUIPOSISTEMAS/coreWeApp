<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Configuración del bot de WhatsApp</h1>
        <p class="ds-sub">Qué números tiene la cuenta de Meta y qué asesora atiende cada programa. El bot reconoce el programa por la frase que trae escrita el enlace.</p>
      </div>
      <div class="ds-head-actions">
        <router-link class="btn-exec btn-exec-outline" to="/comercial/whatsapp">
          <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Ir a la bandeja
        </router-link>
      </div>
    </header>

    <p v-if="error" class="ds-alert">{{ error }}</p>
    <p v-for="w in avisos" :key="w" class="ds-callout warn">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>{{ w }}</span>
    </p>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">Números</h3>
        <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="editarNumero()">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar número
        </button>
      </header>
      <div class="ds-panel-body">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista">
            <thead>
              <tr><th>Línea</th><th>Rol</th><th>WhatsApp</th><th>Usuaria del ERP</th><th>Estado</th><th class="num">Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-if="loading && !data"><td colspan="6"><span class="ds-skel"></span></td></tr>
              <tr v-else-if="!numeros.length">
                <td colspan="6" class="ds-empty ds-empty--lista">No hay números. Agrega el del bot y el de cada asesora con su Phone Number ID de Meta.</td>
              </tr>
              <tr v-for="n in numeros" v-else :key="n.id">
                <td>
                  <strong>{{ n.label }}</strong>
                  <span v-if="n.porDefecto" class="ds-pill ok">Por defecto</span>
                </td>
                <td><span class="ds-pill" :class="n.rol.tone">{{ n.rol.label }}</span></td>
                <td><a :href="n.waMe" target="_blank" rel="noopener">{{ n.telefono }}</a></td>
                <td>{{ n.usuario }}</td>
                <td><span class="ds-pill" :class="n.activo ? 'ok' : ''">{{ n.activo ? 'Activo' : 'Inactivo' }}</span></td>
                <td class="num">
                  <button class="btn-icon btn-icon-sm" type="button" :title="`Editar ${n.label}`" :aria-label="`Editar ${n.label}`" @click="editarNumero(n.id)">
                    <i class="fa-solid fa-pen" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="ds-panel">
      <header class="ds-panel-head">
        <h3 class="ds-panel-title">Asesora por programa</h3>
        <button class="btn-exec btn-exec-outline btn-sm" type="button" :disabled="!asesoras.length" @click="editarPrograma()">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Asignar programa
        </button>
      </header>
      <div class="ds-panel-body">
        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista">
            <thead>
              <tr><th>Programa</th><th>Asesora</th><th>Frases que lo reconocen</th><th class="num">Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-if="loading && !data"><td colspan="4"><span class="ds-skel"></span></td></tr>
              <tr v-else-if="!programas.length">
                <td colspan="4" class="ds-empty ds-empty--lista">Ningún programa asignado: todo lo que llegue se deriva a la asesora por defecto. Asigna los programas con anuncio activo.</td>
              </tr>
              <tr v-for="p in programas" v-else :key="p.program_id">
                <td>
                  <strong>{{ p.program_name }}</strong>
                  <small v-if="p.missing_media?.length" class="falta">
                    <span class="ds-pill warn">Faltan archivos</span> {{ p.missing_media.join(', ') }}. Pídeselos a Producto (Programas → Archivos del programa): sin ellos el bot no responde.
                  </small>
                </td>
                <td>{{ p.advisor_label }}</td>
                <td>
                  <span v-if="!p.prefill_phrases.length" class="ds-pill warn">Sin frases: el bot no lo reconoce</span>
                  <small v-for="f in p.prefill_phrases" :key="f" class="frase">“{{ f }}”</small>
                </td>
                <td class="num">
                  <button class="btn-icon btn-icon-sm" type="button" :title="`Editar ${p.program_name}`" :aria-label="`Editar ${p.program_name}`" @click="editarPrograma(p)">
                    <i class="fa-solid fa-pen" aria-hidden="true"></i>
                  </button>
                  <button class="btn-icon btn-icon-sm" type="button" :title="`Quitar ${p.program_name}`" :aria-label="`Quitar ${p.program_name}`" @click="quitarPrograma(p)">
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <BaseModal v-model="modalNumero" :title="numero.wa_number_id ? 'Editar número' : 'Agregar número'" size="md">
      <form id="form-numero" ref="numeroRef" class="ds-form-grid" @submit.prevent="guardarNumero">
        <div class="ds-field">
          <label class="ds-label" for="wa-label">Nombre de la línea<span class="ds-req">*</span></label>
          <input id="wa-label" v-model.trim="numero.label" class="ds-input" maxlength="80" required placeholder="Grecia, Bot WE…" />
        </div>
        <div class="ds-field">
          <label class="ds-label" for="wa-rol">Rol<span class="ds-req">*</span></label>
          <select id="wa-rol" v-model="numero.role" class="ds-input" required>
            <option value="ADVISOR">Asesora</option>
            <option value="BOT">Bot</option>
          </select>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="wa-phone">Número de WhatsApp<span class="ds-req">*</span></label>
          <input id="wa-phone" v-model="numero.display_phone" class="ds-input" inputmode="tel" required placeholder="51920764971" />
          <span class="ds-help">Con código de país, como en wa.me.</span>
        </div>
        <div class="ds-field">
          <label class="ds-label" for="wa-pnid">Phone Number ID de Meta<span class="ds-req">*</span></label>
          <input id="wa-pnid" v-model.trim="numero.phone_number_id" class="ds-input" required />
          <span class="ds-help">Administrador de WhatsApp → Números de teléfono.</span>
        </div>
        <div v-if="numero.role === 'ADVISOR'" class="ds-field">
          <label class="ds-label" for="wa-user">Usuaria del ERP</label>
          <select id="wa-user" v-model="numero.user_id" class="ds-input">
            <option :value="null">Sin asignar</option>
            <option v-for="u in data?.users ?? []" :key="u.user_id" :value="u.user_id">{{ u.alias }}</option>
          </select>
          <span class="ds-help">Ella responde desde la bandeja las conversaciones de esta línea.</span>
        </div>
        <div class="ds-field interruptores">
          <label v-if="numero.role === 'ADVISOR'" class="switch-row">
            <span class="exec-switch"><input v-model="numero.is_default_advisor" type="checkbox" /><span></span></span>
            Recibe los programas sin asesora
          </label>
          <label class="switch-row">
            <span class="exec-switch">
              <input type="checkbox" :checked="numero.active === 'Y'" @change="numero.active = $event.target.checked ? 'Y' : 'N'" /><span></span>
            </span>
            {{ numero.active === 'Y' ? 'Línea activa' : 'Línea inactiva' }}
          </label>
        </div>
      </form>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="modalNumero = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="submit" form="form-numero" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar número' }}</button>
      </template>
    </BaseModal>

    <BaseModal v-model="modalPrograma" :title="programa.editando ? 'Editar programa' : 'Asignar programa'" size="md">
      <form id="form-programa" ref="programaRef" class="ds-form-grid" @submit.prevent="guardarPrograma">
        <div class="ds-field full">
          <label class="ds-label">Programa<span class="ds-req">*</span></label>
          <SearchSelect
            v-model="programa.program_id"
            :items="data?.programs ?? []"
            label-field="program_name"
            value-field="program_id"
            :disabled="programa.editando"
            required
          />
        </div>
        <div class="ds-field full">
          <label class="ds-label" for="wa-asesora">Asesora<span class="ds-req">*</span></label>
          <select id="wa-asesora" v-model="programa.advisor_number_id" class="ds-input" required>
            <option v-for="a in asesoras" :key="a.wa_number_id" :value="a.wa_number_id">{{ a.label }}</option>
          </select>
        </div>
        <div class="ds-field full">
          <label class="ds-label" for="wa-frases">Frases prellenadas</label>
          <textarea id="wa-frases" v-model="programa.frases" class="ds-input" rows="4" placeholder="información del curso N8N: Agentes IA"></textarea>
          <span class="ds-help">Una por línea, tal cual la trae el enlace del anuncio o de la web (tildes y mayúsculas no importan).</span>
        </div>
      </form>
      <template #footer>
        <button class="btn-exec btn-exec-outline" type="button" @click="modalPrograma = false">Cancelar</button>
        <button class="btn-exec btn-exec-primary" type="submit" form="form-programa" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar programa' }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ServiceKeys } from '@/services'
import BaseModal from '@/components/BaseModal.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { confirmAction } from '@/composables/useConfirm'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import { numberRow, emptyNumber, numberPayload, parsePhrases, formatPhrases, configWarnings } from '@/features/whatsapp/config'

const service = inject(ServiceKeys.Whatsapp)
const toast = useToast()

const data = ref(null)
const loading = ref(false)
const error = ref('')
const guardando = ref(false)
const modalNumero = ref(false)
const modalPrograma = ref(false)
const numero = ref(emptyNumber())
const programa = ref({})
const numeroRef = ref(null)
const programaRef = ref(null)
const numeroCompleto = useRequiredFieldsGuard(numeroRef)
const programaCompleto = useRequiredFieldsGuard(programaRef)

async function cargar () {
  loading.value = true
  error.value = ''
  try {
    data.value = await service.config()
  } catch (err) {
    console.error('[WhatsappConfig] config', { err })
    error.value = err?.response?.data?.message || 'No se pudo cargar la configuración del bot.'
  } finally {
    loading.value = false
  }
}
onMounted(cargar)

const numeros = computed(() => (data.value?.numbers ?? []).map(numberRow))
const programas = computed(() => data.value?.programAdvisors ?? [])
const asesoras = computed(() => (data.value?.numbers ?? []).filter(n => n.role === 'ADVISOR' && n.active === 'Y'))
const avisos = computed(() => data.value ? configWarnings(data.value) : [])

function editarNumero (id) {
  const actual = data.value?.numbers.find(n => n.wa_number_id === id)
  numero.value = actual
    ? { wa_number_id: actual.wa_number_id, phone_number_id: actual.phone_number_id, display_phone: actual.display_phone, label: actual.label, role: actual.role, user_id: actual.user_id, is_default_advisor: actual.is_default_advisor, active: actual.active }
    : emptyNumber()
  modalNumero.value = true
}

async function guardarNumero () {
  if (!numeroCompleto()) return
  guardando.value = true
  try {
    await service.guardarNumero(numberPayload(numero.value))
    toast.success(`Línea ${numero.value.label} guardada`)
    modalNumero.value = false
    await cargar()
  } catch (err) {
    console.error('[WhatsappConfig] guardar número', { numero: numero.value, err })
    toast.error(err?.response?.data?.message || 'No se pudo guardar el número.')
  } finally {
    guardando.value = false
  }
}

function editarPrograma (actual) {
  programa.value = actual
    ? { program_id: actual.program_id, advisor_number_id: actual.advisor_number_id, frases: formatPhrases(actual.prefill_phrases), editando: true }
    : { program_id: null, advisor_number_id: asesoras.value[0]?.wa_number_id ?? null, frases: '', editando: false }
  modalPrograma.value = true
}

async function guardarPrograma () {
  if (!programaCompleto()) return
  guardando.value = true
  try {
    const { program_id, advisor_number_id, frases } = programa.value
    await service.guardarPrograma({ program_id, advisor_number_id, prefill_phrases: parsePhrases(frases) })
    toast.success('Programa guardado')
    modalPrograma.value = false
    await cargar()
  } catch (err) {
    console.error('[WhatsappConfig] guardar programa', { programa: programa.value, err })
    toast.error(err?.response?.data?.message || 'No se pudo guardar el programa.')
  } finally {
    guardando.value = false
  }
}

async function quitarPrograma (p) {
  const ok = await confirmAction({
    title: `Quitar ${p.program_name}`,
    text: 'El bot deja de reconocer este programa por sus frases y sus conversaciones se derivan a la asesora por defecto.',
    confirmText: 'Quitar programa',
    danger: true
  })
  if (!ok) return
  try {
    await service.quitarPrograma(p.program_id)
    toast.success('Programa quitado')
    await cargar()
  } catch (err) {
    console.error('[WhatsappConfig] quitar programa', { programId: p.program_id, err })
    toast.error(err?.response?.data?.message || 'No se pudo quitar el programa.')
  }
}
</script>

<style scoped>
.frase { display: block; color: var(--ds-ink-2); }
.falta { display: block; margin-top: 4px; color: var(--ds-warn-ink); }
.full { grid-column: 1 / -1; }
.interruptores { display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.switch-row { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ds-ink); cursor: pointer; }
</style>
