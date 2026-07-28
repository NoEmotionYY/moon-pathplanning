<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { FileJson2, Image as ImageIcon, Info } from '@lucide/vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import FileDropZone from './FileDropZone.vue'
import ImageSourcePreview from './ImageSourcePreview.vue'
import ImageTransformControls from './ImageTransformControls.vue'
import MazeAnalysisProgress from './MazeAnalysisProgress.vue'
import MazeAnalysisResult from './MazeAnalysisResult.vue'
import MazeDetectionPreview from './MazeDetectionPreview.vue'
import MazeImportConfirmation from './MazeImportConfirmation.vue'
import { useMapImportExport } from '@/composables/useMapImportExport'
import {
  MAZE_IMPORT_ANALYSIS_FACTORY,
  useMazeImportAnalysis,
} from '@/composables/useMazeImportAnalysis'
import { useMazeImportWizard } from '@/composables/useMazeImportWizard'
import { usePreferencesStore } from '@/stores/preferences'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  jsonImported: []
  imageImported: [payload: { width: number; height: number }]
}>()

const activeKind = ref<'json' | 'image'>('json')
const jsonError = ref<string | null>(null)
const { importFile } = useMapImportExport()
const { show } = useToast()
const preferences = usePreferencesStore()
const analysisFactory = inject(
  MAZE_IMPORT_ANALYSIS_FACTORY,
  useMazeImportAnalysis,
)
const wizard = useMazeImportWizard({ analysisFactory })
const raster = wizard.raster
const retainOpenDuringApplication = ref(false)
const effectiveOpen = computed(
  () => props.open || retainOpenDuringApplication.value,
)

const close = () => {
  if (wizard.isApplyingMap.value) {
    retainOpenDuringApplication.value = true
    show('地图正在安全替换，请稍候。', 'info')
    return
  }
  retainOpenDuringApplication.value = false
  wizard.disposeWizard()
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
  if (wizard.isApplyingMap.value) return
  await raster.selectFile(file)
}

const selectKind = (kind: 'json' | 'image') => {
  if (wizard.isApplyingMap.value) return
  if (kind === activeKind.value) return
  if (kind === 'json') wizard.disposeWizard()
  activeKind.value = kind
}

const confirmImageImport = async () => {
  if (wizard.isApplyingMap.value) return
  const document = wizard.result.value?.document
  if (!document) return
  const result = await wizard.confirmMapImport()
  if (result?.status !== 'success' || !result.applied) return

  const payload = {
    width: document.width,
    height: document.height,
  }
  show('迷宫地图已导入', 'success')
  wizard.disposeWizard()
  jsonError.value = null
  activeKind.value = 'json'
  retainOpenDuringApplication.value = false
  emit('imageImported', payload)
  emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      if (wizard.isApplyingMap.value) {
        retainOpenDuringApplication.value = true
        return
      }
      wizard.disposeWizard()
      jsonError.value = null
      activeKind.value = 'json'
      retainOpenDuringApplication.value = false
    }
  },
)
</script>

<template>
  <BaseModal
    :open="effectiveOpen"
    title="导入地图"
    size="wide"
    :close-disabled="wizard.isApplyingMap.value"
    @close="close"
  >
    <div class="map-import-modal">
      <div class="import-kind-tabs" role="tablist" aria-label="导入类型">
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'json'"
          :class="{ active: activeKind === 'json' }"
          :disabled="
            wizard.analysisStatus.value === 'running' ||
            wizard.isApplyingMap.value
          "
          @click="selectKind('json')"
        >
          <FileJson2 :size="16" />JSON 地图
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeKind === 'image'"
          :class="{ active: activeKind === 'image' }"
          :disabled="
            wizard.analysisStatus.value === 'running' ||
            wizard.isApplyingMap.value
          "
          @click="selectKind('image')"
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
        <div
          v-if="wizard.step.value === 'source'"
          class="import-image-layout"
        >
          <div class="import-image-sidebar">
            <FileDropZone
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              :disabled="
                raster.isLoading.value || wizard.isApplyingMap.value
              "
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
              :disabled="
                !raster.decodedImage.value ||
                raster.isLoading.value ||
                wizard.analysisStatus.value === 'running' ||
                wizard.isApplyingMap.value
              "
              @rotate-left="raster.rotateLeft"
              @rotate-right="raster.rotateRight"
              @flip-horizontal="raster.toggleHorizontal"
              @flip-vertical="raster.toggleVertical"
              @invert="raster.toggleInvert"
              @reset="raster.resetTransform"
            />
          </div>
        </div>

        <div
          v-else-if="wizard.step.value === 'analyzing'"
          class="import-analysis-layout"
        >
          <div class="import-analysis-preview">
            <ImageSourcePreview
              :image="raster.transformedImage.value"
              :metadata="raster.decodedImage.value?.metadata ?? null"
              :state="raster.transformState.value"
              :file-type="raster.fileType.value"
              :theme="preferences.theme"
              :loading="false"
            />
            <ImageTransformControls
              :state="raster.transformState.value"
              disabled
              @rotate-left="raster.rotateLeft"
              @rotate-right="raster.rotateRight"
              @flip-horizontal="raster.toggleHorizontal"
              @flip-vertical="raster.toggleVertical"
              @invert="raster.toggleInvert"
              @reset="raster.resetTransform"
            />
          </div>
          <MazeAnalysisProgress
            :progress="wizard.progress.value"
            :action="
              wizard.isApplyingEntranceSelection.value
                ? 'apply-selection'
                : 'analyze'
            "
            @cancel="wizard.cancelAnalysis"
          />
        </div>

        <div
          v-else
          class="import-result-layout"
        >
          <MazeDetectionPreview
            v-if="wizard.result.value"
            :result="wizard.result.value"
            :theme="preferences.theme"
            :pending-selection="
              wizard.canSelectEntrances.value
                ? wizard.manualSelection.value
                : null
            "
          />
          <section v-else class="result-preview-unavailable">
            当前没有可用的识别预览。
          </section>
          <MazeImportConfirmation
            v-if="
              wizard.importConfirmationSummary.value &&
              (
                wizard.isImportConfirmationOpen.value ||
                wizard.isApplyingMap.value
              )
            "
            :summary="wizard.importConfirmationSummary.value"
            :applying="wizard.isApplyingMap.value"
            @cancel="wizard.cancelImportConfirmation"
            @confirm="confirmImageImport"
          />
          <div v-else class="maze-import-result-panel">
          <MazeAnalysisResult
            :status="wizard.analysisStatus.value"
            :result="wizard.result.value"
            :error="wizard.analysisError.value"
            :can-select-entrances="wizard.canSelectEntrances.value"
            :can-apply-manual-selection="
              wizard.canApplyManualSelection.value
            "
            :manual-selection="wizard.manualSelection.value"
            :manual-selection-validation="
              wizard.manualSelectionValidation.value
            "
            :needs-low-confidence-confirmation="
              wizard.needsLowConfidenceConfirmation.value
            "
            :entrance-selection-source="
              wizard.entranceSelectionSource.value
            "
            :applied-entrance-selection="
              wizard.appliedEntranceSelection.value
            "
            :disabled="wizard.isApplyingMap.value"
            @select-entrance="wizard.setManualEntrance"
            @clear-selection="wizard.clearManualEntranceSelection"
            @swap-selection="wizard.swapManualEntrances"
            @apply-selection="wizard.applyManualEntranceSelection"
            @confirm-low-confidence="
              wizard.confirmLowConfidenceSelection
            "
            @cancel-low-confidence="
              wizard.cancelLowConfidenceConfirmation
            "
            @swap-applied="wizard.swapAppliedEntrances"
          />
          <section
            v-if="wizard.canShowImportAction.value && wizard.result.value?.document"
            class="maze-import-capability"
            :class="{
              'is-blocked':
                wizard.importCapability.value?.allowed === false,
            }"
          >
            <strong>
              转换地图：{{ wizard.result.value.document.width }} ×
              {{ wizard.result.value.document.height }}
            </strong>
            <template v-if="wizard.importCapability.value?.allowed">
              <span>当前可正式导入</span>
            </template>
            <template v-else>
              <span>
                当前地图编辑器正式导入上限为
                {{ wizard.importCapability.value?.maximumImportWidth }} ×
                {{ wizard.importCapability.value?.maximumImportHeight }}。
              </span>
              <p>该结果仍可查看，但不能应用到主地图。</p>
              <code>
                {{
                  wizard.importCapability.value?.error?.code ??
                  'MAP_IMPORT_RENDER_LIMIT_EXCEEDED'
                }}
              </code>
            </template>
          </section>
          <section
            v-if="wizard.isMapPreviewStale.value"
            class="import-application-message is-warning"
            role="alert"
          >
            当前主地图已在迷宫识别期间发生变化。为避免覆盖新的修改，请重新识别或返回调整。
          </section>
          <section
            v-else-if="wizard.importApplicationError.value"
            class="import-application-message is-danger"
            role="alert"
          >
            <strong>{{ wizard.importApplicationError.value.code }}</strong>
            <span>{{ wizard.importApplicationError.value.message }}</span>
          </section>
          </div>
        </div>
      </section>

      <footer class="import-modal-footer">
        <template v-if="activeKind === 'json'">
          <BaseButton variant="ghost" @click="close">取消</BaseButton>
        </template>
        <template v-else-if="wizard.step.value === 'source'">
          <BaseButton variant="ghost" @click="close">取消</BaseButton>
          <div class="import-next-step">
            <BaseButton
              variant="primary"
              :disabled="!wizard.canAnalyze.value"
              @click="wizard.startAnalysis"
            >
              识别迷宫
            </BaseButton>
            <span v-if="wizard.analysisStatus.value === 'cancelled'">
              已取消识别
            </span>
            <span v-else>仅分析和预览，不会修改当前地图</span>
          </div>
        </template>
        <template v-else-if="wizard.step.value === 'analyzing'">
          <span class="footer-status">
            {{
              wizard.isApplyingEntranceSelection.value
                ? 'Worker 正在应用入口选择'
                : 'Worker 正在分析图片'
            }}
          </span>
        </template>
        <template v-else>
          <div
            v-if="
              !wizard.isImportConfirmationOpen.value &&
              !wizard.isApplyingMap.value
            "
            class="result-footer-actions"
          >
            <BaseButton variant="ghost" @click="wizard.returnToSource">
              返回调整
            </BaseButton>
            <BaseButton
              variant="secondary"
              :disabled="
                !wizard.canAnalyze.value || wizard.isApplyingMap.value
              "
              @click="wizard.startAnalysis"
            >
              重新识别
            </BaseButton>
          </div>
          <div
            v-if="
              wizard.isImportConfirmationOpen.value ||
              wizard.isApplyingMap.value
            "
            class="footer-status"
          >
            {{
              wizard.isApplyingMap.value
                ? '地图正在安全替换，请稍候。'
                : '请在确认卡片中检查替换信息。'
            }}
          </div>
          <div v-else class="result-import-actions">
            <BaseButton
              v-if="wizard.canShowImportAction.value"
              variant="primary"
              :disabled="!wizard.canConfirmImport.value"
              @click="wizard.openImportConfirmation"
            >
              确认导入地图
            </BaseButton>
            <BaseButton variant="primary" @click="close">关闭</BaseButton>
          </div>
        </template>
      </footer>
    </div>
  </BaseModal>
</template>
