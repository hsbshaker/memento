import assert from "node:assert/strict";
import test from "node:test";
import { dedupeUserBenefitRows } from "@/lib/benefits/dedupe-user-benefit-rows";

type Row = {
  id: string;
  user_card_id: string;
  card_id: string;
  benefit_name: string;
  benefit_code: string;
  is_active: boolean;
  tracking_status: "tracked" | "not_tracked";
  has_period_status: boolean;
  metadata_score: number;
};

function dedupe(rows: Row[]) {
  return dedupeUserBenefitRows(rows, {
    getUserCardId: (row) => row.user_card_id,
    getCardId: (row) => row.card_id,
    getBenefitName: (row) => row.benefit_name,
    getBenefitCode: (row) => row.benefit_code,
    getIsActive: (row) => row.is_active,
    getTrackingStatus: (row) => row.tracking_status,
    getHasCurrentPeriodData: (row) => row.has_period_status,
    getMetadataScore: (row) => row.metadata_score,
  });
}

test("dedupeUserBenefitRows prefers canonical non-legacy rows within a user card", () => {
  const deduped = dedupe([
    {
      id: "legacy",
      user_card_id: "uc-1",
      card_id: "c-1",
      benefit_name: "Digital Entertainment Credit",
      benefit_code: "amex_amex_platinum_digital_entertainment_credit",
      is_active: true,
      tracking_status: "tracked",
      has_period_status: false,
      metadata_score: 1,
    },
    {
      id: "canonical",
      user_card_id: "uc-1",
      card_id: "c-1",
      benefit_name: "Digital Entertainment Credit",
      benefit_code: "amex_platinum_digital_entertainment_credit",
      is_active: true,
      tracking_status: "tracked",
      has_period_status: false,
      metadata_score: 1,
    },
  ]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.id, "canonical");
});

test("dedupeUserBenefitRows prefers active tracked rows with period data", () => {
  const deduped = dedupe([
    {
      id: "inactive",
      user_card_id: "uc-1",
      card_id: "c-1",
      benefit_name: "Dining Credit",
      benefit_code: "amex_gold_dining_credit",
      is_active: false,
      tracking_status: "not_tracked",
      has_period_status: false,
      metadata_score: 4,
    },
    {
      id: "active",
      user_card_id: "uc-1",
      card_id: "c-1",
      benefit_name: "Dining Credit",
      benefit_code: "amex_gold_dining_credit",
      is_active: true,
      tracking_status: "tracked",
      has_period_status: true,
      metadata_score: 1,
    },
  ]);

  assert.equal(deduped[0]?.id, "active");
});

test("dedupeUserBenefitRows keeps the same benefit across different user cards", () => {
  const deduped = dedupe([
    {
      id: "first",
      user_card_id: "uc-1",
      card_id: "c-1",
      benefit_name: "Dining Credit",
      benefit_code: "amex_gold_dining_credit",
      is_active: true,
      tracking_status: "tracked",
      has_period_status: false,
      metadata_score: 1,
    },
    {
      id: "second",
      user_card_id: "uc-2",
      card_id: "c-1",
      benefit_name: "Dining Credit",
      benefit_code: "amex_gold_dining_credit",
      is_active: true,
      tracking_status: "tracked",
      has_period_status: false,
      metadata_score: 1,
    },
  ]);

  assert.equal(deduped.length, 2);
});
