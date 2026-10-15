import { describe, it, expect } from 'vitest';
import { createAudioSession } from '../../js/audioSession.js';

// Infinity Drumming, 2026: a groove is heard through an iPhone's silent switch.

describe('audio session', () => {
  it('says "playback" while a groove plays and goes back to "auto" when it stops', () => {
    const nav = { audioSession: { type: 'auto' } };
    const session = createAudioSession(nav);
    session.playing(true);
    expect(nav.audioSession.type).toBe('playback');
    session.playing(false);
    expect(nav.audioSession.type).toBe('auto');
  });

  it('does nothing in a browser without the Audio Session API', () => {
    const nav = {};
    expect(() => createAudioSession(nav).playing(true)).not.toThrow();
    expect(nav).toEqual({});
  });
});
