<template>
  <div class="exec-shell list-shell">

    <header class="exec-masthead">
      <div class="masthead-inner">
        <div class="masthead-brand">
          <div class="brand-rule"></div>
          <div class="brand-text">
            <span class="brand-eyebrow">Configuración</span>
            <h1 class="brand-title">Roles y Permisos</h1>
          </div>
        </div>
        <div class="masthead-actions">
          <button class="btn-exec btn-exec-ghost" @click="openNewRole">
            <i class="fa-solid fa-plus"></i> Nuevo Rol
          </button>
        </div>
      </div>
    </header>

    <main class="exec-body">
      <div class="split-layout">

        <!-- ── Lista de roles ── -->
        <aside class="roles-panel">
          <div class="panel-title">Roles del sistema</div>
          <!-- skeleton de carga: lista de roles -->
          <template v-if="isLoading">
            <div v-for="n in 5" :key="'skr' + n" class="role-item skel-role">
              <span class="skel" :style="{ width: (45 + (n % 3) * 15) + '%' }"></span>
              <span class="skel skel-pill"></span>
            </div>
          </template>
          <template v-else>
          <button
            v-for="r in roles"
            :key="r.rol_id"
            class="role-item"
            :class="{ selected: selectedRole?.rol_id === r.rol_id }"
            @click="selectRole(r)"
          >
            <div class="role-item-main">
              <span class="role-item-alias">{{ r.alias }}</span>
              <span class="role-item-desc">{{ r.description }}</span>
            </div>
            <div class="role-item-meta">
              <span class="pill pill-slate" :title="`${r.user_count} usuarios con este rol`">
                <i class="fa-solid fa-user me-1"></i>{{ r.user_count }}
              </span>
              <span v-if="r.alias === 'ADMIN'" class="pill pill-navy">TOTAL</span>
              <span v-else class="pill" :class="r.submodule_ids.length || r.module_ids.length ? 'pill-green' : 'pill-red'">
                {{ r.module_ids.length }} mód. · {{ r.submodule_ids.length }} sub.
              </span>
            </div>
          </button>
          </template>
        </aside>

        <!-- ── Detalle: permisos del rol ── -->
        <section class="detail-panel">
          <!-- skeleton de carga: matriz de permisos -->
          <template v-if="isLoading">
            <div class="skel skel-title"></div>
            <div class="skel-matrix">
              <div v-for="n in 6" :key="'skm' + n" class="skel-matrix-card">
                <span class="skel" :style="{ width: (55 + (n % 4) * 10) + '%' }"></span>
                <span class="skel skel-sub" :style="{ width: (35 + (n % 3) * 15) + '%' }"></span>
                <span class="skel skel-sub" :style="{ width: (45 + ((n + 1) % 3) * 12) + '%' }"></span>
              </div>
            </div>
          </template>
          <template v-else-if="selectedRole">
            <div class="detail-head">
              <div>
                <div class="detail-alias">{{ selectedRole.alias }}</div>
                <div class="d-flex align-items-center gap-2">
                  <input
                    v-model.trim="descriptionDraft"
                    type="text"
                    class="exec-input-light desc-input"
                    :disabled="isSuperRole"
                    placeholder="Descripción del rol"
                  />
                  <button
                    v-if="!isSuperRole && descriptionDraft !== selectedRole.description"
                    class="btn-exec btn-exec-outline btn-exec-sm"
                    @click="saveDescription"
                  >Renombrar</button>
                </div>
              </div>
              <button
                v-if="!isSuperRole"
                class="btn-exec btn-exec-primary"
                :disabled="saving || !permissionsDirty"
                @click="savePermissions"
              >
                <i class="fa-solid fa-floppy-disk"></i> {{ saving ? 'Guardando...' : 'Guardar permisos' }}
              </button>
            </div>

            <div v-if="isSuperRole" class="super-banner">
              <i class="fa-solid fa-shield-halved me-1"></i>
              <strong>ADMIN</strong> es superusuario: tiene acceso a todos los módulos y su matriz no es editable.
            </div>

            <div class="modules-grid" :class="{ 'is-readonly': isSuperRole }">
              <div
                v-for="m in modules"
                :key="m.module_id"
                class="module-card"
                :class="{ checked: isModuleOn(m), readonly: isSuperRole }"
              >
                <label class="module-head">
                  <input
                    type="checkbox"
                    :checked="isModuleOn(m)"
                    :disabled="isSuperRole"
                    @change="toggleModule(m, $event.target.checked)"
                  />
                  <div class="module-head-body">
                    <span class="module-name">{{ m.name }}</span>
                    <span class="module-route text-mono">{{ m.route }}</span>
                  </div>
                  <i class="fa-solid fa-check module-check"></i>
                </label>

                <div v-if="m.submodules.length" class="submodule-list">
                  <label
                    v-for="s in m.submodules"
                    :key="s.submodule_id"
                    class="submodule-row"
                    :class="{ checked: isSubOn(s), disabled: isSuperRole }"
                  >
                    <input
                      type="checkbox"
                      :checked="isSubOn(s)"
                      :disabled="isSuperRole"
                      @change="toggleSubmodule(m, s, $event.target.checked)"
                    />
                    <span class="submodule-name">{{ s.name }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div v-if="!isSuperRole" class="quick-actions">
              <button class="btn-link" @click="markAll">Marcar todos</button>
              <span class="text-muted">·</span>
              <button class="btn-link" @click="clearAll">Desmarcar todos</button>
            </div>
          </template>

          <div v-else class="empty-state">Seleccione un rol para ver sus permisos.</div>
        </section>

      </div>
    </main>
  </div>

  <!-- Modal nuevo rol -->
  <BaseModal v-model="showRoleModal" title="Nuevo Rol" size="sm">
    <div class="px-3 py-2">
      <div class="mb-3">
        <label class="exec-label">Descripción *</label>
        <input v-model.trim="roleForm.description" type="text" class="exec-input-light w-100" placeholder="Ej: Líder de Marketing" />
      </div>
      <div class="mb-2">
        <label class="exec-label">Alias * (identificador técnico, no se puede cambiar después)</label>
        <input v-model.trim="roleForm.alias" type="text" class="exec-input-light w-100 text-mono" placeholder="LIDER_MARKETING" maxlength="40" style="text-transform: uppercase" />
        <div class="text-muted small mt-1">Solo letras, números y guión bajo. Vista previa: <strong class="text-mono">{{ aliasPreview || '—' }}</strong></div>
      </div>
    </div>
    <template #footer>
      <button class="btn-exec btn-exec-outline btn-exec-sm" @click="showRoleModal = false">Cancelar</button>
      <button class="btn-exec btn-exec-primary btn-exec-sm" :disabled="saving" @click="saveNewRole">
        <i class="fa-solid fa-floppy-disk"></i> Crear Rol
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { useToast } from 'vue-toastification'
import BaseModal from '@/components/BaseModal.vue'
import { ServiceKeys } from '@/services'

const toast = useToast()
const configService = inject(ServiceKeys.Config)

const roles = ref([])
const modules = ref([])
const selectedRole = ref(null)
const moduleDraft = ref([])      // module_ids marcados
const submoduleDraft = ref([])   // submodule_ids marcados
const descriptionDraft = ref('')
const saving = ref(false)
const isLoading = ref(false)

const isSuperRole = computed(() => selectedRole.value?.alias === 'ADMIN')

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

async function saveNewRole() {
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
  } catch (err) {
    toast.error(err.response?.data?.message || 'No se pudo crear el rol.')
  } finally {
    saving.value = false
  }
}

async function fetchRoles(keepSelectedId = null) {
  try {
    roles.value = await configService.roleList()
    const target = keepSelectedId ?? selectedRole.value?.rol_id
    const found = roles.value.find(r => r.rol_id === target)
    if (found) selectRole(found)
    else if (!selectedRole.value && roles.value.length) selectRole(roles.value[0])
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
.exec-shell { background: var(--slate-50, #f8fafc); min-height: 100vh; display: flex; flex-direction: column; font-size: 13px; color: var(--text-primary, #0f172a); }

.exec-masthead { background: var(--navy-900, #0f172a); color: #fff; border-bottom: 1px solid var(--navy-700, #334155); position: sticky; top: 0; z-index: 100; }
.masthead-inner { display: flex; justify-content: space-between; align-items: center; padding: 12px 28px; }
.masthead-brand { display: flex; align-items: center; gap: 16px; }
.brand-rule { width: 4px; height: 42px; background: var(--teal-500, #14b8a6); border-radius: 4px; }
.brand-eyebrow { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--slate-400, #94a3b8); font-weight: 500; display: block; margin-bottom: 3px; }
.brand-title { font-size: 19px; font-weight: 700; margin: 0; color: #fff; }
.masthead-actions { display: flex; gap: 10px; align-items: center; }

.exec-body { flex: 1; padding: 20px 28px; }

.btn-exec { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
.btn-exec:disabled { opacity: .5; cursor: default; }
.btn-exec-primary { background: var(--navy-900, #0f172a); color: #fff; border-color: var(--navy-900, #0f172a); }
.btn-exec-primary:hover:not(:disabled) { background: #1e293b; }
.btn-exec-ghost { background: rgba(255,255,255,.07); color: var(--slate-300, #cbd5e1); border-color: rgba(255,255,255,.12); }
.btn-exec-ghost:hover:not(:disabled) { background: rgba(255,255,255,.13); color: #fff; }
.btn-exec-outline { background: #fff; border-color: var(--border, #e2e8f0); color: var(--text-secondary, #475569); }
.btn-exec-outline:hover:not(:disabled) { background: var(--slate-50, #f8fafc); border-color: var(--slate-400, #94a3b8); }
.btn-exec-sm { padding: 5px 10px; font-size: 11.5px; }
.btn-link { background: none; border: none; color: var(--teal-600, #0d9488); font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; }
.btn-link:hover { text-decoration: underline; }

/* ── Layout maestro-detalle ── */
.split-layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }

.roles-panel { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow: hidden; }
.panel-title { padding: 10px 14px; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; background: #fafbfc; color: var(--text-secondary, #475569); border-bottom: 1px solid var(--border, #e2e8f0); }
.role-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: #fff; border: none; border-bottom: 1px solid var(--slate-50, #f8fafc); border-left: 3px solid transparent; cursor: pointer; text-align: left; font-family: inherit; transition: all .12s; }
.role-item:hover { background: #f8fafc; }
.role-item.selected { background: rgba(20,184,166,.06); border-left-color: var(--teal-500, #14b8a6); }
.role-item-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.role-item-alias { font-weight: 700; font-size: 12px; letter-spacing: .03em; }
.role-item-desc { font-size: 11px; color: var(--text-muted, #94a3b8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-item-meta { display: flex; gap: 4px; flex-shrink: 0; }

.detail-panel { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.04); padding: 18px; min-height: 320px; }
.detail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.detail-alias { font-size: 17px; font-weight: 800; letter-spacing: .02em; margin-bottom: 6px; }
.desc-input { width: 320px; max-width: 100%; }

.super-banner { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; margin-bottom: 14px; }

/* ── Tarjetas de módulo con submódulos ── */
.modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; align-items: start; }
.module-card { border: 1px solid var(--border, #e2e8f0); border-radius: 6px; background: #fff; transition: all .15s; overflow: hidden; }
.module-card.checked { border-color: var(--teal-500, #14b8a6); }
.module-card.readonly { opacity: .85; }

.module-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer; background: #fff; transition: background .15s; position: relative; }
.module-card.checked .module-head { background: rgba(20,184,166,.06); }
.module-head input { accent-color: var(--teal-500, #14b8a6); }
.module-head-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.module-name { font-weight: 700; font-size: 12.5px; }
.module-route { font-size: 10px; color: var(--text-muted, #94a3b8); }
.module-check { margin-left: auto; color: var(--teal-500, #14b8a6); opacity: 0; transition: opacity .15s; }
.module-card.checked .module-check { opacity: 1; }

.submodule-list { border-top: 1px solid var(--slate-100, #f1f5f9); padding: 6px 0; }
.submodule-row { display: flex; align-items: center; gap: 8px; padding: 5px 14px 5px 26px; cursor: pointer; font-size: 12px; color: var(--text-secondary, #475569); transition: background .12s; }
.submodule-row:hover:not(.disabled) { background: #f8fafc; }
.submodule-row.checked { color: var(--text-primary, #0f172a); font-weight: 600; }
.submodule-row.disabled { cursor: default; }
.submodule-row input { accent-color: var(--teal-500, #14b8a6); }
.submodule-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.quick-actions { display: flex; gap: 8px; align-items: center; margin-top: 14px; }

.pill { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .03em; }
.pill-slate { background: var(--slate-100, #f1f5f9); color: var(--text-secondary, #475569); }
.pill-green { background: #dcfce7; color: #15803d; }
.pill-red { background: #fee2e2; color: #b91c1c; }
.pill-navy { background: var(--navy-900, #0f172a); color: #fff; }

.text-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.text-muted { color: var(--text-muted, #94a3b8); }
.small { font-size: 11.5px; }
.me-1 { margin-right: 4px; }
.empty-state { padding: 40px; text-align: center; color: var(--slate-400, #94a3b8); font-size: 13px; font-weight: 500; }

/* skeleton loading (mismo shimmer que Aulas/BotTickets) */
.skel {
  display: block; height: 14px; border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-role { justify-content: space-between; cursor: default; }
.skel-role:hover { background: #fff; }
.skel-pill { width: 42px; height: 18px; flex-shrink: 0; }
.skel-title { width: 200px; height: 22px; margin-bottom: 18px; }
.skel-matrix { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; align-items: start; }
.skel-matrix-card { border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 12px 14px; display: flex; flex-direction: column; gap: 9px; }
.skel-sub { height: 11px; margin-left: 14px; }

.exec-label { font-size: 10.5px; font-weight: 600; color: var(--text-secondary, #475569); text-transform: uppercase; letter-spacing: .05em; display: block; margin-bottom: 4px; }
.exec-input-light { background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 4px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; color: var(--text-primary, #0f172a); transition: border-color .15s; height: 36px; display: block; }
.exec-input-light:focus { outline: none; border-color: var(--teal-500, #14b8a6); box-shadow: 0 0 0 3px rgba(20,184,166,.1); }
.exec-input-light:disabled { background: var(--slate-100, #f1f5f9); color: var(--text-muted, #94a3b8); }

@media (max-width: 992px) {
  .split-layout { grid-template-columns: 1fr; }
  .masthead-inner { flex-direction: column; gap: 12px; align-items: flex-start; padding: 12px 16px; }
  .exec-body { padding: 16px 12px; }
}

/* ════════════════════════════════════════
   DARK MODE
   ════════════════════════════════════════ */
[data-coreui-theme="dark"] .exec-shell {
  /* los var(--x, fallback) no estan definidos en light: definirlos solo
     en dark no altera el modo claro */
  --slate-50: #1F1F1A;
  --slate-100: #24241E;
  --slate-300: #3A3A33;
  --slate-400: #8A8A80;
  --border: #2A2A22;
  --text-primary: #F4F4F0;
  --text-secondary: #A0A099;
  --text-muted: #8A8A80;
  background: #14140F;
}
[data-coreui-theme="dark"] .exec-shell .btn-exec-primary,
[data-coreui-theme="dark"] .btn-exec-primary { background: #F4F4F0; color: #14140F; border-color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-shell .btn-exec-primary:hover:not(:disabled),
[data-coreui-theme="dark"] .btn-exec-primary:hover:not(:disabled) { background: #E4E4DD; }
[data-coreui-theme="dark"] .btn-exec-outline { background: #1F1F1A; border-color: #2A2A22; color: #A0A099; }
[data-coreui-theme="dark"] .btn-exec-outline:hover:not(:disabled) { background: #24241E; border-color: #3A3A33; }
[data-coreui-theme="dark"] .exec-shell .btn-link { color: #2DD4BF; }
[data-coreui-theme="dark"] .exec-shell .roles-panel,
[data-coreui-theme="dark"] .exec-shell .detail-panel { background: #1A1A14; box-shadow: 0 1px 4px rgba(0, 0, 0, .4); }
[data-coreui-theme="dark"] .exec-shell .panel-title { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell .role-item { background: #1A1A14; }
[data-coreui-theme="dark"] .exec-shell .role-item:hover { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell .role-item.selected { background: rgba(20, 184, 166, .12); }
[data-coreui-theme="dark"] .exec-shell .skel-role:hover { background: #1A1A14; }
[data-coreui-theme="dark"] .exec-shell .super-banner { background: rgba(59, 130, 246, .12); border-color: rgba(59, 130, 246, .3); color: #60A5FA; }
[data-coreui-theme="dark"] .exec-shell .module-card,
[data-coreui-theme="dark"] .exec-shell .module-head { background: #1A1A14; }
[data-coreui-theme="dark"] .exec-shell .module-card.checked { border-color: #2DD4BF; }
[data-coreui-theme="dark"] .exec-shell .module-card.checked .module-head { background: rgba(20, 184, 166, .12); }
[data-coreui-theme="dark"] .exec-shell .submodule-row:hover:not(.disabled) { background: #1F1F1A; }
[data-coreui-theme="dark"] .exec-shell .pill-green { background: rgba(16, 185, 129, .16); color: #34D399; }
[data-coreui-theme="dark"] .exec-shell .pill-red { background: rgba(239, 68, 68, .16); color: #F87171; }
[data-coreui-theme="dark"] .exec-shell .skel { background: linear-gradient(90deg, #24241E 25%, #2A2A22 50%, #24241E 75%); background-size: 200% 100%; }
/* el modal se teleporta fuera de .exec-shell */
[data-coreui-theme="dark"] .exec-label { color: #A0A099; }
[data-coreui-theme="dark"] .exec-input-light { background: #1F1F1A; border-color: #2A2A22; color: #F4F4F0; }
[data-coreui-theme="dark"] .exec-input-light:disabled { background: #24241E; color: #8A8A80; }
[data-coreui-theme="dark"] .text-muted { color: #8A8A80; }
</style>
