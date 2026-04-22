<template>
  <div class="ep-wrap">
    <div v-if="loading" class="ep-loading">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:20px"></i>
      <p>Cargando preview...</p>
    </div>
    <template v-else-if="previewData">
      <div class="ep-meta">
        <div><span class="ep-meta-label">Para:</span> <span class="ep-meta-value">{{ previewData.to }}</span></div>
        <div><span class="ep-meta-label">Asunto:</span> <span class="ep-meta-value">{{ previewData.subject }}</span></div>
      </div>
      <div v-if="previewData.hasAttachment" class="ep-attachment">
        <i class="fa-solid fa-paperclip"></i>
        <span class="ep-attachment-label">Se adjuntará:</span>
        <span class="ep-attachment-file">{{ previewData.attachmentName }}</span>
      </div>
      <div class="ep-frame-wrap">
        <iframe class="ep-frame" :srcdoc="previewData.html"></iframe>
      </div>
    </template>
    <div v-else class="ep-error">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <p>No se pudo cargar el preview del correo</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, inject } from 'vue'
import { ServiceKeys } from '@/services'
import { useToast } from 'vue-toastification'

const props = defineProps({
  enrollmentId: { type: Number, required: true },
  active: { type: Boolean, default: false }
})

const ficoService = inject(ServiceKeys.Fico)
const toast = useToast()

const loading = ref(false)
const previewData = ref(null)

watch(() => props.active, async (v) => {
  if (!v || previewData.value) return
  loading.value = true
  try {
    previewData.value = await ficoService.previewEmail(props.enrollmentId)
  } catch (err) {
    console.error(err)
    toast.error('Error cargando preview del correo')
  } finally {
    loading.value = false
  }
}, { immediate: true })

defineExpose({ previewData })
</script>

<style scoped>
.ep-wrap { min-height: 200px; }

.ep-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px;
  color: #9CA3AF;
  font-size: 13px;
}

.ep-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
  font-size: 12.5px;
  padding: 10px 14px;
  background: #F9FAFB;
  border-radius: 8px;
}
.ep-meta-label { color: #9CA3AF; font-weight: 600; }
.ep-meta-value { font-weight: 700; color: #111827; }

.ep-attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  margin-bottom: 10px;
  background: #F0F9FF;
  border: 1px solid #BAE6FD;
  border-radius: 8px;
  font-size: 12.5px;
}
.ep-attachment i { color: #0369A1; font-size: 12px; }
.ep-attachment-label { color: #475569; font-weight: 600; }
.ep-attachment-file { color: #0c4a6e; font-weight: 700; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; }

.ep-frame-wrap {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.ep-frame {
  width: 100%;
  height: 450px;
  border: none;
  display: block;
}

.ep-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 50px;
  color: #DC2626;
  font-size: 13px;
}
.ep-error i { font-size: 24px; opacity: .6; }
</style>
