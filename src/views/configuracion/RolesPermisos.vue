<template>
  <div class="ds-page">
    <header class="ds-head">
      <div class="ds-head-titles">
        <h1 class="ds-title">Roles y Permisos</h1>
        <p class="ds-sub">{{ isLoading ? 'Cargando roles…' : `${roles.length} roles · cada casilla de la matriz es un permiso` }}</p>
      </div>
      <div class="ds-head-actions">
        <button class="btn-exec btn-exec-primary" type="button" @click="openNewRole">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Nuevo rol
        </button>
      </div>
    </header>

    <section class="rp-grid" aria-label="Roles del sistema">
      <template v-if="isLoading">
        <div v-for="n in 6" :key="'sk' + n" class="ds-panel rp-card">
          <span class="ds-skel rp-skel-title"></span>
          <span class="ds-skel"></span>
          <span class="ds-skel rp-skel-short"></span>
        </div>
      </template>

      <template v-else>
        <article v-for="r in roleCards" :key="r.rol_id" class="ds-panel rp-card">
          <div class="rp-card-head">
            <span class="rp-shield" aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></span>
            <h2 class="rp-name">{{ r.description || r.alias }}</h2>
            <code class="rp-alias">{{ r.alias.toLowerCase() }}</code>
            <button class="btn-exec btn-exec-outline btn-sm rp-edit" type="button" @click="openEdit(r)">
              <i class="fa-solid fa-pen" aria-hidden="true"></i> Editar
            </button>
          </div>

          <div class="rp-stats">
            <div>
              <span class="ds-label">Usuarios</span>
              <span class="rp-num">{{ formatValue(r.user_count, 'num') }}</span>
            </div>
            <div>
              <span class="ds-label">Permisos</span>
              <div class="rp-perm-row">
                <span class="rp-num">{{ formatValue(r.summary.granted, 'num') }}</span>
                <span class="ds-track rp-track"><i :style="{ width: r.summary.pct + '%' }"></i></span>
                <span class="rp-pct">{{ r.summary.pct }} %</span>
              </div>
            </div>
          </div>

          <div v-if="r.summary.chips.length" class="rp-chips">
            <span v-for="c in r.summary.chips" :key="c.id" class="ds-chip">{{ c.name }} <b>{{ c.count }}</b></span>
          </div>
          <p v-else class="rp-none">Sin permisos en la matriz: solo ve lo que le dan los roles fijos del sistema.</p>
        </article>
      </template>
    </section>
  </div>

  <!-- Editar permisos de un rol -->
  <BaseModal v-model="showEditModal" :title="selectedRole ? `Permisos · ${selectedRole.alias}` : 'Permisos'" size="xl">
    <div v-if="selectedRole" class="rp-editor">
      <div class="ds-field">
        <label class="ds-label" for="rp-desc">Nombre del rol</label>
        <div class="rp-desc-row">
          <input id="rp-desc" v-model.trim="descriptionDraft" type="text" class="ds-input" :disabled="isSuperRole" placeholder="Descripción del rol" />
          <button
            v-if="!isSuperRole && descriptionDraft !== selectedRole.description"
            class="btn-exec btn-exec-outline btn-sm"
            type="button"
            @click="saveDescription"
          >Renombrar</button>
        </div>
      </div>

      <div v-if="isSuperRole" class="ds-callout">
        <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
        <strong>ADMIN</strong> es superusuario: tiene acceso a todos los módulos y su matriz no es editable.
      </div>

      <div class="rp-modules">
        <div v-for="m in modules" :key="m.module_id" class="rp-module" :class="{ 'is-on': isModuleOn(m) }">
          <label class="rp-module-head">
            <input type="checkbox" :checked="isModuleOn(m)" :disabled="isSuperRole" @change="toggleModule(m, $event.target.checked)" />
            <span class="rp-module-body">
              <span class="rp-module-name">{{ m.name }}</span>
              <span class="rp-module-route">{{ m.route }}</span>
            </span>
          </label>
          <div v-if="m.submodules.length" class="rp-subs">
            <label v-for="s in m.submodules" :key="s.submodule_id" class="rp-sub" :class="{ 'is-on': isSubOn(s) }">
              <input type="checkbox" :checked="isSubOn(s)" :disabled="isSuperRole" @change="toggleSubmodule(m, s, $event.target.checked)" />
              <span>{{ s.name }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="!isSuperRole" class="rp-quick">
        <button class="btn-exec btn-exec-ghost btn-sm" type="button" @click="markAll">Marcar todos</button>
        <button class="btn-exec btn-exec-ghost btn-sm" type="button" @click="clearAll">Desmarcar todos</button>
      </div>
      <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="showEditModal = false">Cerrar</button>
      <button
        v-if="!isSuperRole"
        class="btn-exec btn-exec-primary btn-sm"
        type="button"
        :disabled="saving || !permissionsDirty"
        @click="savePermissions"
      >
        <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> {{ saving ? 'Guardando…' : 'Guardar permisos' }}
      </button>
    </template>
  </BaseModal>

  <!-- Nuevo rol -->
  <BaseModal v-model="showRoleModal" title="Nuevo rol" size="sm">
    <div ref="newRoleForm" class="rp-new">
      <div class="ds-field">
        <label class="ds-label" for="rp-new-desc">Descripción <span class="ds-req">*</span></label>
        <input id="rp-new-desc" v-model.trim="roleForm.description" type="text" class="ds-input" placeholder="Ej: Líder de Marketing" required />
      </div>
      <div class="ds-field">
        <label class="ds-label" for="rp-new-alias">Alias <span class="ds-req">*</span></label>
        <input id="rp-new-alias" v-model.trim="roleForm.alias" type="text" class="ds-input rp-mono rp-upper" placeholder="LIDER_MARKETING" maxlength="40" required />
        <p class="ds-help">Identificador técnico, no se puede cambiar después. Solo letras, números y guion bajo. Vista previa: <strong class="rp-mono">{{ aliasPreview || '—' }}</strong></p>
      </div>
    </div>
    <template #footer>
      <button class="btn-exec btn-exec-outline btn-sm" type="button" @click="showRoleModal = false">Cancelar</button>
      <button class="btn-exec btn-exec-primary btn-sm" type="button" :disabled="saving" @click="saveNewRole">
        <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Crear rol
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import BaseModal from '@/components/BaseModal.vue'
import { useRequiredFieldsGuard } from '@/composables/useRequiredFieldsGuard'
import { formatValue } from '@/shared/lib/formatValue'
import { roleSummary } from '@/features/roles/roleSummary'
import { ServiceKeys } from '@/services'

const toast = useToast()
const configService = inject(ServiceKeys.Config)

const SUPER_ROLE = 'ADMIN'

const roles = ref([])
const modules = ref([])
const selectedRole = ref(null)
const moduleDraft = ref([])      // module_ids marcados
const submoduleDraft = ref([])   // submodule_ids marcados
const descriptionDraft = ref('')
const saving = ref(false)
const isLoading = ref(false)
const showEditModal = ref(false)

const isSuperRole = computed(() => selectedRole.value?.alias === SUPER_ROLE)

const roleCards = computed(() =>
  roles.value.map(r => ({ ...r, summary: roleSummary(r, modules.value, r.alias === SUPER_ROLE) }))
)

function sortedJson(arr) {
  return JSON.stringify([...arr].sort((a, b) => a - b))
}

const permissionsDirty = computed(() => {
  if (!selectedRole.value) return false
  return sortedJson(selectedRole.value.module_ids) !== sortedJson(moduleDraft.value) ||
         sortedJson(selectedRole.value.submodule_ids) !== sortedJson(submoduleDraft.value)
})

function isModuleOn(m) {
  if (isSuperRole.value) return true
  return moduleDraft.value.includes(m.module_id)
}

function isSubOn(s) {
  if (isSuperRole.value) return true
  return submoduleDraft.value.includes(s.submodule_id)
}

// Marcar un módulo marca todos sus submódulos; desmarcarlo los quita.
function toggleModule(m, on) {
  const subIds = m.submodules.map(s => s.submodule_id)
  if (on) {
    if (!moduleDraft.value.includes(m.module_id)) moduleDraft.value.push(m.module_id)
    submoduleDraft.value = [...new Set([...submoduleDraft.value, ...subIds])]
  } else {
    moduleDraft.value = moduleDraft.value.filter(id => id !== m.module_id)
    submoduleDraft.value = submoduleDraft.value.filter(id => !subIds.includes(id))
  }
}

// Marcar un submódulo enciende su módulo; desmarcar el último lo apaga.
function toggleSubmodule(m, s, on) {
  if (on) {
    if (!submoduleDraft.value.includes(s.submodule_id)) submoduleDraft.value.push(s.submodule_id)
    if (!moduleDraft.value.includes(m.module_id)) moduleDraft.value.push(m.module_id)
  } else {
    submoduleDraft.value = submoduleDraft.value.filter(id => id !== s.submodule_id)
    const remaining = m.submodules.some(sub => submoduleDraft.value.includes(sub.submodule_id))
    if (!remaining) moduleDraft.value = moduleDraft.value.filter(id => id !== m.module_id)
  }
}

function markAll() {
  moduleDraft.value = modules.value.map(m => m.module_id)
  submoduleDraft.value = modules.value.flatMap(m => m.submodules.map(s => s.submodule_id))
}

function clearAll() {
  moduleDraft.value = []
  submoduleDraft.value = []
}

function selectRole(r) {
  selectedRole.value = r
  moduleDraft.value = [...r.module_ids]
  submoduleDraft.value = [...r.submodule_ids]
  descriptionDraft.value = r.description
}

function openEdit(r) {
  selectRole(roles.value.find(role => role.rol_id === r.rol_id))
  showEditModal.value = true
}

async function savePermissions() {
  if (!selectedRole.value) return
  saving.value = true
  try {
    await configService.permissionUpdate({
      rol_id: selectedRole.value.rol_id,
      module_ids: moduleDraft.value,
      submodule_ids: submoduleDraft.value
    })
    toast.success(`Permisos de ${selectedRole.value.alias} actualizados.`)
    await fetchRoles(selectedRole.value.rol_id)
    showEditModal.value = false
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudieron guardar los permisos.')
  } finally {
    saving.value = false
  }
}

async function saveDescription() {
  if (!selectedRole.value || !descriptionDraft.value) return
  try {
    await configService.roleUpdate({
      role: { rol_id: selectedRole.value.rol_id, description: descriptionDraft.value }
    })
    toast.success('Descripción actualizada.')
    await fetchRoles(selectedRole.value.rol_id)
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudo actualizar el rol.')
  }
}

// ── Nuevo rol ──
const showRoleModal = ref(false)
const roleForm = reactive({ description: '', alias: '' })
const aliasPreview = computed(() =>
  roleForm.alias.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
)

function openNewRole() {
  roleForm.description = ''
  roleForm.alias = ''
  showRoleModal.value = true
}

const newRoleForm = ref(null)
const requiredFieldsFilled = useRequiredFieldsGuard(newRoleForm)

// El rol recién creado no tiene permisos: se abre directo su editor.
async function saveNewRole() {
  if (!requiredFieldsFilled()) return
  if (!roleForm.description || !aliasPreview.value) {
    toast.warning('Descripción y alias son obligatorios.')
    return
  }
  saving.value = true
  try {
    const { rol_id } = await configService.roleRegister({
      role: { description: roleForm.description, alias: aliasPreview.value }
    })
    toast.success(`Rol ${aliasPreview.value} creado. Ahora asigne sus módulos.`)
    showRoleModal.value = false
    await fetchRoles(rol_id)
    if (selectedRole.value?.rol_id === rol_id) showEditModal.value = true
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudo crear el rol.')
  } finally {
    saving.value = false
  }
}

async function fetchRoles(keepSelectedId = null) {
  try {
    roles.value = await configService.roleList()
    const found = roles.value.find(r => r.rol_id === keepSelectedId)
    if (found) selectRole(found)
  } catch (err) {
    console.error('Error cargando roles:', err)
    roles.value = []
  }
}

async function fetchModules() {
  try {
    modules.value = await configService.moduleList()
  } catch (err) {
    console.error('Error cargando módulos:', err)
    modules.value = []
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([fetchModules(), fetchRoles()])
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* Una tarjeta por rol: el resumen se lee sin abrir nada y "Editar" abre la
   matriz completa en el modal (antes era maestro-detalle de un rol a la vez). */
.rp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; align-items: start; }
.rp-card { display: flex; flex-direction: column; gap: 14px; padding: 18px 20px; }

.rp-card-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rp-shield { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--ds-soft-ok); color: var(--ds-ok); flex-shrink: 0; }
.rp-name { margin: 0; font-size: 17px; font-weight: 700; color: var(--ds-heading); }
.rp-alias { font-family: var(--ds-font-mono); font-size: 12px; padding: 2px 8px; border-radius: 6px; background: var(--ds-soft-neutral); color: var(--ds-ink-2); }
.rp-edit { margin-left: auto; }

.rp-stats { display: grid; grid-template-columns: auto 1fr; gap: 28px; align-items: end; }
.rp-num { display: block; font-size: 24px; font-weight: 700; line-height: 1.15; color: var(--ds-heading); font-variant-numeric: tabular-nums; }
.rp-perm-row { display: flex; align-items: center; gap: 10px; }
.rp-track { flex: 1; }
.rp-track > i { background: var(--ds-ok); }
.rp-pct { font-size: 12.5px; color: var(--ds-muted); white-space: nowrap; }

.rp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rp-chips .ds-chip { border-radius: 6px; font-weight: 500; }
.rp-chips b { font-weight: 700; color: var(--ds-heading); }
.rp-none { margin: 0; font-size: 12.5px; color: var(--ds-muted); }

.rp-skel-title { width: 55%; height: 20px; }
.rp-skel-short { width: 35%; }

/* ── Modal editor ── */
.rp-editor { display: flex; flex-direction: column; gap: 14px; }
.rp-desc-row { display: flex; gap: 8px; align-items: center; }
.rp-desc-row .ds-input { max-width: 360px; }

.rp-modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; align-items: start; }
.rp-module { border: 1px solid var(--ds-border); border-radius: 8px; overflow: hidden; }
.rp-module.is-on { border-color: var(--ds-accent); }
.rp-module-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
.rp-module.is-on .rp-module-head { background: var(--ds-soft-info); }
.rp-module-body { display: flex; flex-direction: column; min-width: 0; }
.rp-module-name { font-weight: 700; font-size: 13px; color: var(--ds-heading); }
.rp-module-route { font-family: var(--ds-font-mono); font-size: 10.5px; color: var(--ds-muted); }
.rp-subs { border-top: 1px solid var(--ds-border); padding: 4px 0; }
.rp-sub { display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 24px; font-size: 12.5px; color: var(--ds-ink-2); cursor: pointer; }
.rp-sub:hover { background: var(--ds-surface-2); }
.rp-sub.is-on { color: var(--ds-heading); font-weight: 600; }
.rp-sub span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-editor input[type="checkbox"] { accent-color: var(--ds-accent); }

.rp-quick { display: flex; gap: 6px; margin-right: auto; }
.rp-new { display: flex; flex-direction: column; gap: 12px; padding: 4px 8px; }
.rp-mono { font-family: var(--ds-font-mono); }
.rp-upper { text-transform: uppercase; }

@media (max-width: 600px) {
  .rp-grid { grid-template-columns: 1fr; }
  .rp-edit { margin-left: 0; }
}
</style>
