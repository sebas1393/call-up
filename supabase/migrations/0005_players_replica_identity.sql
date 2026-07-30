-- Optional hardening for Realtime DELETE payloads on players.
-- ASK FIRST before applying (constitution schema rule).
-- Default REPLICA IDENTITY only includes primary key on DELETE `old` records,
-- so clients may not see callup_id. FULL includes all columns on old/new.
-- Client already refetches on DELETE without callup_id as a fallback.

ALTER TABLE public.players REPLICA IDENTITY FULL;
