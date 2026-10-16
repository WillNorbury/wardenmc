GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT, DELETE ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
GRANT EXECUTE ON FUNCTION public.can_access_ticket(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.validate_support_input() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.body := btrim(NEW.body);
  IF char_length(NEW.body) < 1 OR char_length(NEW.body) > 5000 THEN RAISE EXCEPTION 'Message must contain 1 to 5000 characters'; END IF;
  IF TG_TABLE_NAME = 'support_tickets' THEN
    NEW.subject := btrim(NEW.subject);
    IF char_length(NEW.subject) < 3 OR char_length(NEW.subject) > 150 THEN RAISE EXCEPTION 'Subject must contain 3 to 150 characters'; END IF;
    IF NEW.category IS NOT NULL AND char_length(NEW.category) > 64 THEN RAISE EXCEPTION 'Category is too long'; END IF;
    IF TG_OP = 'INSERT' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text || ':support', 0));
      IF (SELECT count(*) FROM public.support_tickets WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour') >= 5 THEN RAISE EXCEPTION 'Too many questions. Please try again later.'; END IF;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.author_id::text || ':support-reply', 0));
    IF (SELECT count(*) FROM public.support_ticket_messages WHERE author_id = NEW.author_id AND created_at > now() - interval '1 minute') >= 10 THEN RAISE EXCEPTION 'Too many replies. Please wait a minute.'; END IF;
    IF NOT NEW.is_staff AND EXISTS (SELECT 1 FROM public.support_tickets WHERE id = NEW.ticket_id AND status = 'closed') THEN RAISE EXCEPTION 'This ticket is closed. Please send a new question.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_support_ticket_input BEFORE INSERT OR UPDATE OF subject, body, category ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.validate_support_input();
CREATE TRIGGER validate_support_message_input BEFORE INSERT ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.validate_support_input();
CREATE OR REPLACE FUNCTION public.touch_support_ticket_on_reply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.support_tickets SET updated_at = now(), status = CASE WHEN NOT NEW.is_staff AND status = 'waiting_user' THEN 'open'::public.ticket_status ELSE status END WHERE id = NEW.ticket_id;
 RETURN NEW;
END;
$$;
CREATE TRIGGER touch_support_ticket_reply AFTER INSERT ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket_on_reply();