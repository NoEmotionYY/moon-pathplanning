import type {
  OrthogonalDetectionOptions,
  ProjectionProfile,
  WallBand,
} from '@/types/orthogonalMaze'

const createBand = (
  start: number,
  end: number,
  values: Float64Array,
  maximum: number,
  threshold: number,
): WallBand => {
  let weightedPosition = 0
  let weight = 0
  let peak = 0
  for (let index = start; index < end; index += 1) {
    const value = values[index] ?? 0
    weightedPosition += index * value
    weight += value
    peak = Math.max(peak, value)
  }
  const center = weight > 0
    ? weightedPosition / weight
    : (start + end - 1) / 2
  const strength = maximum > 0 ? peak / maximum : 0
  const confidence = maximum > threshold
    ? Math.max(0, Math.min(1, (peak - threshold) / (maximum - threshold)))
    : 0
  return {
    start,
    end,
    center,
    thickness: end - start,
    strength,
    confidence,
  }
}

export function detectWallBands(
  profile: ProjectionProfile,
  options: OrthogonalDetectionOptions | number,
): WallBand[] {
  if (profile.length === 0 || profile.maximum <= 0) {
    return []
  }
  const thresholdRatio = typeof options === 'number'
    ? options
    : options.lineBandThresholdRatio
  const ratio = Math.max(0, Math.min(1, thresholdRatio))
  const threshold =
    profile.mean + (profile.maximum - profile.mean) * ratio
  let rawMaximum = 0
  let rawTotal = 0
  for (const value of profile.values) {
    rawMaximum = Math.max(rawMaximum, value)
    rawTotal += value
  }
  const rawMean = rawTotal / profile.length
  const rawThreshold = rawMean + (rawMaximum - rawMean) * ratio
  const bands: WallBand[] = []
  let start = -1

  for (let index = 0; index <= profile.length; index += 1) {
    const aboveThreshold =
      index < profile.length &&
      (profile.smoothedValues[index] ?? 0) >= threshold
    if (aboveThreshold && start < 0) {
      start = index
    } else if (!aboveThreshold && start >= 0) {
      let refinedStart = -1
      for (let position = start; position <= index; position += 1) {
        const rawAbove =
          position < index &&
          (profile.values[position] ?? 0) >= rawThreshold
        if (rawAbove && refinedStart < 0) {
          refinedStart = position
        } else if (!rawAbove && refinedStart >= 0) {
          bands.push(
            createBand(
              refinedStart,
              position,
              profile.values,
              rawMaximum,
              rawThreshold,
            ),
          )
          refinedStart = -1
        }
      }
      start = -1
    }
  }
  return bands
}
