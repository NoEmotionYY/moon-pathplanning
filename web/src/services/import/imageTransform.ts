import type {
  ImageMatrix,
  ImageTransformState,
  MazeImportOptions,
} from '@/types/import'

type Rotation = MazeImportOptions['rotate']

const assertImageMatrix = (image: ImageMatrix): void => {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    image.rgba.length !== image.width * image.height * 4
  ) {
    throw new Error('ImageMatrix 尺寸与 RGBA 数据长度不一致')
  }
}

const copyPixel = (
  source: Uint8ClampedArray,
  sourceIndex: number,
  target: Uint8ClampedArray,
  targetIndex: number,
  invert: boolean,
): void => {
  target[targetIndex] = invert ? 255 - (source[sourceIndex] ?? 0) : source[sourceIndex] ?? 0
  target[targetIndex + 1] = invert
    ? 255 - (source[sourceIndex + 1] ?? 0)
    : source[sourceIndex + 1] ?? 0
  target[targetIndex + 2] = invert
    ? 255 - (source[sourceIndex + 2] ?? 0)
    : source[sourceIndex + 2] ?? 0
  target[targetIndex + 3] = source[sourceIndex + 3] ?? 0
}

const rotatedDimensions = (
  width: number,
  height: number,
  rotation: Rotation,
): [number, number] =>
  rotation === 90 || rotation === 270
    ? [height, width]
    : [width, height]

const rotatedPoint = (
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: Rotation,
): [number, number] => {
  if (rotation === 90) return [height - 1 - y, x]
  if (rotation === 180) return [width - 1 - x, height - 1 - y]
  if (rotation === 270) return [y, width - 1 - x]
  return [x, y]
}

export const rotateImageMatrix = (
  image: ImageMatrix,
  rotation: Rotation,
): ImageMatrix => {
  assertImageMatrix(image)
  const [width, height] = rotatedDimensions(image.width, image.height, rotation)
  const rgba = new Uint8ClampedArray(image.rgba.length)

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const [targetX, targetY] = rotatedPoint(
        x,
        y,
        image.width,
        image.height,
        rotation,
      )
      copyPixel(
        image.rgba,
        (y * image.width + x) * 4,
        rgba,
        (targetY * width + targetX) * 4,
        false,
      )
    }
  }

  return { width, height, rgba }
}

export const flipImageMatrix = (
  image: ImageMatrix,
  horizontal: boolean,
  vertical: boolean,
): ImageMatrix => {
  assertImageMatrix(image)
  const rgba = new Uint8ClampedArray(image.rgba.length)

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const targetX = horizontal ? image.width - 1 - x : x
      const targetY = vertical ? image.height - 1 - y : y
      copyPixel(
        image.rgba,
        (y * image.width + x) * 4,
        rgba,
        (targetY * image.width + targetX) * 4,
        false,
      )
    }
  }

  return { width: image.width, height: image.height, rgba }
}

export const invertImageMatrix = (image: ImageMatrix): ImageMatrix => {
  assertImageMatrix(image)
  const rgba = new Uint8ClampedArray(image.rgba.length)
  for (let index = 0; index < image.rgba.length; index += 4) {
    copyPixel(image.rgba, index, rgba, index, true)
  }
  return { width: image.width, height: image.height, rgba }
}

export const applyImageTransforms = (
  image: ImageMatrix,
  state: ImageTransformState,
): ImageMatrix => {
  assertImageMatrix(image)
  const [width, height] = rotatedDimensions(
    image.width,
    image.height,
    state.rotation,
  )
  const rgba = new Uint8ClampedArray(image.rgba.length)

  // 固定语义顺序：旋转 → 水平翻转 → 垂直翻转 → RGB 反色。
  // 坐标映射合并在单次遍历中，避免为每一步复制完整 RGBA 数组。
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const [rotatedX, rotatedY] = rotatedPoint(
        x,
        y,
        image.width,
        image.height,
        state.rotation,
      )
      const targetX = state.flipHorizontal ? width - 1 - rotatedX : rotatedX
      const targetY = state.flipVertical ? height - 1 - rotatedY : rotatedY
      copyPixel(
        image.rgba,
        (y * image.width + x) * 4,
        rgba,
        (targetY * width + targetX) * 4,
        state.invert,
      )
    }
  }

  return { width, height, rgba }
}
