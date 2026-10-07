<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Usuarios</h1>
        <p class="ds-sub">{{ filteredUsers.length }} de {{ users.length }} usuarios</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" @click="openNew">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo usuario
        </button>
      </div>
    </header>

    <section class="ds-panel">
      <div class="ds-panel-body">
        <div class="us-toolbar">
          <input
            v-model.trim="search"
            type="text"
            class="ds-input us-search"
            placeholder="Buscar por alias, nombre, correo o rol…"
            aria-label="Buscar usuarios"
          />
          <SearchSelect
            v-model="filterActive"
            :items="filtroEstado"
            label-field="description"
            value-field="value"
            placeholder="Estado…"
            :nullable="true"
            class="us-filter-estado"
          />
        </div>

        <div class="ds-table-scroll">
          <table class="ds-table ds-table--lista">
            <thead>
              <tr>
                <th class="us-col-acciones">Acciones</th>
                <th>Estado</th>
                <th>Alias</th>
                <th>Nombre completo</th>
                <th>Correo</th>
                <th>Roles</th>
                <th>Teléfonos</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n">
                  <td v-for="col in 7" :key="col"><span class="ds-skel"></span></td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="u in filteredUsers" :key="u.user_id" class="link" @dblclick="openEdit(u)">
                  <td class="us-col-acciones">
                    <button
                      class="btn-icon btn-icon-sm"
                      type="button"
                      :title="`Editar ${u.alias}`"
                      :aria-label="`Editar ${u.alias}`"
                      @click="openEdit(u)"
                    >
                      <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
                    </button>
                  </td>
                  <td>
                    <span class="ds-pill" :class="u.active ? 'ok' : 'bad'">
                      {{ u.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="us-mono us-strong us-nowrap">{{ u.alias }}</td>
                  <td class="us-nowrap">{{ u.full_name || '—' }}</td>
                  <td class="us-nowrap">{{ u.email || '—' }}</td>
                  <td>
                    <span class="us-roles">
                      <span v-for="r in u.roles" :key="r.rol_id" class="ds-pill">{{ r.alias }}</span>
                      <span v-if="!u.roles.length" class="us-muted">Sin rol</span>
                    </span>
                  </td>
                  <td class="us-mono us-nowrap">
                    <span v-if="u.telefonos.length">{{ u.telefonos.join(' · ') }}</span>
                    <span v-else class="us-muted">—</span>
                  </td>
                </tr>
                <tr v-if="!filteredUsers.length">
                  <td colspan="7" class="ds-empty ds-empty--lista">
                    No hay usuarios que coincidan con la búsqueda. Cambia el texto o el estado arriba.
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>

  <!-- Modal crear / editar usuario -->
  <BaseModal v-model="showModal" :title="editingId ? `Editar usuario — ${form.alias}` : 'Nuevo usuario'" size="lg">
    <div ref="userForm" class="ds-form-grid">
      <div class="ds-field">
        <label class="ds-label" for="us-alias">Alias<span class="ds-req">*</span></label>
        <input id="us-alias" v-model.trim="form.alias" type="text" class="ds-input us-upper" placeholder="AE30" maxlength="20" required />
      </div>
      <div class="ds-field">
        <label class="ds-label" for="us-nombre">Nombre<span class="ds-req">*</span></label>
        <input id="us-nombre" v-model.trim="form.first_name" type="text" class="ds-input" placeholder="Nombre" required />
      </div>
      <div class="ds-field">
        <label class="ds-label" for="us-apellidos">Apellidos</label>
        <input id="us-apellidos" v-model.trim="form.last_name" type="text" class="ds-input" placeholder="Apellidos" />
      </div>
      <div class="ds-field">
        <label class="ds-label" for="us-correo">Correo</label>
        <input id="us-correo" v-model.trim="form.email" type="email" class="ds-input" placeholder="usuario@we-educacion.com" />
      </div>
      <div class="ds-field">
        <label class="ds-label" for="us-clave">
          {{ editingId ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña' }}<span v-if="!editingId" class="ds-req">*</span>
        </label>
        <input id="us-clave" v-model="form.password" type="password" class="ds-input" placeholder="Mínimo 6 caracteres" autocomplete="new-password" :required="!editingId" />
      </div>

      <div class="ds-field us-full">
        <span class="ds-label">Roles</span>
        <div class="us-roles-grid">
          <label v-for="r in roles" :key="r.rol_id" class="us-role" :class="{ checked: form.roles.includes(r.rol_id) }">
            <input type="checkbox" :value="r.rol_id" v-model="form.roles" />
            <span class="us-role-alias">{{ r.alias }}</span>
            <span class="us-role-desc">{{ r.description }}</span>
          </label>
        </div>
      </div>

      <div class="ds-field us-full">
        <label class="ds-label" for="us-telefono">Teléfonos asignados (asesores comerciales)</label>
        <div class="us-phone-add">
          <input
            id="us-telefono"
            v-model.trim="phoneDraft"
            type="text"
            class="ds-input"
            placeholder="999606366"
            @keyup.enter="addPhone"
          />
          <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="addPhone">
            <i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar
          </button>
        </div>
        <div v-if="form.telefonos.length" class="us-phones">
          <span v-for="(p, i) in form.telefonos" :key="p" class="us-phone">
            <i class="fa-solid fa-phone" aria-hidden="true"></i>{{ p }}
            <button type="button" class="us-phone-remove" :title="`Quitar ${p}`" :aria-label="`Quitar teléfono ${p}`" @click="form.telefonos.splice(i, 1)">×</button>
          </span>
        </div>
        <span v-else class="ds-help">Sin teléfonos asignados.</span>
      </div>

      <div v-if="editingId" class="ds-field us-full">
        <label class="us-switch-row">
          <span class="exec-switch">
            <input type="checkbox" :checked="form.active === 'Y'" @change="form.active = $event.target.checked ? 'Y' : 'N'" />
            <span></span>
          </span>
          {{ form.active === 'Y' ? 'Usuario activo' : 'Usuario inactivo' }}
        </label>
      </div>
    </div>
    <template #footer>
      <button class="btn-exec btn-exec-outline" type="button" @click="showModal = false">Cancelar</button>
      <button class="btn-exec btn-exec-primary" type="button" :disabled="saving" @click="save">
        <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> {{ saving ? 'Guardando…' : 'Guardar usuario' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import BaseModal from '@/components/BaseModal.vue'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import SearchSelect from '@/components/SearchSelect.vue'
import { ServiceKeys } from '@/services'

const toast = useToast()
const configService = inject(ServiceKeys.Config)

const users = ref([])
const roles = ref([])
const search = ref('')
const filterActive = ref(null)
const isLoading = ref(false)

const filtroEstado = [
  { value: null, description: 'Todos' },
  { value: true, description: 'Activo' },
  { value: false, description: 'Inactivo' }
]

const filteredUsers = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter(u => {
    if (filterActive.value !== null && u.active !== filterActive.value) return false
    if (!q) return true
    return (
      (u.alias || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      u.roles.some(r => r.alias.toLowerCase().includes(q))
    )
  })
})

// ── Modal ──
const showModal = ref(false)
const saving = ref(false)
const editingId = ref(null)
const phoneDraft = ref('')

const form = reactive({
  alias: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  active: 'Y',
  telefonos: [],
  roles: []
})

function resetForm() {
  Object.assign(form, {
    alias: '', first_name: '', last_name: '', email: '',
    password: '', active: 'Y', telefonos: [], roles: []
  })
  phoneDraft.value = ''
}

function openNew() {
  resetForm()
  editingId.value = null
  showModal.value = true
}

function openEdit(u) {
  resetForm()
  editingId.value = u.user_id
  Object.assign(form, {
    alias: u.alias,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email || '',
    password: '',
    active: u.active ? 'Y' : 'N',
    telefonos: [...u.telefonos],
    roles: u.roles.map(r => r.rol_id)
  })
  showModal.value = true
}

function addPhone() {
  const phone = phoneDraft.value.replace(/\D/g, '')
  if (!phone) return
  if (phone.length < 6 || phone.length > 15) {
    toast.warning('El teléfono debe tener entre 6 y 15 dígitos.')
    return
  }
  if (!form.telefonos.includes(phone)) form.telefonos.push(phone)
  phoneDraft.value = ''
}

const userForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(userForm)

async function save() {
  if (!requiredFieldsFilled()) return
  if (!form.alias || !form.first_name) {
    toast.warning('Alias y nombre son obligatorios.')
    return
  }
  if (!editingId.value && (form.password || '').length < 6) {
    toast.warning('La contraseña es obligatoria (mínimo 6 caracteres).')
    return
  }
  saving.value = true
  try {
    const user = {
      alias: form.alias.toUpperCase(),
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email || null,
      password: form.password || null,
      active: form.active,
      telefonos: form.telefonos,
      roles: form.roles
    }
    if (editingId.value) {
      await configService.userUpdate({ id: editingId.value, user })
      toast.success('Usuario actualizado.')
    } else {
      await configService.userRegister({ user })
      toast.success('Usuario creado.')
    }
    showModal.value = false
    await fetchUsers()
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudo guardar el usuario.')
  } finally {
    saving.value = false
  }
}

async function fetchUsers() {
  try {
    users.value = await configService.userList()
  } catch (err) {
    console.error('Error cargando usuarios:', err)
    users.value = []
  }
}

async function fetchRoles() {
  try {
    roles.value = await configService.roleList()
  } catch (err) {
    console.error('Error cargando roles:', err)
    roles.value = []
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([fetchUsers(), fetchRoles()])
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.us-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
.us-search { width: 300px; max-width: 100%; }
.us-filter-estado { min-width: 150px; }

.us-col-acciones { width: 70px; text-align: center; }
.us-nowrap { white-space: nowrap; }
.us-mono { font-family: var(--ds-font-mono); }
.us-strong { font-weight: 600; color: var(--ds-heading); }
.us-muted { color: var(--ds-muted); }
.us-roles { display: inline-flex; flex-wrap: wrap; gap: 4px; }

/* Modal (se teleporta: solo clases propias con tokens de :root) */
.us-full { grid-column: 1 / -1; }
.us-upper { text-transform: uppercase; }

.us-roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.us-role { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 7px 10px; border: 1px solid var(--ds-border); border-radius: var(--ds-radius-control); background: var(--ds-surface-2); cursor: pointer; transition: border-color .15s, background .15s; }
.us-role:hover { border-color: var(--ds-border-strong); }
.us-role.checked { border-color: var(--ds-accent); background: var(--ds-soft-info); }
.us-role input { flex-shrink: 0; accent-color: var(--ds-accent); }
.us-role-alias { font-size: 11px; font-weight: 700; letter-spacing: .03em; color: var(--ds-heading); }
.us-role-desc { font-size: 11px; color: var(--ds-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.us-phone-add { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.us-phones { display: flex; flex-wrap: wrap; gap: 6px; }
.us-phone { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--ds-border); border-radius: 999px; background: var(--ds-surface-3); font-family: var(--ds-font-mono); font-size: 12px; color: var(--ds-ink); }
.us-phone-remove { padding: 0 2px; border: 0; background: none; font-size: 14px; line-height: 1; color: var(--ds-bad-ink); cursor: pointer; }

.us-switch-row { display: inline-flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: var(--ds-ink); cursor: pointer; }

@media (max-width: 768px) {
  .us-search { width: 100%; }
}
</style>
