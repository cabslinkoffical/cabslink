insert into public.private_settings (key, value)
values ('admin_notification_email', 'info@cabslink.com')
on conflict (key) do update set value = excluded.value;