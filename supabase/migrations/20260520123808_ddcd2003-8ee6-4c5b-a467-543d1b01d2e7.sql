
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'mention',
  title text NOT NULL,
  body text,
  link text,
  source_type text,
  source_id uuid,
  actor uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif read own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notif insert signed-in" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (actor = auth.uid() OR actor IS NULL));

CREATE POLICY "notif update own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notif delete own or sysadmin" ON public.notifications
  FOR DELETE USING (user_id = auth.uid() OR has_role(auth.uid(), 'SYSADMIN'::app_role));
