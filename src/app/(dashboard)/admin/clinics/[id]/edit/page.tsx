"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

// Redirect to detail page settings tab
export default function EditClinicPage() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/admin/clinics/${params.id}?tab=settings`);
  }, [params.id, router]);
  return null;
}
