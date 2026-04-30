import type { HomeDashboardState } from "@/lib/types/server-data";

export function buildHomeState({
  trackedCards,
  trackedBenefits,
  urgentBenefitCount,
  nextBenefitCount,
}: {
  trackedCards: number;
  trackedBenefits: number;
  urgentBenefitCount: number;
  nextBenefitCount: number;
}): HomeDashboardState {
  if (trackedCards === 0 || trackedBenefits === 0) {
    return {
      isEmpty: true,
      isAllCaughtUp: false,
      headline: "Add your first card to get started.",
      supportingText: "Track benefits here so Memento can tell you what to use next.",
    };
  }

  if (urgentBenefitCount > 0) {
    return {
      isEmpty: false,
      isAllCaughtUp: false,
      headline:
        urgentBenefitCount === 1
          ? "1 benefit needs attention in the next 14 days."
          : `${urgentBenefitCount} benefits need attention in the next 14 days.`,
      supportingText: "Use the soonest reset first so you don’t lose value.",
    };
  }

  if (nextBenefitCount > 0) {
    return {
      isEmpty: false,
      isAllCaughtUp: true,
      headline: "You’re all caught up.",
      supportingText: "Next up are the benefits coming later in this period.",
    };
  }

  return {
    isEmpty: false,
    isAllCaughtUp: true,
    headline: "You’re all caught up.",
    supportingText: "Nothing is waiting on you right now.",
  };
}
