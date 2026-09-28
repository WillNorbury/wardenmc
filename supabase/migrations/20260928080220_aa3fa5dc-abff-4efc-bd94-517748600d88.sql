ALTER TABLE public.profiles
  ADD COLUMN business_website TEXT,
  ADD COLUMN business_contact TEXT,
  ADD COLUMN business_category TEXT;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_business_website_len CHECK (business_website IS NULL OR char_length(business_website) <= 200),
  ADD CONSTRAINT profiles_business_contact_len CHECK (business_contact IS NULL OR char_length(business_contact) <= 200),
  ADD CONSTRAINT profiles_business_category_len CHECK (business_category IS NULL OR char_length(business_category) <= 60);