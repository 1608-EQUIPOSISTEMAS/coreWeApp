<template>
  <div class="file-viewer-container">
    <label class="form-label text-muted small fw-bold mb-2">
        <i class="fas fa-paperclip me-1"></i> Archivos Adjuntos
    </label>

    <div v-if="!files || files.length === 0" class="empty-state">
        <span class="text-muted small fst-italic">Sin documentos adjuntos.</span>
    </div>

    <div v-else class="list-group list-group-flush border rounded-3 overflow-hidden">
      <div 
        v-for="(file, index) in files" 
        :key="index"
        class="list-group-item list-group-item-action d-flex align-items-center justify-content-between px-3 py-2"
      >
        <div class="d-flex align-items-center gap-3 overflow-hidden">
            <div class="icon-wrapper">
                <i class="fas fa-lg" :class="getFileIcon(file.type)"></i>
            </div>
            <div class="d-flex flex-column text-truncate">
                <span class="fw-medium text-dark small text-truncate" :title="file.name">
                    {{ file.name || 'Documento sin título' }}
                </span>
                <span class="text-muted x-small">
                    {{ file.date || 'Adjunto' }}
                </span>
            </div>
        </div>

        <button 
            class="btn btn-sm btn-light border text-primary ms-2" 
            @click="openFile(file.url)"
            data-bs-toggle="tooltip" 
            title="Abrir documento"
        >
            <i class="fas fa-external-link-alt"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  files: {
    type: Array,
    default: () => []
  }
})

function openFile(url) {
  if (url) window.open(url, '_blank')
}

function getFileIcon(type) {
    if (!type) return 'fa-file text-secondary'
    
    // Lógica simple para iconos
    const t = type.toLowerCase()
    if (t.includes('pdf')) return 'fa-file-pdf text-danger'
    if (t.includes('image') || t.includes('jpg') || t.includes('png')) return 'fa-file-image text-success'
    if (t.includes('legacy')) return 'fa-file-contract text-warning' // Para los antiguos
    return 'fa-file-alt text-primary'
}
</script>

<style scoped>
.empty-state {
    padding: 1rem;
    background-color: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    text-align: center;
}
.icon-wrapper {
    width: 32px;
    display: flex;
    justify-content: center;
}
.x-small {
    font-size: 0.75rem;
}

/* ═══════════ DARK MODE ═══════════ */
[data-coreui-theme="dark"] .empty-state {
    background-color: #1F1F1A;
    border-color: #3A3A33;
}
/* Utilidades Bootstrap dentro del componente que no se adaptan solas */
[data-coreui-theme="dark"] .text-dark { color: #F4F4F0 !important; }
[data-coreui-theme="dark"] .list-group {
    --cui-list-group-bg: #1A1A14;
    --cui-list-group-color: #F4F4F0;
    --cui-list-group-border-color: #2A2A22;
    --cui-list-group-action-hover-bg: #1F1F1A;
    --cui-list-group-action-hover-color: #F4F4F0;
    --cui-list-group-action-active-bg: #24241E;
    --cui-list-group-action-active-color: #F4F4F0;
    border-color: #2A2A22 !important;
}
[data-coreui-theme="dark"] .btn-light {
    background-color: #24241E;
    border-color: #3A3A33 !important;
    color: #8FAADC !important;
}
[data-coreui-theme="dark"] .btn-light:hover {
    background-color: #2A2A22;
    color: #A9C2E8 !important;
}
</style>