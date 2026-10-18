CREATE OR REPLACE FUNCTION public.validate_support_input() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.body := btrim(NEW.body);
  IF TG_TABLE_NAME = 'support_tickets' THEN
    IF char_length(NEW.body) < 5 OR char_length(NEW.body) > 4000 THEN RAISE EXCEPTION 'Question must contain 5 to 4000 characters'; END IF;
    NEW.subject := btrim(NEW.subject);
    IF char_length(NEW.subject) < 3 OR char_length(NEW.subject) > 150 THEN RAISE EXCEPTION 'Subject must contain 3 to 150 characters'; END IF;
    IF NEW.category IS NOT NULL AND char_length(NEW.category) > 64 THEN RAISE EXCEPTION 'Category is too long'; END IF;
    IF TG_OP = 'INSERT' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text || ':support', 0));
      IF (SELECT count(*) FROM public.support_tickets WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour') >= 5 THEN RAISE EXCEPTION 'Too many questions. Please try again later.'; END IF;
    END IF;
  ELSE
    IF char_length(NEW.body) < 1 OR char_length(NEW.body) > 4000 THEN RAISE EXCEPTION 'Reply must contain 1 to 4000 characters'; END IF;
    IF TG_OP = 'INSERT' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.author_id::text || ':support-reply', 0));
      IF (SELECT count(*) FROM public.support_ticket_messages WHERE author_id = NEW.author_id AND created_at > now() - interval '1 minute') >= 10 THEN RAISE EXCEPTION 'Too many replies. Please wait a minute.'; END IF;
      IF NOT NEW.is_staff AND EXISTS (SELECT 1 FROM public.support_tickets WHERE id = NEW.ticket_id AND status = 'closed') THEN RAISE EXCEPTION 'This ticket is closed. Please send a new question.'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;