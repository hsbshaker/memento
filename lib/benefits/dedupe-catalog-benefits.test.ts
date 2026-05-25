import assert from "node:assert/strict";
import test from "node:test";
import { dedupeCatalogBenefits, normalizeBenefitName } from "@/lib/benefits/dedupe-catalog-benefits";

test("normalizeBenefitName lowercases and collapses whitespace", () => {
  assert.equal(normalizeBenefitName("  CLEAR   Plus Credit "), "clear plus credit");
});

test("dedupeCatalogBenefits prefers canonical non-legacy benefit codes", () => {
  const deduped = dedupeCatalogBenefits([
    {
      id: "legacy",
      card_id: "card-1",
      benefit_name: "Airline Fee Credit",
      benefit_code: "amex_amex_platinum_airline_fee_credit",
      track_in_memento: "yes",
    },
    {
      id: "canonical",
      card_id: "card-1",
      benefit_name: "Airline Fee Credit",
      benefit_code: "amex_platinum_airline_fee_credit",
      track_in_memento: "yes",
    },
  ]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.id, "canonical");
});

test("dedupeCatalogBenefits prefers track_in_memento yes when mixed", () => {
  const deduped = dedupeCatalogBenefits([
    {
      id: "later",
      card_id: "card-1",
      benefit_name: "Hotel Credit",
      benefit_code: "amex_platinum_hotel_credit",
      track_in_memento: "later",
    },
    {
      id: "yes",
      card_id: "card-1",
      benefit_name: "Hotel Credit",
      benefit_code: "amex_platinum_hotel_credit",
      track_in_memento: "yes",
    },
  ]);

  assert.equal(deduped[0]?.id, "yes");
});

test("dedupeCatalogBenefits keeps distinct names separate", () => {
  const deduped = dedupeCatalogBenefits([
    {
      id: "one",
      card_id: "card-1",
      benefit_name: "Airline Fee Credit",
      benefit_code: "a",
      track_in_memento: "yes",
    },
    {
      id: "two",
      card_id: "card-1",
      benefit_name: "CLEAR Plus Credit",
      benefit_code: "b",
      track_in_memento: "yes",
    },
  ]);

  assert.equal(deduped.length, 2);
});
