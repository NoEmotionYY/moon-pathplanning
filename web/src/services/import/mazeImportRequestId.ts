let requestCounter = 0

export function createMazeImportRequestId(
  now: () => number = Date.now,
): string {
  requestCounter += 1
  return `maze-import-${Math.trunc(now())}-${requestCounter}`
}

export function resetMazeImportRequestIdCounterForTests(): void {
  requestCounter = 0
}
