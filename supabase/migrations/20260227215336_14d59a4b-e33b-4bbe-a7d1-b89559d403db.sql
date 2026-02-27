
ALTER TABLE public.deals
  ADD COLUMN bedrooms integer,
  ADD COLUMN bathrooms numeric,
  ADD COLUMN square_footage integer,
  ADD COLUMN lot_size numeric,
  ADD COLUMN year_built integer,
  ADD COLUMN property_type text,
  ADD COLUMN last_sale_price numeric,
  ADD COLUMN last_sale_date date,
  ADD COLUMN property_photos text[],
  ADD COLUMN enrichment_data jsonb;
