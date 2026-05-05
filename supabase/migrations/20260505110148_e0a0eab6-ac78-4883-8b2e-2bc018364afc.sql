ALTER TABLE public.team_members ADD COLUMN role text NOT NULL DEFAULT '팀원';
UPDATE public.team_members SET role = '팀장' WHERE name = '신혜영';
UPDATE public.team_members SET role = '셀장' WHERE name IN ('김태식','최혜은','정은혜');