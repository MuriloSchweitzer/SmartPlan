CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE task_context AS ENUM ('Estudo', 'Trabalho', 'Pessoal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_mode AS ENUM ('flexible', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'ongoing', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agenda_status AS ENUM ('planned', 'manual', 'ongoing', 'executed', 'cancelled', 'missed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password_hash VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_normalized UNIQUE (email),
  CONSTRAINT users_name_not_blank CHECK (length(trim(name)) >= 2)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6558E8',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_user_name_unique UNIQUE (user_id, name),
  CONSTRAINT categories_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(1000),
  context task_context NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  mode task_mode NOT NULL DEFAULT 'flexible',
  duration_minutes INTEGER NOT NULL,
  criticality SMALLINT NOT NULL,
  impact SMALLINT NOT NULL,
  fixed_start TIMESTAMPTZ,
  fixed_end TIMESTAMPTZ,
  status task_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT tasks_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT tasks_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT tasks_criticality_range CHECK (criticality BETWEEN 1 AND 5),
  CONSTRAINT tasks_impact_range CHECK (impact BETWEEN 1 AND 5),
  CONSTRAINT tasks_fixed_period CHECK (
    (mode = 'flexible' AND fixed_start IS NULL AND fixed_end IS NULL)
    OR
    (mode = 'fixed' AND fixed_start IS NOT NULL AND fixed_end IS NOT NULL AND fixed_end > fixed_start AND fixed_end <= deadline)
  )
);

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_weekday_range CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT availability_period_valid CHECK (end_time > start_time),
  CONSTRAINT availability_unique UNIQUE (user_id, weekday, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS agenda_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status agenda_status NOT NULL DEFAULT 'planned',
  manual BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT agenda_period_valid CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agenda_block_id UUID UNIQUE REFERENCES agenda_blocks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT history_period_valid CHECK (ended_at > started_at),
  CONSTRAINT history_duration_positive CHECK (duration_minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_deadline ON tasks(user_id, status, deadline);
CREATE INDEX IF NOT EXISTS idx_availability_user_weekday ON availability(user_id, weekday, start_time);
CREATE INDEX IF NOT EXISTS idx_agenda_user_start ON agenda_blocks(user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_agenda_task ON agenda_blocks(task_id);
CREATE INDEX IF NOT EXISTS idx_history_user_start ON task_history(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_task ON task_history(task_id);
