/**
 * Lazy AudioContext Manager
 * 
 * Manages AudioContext creation in compliance with Chrome's autoplay policy.
 * The AudioContext is only created after a user gesture to avoid browser warnings.
 */

class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private hasUserGesture = false;

  private constructor() {
    // Listen for first user interaction to enable audio
    this.setupUserGestureDetection();
  }

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  private setupUserGestureDetection() {
    const enableAudio = () => {
      this.hasUserGesture = true;
      // Remove listeners once we have gesture
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };

    // Listen for any user interaction
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
  }

  /**
   * Get or create AudioContext after user gesture
   * Returns null if no user gesture detected yet
   */
  getAudioContext(): AudioContext | null {
    if (!this.hasUserGesture) {
      console.warn('[AudioContext] Waiting for user gesture before creating AudioContext');
      return null;
    }

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[AudioContext] Created after user gesture');
      } catch (error) {
        console.error('[AudioContext] Failed to create:', error);
        return null;
      }
    }

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(error => {
        console.error('[AudioContext] Failed to resume:', error);
      });
    }

    return this.audioContext;
  }

  /**
   * Force enable audio context (call from click handlers)
   */
  enableWithUserGesture(): AudioContext | null {
    this.hasUserGesture = true;
    return this.getAudioContext();
  }

  /**
   * Check if audio context can be created
   */
  canCreateAudioContext(): boolean {
    return this.hasUserGesture;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Export singleton instance
export const audioContextManager = AudioContextManager.getInstance();

// Convenience functions
export const getAudioContext = () => audioContextManager.getAudioContext();
export const enableAudioWithGesture = () => audioContextManager.enableWithUserGesture();
export const canCreateAudioContext = () => audioContextManager.canCreateAudioContext();