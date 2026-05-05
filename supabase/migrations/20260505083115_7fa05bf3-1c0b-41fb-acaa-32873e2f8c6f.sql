
-- Leaves (연차) table
CREATE TABLE public.leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_name text NOT NULL,
  department text NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('전일','오전반차','오후반차','병가')),
  leave_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leaves_date_idx ON public.leaves (leave_date);
CREATE INDEX leaves_member_idx ON public.leaves (member_name);

ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- Public access (matches existing localStorage-driven app — no auth yet)
CREATE POLICY "leaves_public_select" ON public.leaves FOR SELECT USING (true);
CREATE POLICY "leaves_public_insert" ON public.leaves FOR INSERT WITH CHECK (true);
CREATE POLICY "leaves_public_update" ON public.leaves FOR UPDATE USING (true);
CREATE POLICY "leaves_public_delete" ON public.leaves FOR DELETE USING (true);
