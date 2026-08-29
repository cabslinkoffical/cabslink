UPDATE public.site_settings
SET company_name = 'Cabslink',
    contact_email = COALESCE(contact_email, 'info@cabslink.com'),
    contact_phone = COALESCE(contact_phone, '+44 333 888 2991'),
    business_address = COALESCE(business_address, '263a Leith Walk, Edinburgh, Scotland, EH6 8NY')
WHERE id = 1;

DELETE FROM public.vehicle_classes WHERE name = 'QA TEST Vehicle Class';