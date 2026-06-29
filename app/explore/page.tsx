import { Suspense } from "react";
import { ExploreContent } from "@/app/explore/explore-content";

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-mist" />}>
      <ExploreContent />
    </Suspense>
  );
}
