import type {
  MazePreprocessOptions,
} from '@/types/imageAnalysis'
import type { ImageMatrix } from '@/types/import'
import type {
  MazeStructureAnalysis,
  OrthogonalDetectionOptions,
} from '@/types/orthogonalMaze'
import { preprocessMazeImage } from './mazePreprocessor'
import { detectOrthogonalMaze } from './orthogonalMazeDetector'

export function analyzeMazeStructure(
  image: ImageMatrix,
  preprocessOptions: Partial<MazePreprocessOptions> = {},
  detectionOptions: Partial<OrthogonalDetectionOptions> = {},
): MazeStructureAnalysis {
  const preprocess = preprocessMazeImage(image, preprocessOptions)
  const orthogonal = detectOrthogonalMaze(
    preprocess.croppedMask,
    preprocess.integralMask,
    detectionOptions,
  )
  return { preprocess, orthogonal }
}
