import type { PlayerVideo } from "@/lib/types";

interface Props {
  videos: PlayerVideo[];
}

function ytId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m?.[1] || null;
}
function vimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] || null;
}

export default function VideoGallery({ videos }: Props) {
  if (!videos || videos.length === 0) return null;
  return (
    <div className="space-y-6">
      {videos.map((v, i) => {
        const yt = v.kind === "youtube" ? ytId(v.url) : null;
        const vi = v.kind === "vimeo" ? vimeoId(v.url) : null;
        const isFile = v.kind === "file";
        return (
          <div key={i}>
            {v.label && <div className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-2">{v.label}</div>}
            {yt && (
              <div className="border-hairline" style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${yt}`}
                  title={v.label || `Video ${i + 1}`}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {vi && (
              <div className="border-hairline" style={{ aspectRatio: "16/9" }}>
                <iframe
                  src={`https://player.vimeo.com/video/${vi}`}
                  title={v.label || `Video ${i + 1}`}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              </div>
            )}
            {isFile && (
              <video controls src={v.url} className="w-full border-hairline" style={{ maxHeight: 480 }} />
            )}
            {!yt && !vi && !isFile && (
              <a href={v.url} target="_blank" rel="noopener" className="text-accent-lime underline break-all">{v.url}</a>
            )}
          </div>
        );
      })}
    </div>
  );
}
