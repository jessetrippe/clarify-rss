"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ContentArea from "@/components/ContentArea";
import LoadingSpinner from "@/components/LoadingSpinner";

function FeedDetailContent() {
  const params = useParams();
  const feedId = Array.isArray(params.id) ? params.id[0] : params.id;

  return <ContentArea variant="feed" feedId={feedId} />;
}

export default function FeedDetail() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <FeedDetailContent />
    </Suspense>
  );
}
