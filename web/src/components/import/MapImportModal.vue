<script setup lang="ts">
import { ref, watch } from 'vue'
import { FileJson2, Image as ImageIcon, Info } from '@lucide/vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import FileDropZone from './FileDropZone.vue'
import ImageSourcePreview from './ImageSourcePreview.vue'
import ImageTransformControls from './ImageTransformControls.vue'
import { useMapImportExport } from '@/composables/useMapImportExport'
import { useRasterImageImport } from '@/composables/useRasterImageImport'
import { usePreferencesStore } from '@/stores/preferences'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  jsonImported: []
}>()

const activeKind = ref<'json' | 'image'>('json')
const jsonError = ref<string | null>(null)
const { importFile } = useMapImportExport()
const preferences = usePreferencesStore()
const raster = useRasterImageImport()

const close = () => {
  raster.reset()
  jsonError.value = null
  activeKind.value = 'json'
  emit('close')
}

const importJson = async (file: File) => {
  jsonError.value = null
  try {
    await importFile(file)
    emit('jsonImported')
    close()
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : 'JSON 地图导入失败'
  }
}

const selectImage = async (file: File) => {
  await raster.selectFile(file)
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      raster.reset()
      jsonError.value = null
      activeKind.value = 'json'
    }
  },
)
</script>

<template>
  <BaseModal :open="open" title="导入地图" size="wide" @close="close">
    <div class="map-import-modal">
      <div class="import-kind-tabs" role="tablist" aria-label="导入类型">
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'json'"
          :class="{ active: activeKind === 'json' }"
          @click="activeKind = 'json'"
        >
          <FileJson2 :size="16" />JSON 地图
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'image'"
          :class="{ active: activeKind === 'image' }"
          @click="activeKind = 'image'"
        >
          <ImageIcon :size="16" />图片迷宫
        </button>
      </div>

      <section v-if="activeKind === 'json'" class="import-json-panel">
        <p>继续使用现有 moon-pathplanning.grid.v1 校验和导入流程。</p>
        <FileDropZone
          accept=".json,application/json"
          label="选择或拖入 JSON 地图"
          hint="最大 1 MB；导入成功后会替换当前地图"
          @select="importJson"
        />
        <div v-if="jsonError" class="import-error-card">{{ jsonError }}</div>
      </section>

      <section v-else class="import-image-panel">
        <div class="import-image-layout">
          <div class="import-image-sidebar">
            <FileDropZone
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              :disabled="raster.isLoading.value"
              label="选择或拖入迷宫图片"
              hint="PNG、JPG、JPEG、WebP；最大 10 MB"
              @select="selectImage"
            />
            <div class="future-format-note">
              <Info :size="15" />
              SVG 和 PDF 将在后续阶段支持，本阶段不会解析。
            </div>
            <div v-if="raster.error.value" class="import-error-card">
              <strong>{{ raster.error.value.code }}</strong>
              <span>{{ raster.error.value.message }}</span>
            </div>
            <BaseButton
              v-if="raster.isLoading.value"
              variant="ghost"
              @click="raster.cancelDecode"
            >
              取消读取
            </BaseButton>
          </div>

          <div class="import-image-main">
            <ImageSourcePreview
              :image="raster.transformedImage.value"
              :metadata="raster.decodedImage.value?.metadata ?? null"
              :state="raster.transformState.value"
              :file-type="raster.fileType.value"
              :theme="preferences.theme"
              :loading="raster.isLoading.value"
            />
            <ImageTransformControls
              :state="raster.transformState.value"
              :disabled="!raster.decodedImage.value || raster.isLoading.value"
              @rotate-left="raster.rotateLeft"
              @rotate-right="raster.rotateRight"
              @flip-horizontal="raster.toggleHorizontal"
              @flip-vertical="raster.toggleVertical"
              @invert="raster.toggleInvert"
              @reset="raster.resetTransform"
            />
          </div>
        </div>
      </section>

      <footer class="import-modal-footer">
        <BaseButton variant="ghost" @click="close">取消</BaseButton>
        <div v-if="activeKind === 'image'" class="import-next-step">
          <BaseButton variant="primary" disabled>下一步：识别迷宫</BaseButton>
          <span>迷宫墙体识别将在下一阶段实现</span>
        </div>
      </footer>
    </div>
  </BaseModal>
</template>
