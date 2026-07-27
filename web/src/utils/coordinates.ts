import type { Point, PointTuple } from '@/types/grid'

export const pointKey = ({ x, y }: Point): string => `${x},${y}`
export const tupleKey = ([x, y]: PointTuple): string => `${x},${y}`

export const keyToPoint = (key: string): Point => {
  const [x, y] = key.split(',').map(Number)
  return { x: x ?? 0, y: y ?? 0 }
}

export const toTuple = ({ x, y }: Point): PointTuple => [x, y]
export const fromTuple = ([x, y]: PointTuple): Point => ({ x, y })

export const clampPoint = (point: Point, width: number, height: number): Point => ({
  x: Math.min(Math.max(point.x, 0), width - 1),
  y: Math.min(Math.max(point.y, 0), height - 1),
})

export const samePoint = (left: Point, right: Point): boolean =>
  left.x === right.x && left.y === right.y

export const getCellsBetween = (from: Point, to: Point): Point[] => {
  const points: Point[] = []
  let x = from.x
  let y = from.y
  const deltaX = Math.abs(to.x - from.x)
  const deltaY = Math.abs(to.y - from.y)
  const stepX = from.x < to.x ? 1 : -1
  const stepY = from.y < to.y ? 1 : -1
  let error = deltaX - deltaY

  while (true) {
    points.push({ x, y })
    if (x === to.x && y === to.y) break
    const twiceError = error * 2
    if (twiceError > -deltaY) {
      error -= deltaY
      x += stepX
    }
    if (twiceError < deltaX) {
      error += deltaX
      y += stepY
    }
  }
  return points
}

export const buildPolylinePoints = (path: PointTuple[], cellSize: number): string =>
  path.map(([x, y]) => `${(x + 0.5) * cellSize},${(y + 0.5) * cellSize}`).join(' ')
