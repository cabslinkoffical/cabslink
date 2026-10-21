DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef('public.set_booking_status(uuid,booking_status,uuid,text,boolean)'::regprocedure) INTO def;
  def := replace(def, 'IF current_payment IN (''paid'',''partial'') THEN',
    'IF current_payment IN (''paid'',''partial'') AND NOT (_override AND _new_status = ''cancelled'') THEN');
  EXECUTE def;
END $$;