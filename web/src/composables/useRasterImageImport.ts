import {
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
} from 'vue'
import type {
  DecodedImage,
  ImageMatrix,
  ImageTransformState,
  MazeImportError,
  MazeSourceFileType,
} from '@/types/import'
import {
  decodeRasterImage,
  isImportCancelledError,
  type RasterImageImportError,
} from '@/services/import/imageLoader'
import { applyImageTransforms } from '@/services/import/imageTransform'
import { validateImportFile } from '@/services/import/importValidation'

const initialTransformState = (): ImageTransformState => ({
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  invert: false,
})

const errorFromUnknown = (value: unknown): MazeImportError => {
  const importError = value as Partial<RasterImageImportError>
  return {
    code: typeof importError.code === 'string' ? importError.code : 'IMAGE_DECODE_FAILED',
    message: value instanceof Error ? value.message : '图片读取失败。',
  }
}

export const useRasterImageImport = (
  decoder: typeof decodeRasterImage = decodeRasterImage,
) => {
  const selectedFile = shallowRef<File | null>(null)
  const decodedImage = shallowRef<DecodedImage | null>(null)
  const transformedImage = shallowRef<ImageMatrix | null>(null)
  const fileType = ref<MazeSourceFileType>('unsupported')
  const transformState = ref<ImageTransformState>(initialTransformState())
  const error = ref<MazeImportError | null>(null)
  const isLoading = ref(false)

  let activeController: AbortController | null = null
  let taskId = 0

  const rebuildTransformedImage = () => {
    transformedImage.value = decodedImage.value
      ? applyImageTransforms(decodedImage.value.matrix, transformState.value)
      : null
  }

  const stopActiveTask = () => {
    taskId += 1
    activeController?.abort()
    activeController = null
    isLoading.value = false
  }

  const resetTransform = () => {
    transformState.value = initialTransformState()
    rebuildTransformedImage()
  }

  const reset = () => {
    stopActiveTask()
    selectedFile.value = null
    decodedImage.value = null
    transformedImage.value = null
    fileType.value = 'unsupported'
    transformState.value = initialTransformState()
    error.value = null
  }

  const cancelDecode = () => {
    if (!isLoading.value) return
    stopActiveTask()
    decodedImage.value = null
    transformedImage.value = null
    error.value = {
      code: 'IMPORT_CANCELLED',
      message: '图片读取已取消。',
    }
  }

  const selectFile = async (file: File): Promise<boolean> => {
    stopActiveTask()
    const validation = validateImportFile(file)
    selectedFile.value = file
    decodedImage.value = null
    transformedImage.value = null
    transformState.value = initialTransformState()
    fileType.value = validation.fileType
    error.value = validation.error ?? null
    if (!validation.valid) return false
    if (validation.fileType === 'svg' || validation.fileType === 'pdf') {
      error.value = {
        code: 'FORMAT_NOT_AVAILABLE',
        message: 'SVG 和 PDF 将在后续阶段支持，本阶段不会解码。',
      }
      return false
    }
    if (!['png', 'jpeg', 'webp'].includes(validation.fileType)) {
      error.value = {
        code: 'RASTER_TYPE_REQUIRED',
        message: '请选择 PNG、JPG、JPEG 或 WebP 图片。',
      }
      return false
    }

    const controller = new AbortController()
    activeController = controller
    const currentTaskId = ++taskId
    isLoading.value = true
    try {
      const decoded = await decoder(file, controller.signal)
      if (controller.signal.aborted || currentTaskId !== taskId) return false
      decodedImage.value = decoded
      rebuildTransformedImage()
      return true
    } catch (decodeError) {
      if (currentTaskId !== taskId) return false
      if (!isImportCancelledError(decodeError)) {
        error.value = errorFromUnknown(decodeError)
      } else {
        error.value = {
          code: 'IMPORT_CANCELLED',
          message: '图片读取已取消。',
        }
      }
      return false
    } finally {
      if (currentTaskId === taskId) {
        activeController = null
        isLoading.value = false
      }
    }
  }

  const updateTransform = (next: Partial<ImageTransformState>) => {
    if (!decodedImage.value) return
    transformState.value = { ...transformState.value, ...next }
    rebuildTransformedImage()
  }

  const rotateLeft = () => {
    const rotation = ((transformState.value.rotation + 270) % 360) as ImageTransformState['rotation']
    updateTransform({ rotation })
  }
  const rotateRight = () => {
    const rotation = ((transformState.value.rotation + 90) % 360) as ImageTransformState['rotation']
    updateTransform({ rotation })
  }
  const toggleHorizontal = () => updateTransform({
    flipHorizontal: !transformState.value.flipHorizontal,
  })
  const toggleVertical = () => updateTransform({
    flipVertical: !transformState.value.flipVertical,
  })
  const toggleInvert = () => updateTransform({
    invert: !transformState.value.invert,
  })

  if (getCurrentScope()) onScopeDispose(reset)

  return {
    selectedFile,
    decodedImage,
    transformedImage,
    fileType,
    transformState,
    error,
    isLoading,
    selectFile,
    cancelDecode,
    rotateLeft,
    rotateRight,
    toggleHorizontal,
    toggleVertical,
    toggleInvert,
    resetTransform,
    reset,
  }
}
