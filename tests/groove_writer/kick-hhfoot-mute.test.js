import { describe, it, expect } from 'vitest';
import { muteArrayFromClickableUI } from '../../js/gridState.js';

// The kick and the hi-hat foot share one voice (kick_array) but have separate
// lines and mute buttons in the editor. Muting one must keep the other.
describe('gridState.muteArrayFromClickableUI: kick vs hi-hat foot', () => {
  const KICK = 'F'; // constant_ABC_KI_Normal
  const FOOT = '^d,'; // constant_ABC_KI_Splash
  const BOTH = '[F^d,]'; // constant_ABC_KI_SandK

  function muteWith(muted) {
    const kick = [KICK, FOOT, BOTH, false];
    const toms = [[], [], [], []];
    muteArrayFromClickableUI([], [], [], kick, toms, 0, (instrument, measure) =>
      muted.includes(instrument + measure)
    );
    return kick;
  }

  it('leaves the kick voice alone when neither is muted', () => {
    expect(muteWith([])).toEqual([KICK, FOOT, BOTH, false]);
  });

  it('muting the kick keeps the hi-hat foot', () => {
    expect(muteWith(['kick1'])).toEqual([false, FOOT, FOOT, false]);
  });

  it('muting the hi-hat foot keeps the kick', () => {
    expect(muteWith(['hhfoot1'])).toEqual([KICK, false, KICK, false]);
  });

  it('muting both silences the whole voice', () => {
    expect(muteWith(['kick1', 'hhfoot1'])).toEqual([false, false, false, false]);
  });

  it('only applies to the measure that is muted', () => {
    expect(muteWith(['kick2'])).toEqual([KICK, FOOT, BOTH, false]);
  });
});
