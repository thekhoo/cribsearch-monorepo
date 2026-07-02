-- Extend searches with two annotation fields:
--   search_name:      nullable text label the user can set after results return.
--   property_details: jsonb bag holding { price?: { amount?, currency?, period? },
--                     description?, listingUrl? }.
--                     NOTE: there is no separate listing_url column — the URL lives
--                     inside property_details.
ALTER TABLE searches
  ADD COLUMN search_name      text,
  ADD COLUMN property_details jsonb NOT NULL DEFAULT '{}';

-- Preserve any name previously stored inside the immutable request jsonb.
UPDATE searches
  SET search_name = request->>'nickname'
  WHERE request ? 'nickname' AND request->>'nickname' IS NOT NULL;
