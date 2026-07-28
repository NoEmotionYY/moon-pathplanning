export type PlaybackFrameStopper = () => boolean

class PlaybackFrameController {
  private readonly stoppers = new Set<PlaybackFrameStopper>()

  register(stopper: PlaybackFrameStopper): () => void {
    this.stoppers.add(stopper)
    return () => this.stoppers.delete(stopper)
  }

  stopAll(): boolean {
    let stopped = false
    for (const stop of this.stoppers) {
      stopped = stop() || stopped
    }
    return stopped
  }
}

export const playbackFrameController = new PlaybackFrameController()
