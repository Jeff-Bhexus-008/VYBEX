import VideoCard from "@/components/VideoCard";

export default function VideoGrid({ videos, emptyState, renderAction }) {
  if (!videos?.length) return emptyState ?? null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
      {videos.map((video) => (
        <div key={video.id} className="w-full [&>a]:w-full">
          <VideoCard
            video={video}
            action={renderAction ? renderAction(video) : undefined}
            badgeLabel={video.badgeLabel}
          />
        </div>
      ))}
    </div>
  );
}