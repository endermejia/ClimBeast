-- 1. Eliminar soporte legado de Stripe Connect en 'areas'
ALTER TABLE areas DROP COLUMN IF EXISTS stripe_account_id;

-- 2. Eliminar sistema de Area Packs
DROP TABLE IF EXISTS area_pack_purchases CASCADE;
DROP TABLE IF EXISTS area_pack_items CASCADE;
DROP TABLE IF EXISTS area_packs CASCADE;

-- 3. Refactorizar 'area_purchases'
ALTER TABLE area_purchases 
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS stripe_fee   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS net_amount   NUMERIC(10,2) NOT NULL DEFAULT 0.00;

UPDATE area_purchases 
SET gross_amount = amount, 
    stripe_fee = 0.00, 
    net_amount = amount 
WHERE gross_amount = 0.00 AND amount > 0;

-- 4. Crear tabla de Donaciones a Áreas
CREATE TABLE IF NOT EXISTS area_donations (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area_id           BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  gross_amount      NUMERIC(10,2) NOT NULL CHECK (gross_amount > 0),
  stripe_fee        NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (stripe_fee >= 0),
  net_amount        NUMERIC(10,2) NOT NULL CHECK (net_amount > 0),
  anonymous         BOOLEAN NOT NULL DEFAULT false,
  donor_message     TEXT,
  stripe_session_id TEXT UNIQUE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Crear Catálogo de Material Oficial
CREATE TABLE IF NOT EXISTS material_catalog (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url   TEXT,
  unit        TEXT NOT NULL DEFAULT 'ud',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Crear Solicitudes de Material de Áreas
DO \$\$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_request_status') THEN 
    CREATE TYPE material_request_status AS ENUM ('pending', 'approved', 'rejected', 'disposed', 'cancelled'); 
  END IF; 
END \$\$;

CREATE TABLE IF NOT EXISTS area_material_requests (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area_id          BIGINT NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES user_profiles(id),
  status           material_request_status NOT NULL DEFAULT 'pending',
  total_amount     NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  notes            TEXT,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by      UUID REFERENCES user_profiles(id),
  reviewed_at      TIMESTAMPTZ
);

-- 7. Crear Ítems de Solicitudes de Material
CREATE TABLE IF NOT EXISTS area_material_request_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id  BIGINT NOT NULL REFERENCES area_material_requests(id) ON DELETE CASCADE,
  material_id BIGINT NOT NULL REFERENCES material_catalog(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: material_catalog
ALTER TABLE material_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS " users_read_active_material\ ON material_catalog;
CREATE POLICY \users_read_active_material\ ON material_catalog
 FOR SELECT TO authenticated
 USING (active = true OR is_user_admin(auth.uid()));

DROP POLICY IF EXISTS \admin_manage_material\ ON material_catalog;
CREATE POLICY \admin_manage_material\ ON material_catalog
 FOR ALL TO authenticated
 USING (is_user_admin(auth.uid()))
 WITH CHECK (is_user_admin(auth.uid()));

-- RLS: area_donations
ALTER TABLE area_donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \public_read_donations\ ON area_donations;
CREATE POLICY \public_read_donations\ ON area_donations
 FOR SELECT TO authenticated
 USING (true);

DROP POLICY IF EXISTS \service_role_insert_donations\ ON area_donations;
CREATE POLICY \service_role_insert_donations\ ON area_donations
 FOR INSERT TO authenticated
 WITH CHECK (is_user_admin(auth.uid()) OR auth.uid() = user_id OR user_id IS NULL);

-- RLS: area_material_requests
ALTER TABLE area_material_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \view_material_requests\ ON area_material_requests;
CREATE POLICY \view_material_requests\ ON area_material_requests
 FOR SELECT TO authenticated
 USING (
 is_user_admin(auth.uid()) OR 
 EXISTS (
 SELECT 1 FROM area_admins 
 WHERE area_admins.area_id = area_material_requests.area_id 
 AND area_admins.user_id = auth.uid()
 )
 );

DROP POLICY IF EXISTS \area_admin_insert_material_requests\ ON area_material_requests;
CREATE POLICY \area_admin_insert_material_requests\ ON area_material_requests
 FOR INSERT TO authenticated
 WITH CHECK (
 EXISTS (
 SELECT 1 FROM area_admins 
 WHERE area_admins.area_id = area_material_requests.area_id 
 AND area_admins.user_id = auth.uid()
 )
 );

DROP POLICY IF EXISTS \admin_update_material_requests\ ON area_material_requests;
CREATE POLICY \admin_update_material_requests\ ON area_material_requests
 FOR UPDATE TO authenticated
 USING (
 is_user_admin(auth.uid()) OR 
 (
 status = 'pending' AND 
 EXISTS (
 SELECT 1 FROM area_admins 
 WHERE area_admins.area_id = area_material_requests.area_id 
 AND area_admins.user_id = auth.uid()
 )
 )
 );

-- RLS: area_material_request_items
ALTER TABLE area_material_request_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \view_request_items\ ON area_material_request_items;
CREATE POLICY \view_request_items\ ON area_material_request_items
 FOR SELECT TO authenticated
 USING (
 EXISTS (
 SELECT 1 FROM area_material_requests amr
 WHERE amr.id = area_material_request_items.request_id
 AND (
 is_user_admin(auth.uid()) OR
 EXISTS (
 SELECT 1 FROM area_admins
 WHERE area_admins.area_id = amr.area_id
 AND area_admins.user_id = auth.uid()
 )
 )
 )
 );

-- RPC: get_area_balance
CREATE OR REPLACE FUNCTION get_area_balance(p_area_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS \$\$
DECLARE
 v_purchases_net NUMERIC(10,2) := 0;
 v_donations_net NUMERIC(10,2) := 0;
 v_withdrawn NUMERIC(10,2) := 0;
 v_reserved NUMERIC(10,2) := 0;
 v_available NUMERIC(10,2) := 0;
BEGIN
 SELECT COALESCE(SUM(net_amount), 0) INTO v_purchases_net
 FROM area_purchases WHERE area_id = p_area_id;

 SELECT COALESCE(SUM(net_amount), 0) INTO v_donations_net
 FROM area_donations WHERE area_id = p_area_id;

 SELECT COALESCE(SUM(total_amount), 0) INTO v_withdrawn
 FROM area_material_requests 
 WHERE area_id = p_area_id AND status IN ('approved', 'disposed');

 SELECT COALESCE(SUM(total_amount), 0) INTO v_reserved
 FROM area_material_requests 
 WHERE area_id = p_area_id AND status = 'pending';

 v_available := (v_purchases_net + v_donations_net) - (v_withdrawn + v_reserved);

 RETURN jsonb_build_object(
 'totalPurchasesNet', v_purchases_net,
 'totalDonationsNet', v_donations_net,
 'totalWithdrawn', v_withdrawn,
 'totalReserved', v_reserved,
 'availableBalance', GREATEST(v_available, 0.00)
 );
END;
\$\$;

-- RPC: create_area_material_request
CREATE OR REPLACE FUNCTION create_area_material_request(
 p_area_id BIGINT,
 p_items JSONB,
 p_notes TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS \$\$
DECLARE
 v_user_id UUID := auth.uid();
 v_is_area_admin BOOLEAN;
 v_balance JSONB;
 v_available NUMERIC(10,2);
 v_total_calc NUMERIC(10,2) := 0;
 v_req_id BIGINT;
 v_item RECORD;
 v_mat_price NUMERIC(10,2);
 v_mat_active BOOLEAN;
BEGIN
 IF v_user_id IS NULL THEN
 RAISE EXCEPTION 'Unauthorized';
 END IF;

 SELECT EXISTS (
 SELECT 1 FROM area_admins WHERE area_id = p_area_id AND user_id = v_user_id
 ) OR is_user_admin(v_user_id) INTO v_is_area_admin;

 IF NOT v_is_area_admin THEN
 RAISE EXCEPTION 'User is not an admin of this area';
 END IF;

 v_balance := get_area_balance(p_area_id);
 v_available := (v_balance->>'availableBalance')::NUMERIC;

 INSERT INTO area_material_requests (area_id, user_id, status, total_amount, notes)
 VALUES (p_area_id, v_user_id, 'pending', 0, p_notes)
 RETURNING id INTO v_req_id;

 FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(material_id BIGINT, quantity INT)
 LOOP
 SELECT price, active INTO v_mat_price, v_mat_active
 FROM material_catalog WHERE id = v_item.material_id;

 IF v_mat_price IS NULL OR NOT v_mat_active THEN
 RAISE EXCEPTION 'Invalid or inactive material item: %', v_item.material_id;
 END IF;

 IF v_item.quantity <= 0 THEN
 RAISE EXCEPTION 'Quantity must be positive';
 END IF;

 INSERT INTO area_material_request_items (request_id, material_id, quantity, unit_price)
 VALUES (v_req_id, v_item.material_id, v_item.quantity, v_mat_price);

 v_total_calc := v_total_calc + (v_mat_price * v_item.quantity);
 END LOOP;

 IF v_total_calc > v_available THEN
 RAISE EXCEPTION 'Request total (%) exceeds available balance (%)', v_total_calc, v_available;
 END IF;

 UPDATE area_material_requests 
 SET total_amount = v_total_calc 
 WHERE id = v_req_id;

 RETURN v_req_id;
END;
\$\$;

-- RPC: get_area_public_timeline
CREATE OR REPLACE FUNCTION get_area_public_timeline(p_area_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS \$\$
DECLARE
 v_result JSONB;
BEGIN
 SELECT jsonb_build_object(
 'summary', get_area_balance(p_area_id),
 'donations', (
 SELECT COALESCE(jsonb_agg(
 jsonb_build_object(
 'id', d.id,
 'amount', d.net_amount,
 'anonymous', d.anonymous,
 'userName', CASE WHEN d.anonymous THEN 'Anónimo' ELSE p.full_name END,
 'userAvatar', CASE WHEN d.anonymous THEN NULL ELSE p.avatar_url END,
 'message', d.donor_message,
 'createdAt', d.created_at
 ) ORDER BY d.created_at DESC
 ), '[]'::jsonb)
 FROM area_donations d
 LEFT JOIN user_profiles p ON p.id = d.user_id
 WHERE d.area_id = p_area_id
 ),
 'withdrawals', (
 SELECT COALESCE(jsonb_agg(
 jsonb_build_object(
 'id', r.id,
 'totalAmount', r.total_amount,
 'status', r.status,
 'createdAt', r.created_at,
 'reviewedAt', r.reviewed_at,
 'items', (
 SELECT jsonb_agg(
 jsonb_build_object(
 'materialName', m.name,
 'quantity', ri.quantity,
 'unit', m.unit,
 'unitPrice', ri.unit_price,
 'imageUrl', m.image_url
 )
 )
 FROM area_material_request_items ri
 JOIN material_catalog m ON m.id = ri.material_id
 WHERE ri.request_id = r.id
 )
 ) ORDER BY r.created_at DESC
 ), '[]'::jsonb)
 FROM area_material_requests r
 WHERE r.area_id = p_area_id AND r.status IN ('approved', 'disposed')
 )
 ) INTO v_result;

 RETURN v_result;
END;
\$\$;
