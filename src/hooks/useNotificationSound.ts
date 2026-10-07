import { useState, useCallback } from 'react';

export type SoundType = 'success' | 'warning' | 'error' | 'info';

const SOUND_ENABLED_KEY = 'apex-sound-enabled';
const SOUND_VOLUME_KEY = 'apex-sound-volume';

function createSuccessSound(ctx: AudioContext, volume: number) {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
  gainNode.connect(ctx.destination);

  // Pleasant ascending ding
  [880, 1108].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    osc.connect(gainNode);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.18);
  });
}

function createWarningSound(ctx: AudioContext, volume: number) {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
  gainNode.connect(ctx.destination);

  [660, 440].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
    osc.connect(gainNode);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.12);
  });
}

function createErrorSound(ctx: AudioContext, volume: number) {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
  gainNode.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);
  osc.connect(gainNode);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

function createInfoSound(ctx: AudioContext, volume: number) {
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  gainNode.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(740, ctx.currentTime);
  osc.connect(gainNode);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

export function useNotificationSound() {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  });

  const [volume, setVolumeState] = useState<number>(() => {
    const stored = localStorage.getItem(SOUND_VOLUME_KEY);
    return stored ? parseFloat(stored) : 0.6;
  });

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    localStorage.setItem(SOUND_VOLUME_KEY, String(clamped));
  }, []);

  const playSound = useCallback(
    (type: SoundType = 'info') => {
      if (!soundEnabled) return;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        switch (type) {
          case 'success':
            createSuccessSound(ctx, volume);
            break;
          case 'warning':
            createWarningSound(ctx, volume);
            break;
          case 'error':
            createErrorSound(ctx, volume);
            break;
          case 'info':
          default:
            createInfoSound(ctx, volume);
            break;
        }
      } catch {
        // Web Audio API not supported — silently ignore
      }
    },
    [soundEnabled, volume]
  );

  return { soundEnabled, setSoundEnabled, volume, setVolume, playSound };
}
