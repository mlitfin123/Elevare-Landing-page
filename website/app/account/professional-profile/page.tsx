import { Suspense } from "react";
import { ProfessionalProfileEditor } from "@/components/marketplace/ProfessionalProfileEditor";

export default async function AccountProfessionalProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfessionalProfileEditor />
    </Suspense>
  );
}
