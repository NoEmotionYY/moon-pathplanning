import { IMPORT_FILE_SIZE_LIMITS } from '@/config/importLimits'
import { MAP_SIZE_LIMITS } from '@/config/mapLimits'
import { validateGridDocument } from '@/utils/validation'
import { detectImportFileType } from './fileTypeDetector'
import {
  createDefaultMazePreprocessOptions,
  createDefaultMazeImportOptions,
  DEFAULT_MAZE_PREPROCESS_OPTIONS,
  DEFAULT_MAZE_IMPORT_OPTIONS,
} from './importDefaults'
import {
  IMPORT_VALIDATION_ERROR_CODES,
  validateImportFile,
} from './importValidation'

const metadata = (name: string, type: string) => ({ name, type })
const candidate = (name: string, type: string, size = 1) => ({ name, type, size })

describe('迷宫导入文件类型检测', () => {
  it.each([
    ['maze.png', 'image/png', 'png'],
    ['maze.svg', 'image/svg+xml', 'svg'],
    ['maze.pdf', 'application/pdf', 'pdf'],
    ['maze.json', 'application/json', 'json'],
  ] as const)('识别 %s', (name, type, expected) => {
    expect(detectImportFileType(metadata(name, type))).toMatchObject({
      fileType: expected,
      conflict: false,
    })
  })

  it('识别 JPEG 和 WebP，并允许 MIME 缺失时使用扩展名', () => {
    expect(detectImportFileType(metadata('maze.JPG', 'image/jpeg')).fileType).toBe('jpeg')
    expect(detectImportFileType(metadata('maze.webp', '')).fileType).toBe('webp')
  })

  it('拒绝 MIME 与扩展名冲突', () => {
    const result = validateImportFile(candidate('maze.png', 'application/pdf'))
    expect(result.valid).toBe(false)
    expect(result.detection.conflict).toBe(true)
    expect(result.error?.code).toBe(IMPORT_VALIDATION_ERROR_CODES.typeMismatch)
  })

  it('拒绝空文件', () => {
    const result = validateImportFile(candidate('maze.png', 'image/png', 0))
    expect(result.valid).toBe(false)
    expect(result.error?.code).toBe(IMPORT_VALIDATION_ERROR_CODES.emptyFile)
  })

  it('拒绝不支持的文件类型', () => {
    const result = validateImportFile(candidate('maze.bmp', 'image/bmp'))
    expect(result.valid).toBe(false)
    expect(result.fileType).toBe('unsupported')
    expect(result.error?.code).toBe(IMPORT_VALIDATION_ERROR_CODES.unsupportedType)
  })

  it('按文件类型使用不同大小上限', () => {
    expect(validateImportFile(candidate(
      'maze.json',
      'application/json',
      IMPORT_FILE_SIZE_LIMITS.json + 1,
    )).error?.code).toBe(IMPORT_VALIDATION_ERROR_CODES.fileTooLarge)
    expect(validateImportFile(candidate(
      'maze.png',
      'image/png',
      IMPORT_FILE_SIZE_LIMITS.png - 1,
    )).valid).toBe(true)
    expect(validateImportFile(candidate(
      'maze.png',
      'image/png',
      IMPORT_FILE_SIZE_LIMITS.png + 1,
    )).error?.code).toBe(IMPORT_VALIDATION_ERROR_CODES.fileTooLarge)
  })

  it('application/octet-stream 和空 MIME 使用扩展名回退', () => {
    expect(detectImportFileType(metadata(
      'maze.png',
      'application/octet-stream',
    )).fileType).toBe('png')
    expect(detectImportFileType(metadata('maze.jpg', '')).fileType).toBe('jpeg')
  })

  it('文件名扩展名大小写不敏感且具体 MIME 冲突仍会拒绝', () => {
    expect(detectImportFileType(metadata('MAZE.JPEG', 'image/jpeg')).fileType).toBe('jpeg')
    expect(validateImportFile(candidate(
      'maze.PNG',
      'image/jpeg',
    )).error?.code).toBe(IMPORT_VALIDATION_ERROR_CODES.typeMismatch)
  })
})

describe('迷宫导入默认参数与地图限制', () => {
  it('提供可复制的默认导入参数', () => {
    expect(DEFAULT_MAZE_IMPORT_OPTIONS).toEqual({
      mode: 'auto',
      targetWidth: 60,
      targetHeight: 60,
      wallThreshold: 0.5,
      wallInflation: 0,
      denoiseLevel: 1,
      cropMargin: 0,
      invert: false,
      rotate: 0,
      flipHorizontal: false,
      flipVertical: false,
      solutionHandling: 'ignore',
    })
    const options = createDefaultMazeImportOptions()
    options.targetWidth = 40
    expect(DEFAULT_MAZE_IMPORT_OPTIONS.targetWidth).toBe(60)
  })

  it('统一声明当前编辑范围、建议上限和未来硬上限', () => {
    expect(MAP_SIZE_LIMITS).toEqual({
      min: 5,
      recommendedMax: 60,
      hardMax: 151,
    })
    const map = {
      format: 'moon-pathplanning.grid.v1',
      width: MAP_SIZE_LIMITS.recommendedMax,
      height: MAP_SIZE_LIMITS.recommendedMax,
      start: [0, 0],
      goal: [59, 59],
      movement: 'four_way',
      obstacles: [],
      terrain: [],
    }
    expect(() => validateGridDocument(map)).not.toThrow()
    expect(() => validateGridDocument({
      ...map,
      width: MAP_SIZE_LIMITS.recommendedMax + 1,
    })).toThrow('地图尺寸必须在')
  })

  it('提供集中且可复制的图像预处理默认参数', () => {
    expect(DEFAULT_MAZE_PREPROCESS_OPTIONS).toEqual({
      cropMargin: 1,
      transparentBackground: 'auto',
      minimumAlpha: 8,
      minimumForegroundPixels: 8,
    })
    const options = createDefaultMazePreprocessOptions()
    options.cropMargin = 4
    expect(DEFAULT_MAZE_PREPROCESS_OPTIONS.cropMargin).toBe(1)
  })
})
