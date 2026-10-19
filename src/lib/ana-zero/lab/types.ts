export type LabTester = {
  id: string;
  name: string;
  profile: string;
  cohort: string | null;
  dailyLimit?: number;
};

export type InviteRow = {
  daily_limit: number;
  id: string;
  code: string;
  label: string;
  email: string | null;
  cohort: string | null;
  max_uses: number;
  uses: number;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export type TesterRow = {
  id: string;
  invite_id: string;
  name: string;
  email: string;
  profile: string;
  organization: string | null;
  cohort: string | null;
  consent_at: string;
  revoked_at: string | null;
  created_at: string;
  sessions: number;
};
