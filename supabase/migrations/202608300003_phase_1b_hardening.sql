-- Phase 1B.1: conflict-safe initial pricing catalog.
-- Admin allowlisting is intentionally checked by server-only service-role requests;
-- no public/authenticated select policy is added to admin_users.
with inserted as (
  insert into public.service_packages(slug,name,price_from,currency,description,delivery_estimate,revisions,support,category,featured,enabled,sort_order)
  values
    ('one-page-website','One-Page Website',14999,'BDT','A focused, custom landing page for a clear offer or campaign.','5–7 working days','2 rounds',null,'Website',false,true,1),
    ('business-website','Business Website',27999,'BDT','A credible, brand-aligned presence built to explain, reassure and convert.','10–12 working days','3 rounds',null,'Website',true,true,2),
    ('e-commerce-website','E-Commerce Website',49999,'BDT','A practical storefront connecting discovery, checkout and basic operations.','18–21 working days',null,null,'Commerce',false,true,3),
    ('advanced-e-commerce','Advanced E-Commerce',79999,'BDT','A custom commerce system for businesses with deeper customer and operational needs.','28 working days',null,'30-day post-launch bug and support window','Commerce',false,true,4),
    ('custom-platform','Custom Platform / Web Application',null,'BDT','Purpose-built software scoped around your users, workflows and operational reality.','Defined after discovery',null,null,'Platform',false,true,5)
  on conflict(slug) do nothing returning id,slug
), feature_seed(slug,label,sort_order) as (
  values
    ('one-page-website','One custom landing page',0),('one-page-website','Up to 6 sections',1),('one-page-website','WhatsApp or contact integration',2),('one-page-website','Basic SEO',3),('one-page-website','Responsive development',4),('one-page-website','2 revision rounds',5),
    ('business-website','Up to 5 pages',0),('business-website','Brand-aligned custom design',1),('business-website','Services or portfolio',2),('business-website','Contact or lead form',3),('business-website','Responsive development',4),('business-website','Basic SEO',5),('business-website','3 revision rounds',6),
    ('e-commerce-website','Up to 30 initial products',0),('e-commerce-website','Product and catalog experience',1),('e-commerce-website','Search and filtering',2),('e-commerce-website','Cart and checkout',3),('e-commerce-website','Payment setup where applicable',4),('e-commerce-website','Cash on delivery',5),('e-commerce-website','Basic store admin',6),
    ('advanced-e-commerce','Custom store experience',0),('advanced-e-commerce','Customer accounts',1),('advanced-e-commerce','Wishlist',2),('advanced-e-commerce','Inventory and order management',3),('advanced-e-commerce','Order-status tracking',4),('advanced-e-commerce','Product reviews',5),('advanced-e-commerce','Advanced store management',6),
    ('custom-platform','Discovery and scope definition',0),('custom-platform','Custom experience architecture',1),('custom-platform','Project-specific engineering plan',2),('custom-platform','Proposal based on verified requirements',3)
)
insert into public.package_features(package_id,label,sort_order)
select inserted.id,feature_seed.label,feature_seed.sort_order from inserted join feature_seed using(slug);

comment on table public.admin_users is 'Private Studio admin allowlist. Membership is checked only by server-side service-role code after Supabase Auth token validation.';
