-- Sets the Admin PIN. Put your four digits between the quotes on the next line, then run it.
-- You can change the PIN later from Admin mode.
do $$ declare pin text := 'PUT YOUR PIN HERE';
begin
  if pin !~ '^[0-9]{4}$' then raise exception 'Put your four-digit PIN between the quotes first'; end if;
  update private.admin set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf')), failed = 0, locked_until = null where id = 1;
end $$;
