<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Configuración</span>
            <h1 class="brand-title">Usuarios</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-ghost" @click="openNew">
            <i class="fa-solid fa-plus"></i> Nuevo Usuario
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body">

      <div class="exec-toolbar">
        <div class="toolbar-info text-muted small">
          {{ filteredUsers.length }} de {{ users.length }} usuarios
        </div>
        <div class="toolbar-actions">
          <input
            v-model.trim="search"
            type="text"
            class="hf-input search-input"
            placeholder="Buscar por alias, nombre, email o rol..."
          />
          <SearchSelect
            v-model="filterActive"
            :items="filtroEstado"
            label-field="description"
            value-field="value"
            placeholder="Estado..."
            :nullable="true"
            class="hf-searchselect filter-estado"
          />
        </div>
      </div>

      <div class="table-shell">
        <div class="table-responsive-custom">
          <table class="exec-table">
            <thead>
              <tr class="thead-sub">
                <th class="ts text-center" style="width:70px">Acciones</th>
                <th class="ts">Estado</th>
                <th class="ts">Alias</th>
                <th class="ts">Nombre Completo</th>
                <th class="ts">Correo</th>
                <th class="ts">Roles</th>
                <th class="ts">Teléfonos</th>
              </tr>
            </thead>
            <tbody>
              <!-- skeleton de carga -->
              <template v-if="isLoading">
                <tr v-for="n in 8" :key="'sk' + n" class="skel-row">
                  <td v-for="col in 7" :key="col"><span class="skel"></span></td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="u in filteredUsers" :key="u.user_id" class="tbody-row" @dblclick="openEdit(u)">
                  <td class="td-a text-center">
                    <button class="btn-icon" @click="openEdit(u)" title="Editar">
                      <i class="fa-solid fa-pen-to-square text-warning"></i>
                    </button>
                  </td>
                  <td class="td-a">
                    <span class="pill" :class="u.active ? 'pill-green' : 'pill-red'">
                      {{ u.active ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="td-a text-mono fw-600 nowrap">{{ u.alias }}</td>
                  <td class="td-a nowrap">{{ u.full_name || '—' }}</td>
                  <td class="td-a small text-muted nowrap">{{ u.email || '—' }}</td>
                  <td class="td-a">
                    <span v-for="r in u.roles" :key="r.rol_id" class="pill pill-slate me-1">{{ r.alias }}</span>
                    <span v-if="!u.roles.length" class="text-muted small">Sin rol</span>
                  </td>
                  <td class="td-a small text-mono nowrap">
                    <span v-if="u.telefonos.length">{{ u.telefonos.join(' · ') }}</span>
                    <span v-else class="text-muted">—</span>
                  </td>
                </tr>
                <tr v-if="!filteredUsers.length">
                  <td colspan="7" class="empty-state">Sin usuarios que coincidan con la búsqueda.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>

  <!-- Modal crear / editar usuario -->
  <BaseModal v-model="showModal" :title="editingId ? `Editar Usuario — ${form.alias}` : 'Nuevo Usuario'" size="lg">
    <div class="px-3 py-2">
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <label class="exec-label">Alias *</label>
          <input v-model.trim="form.alias" type="text" class="exec-input-light w-100" placeholder="AE30" maxlength="20" style="text-transform: uppercase" />
        </div>
        <div class="col-12 col-md-4">
          <label class="exec-label">Nombre *</label>
          <input v-model.trim="form.first_name" type="text" class="exec-input-light w-100" placeholder="Nombre" />
        </div>
        <div class="col-12 col-md-4">
          <label class="exec-label">Apellidos</label>
          <input v-model.trim="form.last_name" type="text" class="exec-input-light w-100" placeholder="Apellidos" />
        </div>
        <div class="col-12 col-md-6">
          <label class="exec-label">Correo</label>
          <input v-model.trim="form.email" type="email" class="exec-input-light w-100" placeholder="usuario@we-educacion.com" />
        </div>
        <div class="col-12 col-md-6">
          <label class="exec-label">{{ editingId ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *' }}</label>
          <input v-model="form.password" type="password" class="exec-input-light w-100" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
        </div>

        <div class="col-12">
          <label class="exec-label">Roles</label>
          <div class="roles-grid">
            <label v-for="r in roles" :key="r.rol_id" class="role-check" :class="{ checked: form.roles.includes(r.rol_id) }">
              <input type="checkbox" :value="r.rol_id" v-model="form.roles" />
              <span class="role-alias">{{ r.alias }}</span>
              <span class="role-desc">{{ r.description }}</span>
            </label>
          </div>
        </div>

        <div class="col-12">
          <label class="exec-label">Teléfonos asignados (asesores comerciales)</label>
          <div class="d-flex gap-2 mb-2">
            <input
              v-model.trim="phoneDraft"
              type="text"
              class="exec-input-light flex-grow-1"
              placeholder="999606366"
              @keyup.enter="addPhone"
            />
            <button class="btn-exec btn-exec-outline btn-exec-sm" type="button" @click="addPhone">
              <i class="fa-solid fa-plus"></i> Agregar
            </button>
          </div>
          <div v-if="form.telefonos.length" class="phone-chips">
            <span v-for="(p, i) in form.telefonos" :key="p" class="phone-chip">
              <i class="fa-solid fa-phone me-1"></i>{{ p }}
              <button type="button" class="chip-remove" @click="form.telefonos.splice(i, 1)">×</button>
            </span>
          </div>
          <div v-else class="text-muted small">Sin teléfonos asignados.</div>
        </div>

        <div class="col-12" v-if="editingId">
          <label class="role-check d-inline-flex" :class="{ checked: form.active === 'Y' }">
            <input type="checkbox" :checked="form.active === 'Y'" @change="form.active = $event.target.checked ? 'Y' : 'N'" />
            <span class="role-alias">{{ form.active === 'Y' ? 'Usuario activo' : 'Usuario inactivo' }}</span>
          </label>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="btn-exec btn-exec-outline btn-exec-sm" @click="showModal = false">Cancelar</button>
      <button class="btn-exec btn-exec-primary btn-exec-sm" :disabled="saving" @click="save">
        <i class="fa-solid fa-floppy-disk"></i> {{ saving ? 'Guardando...' : 'Guardar' }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import BaseModal from '@/components/BaseModal.vue'
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

async function save() {
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
.exec-shell { background: var(--slate-50, #f8fafc); min-height: 100vh; display: flex; flex-direction: column; font-size: 13px; color: var(--text-primary, #0f172a); }

.exec-masthead { background: var(--navy-900, #0f172a); color: #fff; border-bottom: 1px solid var(--navy-700, #334155); position: sticky; top: 0; z-index: 100; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }
.masthead-actions { display: flex; gap: 10px; align-items: center; }

.exec-body { flex: 1; padding: 20px 28px; }
.exec-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.search-input { width: 280px; height: 32px; }
.filter-estado { min-width: 140px; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-ghost { background: rgba(255,255,255,.07); color: var(--slate-300, #cbd5e1); border-color: rgba(255,255,255,.12); }
.btn-exec-ghost:hover:not(:disabled) { background: rgba(255,255,255,.13); color: #fff; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }
.btn-exec-sm { padding: 5px 10px; font-size: 11.5px; }
.btn-icon { background: transparent; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--text-secondary, #475569); transition: all .15s; font-size: 12px; }
.btn-icon:hover { background: var(--slate-100, #f1f5f9); border-color: var(--slate-300, #cbd5e1); }

.table-shell { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.table-responsive-custom { width: 100%; overflow-x: auto; border-radius: 6px; }
.exec-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.thead-sub .ts { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid var(--border, #e2e8f0); text-align: left; background: #fafbfc; color: var(--text-secondary, #475569); white-space: nowrap; }
.thead-sub .ts.text-center { text-align: center; }
.tbody-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); vertical-align: middle; }
.tbody-row:last-child td { border-bottom: none; }
.tbody-row:hover td { background: #f8fafc; cursor: pointer; }
.td-a { border-left: 1px solid transparent; }
.text-center { text-align: center; }
.nowrap { white-space: nowrap; }
.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.fw-600 { font-weight: 600; }
.text-muted { color: var(--text-muted, #94a3b8); }
.small { font-size: 11.5px; }
.me-1 { margin-right: 4px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); }
.pill-green { background: #dcfce7; color: #15803d; }
.pill-red { background: #fee2e2; color: #b91c1c; }
.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }

/* skeleton loading (mismo shimmer que Aulas/BotTickets) */
.skel {
  display: block; height: 14px; border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-row td { padding: 10px 14px; border-bottom: 1px solid var(--slate-50, #f8fafc); }

.hf-input { height: 32px; padding: 3px 10px; font-size: 12px; font-family: inherit; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; background: #fff; color: var(--text-primary, #0f172a); outline: none; transition: border-color .15s, box-shadow .15s; box-sizing: border-box; }
.hf-input:focus { border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 2px rgba(20,184,166,.15); }

.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.exec-input-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-input-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }

/* roles checkboxes */
.roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.role-check { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; cursor: pointer; transition: all .15s; background: #fff; }
.role-check:hover { border-color: var(--slate-400, #94a3b8); }
.role-check.checked { border-color: var(--teal-500, #14b8a6); background: rgba(20,184,166,.06); }
.role-check input { accent-color: var(--teal-500, #14b8a6); }
.role-alias { font-weight: 700; font-size: 11px; letter-spacing: .03em; }
.role-desc { font-size: 11px; color: var(--text-muted, #94a3b8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* teléfonos */
.phone-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.phone-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: var(--slate-100, #f1f5f9); border: 1px solid var(--border, #e2e8f0); border-radius: 999px; font-size: 12px; font-family: 'IBM Plex Mono', monospace; }
.chip-remove { background: transparent; border: none; color: #b91c1c; font-size: 14px; cursor: pointer; line-height: 1; padding: 0 2px; }

@media (max-width: 768px) {
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-toolbar { flex-direction: column; align-items: stretch; }
  .search-input { width: 100%; }
  .exec-body { padding: 16px 12px; }
}
</style>
