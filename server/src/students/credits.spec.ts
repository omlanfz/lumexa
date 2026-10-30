import { wholeCredits } from './student-ledger.service';

// What a student sees as credits: whole classes, always rounded DOWN.
describe('wholeCredits', () => {
  it.each([
    [4.5, 4],
    [4.9, 4],
    [4.99, 4],
    [4.0, 4],
    [0.9, 0],
    [0.5, 0],
    [1, 1],
    [8, 8],
  ])('%p credits are shown as %p', (ratio, shown) => {
    expect(wholeCredits(ratio)).toBe(shown);
  });

  it('never goes below 0, however far a student is overdrawn', () => {
    expect(wholeCredits(0)).toBe(0);
    expect(wholeCredits(-0.5)).toBe(0);
    expect(wholeCredits(-3)).toBe(0);
  });

  it('is not thrown by the cent-rounding of the per-class rate (7.99999 is 8)', () => {
    expect(wholeCredits(7.99999)).toBe(8);
    expect(wholeCredits(2.9999)).toBe(3);
  });
});
