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

  it('is zero at zero', () => {
    expect(wholeCredits(0)).toBe(0);
  });

  it('goes negative when a student is overdrawn — it does not stop at 0', () => {
    expect(wholeCredits(-1)).toBe(-1);
    expect(wholeCredits(-2)).toBe(-2);
    expect(wholeCredits(-3)).toBe(-3);
    expect(wholeCredits(-12)).toBe(-12);
  });

  it('rounds a part-class debt to the next whole credit owed (still "down")', () => {
    expect(wholeCredits(-0.5)).toBe(-1);
    expect(wholeCredits(-1.2)).toBe(-2);
    expect(wholeCredits(-2.9)).toBe(-3);
  });

  it('is not thrown by the cent-rounding of the per-class rate (7.99999 is 8)', () => {
    expect(wholeCredits(7.99999)).toBe(8);
    expect(wholeCredits(2.9999)).toBe(3);
  });

  it('reads that same rounding noise on the debt side as the whole number, not one more', () => {
    expect(wholeCredits(-1.9999)).toBe(-2);
    expect(wholeCredits(-2.0004)).toBe(-2);
    // …and a balance a hair below zero is zero, never "-1".
    expect(wholeCredits(-0.0004)).toBe(0);
    expect(Object.is(wholeCredits(-0.0004), -0)).toBe(false);
  });
});
