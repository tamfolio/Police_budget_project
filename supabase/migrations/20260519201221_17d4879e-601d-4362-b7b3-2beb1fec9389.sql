-- Allow proposal owner to delete linked documents while proposal is editable
CREATE POLICY "docs delete proposal owner editable"
ON public.documents
FOR DELETE
USING (
  linked_table = 'proposals'
  AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = documents.linked_id
      AND p.created_by = auth.uid()
      AND p.status IN ('DRAFT'::txn_status, 'RETURNED'::txn_status)
  )
);

-- Allow proposal owner to remove storage objects belonging to their editable proposals
CREATE POLICY "bms-documents delete proposal owner editable"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bms-documents'
  AND (storage.foldername(name))[1] = 'proposals'
  AND EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id::text = (storage.foldername(name))[2]
      AND p.created_by = auth.uid()
      AND p.status IN ('DRAFT'::txn_status, 'RETURNED'::txn_status)
  )
);