import RoomFinder from "@/app/components/RoomFinder";
import { getRoomFeed } from "@/lib/room-feed";

export const dynamic = "force-dynamic";

export default function BostonUniversity() {
  return <RoomFinder initialFeed={getRoomFeed()} />;
}
