import type { UserCardType } from "@/lib/constants/memento-schema";

export type WalletCardMetadataInput = {
  nickname?: string | null;
  lastFour?: string | null;
  openedDate?: string | null;
  userCardType?: UserCardType | null;
};

export type NormalizedWalletCardMetadata = {
  nickname: string | null;
  lastFour: string | null;
  openedDate: string | null;
  userCardType: UserCardType | null;
};

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOpenedDate(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("Opened must be a valid date.");
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Opened must be a valid date.");
  }

  return normalized;
}

function normalizeLastFour(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;

  if (!/^\d{1,4}$/.test(normalized)) {
    throw new Error("Last Four must be up to 4 digits.");
  }

  return normalized;
}

function normalizeUserCardType(value: UserCardType | null | "" | undefined): UserCardType | null {
  if (!value) return null;
  if (value !== "personal" && value !== "business") {
    throw new Error("Card type must be personal or business.");
  }

  return value;
}

export function normalizeWalletCardMetadata(input: WalletCardMetadataInput): NormalizedWalletCardMetadata {
  return {
    nickname: normalizeOptionalText(input.nickname),
    lastFour: normalizeLastFour(input.lastFour),
    openedDate: normalizeOpenedDate(input.openedDate),
    userCardType: normalizeUserCardType(input.userCardType),
  };
}
