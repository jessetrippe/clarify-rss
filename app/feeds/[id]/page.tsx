"use client";

import { useParams } from "next/navigation";
import ContentArea from "@/components/ContentArea";

export default function FeedDetail() {
  const params = useParams();
  const feedId = Array.isArray(params.id) ? params.id[0] : params.id;

  return <ContentArea variant="feed" feedId={feedId} />;
}
