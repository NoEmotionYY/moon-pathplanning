<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import type {
  DecodedImageMetadata,
  ImageMatrix,
  ImageTransformState,
} from '@/types/import'
import { drawImageMatrixToCanvas } from '@/services/import/imagePreview'

const props = defineProps<{
  image: ImageMatrix | null
  metadata: DecodedImageMetadata | null
  state: ImageTransformState
  fileType: string
  theme: 'dark' | 'light'
  loading: boolean
}>()

const surface = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

const formatPixels = (pixels: number): string =>
  pixels.toLocaleString()

const draw = async () => {
  await nextTick()
  if (!props.image || !canvas.value || !surface.value) return
  const styles = getComputedStyle(surface.value)
  drawImageMatrixToCanvas(canvas.value, props.image, {
    maxWidth: Math.max(1, surface.value.clientWidth - 32),
    maxHeight: 460,
    checkerLight: styles.getPropertyValue('--import-checker-light').trim(),
    checkerDark: styles.getPropertyValue('--import-checker-dark').trim(),
  })
}

watch(
  () => [props.image, props.theme],
  draw,
  { flush: 'post' },
)

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && surface.value) {
    resizeObserver = new ResizeObserver(draw)
    resizeObserver.observe(surface.value)
  }
  void draw()
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section class="image-source-preview">
    <dl v-if="metadata" class="image-metadata">
      <div><dt>文件名</dt><dd>{{ metadata.fileName }}</dd></div>
      <div><dt>格式</dt><dd>{{ fileType.toUpperCase() }}</dd></div>
      <div><dt>大小</dt><dd>{{ formatBytes(metadata.fileSize) }}</dd></div>
      <div><dt>原始尺寸</dt><dd>{{ metadata.width }} × {{ metadata.height }}</dd></div>
      <div><dt>总像素</dt><dd>{{ formatPixels(metadata.pixels) }}</dd></div>
      <div>
        <dt>当前变换</dt>
        <dd>
          {{ state.rotation }}° /
          {{ state.flipHorizontal ? '水平翻转' : '水平原向' }} /
          {{ state.flipVertical ? '垂直翻转' : '垂直原向' }} /
          {{ state.invert ? '已反色' : '原色' }}
        </dd>
      </div>
    </dl>
    <div ref="surface" class="image-preview-surface">
      <div v-if="loading" class="image-preview-loading">
        <span class="button-spinner" aria-hidden="true" />
        <strong>正在安全解码图片…</strong>
      </div>
      <canvas
        v-else-if="image"
        ref="canvas"
        aria-label="迷宫原图预览"
      />
      <div v-else class="image-preview-empty">
        选择 PNG、JPG、JPEG 或 WebP 后在此预览
      </div>
    </div>
  </section>
</template>
