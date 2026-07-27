import { useGridStore } from '@/stores/grid'
import { usePlannerStore } from '@/stores/planner'
import { downloadText } from '@/utils/download'
import { MAX_IMPORT_BYTES, parseGridJson } from '@/utils/validation'
import { useToast } from './useToast'

const exampleNames = [
  'simple_grid',
  'weighted_grid',
  'rs_apso_20x20_simple',
  'rs_apso_20x20_complex',
  'complex_maze',
] as const

export type ExampleName = (typeof exampleNames)[number]

export const useMapImportExport = () => {
  const grid = useGridStore()
  const planner = usePlannerStore()
  const toast = useToast()

  const importFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      throw new Error('请选择 JSON 地图文件')
    }
    if (file.size > MAX_IMPORT_BYTES) throw new Error('地图文件不能超过 1 MB')
    const document = parseGridJson(await file.text())
    grid.loadDocument(document)
    planner.clearResult()
    toast.show(`已导入 ${file.name}`, 'success')
  }

  const exportMap = () => {
    const now = new Date().toISOString().slice(0, 10)
    const filename = `moon-grid-${grid.width}x${grid.height}-${now}.json`
    downloadText(JSON.stringify(grid.toDocument(), null, 2), filename)
    toast.show('地图 JSON 已导出', 'success')
  }

  const loadExample = async (name: ExampleName) => {
    if (!exampleNames.includes(name)) throw new Error('未知的示例地图')
    const response = await fetch(`${import.meta.env.BASE_URL}examples/${name}.json`)
    if (!response.ok) throw new Error('无法加载示例地图')
    grid.loadDocument(parseGridJson(await response.text()))
    planner.clearResult()
    toast.show('示例地图已加载', 'success')
  }

  return { importFile, exportMap, loadExample, exampleNames }
}
