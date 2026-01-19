import { Suspense } from "react";
import ContentArea from "@/components/ContentArea";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Starred() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ContentArea variant="starred" />
    </Suspense>
  );
}
