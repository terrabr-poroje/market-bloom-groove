-- Historical migration reconstructed from the existing production migration ledger.
-- Already applied to the original Terrabar Supabase project; do not manually reapply.
INSERT INTO public.cities (city_name, is_active)
VALUES ('کرج', true), ('تهران', true), ('شیراز', true), ('اصفهان', true),
       ('ارومیه', true), ('جیرفت', true), ('مراغه', true), ('ساری', true)
ON CONFLICT (city_name) DO UPDATE SET is_active = EXCLUDED.is_active;
