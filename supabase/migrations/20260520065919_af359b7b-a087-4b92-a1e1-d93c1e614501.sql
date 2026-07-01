-- Allow document owners to delete supporting docs linked to draft/returned AIEs
CREATE POLICY "docs delete aie owner editable"
ON public.documents
FOR DELETE
TO authenticated
USING (
  (linked_table = 'aie_records'::text) AND
  (EXISTS (
    SELECT 1 FROM aie_records a
    WHERE a.id = documents.linked_id
      AND a.created_by = auth.uid()
      AND a.status = ANY (ARRAY['DRAFT'::txn_status, 'RETURNED'::txn_status])
  ))
);

-- Allow deleting the underlying storage object for draft/returned AIE docs
CREATE POLICY "bms-documents delete aie owner editable"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bms-documents' AND
  (storage.foldername(name))[1] = 'aie_records' AND
  (EXISTS (
    SELECT 1 FROM aie_records a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND a.created_by = auth.uid()
      AND a.status = ANY (ARRAY['DRAFT'::txn_status, 'RETURNED'::txn_status])
  ))
);