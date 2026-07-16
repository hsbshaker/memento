/**
 * Mass-change protection: a run proposing changes to an unusually high share of
 * a card's benefits (or too many proposals overall) is treated as a likely
 * parser or source failure. The orchestrator inserts NOTHING for a halted card
 * and marks the run halted.
 */

export interface MassChangeGuardInput {
  cardProposalCount: number;
  cardBenefitCount: number;
  runProposalsSoFar: number;
  limits: {
    cardChangeRatio: number;
    minTripCount: number;
    maxProposalsPerRun: number;
  };
}

export interface MassChangeGuardResult {
  halted: boolean;
  reason: string | null;
}

export function evaluateMassChangeGuard(
  input: MassChangeGuardInput,
): MassChangeGuardResult {
  const { cardProposalCount, cardBenefitCount, runProposalsSoFar, limits } = input;

  if (
    cardProposalCount >= limits.minTripCount &&
    cardBenefitCount > 0 &&
    cardProposalCount > limits.cardChangeRatio * cardBenefitCount
  ) {
    return {
      halted: true,
      reason: `card_change_ratio_exceeded: ${cardProposalCount}/${cardBenefitCount} benefits changed (limit ${limits.cardChangeRatio})`,
    };
  }

  if (runProposalsSoFar + cardProposalCount > limits.maxProposalsPerRun) {
    return {
      halted: true,
      reason: `run_proposal_limit_exceeded: ${runProposalsSoFar + cardProposalCount} > ${limits.maxProposalsPerRun}`,
    };
  }

  return { halted: false, reason: null };
}
