import {
  ORTHOGONAL_DETECTION_THRESHOLDS,
  ORTHOGONAL_DETECTION_WEIGHTS,
} from '@/config/orthogonalDetection'
import type {
  GridPitchCandidate,
  OrthogonalDetectionOptions,
  ProjectionProfile,
  WallBand,
} from '@/types/orthogonalMaze'

interface ScoredMatch {
  bandIndex: number
  distance: number
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const findNearestBand = (
  position: number,
  bands: WallBand[],
  tolerance: number,
): ScoredMatch | undefined => {
  let best: ScoredMatch | undefined
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index]
    if (!band) {
      continue
    }
    const distance = Math.abs(band.center - position)
    const allowed = tolerance + Math.max(0, band.thickness - 1) / 2
    if (distance <= allowed && (!best || distance < best.distance)) {
      best = { bandIndex: index, distance }
    }
  }
  return best
}

const linePositions = (
  length: number,
  pitch: number,
  offset: number,
): number[] => {
  const positions: number[] = []
  for (let position = offset; position < length; position += pitch) {
    positions.push(position)
  }
  return positions
}

const localProfileMaximum = (
  profile: ProjectionProfile,
  position: number,
  tolerance: number,
): number => {
  const start = Math.max(0, Math.floor(position - tolerance))
  const end = Math.min(profile.length - 1, Math.ceil(position + tolerance))
  let maximum = 0
  for (let index = start; index <= end; index += 1) {
    maximum = Math.max(maximum, profile.smoothedValues[index] ?? 0)
  }
  return profile.maximum > 0 ? maximum / profile.maximum : 0
}

const scoreCandidate = (
  profile: ProjectionProfile,
  bands: WallBand[],
  pitch: number,
  offset: number,
  tolerance: number,
): GridPitchCandidate => {
  const positions = linePositions(profile.length, pitch, offset)
  const matchedBands = new Set<number>()
  let matchedLines = 0
  let positionError = 0
  let energy = 0
  let interlineEnergy = 0

  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index] ?? 0
    energy += localProfileMaximum(profile, position, tolerance)
    const next = positions[index + 1]
    if (next !== undefined) {
      interlineEnergy += localProfileMaximum(
        profile,
        (position + next) / 2,
        tolerance,
      )
    }
    const match = findNearestBand(position, bands, tolerance)
    if (match) {
      matchedLines += 1
      matchedBands.add(match.bandIndex)
      positionError += match.distance
    }
  }

  const expectedLines = positions.length
  const matchedRatio = expectedLines > 0 ? matchedLines / expectedLines : 0
  const coverageRatio = bands.length > 0 ? matchedBands.size / bands.length : 0
  const profileEnergy = expectedLines > 0 ? energy / expectedLines : 0
  const meanInterlineEnergy = expectedLines > 1
    ? interlineEnergy / (expectedLines - 1)
    : 1
  const interlineContrast = clamp01(profileEnergy - meanInterlineEnergy)
  const meanPositionError =
    matchedLines > 0 ? positionError / matchedLines : Number.POSITIVE_INFINITY
  const positionAccuracy = Number.isFinite(meanPositionError)
    ? clamp01(1 - meanPositionError / Math.max(1, tolerance + 0.5))
    : 0
  const firstBand = bands[0]
  const lastBand = bands.at(-1)
  const firstPosition = positions[0]
  const lastPosition = positions.at(-1)
  const boundaryCoverage =
    firstBand && lastBand && firstPosition !== undefined && lastPosition !== undefined
      ? (
          clamp01(
            1 -
            Math.abs(firstPosition - firstBand.center) /
              Math.max(1, tolerance + firstBand.thickness / 2),
          ) +
          clamp01(
            1 -
            Math.abs(lastPosition - lastBand.center) /
              Math.max(1, tolerance + lastBand.thickness / 2),
          )
        ) / 2
      : 0
  const score =
    matchedRatio * ORTHOGONAL_DETECTION_WEIGHTS.pitchMatchedRatio +
    coverageRatio * ORTHOGONAL_DETECTION_WEIGHTS.pitchCoverageRatio +
    profileEnergy * ORTHOGONAL_DETECTION_WEIGHTS.pitchProfileEnergy +
    interlineContrast *
      ORTHOGONAL_DETECTION_WEIGHTS.pitchInterlineContrast +
    positionAccuracy * ORTHOGONAL_DETECTION_WEIGHTS.pitchPositionAccuracy +
    boundaryCoverage * ORTHOGONAL_DETECTION_WEIGHTS.pitchBoundaryCoverage

  return {
    pitch,
    offset,
    score: clamp01(score),
    matchedLines,
    expectedLines,
    meanPositionError,
  }
}

export function detectGridPitchCandidates(
  profile: ProjectionProfile,
  bands: WallBand[],
  options: OrthogonalDetectionOptions,
): GridPitchCandidate[] {
  const minimumPitch = Math.max(1, Math.ceil(options.minimumCellSize))
  const maximumPitch = Math.min(
    Math.floor(options.maximumCellSize),
    Math.floor((profile.length - 1) / options.minimumCellCount),
  )
  const candidates: GridPitchCandidate[] = []

  for (let pitch = minimumPitch; pitch <= maximumPitch; pitch += 1) {
    let bestForPitch: GridPitchCandidate | undefined
    for (let offset = 0; offset < pitch && offset < profile.length; offset += 1) {
      const expectedLines = linePositions(profile.length, pitch, offset).length
      const cellCount = expectedLines - 1
      if (
        cellCount < options.minimumCellCount ||
        cellCount > options.maximumCellCount
      ) {
        continue
      }
      const candidate = scoreCandidate(
        profile,
        bands,
        pitch,
        offset,
        options.linePositionTolerance,
      )
      if (!bestForPitch || candidate.score > bestForPitch.score) {
        bestForPitch = candidate
      }
    }
    if (bestForPitch) {
      candidates.push(bestForPitch)
    }
  }

  return candidates.sort((left, right) =>
    right.score - left.score ||
    right.matchedLines - left.matchedLines ||
    left.pitch - right.pitch,
  )
}

export function selectGridPitch(
  candidates: GridPitchCandidate[],
): GridPitchCandidate | undefined {
  const best = candidates[0]
  if (!best || best.expectedLines === 0) {
    return undefined
  }
  const matchRatio = best.matchedLines / best.expectedLines
  return matchRatio >= ORTHOGONAL_DETECTION_THRESHOLDS.minimumPitchMatchRatio
    ? best
    : undefined
}

export const findGridPitchCandidates = detectGridPitchCandidates

export function selectBestGridPitch(
  candidates: GridPitchCandidate[],
): GridPitchCandidate | null {
  return selectGridPitch(candidates) ?? null
}
