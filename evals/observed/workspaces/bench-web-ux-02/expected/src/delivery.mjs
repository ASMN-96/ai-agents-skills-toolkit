export function accessibilityState({ contrastRatio, visibleFocus }) {
  if (!Number.isFinite(contrastRatio)) throw new TypeError("contrast ratio is required");
  return Object.freeze({ contrastPasses: contrastRatio >= 4.5, focusPasses: visibleFocus === true });
}
