/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

export const useSound = (isMuted: boolean, lastEvent: string, isTickingNeeded: boolean, isQMM: boolean = false, streakTier: number = 0) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickIntervalRef = useRef<number | null>(null);
  const activeOscillatorsRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);

  useEffect(() => {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
    return () => {
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const stopAllSounds = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    activeOscillatorsRef.current.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.01);
        osc.stop(ctx.currentTime + 0.01);
      } catch (e) {
        // Ignore if already stopped
      }
    });
    activeOscillatorsRef.current = [];
  }, []);

  const playTone = useCallback(
    (freq: number, type: OscillatorType, duration: number, startTimeOffset = 0, vol = 0.1) => {
      if (isMuted || !audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const baseVol = isQMM ? vol * 0.6 : vol;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      const startTime = ctx.currentTime + startTimeOffset;
      
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(baseVol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);

      activeOscillatorsRef.current.push({ osc, gain });

      // Cleanup ref array later
      setTimeout(() => {
        activeOscillatorsRef.current = activeOscillatorsRef.current.filter((o) => o.osc !== osc);
      }, (startTimeOffset + duration + 0.1) * 1000);
    },
    [isMuted, isQMM]
  );

  const sounds = useMemo(
    () => ({
      correct: () => {
        stopAllSounds();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          const baseVib = isQMM ? 25 : 50;
          navigator.vibrate(baseVib + (streakTier * 10));
        }
        const pitchShift = streakTier * 80;
        playTone(880 + pitchShift, 'sine', 0.1);
        playTone(1760 + pitchShift, 'sine', 0.1, 0.1);
      },
      incorrect: () => {
        stopAllSounds();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(isQMM ? 60 : 100);
        }
        playTone(150, 'sawtooth', 0.3);
      },
      modeChange: () => {
        stopAllSounds();
        playTone(440, 'sine', 0.1, 0);
        playTone(554, 'sine', 0.1, 0.1);
        playTone(659, 'sine', 0.4, 0.2);
      },
      click: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(20);
        }
        playTone(600, 'triangle', 0.05);
      },
      win: () => {
        stopAllSounds();
        playTone(523, 'sine', 0.5, 0);
        playTone(659, 'sine', 0.5, 0);
        playTone(783, 'sine', 0.5, 0);
        playTone(1046, 'sine', 0.8, 0.1);
      },
      stepComplete: () => {
        stopAllSounds();
        playTone(1200, 'sine', 0.08, 0, 0.04);
      }
    }),
    [playTone, stopAllSounds, isQMM, streakTier]
  );


  useEffect(() => {
    if (isMuted) return;
    switch (lastEvent) {
      case 'correct':
        sounds.correct();
        break;
      case 'incorrect':
        sounds.incorrect();
        break;
      case 'mode_change':
        sounds.modeChange();
        break;
      case 'win':
        sounds.win();
        break;
      case 'start':
        sounds.modeChange();
        break;
      case 'step_advance':
        sounds.stepComplete();
        break;
    }
  }, [lastEvent, isMuted, sounds]);

  useEffect(() => {
    if (isMuted || !isTickingNeeded) {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      return;
    }
    const tickCallback = () => playTone(800, 'square', 0.05, 0, 0.02);
    if (!tickIntervalRef.current) {
      tickCallback();
      tickIntervalRef.current = window.setInterval(tickCallback, 1000);
    }
    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [isMuted, isTickingNeeded, playTone]);

  return { playButtonClick: sounds.click };
};
