-- Explicit host migration: one entitlement row and one authoritative counter.
-- Fail if access_receipts already exists; never replace another authority table.
ALTER TABLE public.access_entitlements ADD CONSTRAINT access_entitlements_bounded_count
  CHECK (max_redemptions > 0 AND redemption_count >= 0 AND redemption_count <= max_redemptions);
--> statement-breakpoint
-- Retain the existing flag as derived metadata, never as independent authority.
CREATE FUNCTION public.sync_access_entitlement_exhausted() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.exhausted := NEW.redemption_count >= NEW.max_redemptions;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER access_entitlements_sync_exhausted
BEFORE INSERT OR UPDATE OF redemption_count, max_redemptions, exhausted
ON public.access_entitlements FOR EACH ROW
EXECUTE FUNCTION public.sync_access_entitlement_exhausted();
--> statement-breakpoint
UPDATE public.access_entitlements SET exhausted = (redemption_count >= max_redemptions)
WHERE exhausted IS DISTINCT FROM (redemption_count >= max_redemptions);
--> statement-breakpoint
-- Direct column aliases are updatable. The computed revocation field is read-only.
-- Non-null epoch is a sentinel, not a claimed historical revocation timestamp.
CREATE VIEW public.access_receipts AS
SELECT jti, issuer AS iss, user_id AS sub, audience AS aud,
  intent_id, resource_id, policy_id, grant_type, max_redemptions, redemption_count,
  issued_at AS iat, not_before AS nbf, expires_at AS exp, payment_ref,
  CASE WHEN revoked THEN TIMESTAMPTZ '1970-01-01 00:00:00+00' ELSE NULL END AS revoked_at
FROM public.access_entitlements;
