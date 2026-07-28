-- Call Up initial schema (PostgreSQL / Supabase)
-- DRAFT — do not apply until human approval (see docs/schema-approval.md).
-- Source: plan.md §4, spec.md §4 / §10 / §11.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- users (id mirrors auth.users.id)
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL CHECK (char_length(name) <= 100),
  phone text NULL CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),
  user_name text NULL UNIQUE CHECK (
    user_name IS NULL OR user_name ~ '^[a-z0-9-]{5,10}$'
  ),
  avatar_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_user_name_idx ON public.users (user_name)
  WHERE user_name IS NOT NULL;

-- user_name immutable once set (API also enforces)
CREATE OR REPLACE FUNCTION public.prevent_user_name_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.user_name IS NOT NULL AND NEW.user_name IS DISTINCT FROM OLD.user_name THEN
    RAISE EXCEPTION 'user_name is immutable once set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_user_name_immutable
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.prevent_user_name_change();

-- ---------------------------------------------------------------------------
-- courts (before callups FK)
-- ---------------------------------------------------------------------------
CREATE TABLE public.courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.users (id),
  name text NOT NULL UNIQUE CHECK (char_length(name) <= 100),
  address text NOT NULL CHECK (char_length(address) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX courts_created_by_idx ON public.courts (created_by);

-- ---------------------------------------------------------------------------
-- callup_channels (public /{userName} resolution — no users SELECT for anon)
-- ---------------------------------------------------------------------------
CREATE TABLE public.callup_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  link text NOT NULL UNIQUE,
  user_name text NOT NULL UNIQUE CHECK (user_name ~ '^[a-z0-9-]{5,10}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX callup_channels_user_name_idx ON public.callup_channels (user_name);

-- ---------------------------------------------------------------------------
-- caller_courts (link on select)
-- ---------------------------------------------------------------------------
CREATE TABLE public.caller_courts (
  caller_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  court_id uuid NOT NULL REFERENCES public.courts (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (caller_user_id, court_id)
);

-- ---------------------------------------------------------------------------
-- callups
-- ---------------------------------------------------------------------------
CREATE TABLE public.callups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller uuid NOT NULL REFERENCES public.users (id),
  court_id uuid NOT NULL REFERENCES public.courts (id),
  court_type text NOT NULL CHECK (court_type IN ('F5', 'F6')),
  match_at timestamptz NOT NULL,
  spots_quantity int NOT NULL CHECK (spots_quantity BETWEEN 1 AND 30),
  wait_list boolean NOT NULL,
  wait_list_threshold int NOT NULL CHECK (wait_list_threshold >= 0),
  payment_key text NOT NULL CHECK (
    char_length(payment_key) <= 50
    AND payment_key !~ '[[:space:]]'
  ),
  status text NOT NULL CHECK (status IN ('Open', 'Full', 'Closed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX callups_caller_created_at_idx ON public.callups (caller, created_at DESC);
CREATE INDEX callups_match_at_idx ON public.callups (match_at);
CREATE INDEX callups_status_idx ON public.callups (status);

-- ---------------------------------------------------------------------------
-- players (roster / waitlist)
-- ---------------------------------------------------------------------------
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  callup_id uuid NOT NULL REFERENCES public.callups (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (char_length(name) <= 100),
  has_payment boolean NOT NULL DEFAULT false,
  user_id uuid NULL REFERENCES public.users (id),
  is_wait_list boolean NOT NULL DEFAULT false
);

CREATE INDEX players_callup_id_idx ON public.players (callup_id);
CREATE INDEX players_callup_waitlist_created_idx
  ON public.players (callup_id, is_wait_list, created_at);

-- One registered user per callup
CREATE UNIQUE INDEX players_callup_user_unique
  ON public.players (callup_id, user_id)
  WHERE user_id IS NOT NULL;

-- Guest uniqueness among guests: normalized lower + trim + collapse spaces — no accent folding
CREATE UNIQUE INDEX players_callup_guest_name_unique
  ON public.players (
    callup_id,
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
  )
  WHERE user_id IS NULL;

-- ---------------------------------------------------------------------------
-- player_subscriptions (follow channel — no self-follow)
-- ---------------------------------------------------------------------------
CREATE TABLE public.player_subscriptions (
  player_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  caller_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.callup_channels (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_user_id, caller_user_id),
  CHECK (player_user_id <> caller_user_id)
);

CREATE INDEX player_subscriptions_caller_idx
  ON public.player_subscriptions (caller_user_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions (device endpoints)
-- ---------------------------------------------------------------------------
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions (user_id);
