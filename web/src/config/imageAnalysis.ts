export const IMAGE_ANALYSIS_DEFAULTS = {
  cropMargin: 1,
  transparentBackground: 'auto',
  minimumAlpha: 8,
  minimumForegroundPixels: 8,
} as const

export const IMAGE_ANALYSIS_THRESHOLDS = {
  backgroundBandRatio: 0.05,
  backgroundBandMin: 3,
  backgroundBandMax: 16,
  backgroundClusterRadius: 8,
  backgroundLightCutoff: 128,
  backgroundLowConfidence: 0.35,
  backgroundDominanceWeight: 0.8,
  backgroundCoverageWeight: 0.2,
  polarityMinimumContrast: 12,
  polarityFullConfidenceContrast: 96,
  polarityLowConfidence: 0.35,
  polarityEvidenceRatio: 0.005,
  polarityBackgroundConfidenceFloor: 0.75,
  darkWallCoreQuantile: 0.35,
  lightWallCoreQuantile: 0.65,
  maskNearEmptyRatio: 0.001,
  maskNearFullRatio: 0.999,
  projectionSupportRatio: 0.003,
  projectionMinimumSupport: 2,
  projectionSupportMax: 8,
} as const
