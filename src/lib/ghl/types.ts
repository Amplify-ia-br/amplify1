export const GHL_API_BASE_URL = "https://services.leadconnectorhq.com";
export const GHL_API_VERSION = "v3";

export const ANA_HANDOFF_READY_TAG = "ana-handoff-ready";

export const ANA_REGION_TAGS = [
  "ana-region-nordeste",
  "ana-region-sp",
  "ana-region-df",
  "ana-region-sul",
] as const;

export type AnaRegionTag = (typeof ANA_REGION_TAGS)[number];

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type GhlConfig = {
  token: string;
  locationId: string;
  pipelineId?: string;
  pipelineStageId?: string;
  pipelineRoutes?: Record<string, {
    pipelineId: string;
    pipelineStageId: string;
  }>;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
};

export type GhlClientDependencies = {
  fetch?: FetchLike;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type GhlCustomField = {
  id?: string;
  key?: string;
  fieldValue: unknown;
};

export type GhlContactInput = {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  source?: string;
  customFields?: GhlCustomField[];
};

export type GhlContact = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  website?: string;
  city?: string;
  state?: string;
  tags?: string[];
  customFields?: Array<{
    id?: string;
    key?: string;
    value?: unknown;
    fieldValue?: unknown;
  }>;
  [key: string]: unknown;
};

export type GhlNote = {
  id: string;
  body: string;
  title?: string;
  [key: string]: unknown;
};

export type GhlOpportunity = {
  id: string;
  contactId?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
};

export type QualificationEvidence =
  | string
  | { label: string; value: string | number | boolean | null | undefined };

export type HandoffScores = {
  account?: number | null;
  /** @deprecated Compatibility alias for integrations created before account_score became canonical. */
  icp?: number | null;
  opportunity?: number | null;
  total?: number | null;
  completeness?: number | null;
};

export type AnaHandoffInput = {
  handoffId: string;
  contact: GhlContactInput;
  uf?: string;
  route: string;
  cluster?: string;
  product?: string;
  scores?: HandoffScores;
  evidence?: QualificationEvidence[] | Record<string, unknown>;
  qualificationSummary: string;
  nextAction?: string;
  opportunityName?: string;
};

export type GhlWarning = {
  code: "opportunity_config_missing" | "opportunity_config_incomplete";
  message: string;
};

export type OpportunitySyncResult =
  | { status: "created" | "updated"; opportunity: GhlOpportunity; warnings: GhlWarning[] }
  | { status: "skipped"; opportunity?: undefined; warnings: GhlWarning[] };

export type NoteSyncResult = {
  status: "created" | "existing";
  note: GhlNote;
};

export type AnaHandoffResult = {
  status: "handed_off" | "already_handed_off";
  replayed: boolean;
  contactId: string;
  opportunityId?: string;
  regionTag: AnaRegionTag | null;
  noteStatus?: NoteSyncResult["status"];
  opportunityStatus?: OpportunitySyncResult["status"];
  readyTagAdded: boolean;
  warnings: GhlWarning[];
};

export type GhlClient = {
  findContact(input: Pick<GhlContactInput, "email" | "phone">): Promise<GhlContact | undefined>;
  getContact(contactId: string): Promise<GhlContact>;
  upsertContact(input: GhlContactInput): Promise<GhlContact>;
  addTags(contactId: string, tags: string[]): Promise<string[]>;
  removeTags(contactId: string, tags: string[]): Promise<string[]>;
  reconcileRegionalTags(contactId: string, currentTags: string[], uf?: string): Promise<{
    tags: string[];
    regionTag: AnaRegionTag | null;
    added: string[];
    removed: string[];
  }>;
  listContactNotes(contactId: string): Promise<GhlNote[]>;
  createContactNote(contactId: string, body: string): Promise<GhlNote>;
  upsertOpportunity(
    contactId: string,
    name: string,
    routing?: Pick<AnaHandoffInput, "cluster" | "route">,
  ): Promise<OpportunitySyncResult>;
  handoff(input: AnaHandoffInput): Promise<AnaHandoffResult>;
};
