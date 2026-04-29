-- Backfill approved display_description values for Amex Business Platinum
-- trackable benefits. Only sets rows where display_description is currently
-- blank or null. Adobe Credit is intentionally excluded pending data correction.

update public.benefits
set display_description = 'Statement credits for incidental fees with one qualifying airline you select.'
where benefit_code = 'amex_amex_business_platinum_airline_fee_credit'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credits toward an eligible CLEAR Plus membership.'
where benefit_code = 'amex_amex_business_platinum_clear_plus_credit'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credits for eligible U.S. purchases made directly with Dell Technologies.'
where benefit_code = 'amex_amex_business_platinum_dell_technologies_credit_tier_1'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credit after meeting the eligible Dell Technologies spend threshold.'
where benefit_code = 'amex_amex_business_platinum_dell_technologies_credit_tier_2'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credit for a Global Entry or TSA PreCheck application fee.'
where benefit_code = 'amex_amex_business_platinum_global_entry_tsa_precheck_credit'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credits for eligible purchases made directly with Hilton properties.'
where benefit_code = 'amex_amex_business_platinum_hilton_for_business_credit'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credits for prepaid Fine Hotels + Resorts or Hotel Collection bookings made through Amex Travel.'
where benefit_code = 'amex_amex_business_platinum_hotel_credit_fhr_hotel_collection'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credits for eligible purchases made directly with Indeed.'
where benefit_code = 'amex_amex_business_platinum_indeed_credit'
  and (display_description is null or btrim(display_description) = '');

update public.benefits
set display_description = 'Statement credits for eligible U.S. wireless telephone service provider purchases.'
where benefit_code = 'amex_amex_business_platinum_wireless_credit'
  and (display_description is null or btrim(display_description) = '');
