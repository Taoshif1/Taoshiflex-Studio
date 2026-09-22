-- Restore repository visibility only for legacy Work sources independently verified as public.
-- Private repositories remain protected by source_repository_private = true.
update public.projects
set source_repository_private = false
where github_repository_id in (1269330700, 1201838871)
  and repository_url in (
    'https://github.com/Taoshif1/RedFlint-client',
    'https://github.com/Taoshif1/JT1-Flocka'
  );
