import { Suspense } from "react";
import ContentArea from "@/components/ContentArea";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ContentArea variant="all" />
    </Suspense>
  );
}
