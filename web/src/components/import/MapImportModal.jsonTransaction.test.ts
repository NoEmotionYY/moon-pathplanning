import {
  computed,
  createApp,
  h,
  nextTick,
  ref,
  type Ref,
} from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/composables/useToast'
import type {
  MapFileApplicationStatus,
} from '@/composables/useMapImportExport'
import type { MapImportTransactionError } from '@/types/mapImportTransaction'

interface JsonImportState {
  importStatus: Ref<MapFileApplicationStatus>
  importError: Ref<MapImportTransactionError | null>
}

const harness = vi.hoisted(() => ({
  state: null as JsonImportState | null,
  runImport: null as null | ((
    file: File,
    state: JsonImportState,
  ) => Promise<void>),
  importFile: vi.fn(),
  resetImportState: vi.fn(),
}))

vi.mock('@/composables/useMapImportExport', () => ({
  useMapImportExport: () => {
    const importStatus = ref<MapFileApplicationStatus>('idle')
    const importError = ref<MapImportTransactionError | null>(null)
    const state = { importStatus, importError }
    harness.state = state
    harness.importFile.mockImplementation((file: File) =>
      harness.runImport?.(file, state))
    harness.resetImportState.mockImplementation(() => {
      if (
        importStatus.value === 'reading' ||
        importStatus.value === 'applying'
      ) {
        return
      }
      importStatus.value = 'idle'
      importError.value = null
    })
    return {
      importStatus,
      importError,
      isImporting: computed(
        () =>
          importStatus.value === 'reading' ||
          importStatus.value === 'applying',
      ),
      importFile: harness.importFile,
      resetImportState: harness.resetImportState,
    }
  },
}))

import MapImportModal from './MapImportModal.vue'

let app: ReturnType<typeof createApp> | null = null
let modalOpen = ref(true)
let onClose: ReturnType<typeof vi.fn>
let onJsonImported: ReturnType<typeof vi.fn>

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

const mapFile = (): File => ({
  name: 'map.json',
  type: 'application/json',
  size: 100,
  text: async () => '{}',
} as File)

const selectJsonFile = async (): Promise<void> => {
  const input = document.querySelector<HTMLInputElement>(
    '.import-json-panel input[type="file"]',
  )
  expect(input).not.toBeNull()
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [mapFile()],
  })
  input?.dispatchEvent(new Event('change', { bubbles: true }))
  await nextTick()
}

const mountModal = async (): Promise<void> => {
  const host = document.createElement('div')
  document.body.append(host)
  app = createApp({
    setup: () => () => h(MapImportModal, {
      open: modalOpen.value,
      onClose,
      onJsonImported,
    }),
  })
  app.use(createPinia())
  app.mount(host)
  await nextTick()
}

beforeEach(() => {
  setActivePinia(createPinia())
  modalOpen = ref(true)
  onClose = vi.fn()
  onJsonImported = vi.fn()
  harness.importFile.mockReset()
  harness.resetImportState.mockReset()
  harness.runImport = null
  const toast = useToast()
  for (const message of [...toast.messages.value]) toast.remove(message.id)
})

afterEach(() => {
  app?.unmount()
  app = null
  document.body.replaceChildren()
})

describe('MapImportModal JSON 原子事务状态', () => {
  it('reading/applying 期间禁用文件、Tab 和关闭，成功后兼容 emit', async () => {
    const reading = deferred()
    const applying = deferred()
    harness.runImport = async (_file, state) => {
      state.importStatus.value = 'reading'
      await reading.promise
      state.importStatus.value = 'applying'
      await applying.promise
      state.importStatus.value = 'success'
    }
    await mountModal()
    await selectJsonFile()

    expect(document.body.textContent).toContain('正在读取 JSON…')
    expect(
      document.querySelector('.file-drop-zone')
        ?.getAttribute('aria-disabled'),
    ).toBe('true')
    expect(
      [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
        .every((tab) => tab.disabled),
    ).toBe(true)
    expect(
      document.querySelector<HTMLButtonElement>(
        '[aria-label="关闭对话框"]',
      )?.disabled,
    ).toBe(true)

    document.querySelector<HTMLButtonElement>(
      '[aria-label="关闭对话框"]',
    )?.click()
    modalOpen.value = false
    await nextTick()
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    reading.resolve()
    await nextTick()
    await nextTick()
    expect(document.body.textContent).toContain('正在应用地图…')
    expect(harness.importFile).toHaveBeenCalledOnce()

    applying.resolve()
    await nextTick()
    await nextTick()
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await nextTick()
    expect(onJsonImported).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('结构化失败保留弹窗并恢复选择文件能力', async () => {
    harness.runImport = async (_file, state) => {
      state.importStatus.value = 'reading'
      await Promise.resolve()
      state.importStatus.value = 'stale'
      state.importError.value = {
        code: 'MAP_IMPORT_STALE_PREVIEW',
        message: '当前地图已在文件读取期间发生变化，请重新选择 JSON 文件。',
      }
      throw Object.assign(new Error(state.importError.value.message), {
        code: state.importError.value.code,
      })
    }
    await mountModal()
    await selectJsonFile()
    await nextTick()

    expect(document.body.textContent).toContain(
      'MAP_IMPORT_STALE_PREVIEW',
    )
    expect(document.body.textContent).toContain(
      '当前地图已在文件读取期间发生变化',
    )
    expect(
      document.querySelector('.file-drop-zone')
        ?.getAttribute('aria-disabled'),
    ).toBe('false')
    expect(onJsonImported).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(
      useToast().messages.value.some(
        (message) =>
          message.tone === 'error' &&
          message.text.includes('文件读取期间发生变化'),
      ),
    ).toBe(true)
  })
})
