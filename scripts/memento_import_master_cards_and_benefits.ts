import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

type Issuer = "amex" | "chase" | "citi" | "capital_one";
type CardType = "personal" | "business";
type CardStatus = "active" | "no_trackable_benefits" | "retired";
type BenefitCadence =
  | "monthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "multi_year"
  | "one_time"
  | "per_booking";
type TrackInMemento = "yes" | "later" | "no";
type Network = "Visa" | "Mastercard" | "Amex" | "Discover";

type RawRow = {
  row_number: number;
  card_name: string;
  benefit_name: string | null;
  benefit_value: string | null;
  cadence: string | null;
  reset_timing: string | null;
  enrollment_required: string | null;
  requires_setup: string | null;
  track_in_memento: string | null;
  source_url: string | null;
  notes: string | null;
  card_status: string | null;
  issuer: string | null;
  card_type: string | null;
  card_code: string | null;
  benefit_code: string | null;
};

type ValidationError = {
  type:
    | "missing_headers"
    | "missing_required_field"
    | "invalid_enum"
    | "invalid_boolean"
    | "conflicting_card_record"
    | "conflicting_benefit_record"
    | "duplicate_existing_benefit_code"
    | "duplicate_existing_card_code"
    | "unresolved_card"
    | "unresolved_network"
    | "active_row_missing_benefit_fields";
  message: string;
  row_numbers?: number[];
  field?: string;
  value?: string | null;
  details?: Record<string, unknown>;
};

type ValidationWarning = {
  type:
    | "derived_card_code"
    | "derived_benefit_code"
    | "derived_network"
    | "missing_source_url"
    | "offline_preview";
  message: string;
  row_numbers?: number[];
  details?: Record<string, unknown>;
};

type DuplicateCodeWarning = {
  type: "duplicate_benefit_row_skipped";
  message: string;
  row_numbers: number[];
  details?: Record<string, unknown>;
};

type RowSkipped = {
  row_number: number;
  reason:
    | "placeholder_card_without_benefit"
    | "unchanged_card"
    | "unchanged_benefit"
    | "duplicate_identical_benefit_row";
  card_code: string | null;
  benefit_code?: string | null;
};

type CardPreview = {
  card_code: string;
  issuer: Issuer;
  card_name: string;
  display_name: string;
  product_key: string;
  card_status: CardStatus;
  card_type: CardType;
  is_business: boolean;
  source_url: string | null;
  network: Network;
  source_row_numbers: number[];
};

type CardAggregate = {
  card: CardPreview;
  identityFingerprint: string;
  observedSourceUrls: Set<string>;
};

type BenefitPreview = {
  benefit_code: string;
  card_code: string;
  benefit_name: string;
  benefit_value: string;
  cadence: BenefitCadence;
  reset_timing: string;
  enrollment_required: boolean;
  requires_setup: boolean;
  track_in_memento: TrackInMemento;
  source_url: string | null;
  notes: string | null;
  benefit_hash: string;
  last_verified_at: string;
  source_row_number: number;
};

type BenefitHistoryPreview = {
  benefit_code: string;
  card_code: string;
  benefit_name: string;
  benefit_value: string;
  cadence: BenefitCadence;
  reset_timing: string;
  enrollment_required: boolean;
  requires_setup: boolean;
  track_in_memento: TrackInMemento;
  source_url: string | null;
  notes: string | null;
  benefit_hash: string;
  change_type: "created" | "updated";
  change_summary: string;
  effective_start_date: string;
  effective_end_date: null;
  verified_at: string;
  created_at: string;
  source_row_number: number;
};

type ExistingCard = {
  id: string;
  card_code: string | null;
  issuer: string | null;
  card_name: string | null;
  display_name: string | null;
  source_url: string | null;
  card_status: string | null;
  card_type?: string | null;
  is_business?: boolean | null;
  product_key?: string | null;
  network?: string | null;
};

type CardMatchStrategy = "code" | "name_match";

type ExistingBenefit = {
  id: string;
  card_id: string;
  benefit_code: string | null;
  benefit_name: string | null;
  benefit_value: string | null;
  cadence: string | null;
  reset_timing: string | null;
  enrollment_required: boolean | null;
  requires_setup: boolean | null;
  track_in_memento: string | null;
  source_url: string | null;
  notes: string | null;
  benefit_hash: string | null;
};

type CardCreatePreview = CardPreview;

type CardUpdatePreview = CardPreview & {
  existing_id: string;
  changed_fields: string[];
  match_strategy: CardMatchStrategy;
};

type BenefitCreatePreview = BenefitPreview;

type BenefitUpdatePreview = BenefitPreview & {
  existing_id: string;
  changed_fields: string[];
};

type PlanResult = {
  cardsToCreate: CardCreatePreview[];
  cardsToUpdate: CardUpdatePreview[];
  benefitsToCreate: BenefitCreatePreview[];
  benefitsToUpdate: BenefitUpdatePreview[];
  benefitHistoryToInsert: BenefitHistoryPreview[];
  rowsSkipped: RowSkipped[];
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];
  duplicateCodeWarnings: DuplicateCodeWarning[];
  databaseConnected: boolean;
};

type DatabaseContext = {
  client: Client | null;
  connected: boolean;
  cardsHaveCardType: boolean;
  existingCardsByCode: Map<string, ExistingCard>;
  existingCardsByNameKey: Map<string, ExistingCard>;
  existingBenefitsByCode: Map<string, ExistingBenefit>;
};

const REQUIRED_HEADERS = [
  "card_name",
  "benefit_name",
  "benefit_value",
  "cadence",
  "reset_timing",
  "enrollment_required",
  "requires_setup",
  "track_in_memento",
  "source_url",
  "notes",
  "card_status",
  "issuer",
  "card_type",
  "card_code",
  "benefit_code",
] as const;

const OUTPUT_FILE_NAMES = [
  "cards_to_create.json",
  "cards_to_update.json",
  "benefits_to_create.json",
  "benefits_to_update.json",
  "benefit_history_to_insert.json",
  "rows_skipped.json",
  "validation_errors.json",
  "validation_warnings.json",
  "duplicate_code_warnings.json",
  "import_summary.json",
] as const;

const DATASET_EFFECTIVE_START_DATE = "2026-01-01";
const CARD_STATUS_VALUES = new Set<CardStatus>([
  "active",
  "no_trackable_benefits",
  "retired",
]);
const CARD_TYPE_VALUES = new Set<CardType>(["personal", "business"]);
const CADENCE_VALUES = new Set<BenefitCadence>([
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "multi_year",
  "one_time",
  "per_booking",
]);
const TRACK_VALUES = new Set<TrackInMemento>(["yes", "later", "no"]);
const BOOLEAN_VALUES = new Set(["yes", "no"]);
const LEGACY_CARD_CODE_ALIASES = new Map<string, string>([
  ["amex_amex_business_platinum", "amex_business_platinum"],
  ["amex_amex_gold", "amex_gold"],
  ["amex_amex_business_gold", "amex_business_gold"],
  ["amex_amex_green", "amex_green"],
  ["amex_amex_everyday", "amex_everyday"],
  ["amex_amex_everyday_preferred", "amex_everyday_preferred"],
  ["amex_amex_platinum", "amex_platinum"],
]);

const loadLocalEnvFile = (filePath: string) => {
  if (!fsSync.existsSync(filePath)) return;

  const raw = fsSync.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadLocalEnvFile(path.resolve(process.cwd(), ".env.local"));

const normalizeHeader = (value: string) => value.trim().toLowerCase();
const normalizeText = (value?: string | null) =>
  (value ?? "").replace(/\s+/g, " ").trim();
const normalizeOptionalText = (value?: string | null) => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};
const normalizeUrl = (value?: string | null) => {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
};
const slugify = (value: string) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[™®℠]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
const getCliArgValue = (flag: string) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
};
const hasFlag = (flag: string) => process.argv.includes(flag);
const getDatabaseUrl = () =>
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL ??
  process.env.POSTGRES_URL ??
  null;

const getSupabaseUrl = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  null;

const getSupabaseServiceRoleKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

const toIssuer = (value: string | null) => {
  switch (normalizeText(value).toLowerCase()) {
    case "amex":
    case "american express":
      return "amex";
    case "chase":
      return "chase";
    case "citi":
    case "citibank":
      return "citi";
    case "capital one":
    case "capital_one":
      return "capital_one";
    default:
      return null;
  }
};

const parseCsv = async (filePath: string): Promise<ParsedCsv> => {
  const raw = await fs.readFile(filePath, "utf8");
  const rows: string[][] = [];
  let current: string[] = [];
  let buffer = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (char === "\"" && raw[i + 1] === "\"") {
      buffer += "\"";
      i += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(buffer);
      buffer = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && raw[i + 1] === "\n") {
        i += 1;
      }
      if (buffer.length > 0 || current.length > 0) {
        current.push(buffer);
        rows.push(current);
        current = [];
        buffer = "";
      }
      continue;
    }

    buffer += char;
  }

  if (buffer.length > 0 || current.length > 0) {
    current.push(buffer);
    rows.push(current);
  }

  return {
    headers: rows.shift() ?? [],
    rows,
  };
};

const assertHeaders = (headers: string[]) => {
  const normalized = headers.map(normalizeHeader);
  const missing = REQUIRED_HEADERS.filter((header) => !normalized.includes(header));

  if (missing.length > 0) {
    const error = new Error(`Missing required headers: ${missing.join(", ")}`);
    (error as Error & { validationErrors?: ValidationError[] }).validationErrors = [
      {
        type: "missing_headers",
        message: `Missing required headers: ${missing.join(", ")}`,
        details: { missing_headers: missing },
      },
    ];
    throw error;
  }

  return normalized;
};

const rowToRecord = (headers: string[], row: string[], rowNumber: number): RawRow => {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });

  return {
    row_number: rowNumber,
    card_name: normalizeText(record.card_name),
    benefit_name: normalizeOptionalText(record.benefit_name),
    benefit_value: normalizeOptionalText(record.benefit_value),
    cadence: normalizeOptionalText(record.cadence)?.toLowerCase() ?? null,
    reset_timing: normalizeOptionalText(record.reset_timing),
    enrollment_required: normalizeOptionalText(record.enrollment_required)?.toLowerCase() ?? null,
    requires_setup: normalizeOptionalText(record.requires_setup)?.toLowerCase() ?? null,
    track_in_memento: normalizeOptionalText(record.track_in_memento)?.toLowerCase() ?? null,
    source_url: normalizeUrl(record.source_url),
    notes: normalizeOptionalText(record.notes),
    card_status: normalizeOptionalText(record.card_status)?.toLowerCase() ?? null,
    issuer: normalizeOptionalText(record.issuer)?.toLowerCase() ?? null,
    card_type: normalizeOptionalText(record.card_type)?.toLowerCase() ?? null,
    card_code: normalizeOptionalText(record.card_code)?.toLowerCase() ?? null,
    benefit_code: normalizeOptionalText(record.benefit_code)?.toLowerCase() ?? null,
  };
};

const inferNetwork = ({
  issuer,
  cardName,
  cardCode,
}: {
  issuer: Issuer;
  cardName: string;
  cardCode: string;
}): Network | null => {
  const haystack = `${cardName} ${cardCode}`.toLowerCase();

  if (issuer === "amex") return "Amex";
  if (haystack.includes("discover")) return "Discover";
  if (
    haystack.includes("mastercard") ||
    haystack.includes("master card") ||
    haystack.includes("freedom flex") ||
    haystack.includes("freedom_flex") ||
    haystack.includes("ihg ")
  ) {
    return "Mastercard";
  }
  if (issuer === "chase" || haystack.includes("visa")) {
    return "Visa";
  }

  return null;
};

const buildProductKey = (issuer: Issuer, cardName: string) => `${issuer}_${slugify(cardName)}`;
const deriveCardCode = (issuer: Issuer, cardName: string) => `${issuer}_${slugify(cardName)}`;
const deriveBenefitCode = (cardCode: string, benefitName: string) =>
  `${cardCode}_${slugify(benefitName)}`;
const buildCardNameKey = (issuer: Issuer, cardName: string) =>
  `${issuer}||${normalizeText(cardName).toLowerCase()}`;

const getCardUrlPriority = (url: string) => {
  const normalized = url.toLowerCase();

  if (
    normalized.includes("/credit-cards/card/") ||
    normalized.includes("/business/credit-cards/") ||
    normalized.includes("creditcards.chase.com/")
  ) {
    return 1;
  }

  if (
    (normalized.includes("/credit-cards/") || normalized.includes("/business/")) &&
    !normalized.includes("credit-intel") &&
    !normalized.includes("prospect/terms") &&
    !normalized.includes("/benefits/") &&
    !normalized.includes("/articles/") &&
    !normalized.includes("/trends-and-insights/")
  ) {
    return 2;
  }

  if (
    normalized.includes("global.americanexpress.com/card-benefits/") ||
    normalized.includes("account.chase.com/")
  ) {
    return 3;
  }

  return 4;
};

const pickCanonicalCardSourceUrl = (urls: Iterable<string>) => {
  const values = [...urls].filter((value) => value.trim().length > 0);
  if (values.length === 0) return null;

  return values.sort((left, right) => {
    const priorityDiff = getCardUrlPriority(left) - getCardUrlPriority(right);
    if (priorityDiff !== 0) return priorityDiff;

    const lengthDiff = left.length - right.length;
    if (lengthDiff !== 0) return lengthDiff;

    return left.localeCompare(right);
  })[0] ?? null;
};

const buildBenefitHash = ({
  benefitCode,
  benefitValue,
  cadence,
  resetTiming,
  enrollmentRequired,
  requiresSetup,
  trackInMemento,
}: {
  benefitCode: string;
  benefitValue: string;
  cadence: BenefitCadence;
  resetTiming: string;
  enrollmentRequired: boolean;
  requiresSetup: boolean;
  trackInMemento: TrackInMemento;
}) =>
  sha256(
    [
      benefitCode,
      benefitValue,
      cadence,
      resetTiming,
      String(enrollmentRequired),
      String(requiresSetup),
      trackInMemento,
    ].join("|"),
  );

const valuesEqual = (left: string | null, right: string | null) => (left ?? null) === (right ?? null);
const isRecognizedLegacyCardCodeAlias = (existingCode: string | null, incomingCode: string) =>
  existingCode ? LEGACY_CARD_CODE_ALIASES.get(existingCode) === incomingCode : false;

const removeIfExists = async (filePath: string) => {
  await fs.rm(filePath, { force: true });
};

const writeJson = async (filePath: string, value: unknown) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const queryColumnExists = async (client: Client, tableName: string, columnName: string) => {
  const result = await client.query<{ exists: boolean }>(
    `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
          and column_name = $2
      ) as exists
    `,
    [tableName, columnName],
  );

  return result.rows[0]?.exists === true;
};

const createServiceRoleSupabase = (): SupabaseClient => {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, and/or SUPABASE_SERVICE_ROLE_KEY. Service-role commit mode requires both.",
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const addExistingCardToMaps = ({
  row,
  existingCardsByCode,
  existingCardsByNameKey,
  validationErrors,
}: {
  row: ExistingCard;
  existingCardsByCode: Map<string, ExistingCard>;
  existingCardsByNameKey: Map<string, ExistingCard>;
  validationErrors: ValidationError[];
}) => {
  const issuer = toIssuer(row.issuer ?? null);
  const cardName = normalizeOptionalText(row.card_name);
  const cardCode = normalizeOptionalText(row.card_code)?.toLowerCase();

  if (cardCode) {
    if (existingCardsByCode.has(cardCode)) {
      validationErrors.push({
        type: "duplicate_existing_card_code",
        message: `Existing database contains duplicate card_code "${cardCode}".`,
        details: { card_code: cardCode },
      });
    } else {
      existingCardsByCode.set(cardCode, row);
    }
  }

  if (issuer && cardName) {
    const nameKey = buildCardNameKey(issuer, cardName);
    if (!existingCardsByNameKey.has(nameKey)) {
      existingCardsByNameKey.set(nameKey, row);
    }
  }
};

const loadDatabaseContext = async (
  cardCodes: string[],
  benefitCodes: string[],
  cardsByName: Array<{ issuer: Issuer; card_name: string }>,
  validationErrors: ValidationError[],
): Promise<DatabaseContext> => {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();
    if (!supabaseUrl || !serviceRoleKey) {
      return {
        client: null,
        connected: false,
        cardsHaveCardType: false,
        existingCardsByCode: new Map(),
        existingCardsByNameKey: new Map(),
        existingBenefitsByCode: new Map(),
      };
    }

    const supabase = createServiceRoleSupabase();
    const existingCardsByCode = new Map<string, ExistingCard>();
    const existingCardsByNameKey = new Map<string, ExistingCard>();
    const existingBenefitsByCode = new Map<string, ExistingBenefit>();

    const { data: cardsRows, error: cardsError } = await supabase
      .from("cards")
      .select("id, card_code, issuer, card_name, display_name, source_url, card_status, card_type, is_business, product_key, network");

    if (cardsError) {
      throw new Error(`Failed to load existing cards: ${cardsError.message}`);
    }

    for (const row of (cardsRows ?? []) as ExistingCard[]) {
      addExistingCardToMaps({
        row,
        existingCardsByCode,
        existingCardsByNameKey,
        validationErrors,
      });
    }

    if (benefitCodes.length > 0) {
      const { data: benefitsRows, error: benefitsError } = await supabase
        .from("benefits")
        .select("id, card_id, benefit_code, benefit_name, benefit_value, cadence, reset_timing, enrollment_required, requires_setup, track_in_memento, source_url, notes, benefit_hash")
        .in("benefit_code", benefitCodes);

      if (benefitsError) {
        throw new Error(`Failed to load existing benefits: ${benefitsError.message}`);
      }

      for (const row of (benefitsRows ?? []) as ExistingBenefit[]) {
        const benefitCode = normalizeOptionalText(row.benefit_code)?.toLowerCase();
        if (!benefitCode) continue;
        if (existingBenefitsByCode.has(benefitCode)) {
          validationErrors.push({
            type: "duplicate_existing_benefit_code",
            message: `Existing database contains duplicate benefit_code "${benefitCode}".`,
            details: { benefit_code: benefitCode },
          });
          continue;
        }
        existingBenefitsByCode.set(benefitCode, row);
      }
    }

    return {
      client: null,
      connected: true,
      cardsHaveCardType: true,
      existingCardsByCode,
      existingCardsByNameKey,
      existingBenefitsByCode,
    };
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const cardsHaveCardType = await queryColumnExists(client, "cards", "card_type");

  const existingCardsByCode = new Map<string, ExistingCard>();
  const existingCardsByNameKey = new Map<string, ExistingCard>();
  if (cardCodes.length > 0 || cardsByName.length > 0) {
    const cardsResult = await client.query<ExistingCard>(
      `
        select
          id,
          card_code,
          issuer::text as issuer,
          card_name,
          display_name,
          source_url,
          card_status::text as card_status,
          ${cardsHaveCardType ? "card_type," : "null::text as card_type,"}
          is_business,
          product_key,
          network
        from public.cards
        where (
          card_code = any($1::text[])
          or (
            issuer is not null
            and lower(trim(card_name)) = any($2::text[])
          )
        )
      `,
      [cardCodes.length > 0 ? cardCodes : [""], cardsByName.map((card) => normalizeText(card.card_name).toLowerCase())],
    );

    for (const row of cardsResult.rows) {
      addExistingCardToMaps({
        row,
        existingCardsByCode,
        existingCardsByNameKey,
        validationErrors,
      });
    }
  }

  const existingBenefitsByCode = new Map<string, ExistingBenefit>();
  if (benefitCodes.length > 0) {
    const benefitsResult = await client.query<ExistingBenefit>(
      `
        select
          id,
          card_id,
          benefit_code,
          benefit_name,
          benefit_value,
          cadence::text as cadence,
          reset_timing,
          enrollment_required,
          requires_setup,
          track_in_memento::text as track_in_memento,
          source_url,
          notes,
          benefit_hash
        from public.benefits
        where benefit_code = any($1::text[])
      `,
      [benefitCodes],
    );

    for (const row of benefitsResult.rows) {
      const benefitCode = normalizeOptionalText(row.benefit_code)?.toLowerCase();
      if (!benefitCode) continue;
      if (existingBenefitsByCode.has(benefitCode)) {
        validationErrors.push({
          type: "duplicate_existing_benefit_code",
          message: `Existing database contains duplicate benefit_code "${benefitCode}".`,
          details: { benefit_code: benefitCode },
        });
        continue;
      }
      existingBenefitsByCode.set(benefitCode, row);
    }
  }

  return {
    client,
    connected: true,
    cardsHaveCardType,
    existingCardsByCode,
    existingCardsByNameKey,
    existingBenefitsByCode,
  };
};

const buildPlan = async ({
  rows,
  importRunAt,
}: {
  rows: RawRow[];
  importRunAt: string;
}): Promise<PlanResult> => {
  const validationErrors: ValidationError[] = [];
  const validationWarnings: ValidationWarning[] = [];
  const duplicateCodeWarnings: DuplicateCodeWarning[] = [];
  const rowsSkipped: RowSkipped[] = [];
  const cardsByCode = new Map<string, CardAggregate>();
  const benefitsByCode = new Map<
    string,
    {
      benefit: BenefitPreview;
      benefitFingerprint: string;
    }
  >();

  for (const row of rows) {
    if (!row.card_name) {
      validationErrors.push({
        type: "missing_required_field",
        message: "Missing required field card_name.",
        row_numbers: [row.row_number],
        field: "card_name",
      });
    }

    const issuer = toIssuer(row.issuer);
    if (!issuer) {
      validationErrors.push({
        type: "invalid_enum",
        message: `Invalid issuer "${row.issuer}".`,
        row_numbers: [row.row_number],
        field: "issuer",
        value: row.issuer,
      });
      continue;
    }

    const cardType = normalizeOptionalText(row.card_type)?.toLowerCase() as CardType | null;
    if (!cardType || !CARD_TYPE_VALUES.has(cardType)) {
      validationErrors.push({
        type: "invalid_enum",
        message: `Invalid card_type "${row.card_type}".`,
        row_numbers: [row.row_number],
        field: "card_type",
        value: row.card_type,
      });
      continue;
    }

    const cardStatus = normalizeOptionalText(row.card_status)?.toLowerCase() as CardStatus | null;
    if (!cardStatus || !CARD_STATUS_VALUES.has(cardStatus)) {
      validationErrors.push({
        type: "invalid_enum",
        message: `Invalid card_status "${row.card_status}".`,
        row_numbers: [row.row_number],
        field: "card_status",
        value: row.card_status,
      });
      continue;
    }

    let cardCode = row.card_code;
    if (!cardCode) {
      cardCode = deriveCardCode(issuer, row.card_name);
      validationWarnings.push({
        type: "derived_card_code",
        message: `Derived card_code "${cardCode}" because the CSV value was missing.`,
        row_numbers: [row.row_number],
        details: { card_name: row.card_name, issuer, card_code: cardCode },
      });
    }

    const network = inferNetwork({ issuer, cardName: row.card_name, cardCode });
    if (!network) {
      validationErrors.push({
        type: "unresolved_network",
        message: `Could not infer network for card_code "${cardCode}".`,
        row_numbers: [row.row_number],
        details: { issuer, card_name: row.card_name, card_code: cardCode },
      });
      continue;
    }
    if (!row.source_url) {
      validationWarnings.push({
        type: "missing_source_url",
        message: `Card row for "${cardCode}" does not include a source_url.`,
        row_numbers: [row.row_number],
        details: { card_code: cardCode },
      });
    }

    const cardPreview: CardPreview = {
      card_code: cardCode,
      issuer,
      card_name: row.card_name,
      display_name: row.card_name,
      product_key: buildProductKey(issuer, row.card_name),
      card_status: cardStatus,
      card_type: cardType,
      is_business: cardType === "business",
      source_url: row.source_url,
      network,
      source_row_numbers: [row.row_number],
    };

    const identityFingerprint = JSON.stringify({
      issuer: cardPreview.issuer,
      card_name: cardPreview.card_name,
      card_status: cardPreview.card_status,
      card_type: cardPreview.card_type,
    });

    const existingCard = cardsByCode.get(cardCode);
    if (existingCard) {
      existingCard.card.source_row_numbers.push(row.row_number);
      if (row.source_url) {
        existingCard.observedSourceUrls.add(row.source_url);
      }
      if (existingCard.identityFingerprint !== identityFingerprint) {
        validationErrors.push({
          type: "conflicting_card_record",
          message: `Conflicting card metadata for card_code "${cardCode}".`,
          row_numbers: existingCard.card.source_row_numbers,
          details: { card_code: cardCode },
        });
      }
    } else {
      cardsByCode.set(cardCode, {
        card: cardPreview,
        identityFingerprint,
        observedSourceUrls: new Set(row.source_url ? [row.source_url] : []),
      });
    }

    if (cardStatus === "no_trackable_benefits" && !row.benefit_name) {
      rowsSkipped.push({
        row_number: row.row_number,
        reason: "placeholder_card_without_benefit",
        card_code: cardCode,
        benefit_code: row.benefit_code,
      });
      continue;
    }

    const activeMissingFields: Array<keyof RawRow> = [];
    if (!row.benefit_name) activeMissingFields.push("benefit_name");
    if (!row.benefit_value) activeMissingFields.push("benefit_value");
    if (!row.cadence) activeMissingFields.push("cadence");
    if (!row.reset_timing) activeMissingFields.push("reset_timing");
    if (!row.enrollment_required) activeMissingFields.push("enrollment_required");
    if (!row.requires_setup) activeMissingFields.push("requires_setup");
    if (!row.track_in_memento) activeMissingFields.push("track_in_memento");

    if (activeMissingFields.length > 0) {
      validationErrors.push({
        type: "active_row_missing_benefit_fields",
        message: `Active benefit row is missing required benefit fields: ${activeMissingFields.join(", ")}.`,
        row_numbers: [row.row_number],
        details: { missing_fields: activeMissingFields, card_code: cardCode },
      });
      continue;
    }

    const cadence = row.cadence as BenefitCadence;
    if (!CADENCE_VALUES.has(cadence)) {
      validationErrors.push({
        type: "invalid_enum",
        message: `Invalid cadence "${row.cadence}".`,
        row_numbers: [row.row_number],
        field: "cadence",
        value: row.cadence,
      });
      continue;
    }

    const trackInMemento = row.track_in_memento as TrackInMemento;
    if (!TRACK_VALUES.has(trackInMemento)) {
      validationErrors.push({
        type: "invalid_enum",
        message: `Invalid track_in_memento "${row.track_in_memento}".`,
        row_numbers: [row.row_number],
        field: "track_in_memento",
        value: row.track_in_memento,
      });
      continue;
    }

    if (!BOOLEAN_VALUES.has(row.enrollment_required)) {
      validationErrors.push({
        type: "invalid_boolean",
        message: `Invalid enrollment_required "${row.enrollment_required}". Expected yes or no.`,
        row_numbers: [row.row_number],
        field: "enrollment_required",
        value: row.enrollment_required,
      });
      continue;
    }

    if (!BOOLEAN_VALUES.has(row.requires_setup)) {
      validationErrors.push({
        type: "invalid_boolean",
        message: `Invalid requires_setup "${row.requires_setup}". Expected yes or no.`,
        row_numbers: [row.row_number],
        field: "requires_setup",
        value: row.requires_setup,
      });
      continue;
    }

    let benefitCode = row.benefit_code;
    if (!benefitCode) {
      benefitCode = deriveBenefitCode(cardCode, row.benefit_name);
      validationWarnings.push({
        type: "derived_benefit_code",
        message: `Derived benefit_code "${benefitCode}" because the CSV value was missing.`,
        row_numbers: [row.row_number],
        details: { benefit_name: row.benefit_name, card_code: cardCode, benefit_code: benefitCode },
      });
    }

    const enrollmentRequired = row.enrollment_required === "yes";
    const requiresSetup = row.requires_setup === "yes";
    const benefitHash = buildBenefitHash({
      benefitCode,
      benefitValue: row.benefit_value,
      cadence,
      resetTiming: row.reset_timing,
      enrollmentRequired,
      requiresSetup,
      trackInMemento,
    });

    const benefitPreview: BenefitPreview = {
      benefit_code: benefitCode,
      card_code: cardCode,
      benefit_name: row.benefit_name,
      benefit_value: row.benefit_value,
      cadence,
      reset_timing: row.reset_timing,
      enrollment_required: enrollmentRequired,
      requires_setup: requiresSetup,
      track_in_memento: trackInMemento,
      source_url: row.source_url,
      notes: row.notes,
      benefit_hash: benefitHash,
      last_verified_at: importRunAt,
      source_row_number: row.row_number,
    };

    const benefitFingerprint = JSON.stringify({
      card_code: benefitPreview.card_code,
      benefit_name: benefitPreview.benefit_name,
      benefit_value: benefitPreview.benefit_value,
      cadence: benefitPreview.cadence,
      reset_timing: benefitPreview.reset_timing,
      enrollment_required: benefitPreview.enrollment_required,
      requires_setup: benefitPreview.requires_setup,
      track_in_memento: benefitPreview.track_in_memento,
      source_url: benefitPreview.source_url,
      notes: benefitPreview.notes,
      benefit_hash: benefitPreview.benefit_hash,
    });

    const existingBenefitEntry = benefitsByCode.get(benefitCode);
    if (existingBenefitEntry) {
      if (existingBenefitEntry.benefitFingerprint === benefitFingerprint) {
        duplicateCodeWarnings.push({
          type: "duplicate_benefit_row_skipped",
          message: `Skipped duplicate identical benefit row for benefit_code "${benefitCode}".`,
          row_numbers: [existingBenefitEntry.benefit.source_row_number, row.row_number],
          details: { benefit_code: benefitCode, card_code: cardCode },
        });
        rowsSkipped.push({
          row_number: row.row_number,
          reason: "duplicate_identical_benefit_row",
          card_code: cardCode,
          benefit_code: benefitCode,
        });
      } else {
        validationErrors.push({
          type: "conflicting_benefit_record",
          message: `Conflicting benefit metadata for benefit_code "${benefitCode}".`,
          row_numbers: [existingBenefitEntry.benefit.source_row_number, row.row_number],
          details: { benefit_code: benefitCode, card_code: cardCode },
        });
      }
      continue;
    }

    benefitsByCode.set(benefitCode, {
      benefit: benefitPreview,
      benefitFingerprint,
    });
  }

  const cardCodes = [...cardsByCode.keys()];
  const cardsByName = [...cardsByCode.values()].map(({ card }) => ({
    issuer: card.issuer,
    card_name: card.card_name,
  }));
  const benefitCodes = [...benefitsByCode.keys()];
  let databaseContext: DatabaseContext | null = null;

  try {
    databaseContext = await loadDatabaseContext(cardCodes, benefitCodes, cardsByName, validationErrors);
  } catch (error) {
    validationWarnings.push({
      type: "offline_preview",
      message:
        error instanceof Error
          ? `Proceeding without database diff because the database could not be reached: ${error.message}`
          : "Proceeding without database diff because the database could not be reached.",
    });
    databaseContext = {
      client: null,
      connected: false,
      cardsHaveCardType: false,
      existingCardsByCode: new Map(),
      existingCardsByNameKey: new Map(),
      existingBenefitsByCode: new Map(),
    };
  }

  for (const [cardCode, aggregate] of cardsByCode) {
    const canonicalSourceUrl = pickCanonicalCardSourceUrl(aggregate.observedSourceUrls);
    aggregate.card.source_url = canonicalSourceUrl;

    validationWarnings.push({
      type: "derived_network",
      message: `Derived network "${aggregate.card.network}" for card_code "${cardCode}" from issuer/card naming.`,
      row_numbers: aggregate.card.source_row_numbers,
      details: {
        issuer: aggregate.card.issuer,
        card_name: aggregate.card.card_name,
        card_code: cardCode,
        network: aggregate.card.network,
      },
    });
  }

  const cardsToCreate: CardCreatePreview[] = [];
  const cardsToUpdate: CardUpdatePreview[] = [];
  const benefitsToCreate: BenefitCreatePreview[] = [];
  const benefitsToUpdate: BenefitUpdatePreview[] = [];
  const benefitHistoryToInsert: BenefitHistoryPreview[] = [];
  const resolvedExistingCardsByIncomingCode = new Map<string, ExistingCard>();

  for (const [cardCode, { card }] of cardsByCode) {
    const existingCardByCode = databaseContext.existingCardsByCode.get(cardCode);
    const existingCardByName = databaseContext.existingCardsByNameKey.get(
      buildCardNameKey(card.issuer, card.card_name),
    );

    let existingCard: ExistingCard | undefined = existingCardByCode;
    let matchStrategy: CardMatchStrategy = "code";

    if (!existingCard && existingCardByName) {
      const existingCode = normalizeOptionalText(existingCardByName.card_code)?.toLowerCase();
      if (existingCode && existingCode !== cardCode && !isRecognizedLegacyCardCodeAlias(existingCode, cardCode)) {
        validationErrors.push({
          type: "conflicting_card_record",
          message: `Existing card matched by issuer + card_name has conflicting card_code "${existingCode}" for incoming "${cardCode}".`,
          row_numbers: card.source_row_numbers,
          details: {
            existing_id: existingCardByName.id,
            existing_card_code: existingCode,
            incoming_card_code: cardCode,
            issuer: card.issuer,
            card_name: card.card_name,
          },
        });
        continue;
      }

      existingCard = existingCardByName;
      matchStrategy = "name_match";
    }

    if (!existingCard) {
      cardsToCreate.push(card);
      continue;
    }

    resolvedExistingCardsByIncomingCode.set(cardCode, existingCard);

    const changedFields: string[] = [];
    if (matchStrategy === "name_match" && !valuesEqual(normalizeOptionalText(existingCard.card_code)?.toLowerCase() ?? null, card.card_code)) {
      changedFields.push("card_code");
    }
    if (!valuesEqual(existingCard.issuer?.toLowerCase() ?? null, card.issuer)) changedFields.push("issuer");
    if (!valuesEqual(existingCard.card_name, card.card_name)) changedFields.push("card_name");
    if (!valuesEqual(existingCard.display_name, card.display_name)) changedFields.push("display_name");
    if (!valuesEqual(existingCard.source_url, card.source_url)) changedFields.push("source_url");
    if (!valuesEqual(existingCard.card_status?.toLowerCase() ?? null, card.card_status)) changedFields.push("card_status");
    if (databaseContext.cardsHaveCardType && !valuesEqual(existingCard.card_type ?? null, card.card_type)) changedFields.push("card_type");
    if ((existingCard.is_business ?? null) !== card.is_business) changedFields.push("is_business");
    if (!valuesEqual(existingCard.product_key ?? null, card.product_key)) changedFields.push("product_key");
    if (!valuesEqual(existingCard.network ?? null, card.network)) changedFields.push("network");

    if (changedFields.length === 0) {
      rowsSkipped.push({
        row_number: card.source_row_numbers[0] ?? 0,
        reason: "unchanged_card",
        card_code: cardCode,
      });
      continue;
    }

    cardsToUpdate.push({
      ...card,
      existing_id: existingCard.id,
      changed_fields: changedFields,
      match_strategy: matchStrategy,
    });
  }

  for (const [benefitCode, { benefit }] of benefitsByCode) {
    const existingBenefit = databaseContext.existingBenefitsByCode.get(benefitCode);
    const existingCard = resolvedExistingCardsByIncomingCode.get(benefit.card_code)
      ?? databaseContext.existingCardsByCode.get(benefit.card_code)
      ?? databaseContext.existingCardsByNameKey.get(
        buildCardNameKey(
          cardsByCode.get(benefit.card_code)?.card.issuer ?? "amex",
          cardsByCode.get(benefit.card_code)?.card.card_name ?? "",
        ),
      );
    const cardPlannedForCreate = cardsToCreate.find((card) => card.card_code === benefit.card_code);
    const resolvedExistingCardId = existingCard?.id ?? null;

    if (!existingBenefit) {
      if (!resolvedExistingCardId && !cardPlannedForCreate) {
        validationErrors.push({
          type: "unresolved_card",
          message: `Benefit row could not resolve an existing or planned card for card_code "${benefit.card_code}".`,
          row_numbers: [benefit.source_row_number],
          details: { card_code: benefit.card_code, benefit_code: benefit.benefit_code },
        });
        continue;
      }

      benefitsToCreate.push(benefit);
      benefitHistoryToInsert.push({
        benefit_code: benefit.benefit_code,
        card_code: benefit.card_code,
        benefit_name: benefit.benefit_name,
        benefit_value: benefit.benefit_value,
        cadence: benefit.cadence,
        reset_timing: benefit.reset_timing,
        enrollment_required: benefit.enrollment_required,
        requires_setup: benefit.requires_setup,
        track_in_memento: benefit.track_in_memento,
        source_url: benefit.source_url,
        notes: benefit.notes,
        benefit_hash: benefit.benefit_hash,
        change_type: "created",
        change_summary: "Initial import snapshot",
        effective_start_date: DATASET_EFFECTIVE_START_DATE,
        effective_end_date: null,
        verified_at: importRunAt,
        created_at: importRunAt,
        source_row_number: benefit.source_row_number,
      });
      continue;
    }

    if (existingCard && existingBenefit.card_id !== existingCard.id) {
      validationErrors.push({
        type: "conflicting_benefit_record",
        message: `Existing benefit_code "${benefitCode}" is attached to a different card than "${benefit.card_code}".`,
        row_numbers: [benefit.source_row_number],
        details: {
          benefit_code: benefitCode,
          incoming_card_code: benefit.card_code,
          existing_card_id: existingBenefit.card_id,
          resolved_card_id: existingCard.id,
        },
      });
      continue;
    }

    const changedFields: string[] = [];
    if (!valuesEqual(existingBenefit.benefit_name, benefit.benefit_name)) changedFields.push("benefit_name");
    if (!valuesEqual(existingBenefit.benefit_value, benefit.benefit_value)) changedFields.push("benefit_value");
    if (!valuesEqual(existingBenefit.cadence?.toLowerCase() ?? null, benefit.cadence)) changedFields.push("cadence");
    if (!valuesEqual(existingBenefit.reset_timing, benefit.reset_timing)) changedFields.push("reset_timing");
    if ((existingBenefit.enrollment_required ?? null) !== benefit.enrollment_required) changedFields.push("enrollment_required");
    if ((existingBenefit.requires_setup ?? null) !== benefit.requires_setup) changedFields.push("requires_setup");
    if (!valuesEqual(existingBenefit.track_in_memento?.toLowerCase() ?? null, benefit.track_in_memento)) changedFields.push("track_in_memento");
    if (!valuesEqual(existingBenefit.source_url, benefit.source_url)) changedFields.push("source_url");
    if (!valuesEqual(existingBenefit.notes, benefit.notes)) changedFields.push("notes");
    if (!valuesEqual(existingBenefit.benefit_hash, benefit.benefit_hash)) changedFields.push("benefit_hash");

    if (changedFields.length === 0) {
      rowsSkipped.push({
        row_number: benefit.source_row_number,
        reason: "unchanged_benefit",
        card_code: benefit.card_code,
        benefit_code: benefit.benefit_code,
      });
      continue;
    }

    benefitsToUpdate.push({
      ...benefit,
      existing_id: existingBenefit.id,
      changed_fields: changedFields,
    });

    benefitHistoryToInsert.push({
      benefit_code: benefit.benefit_code,
      card_code: benefit.card_code,
      benefit_name: benefit.benefit_name,
      benefit_value: benefit.benefit_value,
      cadence: benefit.cadence,
      reset_timing: benefit.reset_timing,
      enrollment_required: benefit.enrollment_required,
      requires_setup: benefit.requires_setup,
      track_in_memento: benefit.track_in_memento,
      source_url: benefit.source_url,
      notes: benefit.notes,
      benefit_hash: benefit.benefit_hash,
      change_type: "updated",
      change_summary: `Updated fields: ${changedFields.join(", ")}`,
      effective_start_date: DATASET_EFFECTIVE_START_DATE,
      effective_end_date: null,
      verified_at: importRunAt,
      created_at: importRunAt,
      source_row_number: benefit.source_row_number,
    });
  }

  await databaseContext.client?.end();

  return {
    cardsToCreate,
    cardsToUpdate,
    benefitsToCreate,
    benefitsToUpdate,
    benefitHistoryToInsert,
    rowsSkipped,
    validationErrors,
    validationWarnings,
    duplicateCodeWarnings,
    databaseConnected: databaseContext.connected,
  };
};

const commitPlan = async ({
  plan,
}: {
  plan: PlanResult;
}) => {
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    return commitPlanViaPostgres({ plan, databaseUrl });
  }

  return commitPlanViaSupabase({ plan });
};

const commitPlanViaPostgres = async ({
  plan,
  databaseUrl,
}: {
  plan: PlanResult;
  databaseUrl: string;
}) => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const cardsHaveCardType = await queryColumnExists(client, "cards", "card_type");
    if (!cardsHaveCardType) {
      throw new Error(
        'Commit mode requires the new "public.cards.card_type" column to exist. Apply the migration before importing.',
      );
    }

    await client.query("begin");
    const createdCardIds = new Map<string, string>();
    const existingCardIds = new Map<string, string>();
    for (const card of plan.cardsToUpdate) {
      existingCardIds.set(card.card_code, card.existing_id);
    }

    for (const batch of chunk(plan.cardsToCreate, 100)) {
      for (const card of batch) {
        const id = randomUUID();
        createdCardIds.set(card.card_code, id);
        await client.query(
          `
            insert into public.cards (
              id,
              issuer,
              card_name,
              display_name,
              product_key,
              network,
              is_business,
              source_url,
              card_status,
              card_code,
              card_type
            ) values ($1, $2::public.issuer_enum, $3, $4, $5, $6, $7, $8, $9::public.card_status_enum, $10, $11)
          `,
          [
            id,
            card.issuer,
            card.card_name,
            card.display_name,
            card.product_key,
            card.network,
            card.is_business,
            card.source_url,
            card.card_status,
            card.card_code,
            card.card_type,
          ],
        );
      }
    }

    for (const batch of chunk(plan.cardsToUpdate, 100)) {
      for (const card of batch) {
        await client.query(
          `
            update public.cards
            set
              issuer = $2::public.issuer_enum,
              card_name = $3,
              display_name = $4,
              product_key = $5,
              network = $6,
              is_business = $7,
              source_url = $8,
              card_status = $9::public.card_status_enum,
              card_code = $10,
              card_type = $11
            where id = $1
          `,
          [
            card.existing_id,
            card.issuer,
            card.card_name,
            card.display_name,
            card.product_key,
            card.network,
            card.is_business,
            card.source_url,
            card.card_status,
            card.card_code,
            card.card_type,
          ],
        );
      }
    }

    const cardIdByCode = new Map<string, string>();
    for (const [cardCode, id] of existingCardIds) cardIdByCode.set(cardCode, id);
    for (const [cardCode, id] of createdCardIds) cardIdByCode.set(cardCode, id);

    for (const batch of chunk(plan.benefitsToCreate, 100)) {
      for (const benefit of batch) {
        const cardId = cardIdByCode.get(benefit.card_code);
        if (!cardId) {
          throw new Error(
            `Commit mode aborted: missing card_id mapping for benefit ${benefit.benefit_code}.`,
          );
        }

        await client.query(
          `
            insert into public.benefits (
              id,
              card_id,
              benefit_key,
              display_name,
              category,
              requires_enrollment,
              benefit_code,
              benefit_name,
              benefit_value,
              cadence,
              reset_timing,
              enrollment_required,
              requires_setup,
              track_in_memento,
              source_url,
              notes,
              benefit_hash,
              last_verified_at
            ) values (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10::public.benefit_cadence_enum,
              $11,
              $12,
              $13,
              $14::public.track_in_memento_enum,
              $15,
              $16,
              $17,
              $18
            )
          `,
          [
            randomUUID(),
            cardId,
            benefit.benefit_code,
            benefit.benefit_name,
            "other",
            benefit.enrollment_required,
            benefit.benefit_code,
            benefit.benefit_name,
            benefit.benefit_value,
            benefit.cadence,
            benefit.reset_timing,
            benefit.enrollment_required,
            benefit.requires_setup,
            benefit.track_in_memento,
            benefit.source_url,
            benefit.notes,
            benefit.benefit_hash,
            benefit.last_verified_at,
          ],
        );
      }
    }

    for (const batch of chunk(plan.benefitsToUpdate, 100)) {
      for (const benefit of batch) {
        await client.query(
          `
            update public.benefits
            set
              benefit_key = $2,
              display_name = $3,
              category = $4,
              requires_enrollment = $5,
              benefit_code = $6,
              benefit_name = $7,
              benefit_value = $8,
              cadence = $9::public.benefit_cadence_enum,
              reset_timing = $10,
              enrollment_required = $11,
              requires_setup = $12,
              track_in_memento = $13::public.track_in_memento_enum,
              source_url = $14,
              notes = $15,
              benefit_hash = $16,
              last_verified_at = $17
            where id = $1
          `,
          [
            benefit.existing_id,
            benefit.benefit_code,
            benefit.benefit_name,
            "other",
            benefit.enrollment_required,
            benefit.benefit_code,
            benefit.benefit_name,
            benefit.benefit_value,
            benefit.cadence,
            benefit.reset_timing,
            benefit.enrollment_required,
            benefit.requires_setup,
            benefit.track_in_memento,
            benefit.source_url,
            benefit.notes,
            benefit.benefit_hash,
            benefit.last_verified_at,
          ],
        );
      }
    }

    if (plan.benefitHistoryToInsert.length > 0) {
      const benefitCodes = Array.from(
        new Set(plan.benefitHistoryToInsert.map((row) => row.benefit_code)),
      );
      const benefitLookup = await client.query<{
        id: string;
        card_id: string;
        benefit_code: string | null;
      }>(
        `
          select id, card_id, benefit_code
          from public.benefits
          where benefit_code = any($1::text[])
        `,
        [benefitCodes],
      );

      const benefitIdByCode = new Map<string, { id: string; card_id: string }>();
      for (const row of benefitLookup.rows) {
        const benefitCode = normalizeOptionalText(row.benefit_code)?.toLowerCase();
        if (!benefitCode) continue;
        benefitIdByCode.set(benefitCode, { id: row.id, card_id: row.card_id });
      }

      for (const batch of chunk(plan.benefitHistoryToInsert, 100)) {
        for (const row of batch) {
          const benefit = benefitIdByCode.get(row.benefit_code);
          const cardId = cardIdByCode.get(row.card_code) ?? benefit?.card_id ?? null;
          if (!benefit || !cardId) {
            throw new Error(
              `Commit mode aborted: missing foreign key mapping for history row ${row.benefit_code}.`,
            );
          }

          const existingHistory = await client.query<{ id: string }>(
            `
              select id
              from public.benefit_history
              where benefit_id = $1
                and benefit_code = $2
                and benefit_name = $3
                and benefit_value = $4
                and cadence::text = $5
                and reset_timing = $6
                and enrollment_required is not distinct from $7
                and requires_setup is not distinct from $8
                and track_in_memento::text = $9
                and source_url is not distinct from $10
                and notes is not distinct from $11
                and benefit_hash = $12
                and change_type::text = $13
              limit 1
            `,
            [
              benefit.id,
              row.benefit_code,
              row.benefit_name,
              row.benefit_value,
              row.cadence,
              row.reset_timing,
              row.enrollment_required,
              row.requires_setup,
              row.track_in_memento,
              row.source_url,
              row.notes,
              row.benefit_hash,
              row.change_type,
            ],
          );

          if (existingHistory.rows.length > 0) {
            continue;
          }

          await client.query(
            `
              insert into public.benefit_history (
                id,
                benefit_id,
                card_id,
                benefit_code,
                benefit_name,
                benefit_value,
                cadence,
                reset_timing,
                enrollment_required,
                requires_setup,
                track_in_memento,
                source_url,
                notes,
                benefit_hash,
                change_type,
                change_summary,
                effective_start_date,
                effective_end_date,
                verified_at,
                created_at
              ) values (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7::public.benefit_cadence_enum,
                $8,
                $9,
                $10,
                $11::public.track_in_memento_enum,
                $12,
                $13,
                $14,
                $15::public.benefit_change_type_enum,
                $16,
                $17,
                $18,
                $19,
                $20
              )
            `,
            [
              randomUUID(),
              benefit.id,
              cardId,
              row.benefit_code,
              row.benefit_name,
              row.benefit_value,
              row.cadence,
              row.reset_timing,
              row.enrollment_required,
              row.requires_setup,
              row.track_in_memento,
              row.source_url,
              row.notes,
              row.benefit_hash,
              row.change_type,
              row.change_summary,
              row.effective_start_date,
              row.effective_end_date,
              row.verified_at,
              row.created_at,
            ],
          );
        }
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
};

const ensureNoSupabaseError = <T>(result: { data: T | null; error: { message: string } | null }, context: string) => {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`);
  }
  return result.data;
};

const commitPlanViaSupabase = async ({
  plan,
}: {
  plan: PlanResult;
}) => {
  const supabase = createServiceRoleSupabase();
  const cardsToUpdateByCode = plan.cardsToUpdate.filter((card) => card.match_strategy === "code");
  const cardsToUpdateByNameMatch = plan.cardsToUpdate.filter(
    (card) => card.match_strategy === "name_match",
  );

  const cardCodes = Array.from(
    new Set([
      ...plan.cardsToCreate.map((card) => card.card_code),
      ...plan.cardsToUpdate.map((card) => card.card_code),
    ]),
  );
  const benefitCodes = Array.from(
    new Set([
      ...plan.benefitsToCreate.map((benefit) => benefit.benefit_code),
      ...plan.benefitsToUpdate.map((benefit) => benefit.benefit_code),
      ...plan.benefitHistoryToInsert.map((row) => row.benefit_code),
    ]),
  );

  const existingCards = cardCodes.length
    ? ensureNoSupabaseError(
        await supabase
          .from("cards")
          .select("id, card_code")
          .in("card_code", cardCodes),
        "Failed to load existing cards",
      ) ?? []
    : [];

  const cardIdByCode = new Map<string, string>();
  for (const row of existingCards) {
    const cardCode = normalizeOptionalText(row.card_code)?.toLowerCase();
    if (cardCode && row.id) {
      cardIdByCode.set(cardCode, row.id);
    }
  }

  const cardsToUpsert = [...plan.cardsToCreate, ...cardsToUpdateByCode].map((card) => ({
    card_code: card.card_code,
    issuer: card.issuer,
    card_name: card.card_name,
    display_name: card.display_name,
    product_key: card.product_key,
    network: card.network,
    is_business: card.is_business,
    source_url: card.source_url,
    card_status: card.card_status,
    card_type: card.card_type,
  }));

  if (cardsToUpsert.length > 0) {
    ensureNoSupabaseError(
      await supabase.from("cards").upsert(cardsToUpsert, { onConflict: "card_code" }).select("id, card_code"),
      "Failed to upsert cards",
    );
  }

  if (cardCodes.length > 0) {
    const refreshedCards =
      ensureNoSupabaseError(
        await supabase
          .from("cards")
          .select("id, card_code")
          .in("card_code", cardCodes),
        "Failed to reload cards after upsert",
      ) ?? [];

    for (const row of refreshedCards) {
      const cardCode = normalizeOptionalText(row.card_code)?.toLowerCase();
      if (cardCode && row.id) {
        cardIdByCode.set(cardCode, row.id);
      }
    }
  }

  for (const card of cardsToUpdateByNameMatch) {
    ensureNoSupabaseError(
      await supabase
        .from("cards")
        .update({
          card_code: card.card_code,
          issuer: card.issuer,
          card_name: card.card_name,
          display_name: card.display_name,
          product_key: card.product_key,
          network: card.network,
          is_business: card.is_business,
          source_url: card.source_url,
          card_status: card.card_status,
          card_type: card.card_type,
        })
        .eq("id", card.existing_id),
      `Failed to update card ${card.existing_id} matched by name`,
    );
    cardIdByCode.set(card.card_code, card.existing_id);
  }

  const benefitsToUpsert = [...plan.benefitsToCreate, ...plan.benefitsToUpdate].map((benefit) => {
    const cardId = cardIdByCode.get(benefit.card_code);
    if (!cardId) {
      throw new Error(`Service-role commit aborted: missing card_id mapping for benefit ${benefit.benefit_code}.`);
    }

    return {
      benefit_code: benefit.benefit_code,
      card_id: cardId,
      benefit_key: benefit.benefit_code,
      display_name: benefit.benefit_name,
      category: "other",
      requires_enrollment: benefit.enrollment_required,
      benefit_name: benefit.benefit_name,
      benefit_value: benefit.benefit_value,
      cadence: benefit.cadence,
      reset_timing: benefit.reset_timing,
      enrollment_required: benefit.enrollment_required,
      requires_setup: benefit.requires_setup,
      track_in_memento: benefit.track_in_memento,
      source_url: benefit.source_url,
      notes: benefit.notes,
      benefit_hash: benefit.benefit_hash,
      last_verified_at: benefit.last_verified_at,
    };
  });

  if (benefitsToUpsert.length > 0) {
    ensureNoSupabaseError(
      await supabase.from("benefits").upsert(benefitsToUpsert, { onConflict: "benefit_code" }),
      "Failed to upsert benefits",
    );
  }

  const existingBenefits = benefitCodes.length
    ? ensureNoSupabaseError(
        await supabase
          .from("benefits")
          .select("id, card_id, benefit_code, benefit_name, benefit_value, cadence, reset_timing, enrollment_required, requires_setup, track_in_memento, source_url, notes, benefit_hash")
          .in("benefit_code", benefitCodes),
        "Failed to load benefits after upsert",
      ) ?? []
    : [];

  const benefitByCode = new Map<string, { id: string; card_id: string; benefit_hash: string | null }>();
  for (const row of existingBenefits) {
    const benefitCode = normalizeOptionalText(row.benefit_code)?.toLowerCase();
    if (benefitCode && row.id && row.card_id) {
      benefitByCode.set(benefitCode, {
        id: row.id,
        card_id: row.card_id,
        benefit_hash: row.benefit_hash ?? null,
      });
    }
  }

  if (plan.benefitHistoryToInsert.length === 0) {
    return;
  }

  const candidateHistoryRows = plan.benefitHistoryToInsert.flatMap((row) => {
    const benefit = benefitByCode.get(row.benefit_code);
    const cardId = cardIdByCode.get(row.card_code) ?? benefit?.card_id ?? null;
    if (!benefit || !cardId) {
      throw new Error(`Service-role commit aborted: missing foreign key mapping for history row ${row.benefit_code}.`);
    }

    return {
      benefit_id: benefit.id,
      card_id: cardId,
      benefit_code: row.benefit_code,
      benefit_name: row.benefit_name,
      benefit_value: row.benefit_value,
      cadence: row.cadence,
      reset_timing: row.reset_timing,
      enrollment_required: row.enrollment_required,
      requires_setup: row.requires_setup,
      track_in_memento: row.track_in_memento,
      source_url: row.source_url,
      notes: row.notes,
      benefit_hash: row.benefit_hash,
      change_type: row.change_type,
      change_summary: row.change_summary,
      effective_start_date: row.effective_start_date,
      effective_end_date: row.effective_end_date,
      verified_at: row.verified_at,
      created_at: row.created_at,
    };
  });

  const historyBenefitIds = Array.from(new Set(candidateHistoryRows.map((row) => row.benefit_id)));
  const existingHistory = historyBenefitIds.length
    ? ensureNoSupabaseError(
        await supabase
          .from("benefit_history")
          .select("benefit_id, benefit_code, benefit_name, benefit_value, cadence, reset_timing, enrollment_required, requires_setup, track_in_memento, source_url, notes, benefit_hash, change_type")
          .in("benefit_id", historyBenefitIds),
        "Failed to load existing benefit history",
      ) ?? []
    : [];

  const historyFingerprint = (row: {
    benefit_id: string;
    benefit_code: string;
    benefit_name: string;
    benefit_value: string;
    cadence: string;
    reset_timing: string;
    enrollment_required: boolean;
    requires_setup: boolean;
    track_in_memento: string;
    source_url: string | null;
    notes: string | null;
    benefit_hash: string;
    change_type: string;
  }) =>
    JSON.stringify([
      row.benefit_id,
      row.benefit_code,
      row.benefit_name,
      row.benefit_value,
      row.cadence,
      row.reset_timing,
      row.enrollment_required,
      row.requires_setup,
      row.track_in_memento,
      row.source_url,
      row.notes,
      row.benefit_hash,
      row.change_type,
    ]);

  const existingHistoryFingerprints = new Set(existingHistory.map((row) => historyFingerprint({
    benefit_id: row.benefit_id,
    benefit_code: row.benefit_code,
    benefit_name: row.benefit_name,
    benefit_value: row.benefit_value,
    cadence: String(row.cadence),
    reset_timing: row.reset_timing,
    enrollment_required: Boolean(row.enrollment_required),
    requires_setup: Boolean(row.requires_setup),
    track_in_memento: String(row.track_in_memento),
    source_url: row.source_url ?? null,
    notes: row.notes ?? null,
    benefit_hash: row.benefit_hash,
    change_type: String(row.change_type),
  })));

  const historyRowsToInsert = candidateHistoryRows.filter(
    (row) =>
      !existingHistoryFingerprints.has(
        historyFingerprint({
          benefit_id: row.benefit_id,
          benefit_code: row.benefit_code,
          benefit_name: row.benefit_name,
          benefit_value: row.benefit_value,
          cadence: row.cadence,
          reset_timing: row.reset_timing,
          enrollment_required: row.enrollment_required,
          requires_setup: row.requires_setup,
          track_in_memento: row.track_in_memento,
          source_url: row.source_url,
          notes: row.notes,
          benefit_hash: row.benefit_hash,
          change_type: row.change_type,
        }),
      ),
  );

  if (historyRowsToInsert.length > 0) {
    ensureNoSupabaseError(
      await supabase.from("benefit_history").insert(historyRowsToInsert),
      "Failed to insert benefit history",
    );
  }
};

const main = async () => {
  const commitMode = hasFlag("--commit");
  const explicitInput = getCliArgValue("--input");
  const inputPath = path.resolve(
    process.cwd(),
    explicitInput ?? path.join("data", "imports", "master_cards_and_benefits.csv"),
  );
  const outputDir = path.resolve(process.cwd(), path.join("data", "previews", "memento"));

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all(
    OUTPUT_FILE_NAMES.map((fileName) => removeIfExists(path.join(outputDir, fileName))),
  );

  const importRunAt = new Date().toISOString();

  let rows: RawRow[] = [];

  try {
    const parsed = await parseCsv(inputPath);
    const headers = assertHeaders(parsed.headers);
    rows = parsed.rows
      .filter((row) => row.some((value) => value.trim().length > 0))
      .map((row, index) => rowToRecord(headers, row, index + 2));
  } catch (error) {
    const knownErrors =
      error instanceof Error &&
      "validationErrors" in error &&
      Array.isArray((error as Error & { validationErrors?: ValidationError[] }).validationErrors)
        ? (error as Error & { validationErrors?: ValidationError[] }).validationErrors ?? []
        : [];

    const errorsToWrite =
      knownErrors.length > 0
        ? knownErrors
        : [
            {
              type: "missing_headers",
              message: error instanceof Error ? error.message : "Failed to parse input CSV.",
            } satisfies ValidationError,
          ];

    await writeJson(path.join(outputDir, "validation_errors.json"), errorsToWrite);
    await writeJson(path.join(outputDir, "cards_to_create.json"), []);
    await writeJson(path.join(outputDir, "cards_to_update.json"), []);
    await writeJson(path.join(outputDir, "benefits_to_create.json"), []);
    await writeJson(path.join(outputDir, "benefits_to_update.json"), []);
    await writeJson(path.join(outputDir, "benefit_history_to_insert.json"), []);
    await writeJson(path.join(outputDir, "rows_skipped.json"), []);
    await writeJson(path.join(outputDir, "validation_warnings.json"), []);
    await writeJson(path.join(outputDir, "duplicate_code_warnings.json"), []);
    await writeJson(path.join(outputDir, "import_summary.json"), {
      mode: commitMode ? "commit" : "dry_run",
      status: "failed",
      input_csv: inputPath,
      output_dir: outputDir,
      import_run_at: importRunAt,
      total_rows: 0,
      cards_to_create: 0,
      cards_to_update: 0,
      cards_to_update_by_code: 0,
      cards_to_update_by_name_match: 0,
      benefits_to_create: 0,
      benefits_to_update: 0,
      benefit_history_to_insert: 0,
      rows_skipped: 0,
      validation_error_count: errorsToWrite.length,
      validation_warning_count: 0,
      duplicate_code_warning_count: 0,
    });
    throw error;
  }

  const plan = await buildPlan({ rows, importRunAt });
  const cardsToUpdateByCodeCount = plan.cardsToUpdate.filter(
    (card) => card.match_strategy === "code",
  ).length;
  const cardsToUpdateByNameMatchCount = plan.cardsToUpdate.filter(
    (card) => card.match_strategy === "name_match",
  ).length;

  await writeJson(path.join(outputDir, "cards_to_create.json"), plan.cardsToCreate);
  await writeJson(path.join(outputDir, "cards_to_update.json"), plan.cardsToUpdate);
  await writeJson(path.join(outputDir, "benefits_to_create.json"), plan.benefitsToCreate);
  await writeJson(path.join(outputDir, "benefits_to_update.json"), plan.benefitsToUpdate);
  await writeJson(
    path.join(outputDir, "benefit_history_to_insert.json"),
    plan.benefitHistoryToInsert,
  );
  await writeJson(path.join(outputDir, "rows_skipped.json"), plan.rowsSkipped);
  await writeJson(path.join(outputDir, "validation_errors.json"), plan.validationErrors);
  await writeJson(path.join(outputDir, "validation_warnings.json"), plan.validationWarnings);
  await writeJson(
    path.join(outputDir, "duplicate_code_warnings.json"),
    plan.duplicateCodeWarnings,
  );
  await writeJson(path.join(outputDir, "import_summary.json"), {
    mode: commitMode ? "commit" : "dry_run",
    status: plan.validationErrors.length > 0 ? "failed" : "ok",
    input_csv: inputPath,
    output_dir: outputDir,
    import_run_at: importRunAt,
    database_connected: plan.databaseConnected,
    total_rows: rows.length,
    cards_to_create: plan.cardsToCreate.length,
    cards_to_update: plan.cardsToUpdate.length,
    cards_to_update_by_code: cardsToUpdateByCodeCount,
    cards_to_update_by_name_match: cardsToUpdateByNameMatchCount,
    benefits_to_create: plan.benefitsToCreate.length,
    benefits_to_update: plan.benefitsToUpdate.length,
    benefit_history_to_insert: plan.benefitHistoryToInsert.length,
    rows_skipped: plan.rowsSkipped.length,
    validation_error_count: plan.validationErrors.length,
    validation_warning_count: plan.validationWarnings.length,
    duplicate_code_warning_count: plan.duplicateCodeWarnings.length,
  });

  if (plan.validationErrors.length > 0) {
    throw new Error(
      `Dry run failed with ${plan.validationErrors.length} validation error(s). See ${path.join(outputDir, "validation_errors.json")}.`,
    );
  }

  if (commitMode) {
    await commitPlan({ plan });
  }

  console.log(commitMode ? "Master import commit completed." : "Master import dry run completed.");
  console.log(`- Input CSV: ${inputPath}`);
  console.log(`- Output dir: ${outputDir}`);
  console.log(`- Cards to create: ${plan.cardsToCreate.length}`);
  console.log(`- Cards to update: ${plan.cardsToUpdate.length}`);
  console.log(`- Cards to update by code: ${cardsToUpdateByCodeCount}`);
  console.log(`- Cards to update by name match: ${cardsToUpdateByNameMatchCount}`);
  console.log(`- Benefits to create: ${plan.benefitsToCreate.length}`);
  console.log(`- Benefits to update: ${plan.benefitsToUpdate.length}`);
  console.log(`- Benefit history to insert: ${plan.benefitHistoryToInsert.length}`);
  console.log(`- Rows skipped: ${plan.rowsSkipped.length}`);
  console.log(`- Validation warnings: ${plan.validationWarnings.length}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Master import failed.");
  process.exit(1);
});
