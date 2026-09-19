<template>
  <ul v-if="adjuntos.length" class="tk-adjuntos">
    <li v-for="a in adjuntos" :key="a.id">
      <button type="button" class="tk-adjunto" :disabled="cargando.has(a.id)" @click="abrir(a)">
        <img v-if="previews[a.id]" :src="previews[a.id]" :alt="a.nombre" class="tk-thumb" />
        <span v-else class="tk-icono">
          <i class="fa-solid" :class="cargando.has(a.id) ? 'fa-spinner fa-spin' : icono(a)" aria-hidden="true"></i>
        </span>
        <span class="tk-adjunto-datos">
          <span class="tk-adjunto-nombre">{{ a.nombre }}</span>
          <span class="tk-adjunto-peso">{{ pesoArchivo(a.bytes) }}</span>
        </span>
      </button>
    </li>
  </ul>
</template>

<script setup>
import { ref, reactive, inject, onMounted, onUnmounted } from 'vue'
import { ServiceKeys } from '@/services'
import { pesoArchivo } from './ticket-format.js'

// Los adjuntos NO se pintan con <img :src="/api/..."> porque el endpoint exige
// el header Authorization: se bajan como blob con el cliente autenticado y se
// pinta un object URL, que se revoca al desmontar para no filtrar memoria.
const props = defineProps({
  adjuntos: { type: Array, default: () => [] },
  // 'ticket' o 'comment': deciden de qué endpoint baja el archivo.
  kind: { type: String, default: 'ticket' },
})

const service = inject(ServiceKeys.Tickets)

const previews = reactive({})
const cargando = ref(new Set())
const urls = []

const esImagen = (a) => String(a.mime || '').startsWith('image/')
const icono = (a) => (a.mime === 'application/pdf' ? 'fa-file-pdf' : 'fa-file')

async function blobUrl (a) {
  const blob = await service.attachmentBlob(a.id, props.kind)
  const url = URL.createObjectURL(blob)
  urls.push(url)
  return url
}

// Las miniaturas se cargan al montar; los PDF no, que pesan y solo se abren
// si alguien hace clic.
onMounted(async () => {
  for (const a of props.adjuntos.filter(esImagen)) {
    try {
      previews[a.id] = await blobUrl(a)
    } catch (e) {
      console.error('adjunto:', e)
    }
  }
})

onUnmounted(() => urls.forEach(URL.revokeObjectURL))

async function abrir (a) {
  if (cargando.value.has(a.id)) return
  cargando.value = new Set(cargando.value).add(a.id)
  try {
    window.open(previews[a.id] ?? await blobUrl(a), '_blank', 'noopener')
  } catch (e) {
    console.error('adjunto:', e)
  } finally {
    const copia = new Set(cargando.value)
    copia.delete(a.id)
    cargando.value = copia
  }
}
</script>

<style scoped>
/* Colores y bordes: sistema de diseño (styles/design-system.css). */
.tk-adjuntos { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.tk-adjunto {
  display: flex; align-items: center; gap: 10px; max-width: 280px;
  padding: 8px 12px 8px 8px; border: 1px solid var(--ds-border); border-radius: 8px;
  background: var(--ds-surface); cursor: pointer; text-align: left; transition: 0.15s;
}
.tk-adjunto:hover:not(:disabled) { border-color: var(--ds-accent); }
.tk-adjunto:disabled { opacity: 0.6; cursor: progress; }
/* Miniatura más grande (antes 38px): con el detalle ahora en página propia hay
   aire de sobra y una vista previa diminuta no dejaba distinguir la imagen. El
   clic sigue abriendo el original en pestaña nueva (ver abrir()). */
.tk-thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.tk-icono { width: 64px; height: 64px; flex-shrink: 0; display: grid; place-items: center; border-radius: 6px; background: var(--ds-soft-neutral); color: var(--ds-muted); font-size: 20px; }
.tk-adjunto-datos { display: flex; flex-direction: column; min-width: 0; }
.tk-adjunto-nombre { font-size: 12.5px; color: var(--ds-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-adjunto-peso { font-size: 11px; color: var(--ds-muted); }
</style>
