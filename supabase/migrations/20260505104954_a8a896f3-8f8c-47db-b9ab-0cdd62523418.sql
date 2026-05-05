alter table public.team_members
  add column if not exists sort_order integer not null default 0;

update public.team_members set sort_order = 0 where original_name = '신혜영';

update public.team_members set sort_order = 0 where original_name = '김태식';
update public.team_members set sort_order = 1 where original_name = '최영환';
update public.team_members set sort_order = 2 where original_name = '박지영';
update public.team_members set sort_order = 3 where original_name = '권순호';
update public.team_members set sort_order = 4 where original_name = '정두휘';
update public.team_members set sort_order = 5 where original_name = '양숙영';

update public.team_members set sort_order = 0 where original_name = '최혜은';
update public.team_members set sort_order = 1 where original_name = '윤봄이';
update public.team_members set sort_order = 2 where original_name = '이예진';
update public.team_members set sort_order = 3 where original_name = '마희연';
update public.team_members set sort_order = 4 where original_name = '정지윤';

update public.team_members set sort_order = 0 where original_name = '정은혜';
update public.team_members set sort_order = 1 where original_name = '채선영';
update public.team_members set sort_order = 2 where original_name = '김수현';
update public.team_members set sort_order = 3 where original_name = '허유나';
update public.team_members set sort_order = 4 where original_name = '김정석';