INSERT INTO storage.buckets (id, name, public)
VALUES ('player-videos', 'player-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view player videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-videos');

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'player-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'player-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'player-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );