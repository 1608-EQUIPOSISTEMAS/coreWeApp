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
</style>