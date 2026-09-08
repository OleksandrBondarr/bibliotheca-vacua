-- Enums
CREATE TYPE public.department AS ENUM ('novels','poetry','treatises','memoirs','reference','restricted');
CREATE TYPE public.book_status AS ENUM ('available','taken_forever');
CREATE TYPE public.loan_status AS ENUM ('active','returned','kept');
CREATE TYPE public.app_role AS ENUM ('admin','user');

-- Publishers
CREATE TABLE public.publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  style_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.publishers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.publishers TO authenticated;
GRANT ALL ON public.publishers TO service_role;
ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;

-- Books
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  kind text NOT NULL,
  publisher_id uuid REFERENCES public.publishers(id) ON DELETE SET NULL,
  year integer NOT NULL,
  pages integer NOT NULL,
  department public.department NOT NULL,
  spine_color text NOT NULL DEFAULT '#5a4a3a',
  status public.book_status NOT NULL DEFAULT 'available',
  review text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX books_department_idx ON public.books(department, created_at DESC);
GRANT SELECT ON public.books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE SEQUENCE public.card_number_seq START 1001;
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  card_number text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- Loans
CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  status public.loan_status NOT NULL DEFAULT 'active',
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_page integer NOT NULL DEFAULT 1,
  bookmark_page integer
);
CREATE INDEX loans_user_idx ON public.loans(user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Publishers are public" ON public.publishers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage publishers" ON public.publishers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Books are public" ON public.books FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage books" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Readers see own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Readers update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Readers manage own loans" ON public.loans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_reader()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, card_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'BV-' || lpad(nextval('public.card_number_seq')::text, 5, '0')
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_reader();

-- Seed: publishers
INSERT INTO public.publishers (id, name, city, style_note) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Hessel & Daughter', 'Tallinn', 'Severe monographs in grey cloth; footnotes longer than the text.'),
  ('a1000000-0000-0000-0000-000000000002', 'Casa Editorial Ombú', 'Montevideo', 'Novels of rigorous construction; every book has an index.'),
  ('a1000000-0000-0000-0000-000000000003', 'The Thursday Press', 'Aberdeen', 'Poetry and memoir; prints only what it cannot explain.');

-- Seed: books
INSERT INTO public.books (title, author, kind, publisher_id, year, pages, department, spine_color, review) VALUES
('The Cartography of Rooms Not Yet Entered', 'Ilse Marand', 'Novel', 'a1000000-0000-0000-0000-000000000002', 1987, 214, 'novels', '#6b3a2e',
'It is by now a commonplace to say that Marand''s third novel is less a story than a floor plan, and like most commonplaces it is half true. The book follows a surveyor, Teodor Anselm, hired to draw up the plans of a house whose owners refuse to let him inside. He measures it from the garden, from the neighbours'' windows, from the sound of footsteps overhead, and the novel is the record of his drawings, each chapter a room he has deduced but never seen. The prose is dry, exact, and lit from below.

What has kept the book in argument for nearly four decades is its refusal to let deduction fail. Anselm''s rooms are always right. The reader waits for the door to open and the plan to be humiliated, and Marand withholds this with a patience that some have called cruelty. The famous ninth chapter, in which he infers a staircase from the way a maid carries a tray, is either the finest thing she wrote or a parody of everything she believed, and the critical literature has not settled which.

There are faults. The middle section, with its long inventories of hinges, tests even admirers. The owners of the house, when at last glimpsed, are thin. But the final pages, in which Anselm draws a room that the house cannot possibly contain and then walks toward it, remain among the most quietly alarming in the language. One closes the book with the sense that one''s own house has been measured.'),

('On the Weight of Shadows Cast by Absent Objects', 'Dr. Femi Oyelaran-Bosch', 'Treatise', 'a1000000-0000-0000-0000-000000000001', 1963, 178, 'treatises', '#2f3d4a',
'Oyelaran-Bosch''s treatise appeared in the same autumn as two other books on optics and was, for a decade, the least read of the three. That it is now the only one still in print says something about the durability of an idea pursued without apology. The argument is set out in the first sentence and never retreats from it: that a shadow is a property of the ground, not of the object, and that ground remembers.

The middle chapters are the hardest and the best. The author builds a notation for what he calls residual shade, tests it against the floors of demolished churches, and arrives at a table of coefficients that has been reproduced, refuted, and reproduced again in every subsequent discussion. His prose is that of a man dictating to a patient secretary in a cold room. There are no jokes. There are, however, three footnotes of unexpected tenderness concerning his mother''s kitchen.

Detractors point, fairly, to the seventh chapter, where the method is extended to shadows cast by persons who have left a room, and the tone shifts from measurement to something closer to grief. The author does not seem to notice. Whether this is a flaw or the whole point has divided readers since the first edition, and this reviewer has changed sides more than once.'),

('Hymns for the Second Tuesday', 'Ragnhild Voss', 'Poems', 'a1000000-0000-0000-0000-000000000003', 2004, 96, 'poetry', '#7a6a2c',
'Voss writes about one day of the month and has done so for thirty years. The second Tuesday is, in her account, the only day that is neither beginning nor end, neither feast nor fast, and therefore the only day on which anything true can be said. This collection gathers the hymns she has written for it, and reading them in sequence is like watching someone set the same table over and over with slightly different cutlery.

The forms are strict and old. There are litanies, versicles, a set of twelve collects that address the weather as if it were a bishop. Voss''s ear is famous and deserves to be; the lines land like stones set by a mason who does not need to check. Yet the tone is never solemn for long. A hymn about a bus timetable modulates without warning into a prayer for a dead dog, and the join cannot be found.

The weakest poems are those in which she explains her project. The strongest do not mention Tuesday at all. Readers who come to this book expecting the consolations of the liturgy will find them, but tilted a few degrees, so that the light falls somewhere unexpected on the floor.'),

('I Was the Lighthouse Keeper''s Second Shadow', 'Anselm Tuuri', 'Memoir', 'a1000000-0000-0000-0000-000000000003', 1971, 240, 'memoirs', '#3f5a48',
'Memoirs of service are usually written by those who served. Tuuri''s is written, or claims to be, by the shadow that a lighthouse keeper cast on the north wall of the lamp room for twenty-two years, and the remarkable thing is how quickly one stops finding this strange. The voice is plain, faintly aggrieved, and attentive to the things a shadow would notice: the angle of the sun through the gallery, the keeper''s changing weight, the long winters in which there is nothing to be.

The book is, underneath its conceit, a study of one man''s loneliness observed from a position of total intimacy and total powerlessness. The keeper, never named, drinks, writes letters he does not send, and reads the same three books. The shadow records all of it and can alter none of it, and the accumulated weight of this is considerable. The chapter on the keeper''s single visitor, a customs officer who stays for a week in 1954, is as fine a piece of restrained writing as the decade produced.

Some readers find the frame precious. This reviewer did, for forty pages, and then forgot about it entirely, which may be the truest praise the book can receive. When the lamp is at last electrified and the keeper leaves, the final paragraph, in which the shadow describes being left on the wall, is not easily put down or put away.'),

('A Concise Dictionary of Sounds Heard Only Once', 'compiled by M. Ferreira Quist', 'Reference', 'a1000000-0000-0000-0000-000000000001', 1996, 312, 'reference', '#4a2f3f',
'Reference works are not meant to be read, and Ferreira Quist''s dictionary is the exception that shows why the rule exists. Its four hundred and some entries record sounds that, by the compiler''s strict criteria, have been heard exactly once by exactly one person and reported in writing. Each entry gives the date, the witness, the circumstances, and a description, with the compiler''s brief and often withering notes on reliability.

The scholarship is real. The entries are cross-referenced with a thoroughness that borders on mania, and the appendix on notation, which proposes a system for transcribing sounds that cannot be repeated, has been adopted, with reservations, by at least two acoustic laboratories. But the book''s reputation rests on its accidental qualities: the way the entries, read in alphabetical order, begin to describe a single evening in a single house, with a single door that closes at the end.

Whether this was the compiler''s intention has been argued at length. Ferreira Quist, in the only interview granted, said that a dictionary is a house with the rooms in the wrong order, and declined to elaborate. The second edition corrected eleven dates and removed one entry, and the removed entry is now the most sought after page in the literature.'),

('The Sealed Minutes of the Committee for the Prevention of Coincidence', 'anon.', 'Proceedings', 'a1000000-0000-0000-0000-000000000001', 1958, 188, 'restricted', '#1f1f1f',
'This volume is held in the restricted department and is not lent. It is listed here because its review, unlike its text, belongs to everyone. The minutes record the meetings of a body that convened, by its own account, forty-one times between 1949 and 1957, with the aim of reducing the incidence of coincidence in a mid-sized provincial city by administrative means. The minutes are dry, procedural, and entirely serious.

Readers who have consulted the volume under supervision report that the committee''s methods, which included the staggering of tram timetables and the discouragement of certain surnames, were partially successful, and that the later meetings are taken up with the question of what the city had lost. The final session is recorded on a single page, and the page is mostly blank.

The library''s position is that some books are safer described than read. The reviewer, who has read it, does not entirely disagree.');