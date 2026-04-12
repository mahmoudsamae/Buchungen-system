-- One canonical access link per student per school; encodes teacher + student + business server-side.
CREATE TABLE IF NOT EXISTS student_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL,
  student_user_id uuid NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT student_access_tokens_token_key UNIQUE (token),
  CONSTRAINT student_access_tokens_one_per_student UNIQUE (business_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_access_tokens_lookup
  ON student_access_tokens (token)
  WHERE revoked_at IS NULL;

ALTER TABLE student_access_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE student_access_tokens IS 'Opaque tokens for /student-access/[token]; resolved only via service role in API routes.';
