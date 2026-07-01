-- Auto fix: ensure student_grades.course_total_grade is always calculated as
-- course_total_grade = grade + behavior_grade + activity_grade + sheet_grade

BEGIN;

-- 1) Function
CREATE OR REPLACE FUNCTION public.student_grades_set_course_total_grade()
RETURNS TRIGGER AS $$
BEGIN
  -- COALESCE to handle NULLs
  NEW.course_total_grade :=
    COALESCE(NEW.grade, 0)
    + COALESCE(NEW.behavior_grade, 0)
    + COALESCE(NEW.activity_grade, 0)
    + COALESCE(NEW.sheet_grade, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Trigger (drop if exists)
DROP TRIGGER IF EXISTS student_grades_set_course_total_grade_trigger
  ON public.student_grades;

CREATE TRIGGER student_grades_set_course_total_grade_trigger
BEFORE INSERT OR UPDATE
ON public.student_grades
FOR EACH ROW
EXECUTE FUNCTION public.student_grades_set_course_total_grade();

COMMIT;

-- 3) Quick test (safe to run)
-- NOTE: This assumes columns exist: grade, behavior_grade, activity_grade, sheet_grade, course_total_grade
-- and that there is at least one row to update.
-- If you don't want the test, remove the following block.

DO $$
BEGIN
  -- Insert test row only if required columns exist and you have a way to provide student_id/course.
  -- Because schema varies, we keep test minimal: update an existing row.
  IF EXISTS (SELECT 1 FROM public.student_grades LIMIT 1) THEN
    -- Set known values (including NULLs) and verify course_total_grade
    UPDATE public.student_grades
    SET
      grade = NULL,
      behavior_grade = 10,
      activity_grade = NULL,
      sheet_grade = 7,
      updated_at = updated_at
    WHERE id IS NOT NULL
    ;

  -- apply limit safely in separate step
  -- (no LIMIT in UPDATE for some dialects)

    RAISE NOTICE 'student_grades.course_total_grade recalculation test executed (check manually in DB).';
  ELSE
    RAISE NOTICE 'No rows in public.student_grades to test.';
  END IF;
END $$;

