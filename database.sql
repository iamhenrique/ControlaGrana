
-- =====================================================
-- CONTROLAGRANA | SCHEMA DEFINITIVO
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS (PERFIS FAMILIARES)
CREATE TABLE IF NOT EXISTS usuarios (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome text NOT NULL,
    email text UNIQUE NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);

-- 2. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('REVENUE', 'EXPENSE')),
    created_at timestamp with time zone DEFAULT now()
);

-- 3. TABELA DE RECEITAS
CREATE TABLE IF NOT EXISTS revenues (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    description text NOT NULL,
    value numeric NOT NULL CHECK (value >= 0),
    date date NOT NULL,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    status text NOT NULL CHECK (status IN ('PENDING', 'PAID')),
    is_recurrent boolean DEFAULT false,
    frequency text,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. TABELA DE DESPESAS (AVULSAS E RECORRENTES)
CREATE TABLE IF NOT EXISTS expenses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    description text NOT NULL,
    value numeric NOT NULL CHECK (value >= 0),
    due_date date NOT NULL,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    payment_method text DEFAULT 'PIX',
    status text NOT NULL CHECK (status IN ('PENDING', 'PAID')),
    is_recurrent boolean DEFAULT false,
    frequency text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. TABELA DE DÉBITOS (PARCELAMENTOS)
CREATE TABLE IF NOT EXISTS debts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    description text NOT NULL,
    total_value numeric NOT NULL CHECK (total_value > 0),
    start_date date NOT NULL,
    frequency text NOT NULL,
    installments_count integer NOT NULL CHECK (installments_count > 0),
    installment_value numeric NOT NULL,
    status text NOT NULL CHECK (status IN ('ACTIVE', 'FINISHED')),
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. TABELA DE PARCELAS INDIVIDUAIS
CREATE TABLE IF NOT EXISTS installments (
    id text PRIMARY KEY,
    debt_id uuid REFERENCES debts(id) ON DELETE CASCADE,
    installment_number integer NOT NULL,
    value numeric NOT NULL,
    due_date date NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING', 'PAID')),
    created_at timestamp with time zone DEFAULT now()
);

-- 7. TABELA DE ORÇAMENTOS (METAS)
CREATE TABLE IF NOT EXISTS budgets (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    limit_value numeric NOT NULL CHECK (limit_value >= 0),
    month integer NOT NULL CHECK (month >= 0 AND month <= 11),
    year integer NOT NULL,
    UNIQUE(user_id, category_id, month, year)
);

-- SEGURANÇA: ROW LEVEL SECURITY
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO PÚBLICO (FLUXO SIMPLIFICADO)
CREATE POLICY "Public Access" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON revenues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON debts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON budgets FOR ALL USING (true) WITH CHECK (true);

-- DADOS MESTRE
INSERT INTO categories (name, type) VALUES 
('SALÁRIO', 'REVENUE'),
('BÔNUS', 'REVENUE'),
('INVESTIMENTOS', 'REVENUE'),
('ALIMENTAÇÃO', 'EXPENSE'),
('MORADIA', 'EXPENSE'),
('TRANSPORTE', 'EXPENSE'),
('LAZER', 'EXPENSE'),
('SAÚDE', 'EXPENSE'),
('EDUCAÇÃO', 'EXPENSE'),
('ASSINATURAS', 'EXPENSE'),
('OUTROS', 'EXPENSE')
ON CONFLICT DO NOTHING;
