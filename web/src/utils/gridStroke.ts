import type { Point } from '@/types/grid'
import { getCellsBetween, pointKey } from './coordinates'

export class GridStrokeSession {
  pointerId: number | null = null
  lastPoint: Point | null = null
  private readonly processed = new Set<string>()

  get active(): boolean {
    return this.pointerId !== null
  }

  start(pointerId: number, point: Point): Point[] {
    this.cancel()
    this.pointerId = pointerId
    this.lastPoint = point
    this.processed.add(pointKey(point))
    return [point]
  }

  move(pointerId: number, point: Point): Point[] {
    if (this.pointerId !== pointerId || !this.lastPoint) return []
    const fresh = getCellsBetween(this.lastPoint, point).filter((cell) => {
      const key = pointKey(cell)
      if (this.processed.has(key)) return false
      this.processed.add(key)
      return true
    })
    this.lastPoint = point
    return fresh
  }

  cancel(): void {
    this.pointerId = null
    this.lastPoint = null
    this.processed.clear()
  }
}

export const cancelFromContextMenu = (
  event: Pick<Event, 'preventDefault'>,
  cancel: () => void,
): void => {
  event.preventDefault()
  cancel()
}
