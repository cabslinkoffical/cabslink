ALTER TABLE public.automation_rules DROP CONSTRAINT IF EXISTS automation_rules_trigger_type_check;
ALTER TABLE public.automation_rules ADD CONSTRAINT automation_rules_trigger_type_check CHECK (trigger_type IN ('after_trip','lapsed','enquiry_no_booking','before_trip','anniversary','abandoned_quote','after_cancellation','custom'));
ALTER TABLE public.automation_rules DROP CONSTRAINT IF EXISTS automation_rules_delay_days_check;
ALTER TABLE public.automation_rules ADD CONSTRAINT automation_rules_delay_days_check CHECK (delay_days BETWEEN 0 AND 730);