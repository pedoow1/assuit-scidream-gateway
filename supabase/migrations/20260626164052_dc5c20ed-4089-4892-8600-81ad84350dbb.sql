
-- Phase 3: Quizzes
CREATE TYPE public.question_type AS ENUM ('mcq', 'true_false', 'essay');

CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  time_limit_min integer,
  pass_score integer NOT NULL DEFAULT 50,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified students view published quizzes" ON public.quizzes
  FOR SELECT TO authenticated USING (
    is_published = true AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.verification_status = 'verified')
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Admins manage quizzes" ON public.quizzes
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER touch_quizzes BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type public.question_type NOT NULL,
  prompt text NOT NULL,
  options jsonb,                -- for mcq: ["a","b","c","d"]
  correct_answer text,          -- index (0..n) for mcq, "true"/"false" for tf, model answer for essay
  explanation text,
  points integer NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified students view questions of published quizzes" ON public.quiz_questions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE q.id = quiz_id AND q.is_published = true AND p.verification_status = 'verified'
    )
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
  );
CREATE POLICY "Admins manage questions" ON public.quiz_questions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, order_index);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score numeric,
  total_points integer,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{question_id, response, is_correct, points}]
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attempts" ON public.quiz_attempts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id, quiz_id);
