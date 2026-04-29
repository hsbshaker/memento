type AnniversarySignalSource = {
  reset_timing: string | null;
  notes: string | null;
};

const ANNIVERSARY_SIGNAL_PATTERN = /\b(card anniversary|account anniversary|anniversary)\b/i;
const ANNIVERSARY_NOTES_RESET_CONTEXT_PATTERN = /\b(reset|resets|renew|renews|benefit year|cardmember year|membership year)\b/i;

function normalizeText(value: string | null | undefined) {
  return value?.trim() || null;
}

export function benefitRequiresAnniversaryDate(benefit: AnniversarySignalSource) {
  // Annual cadence alone is not enough here. Many annual benefits are calendar-year based,
  // so only explicit anniversary reset language should trigger the anniversary requirement.
  const resetTiming = normalizeText(benefit.reset_timing);
  if (resetTiming && ANNIVERSARY_SIGNAL_PATTERN.test(resetTiming)) {
    return true;
  }

  const notes = normalizeText(benefit.notes);
  if (
    notes &&
    ANNIVERSARY_SIGNAL_PATTERN.test(notes) &&
    ANNIVERSARY_NOTES_RESET_CONTEXT_PATTERN.test(notes)
  ) {
    return true;
  }

  return false;
}
