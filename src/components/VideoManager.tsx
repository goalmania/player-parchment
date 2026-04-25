import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayerVideo } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  videos: PlayerVideo[];
  onChange: (videos: PlayerVideo[]) => void;
}

function detectKind(url: string): PlayerVideo["kind"] {
  if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return "external";
}

export default function VideoManager({ videos, onChange }: Props) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    const v: PlayerVideo = { url: u, label: label.trim() || undefined, kind: detectKind(u) };
    onChange([...videos, v]);
    setUrl(""); setLabel("");
  };

  const remove = (i: number) => onChange(videos.filter((_, idx) => idx !== i));

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Non autenticato");
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await supabase.storage.from("player-videos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("player-videos").getPublicUrl(path);
      const v: PlayerVideo = { url: pub.publicUrl, label: file.name, kind: "file" };
      onChange([...videos, v]);
      toast.success("Video caricato");
    } catch (e: any) {
      toast.error(e?.message || "Upload fallito");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {videos.map((v, i) => (
          <div key={i} className="flex items-center gap-2 border-hairline p-2 bg-gray-light/30">
            <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-light uppercase">{v.kind}</span>
            <span className="flex-1 truncate text-sm">{v.label || v.url}</span>
            <a href={v.url} target="_blank" rel="noopener" className="text-accent-lime text-xs">↗</a>
            <button onClick={() => remove(i)} className="text-gray-soft hover:text-red-soft text-xs px-2">✕</button>
          </div>
        ))}
        {videos.length === 0 && (
          <div className="text-xs text-gray-soft italic">Nessun video. Aggiungi un link YouTube/Vimeo o carica un file.</div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_180px_auto] gap-2">
        <input
          className="dm-input"
          placeholder="URL video (YouTube, Vimeo, link diretto…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="dm-input"
          placeholder="Etichetta (opzionale)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button type="button" onClick={addUrl} className="dm-btn-outline">+ Aggiungi URL</button>
      </div>

      <div className="flex items-center gap-3 pt-2 border-hairline-t">
        <label className="dm-btn-outline cursor-pointer">
          {uploading ? "Caricamento…" : "↑ Carica file video"}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          />
        </label>
        <span className="text-xs text-gray-soft">Max consigliato 100 MB · MP4/WebM</span>
      </div>
    </div>
  );
}
