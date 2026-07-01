
CREATE OR REPLACE FUNCTION public.log_document_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log(actor, table_name, row_id, action, diff, at)
  VALUES (
    auth.uid(),
    'documents',
    OLD.id::text,
    'DELETE',
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'linked_table', OLD.linked_table,
      'linked_id', OLD.linked_id,
      'aie_id', CASE WHEN OLD.linked_table = 'aie_records' THEN OLD.linked_id ELSE NULL END,
      'bucket_path', OLD.bucket_path
    ),
    now()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_document_delete ON public.documents;
CREATE TRIGGER trg_log_document_delete
AFTER DELETE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.log_document_delete();
