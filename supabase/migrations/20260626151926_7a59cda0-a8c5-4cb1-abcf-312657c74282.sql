
-- ============= Pricing rules =============
CREATE TABLE public.pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address text NOT NULL,
  to_address text NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  valid_from date,
  valid_to date,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;
GRANT ALL ON public.pricing_rules TO service_role;
GRANT SELECT ON public.pricing_rules TO anon;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active pricing" ON public.pricing_rules FOR SELECT USING (active = true);
CREATE POLICY "Admin full pricing" ON public.pricing_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_pricing_rules_updated BEFORE UPDATE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= Hourly rates =============
CREATE TABLE public.hourly_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  min_hours integer NOT NULL DEFAULT 1,
  max_hours integer NOT NULL DEFAULT 24,
  price_per_hour numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hourly_rates TO authenticated;
GRANT ALL ON public.hourly_rates TO service_role;
GRANT SELECT ON public.hourly_rates TO anon;
ALTER TABLE public.hourly_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active hourly" ON public.hourly_rates FOR SELECT USING (active = true);
CREATE POLICY "Admin full hourly" ON public.hourly_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_hourly_rates_updated BEFORE UPDATE ON public.hourly_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= Surcharges =============
CREATE TABLE public.surcharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  charge_type text NOT NULL DEFAULT 'fixed' CHECK (charge_type IN ('fixed','percent')),
  amount numeric(10,2) NOT NULL,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','vehicle','time_window','date_range')),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  days_of_week int[],
  time_from time,
  time_to time,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surcharges TO authenticated;
GRANT ALL ON public.surcharges TO service_role;
GRANT SELECT ON public.surcharges TO anon;
ALTER TABLE public.surcharges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active surcharges" ON public.surcharges FOR SELECT USING (active = true);
CREATE POLICY "Admin full surcharges" ON public.surcharges FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_surcharges_updated BEFORE UPDATE ON public.surcharges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= Content blocks =============
CREATE TABLE public.content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text,
  body text,
  image_url text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_blocks TO authenticated;
GRANT ALL ON public.content_blocks TO service_role;
GRANT SELECT ON public.content_blocks TO anon;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read content" ON public.content_blocks FOR SELECT USING (true);
CREATE POLICY "Admin full content" ON public.content_blocks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_content_blocks_updated BEFORE UPDATE ON public.content_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.content_blocks (key, title, body) VALUES
  ('hero_title','Hero Title','Premium Airport Transfers & Chauffeur Service'),
  ('hero_sub','Hero Subtitle','Reliable, punctual, and luxurious rides across the UK.'),
  ('about_intro','About Intro','CabsLink delivers a premium chauffeur experience for business and leisure travellers.'),
  ('footer_about','Footer About','CabsLink — your trusted partner for airport transfers, executive travel, and corporate accounts.'),
  ('contact_address','Contact Address','London, United Kingdom'),
  ('contact_phone','Contact Phone','+44 20 0000 0000'),
  ('contact_email','Contact Email','info@cabslink.com')
ON CONFLICT (key) DO NOTHING;

-- ============= Notification templates =============
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms')),
  subject text,
  body text NOT NULL,
  variables text[] DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full templates" ON public.notification_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_notification_templates_updated BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.notification_templates (key, name, channel, subject, body, variables) VALUES
  ('booking_confirmed','Booking Confirmed','email','Your booking {{booking_ref}} is confirmed','Hi {{customer_name}}, your booking from {{pickup_address}} to {{dropoff_address}} on {{pickup_date}} {{pickup_time}} is confirmed.',ARRAY['customer_name','booking_ref','pickup_address','dropoff_address','pickup_date','pickup_time']),
  ('booking_cancelled','Booking Cancelled','email','Booking {{booking_ref}} cancelled','Hi {{customer_name}}, your booking {{booking_ref}} has been cancelled.',ARRAY['customer_name','booking_ref']),
  ('driver_assigned','Driver Assigned','sms','','Your driver {{driver_name}} ({{driver_phone}}) is assigned for booking {{booking_ref}}.',ARRAY['driver_name','driver_phone','booking_ref'])
ON CONFLICT (key) DO NOTHING;

-- ============= Notification log =============
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text,
  channel text NOT NULL,
  recipient text NOT NULL,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','suppressed')),
  payload jsonb,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full notif log" ON public.notification_log FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= Activity logs =============
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity, entity_id);

-- ============= Activity log trigger =============
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_entity_id text;
  v_diff jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    v_email := (auth.jwt() ->> 'email');
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::text;
    v_diff := jsonb_build_object('before', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id::text;
    v_diff := jsonb_build_object('after', to_jsonb(NEW));
  ELSE
    v_entity_id := NEW.id::text;
    v_diff := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  END IF;

  INSERT INTO public.activity_logs (actor_id, actor_email, action, entity, entity_id, diff)
  VALUES (v_uid, v_email, lower(TG_OP), TG_TABLE_NAME, v_entity_id, v_diff);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER log_bookings_actions AFTER INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_vehicles_actions AFTER INSERT OR UPDATE OR DELETE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_coupons_actions AFTER INSERT OR UPDATE OR DELETE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_drivers_actions AFTER INSERT OR UPDATE OR DELETE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_addresses_actions AFTER INSERT OR UPDATE OR DELETE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_payments_actions AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_pricing_rules_actions AFTER INSERT OR UPDATE OR DELETE ON public.pricing_rules FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_hourly_rates_actions AFTER INSERT OR UPDATE OR DELETE ON public.hourly_rates FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_surcharges_actions AFTER INSERT OR UPDATE OR DELETE ON public.surcharges FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_content_blocks_actions AFTER INSERT OR UPDATE OR DELETE ON public.content_blocks FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER log_site_settings_actions AFTER UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
