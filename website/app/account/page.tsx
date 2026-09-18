import { Suspense } from "react";
import { AccountDashboard } from "@/components/marketplace/AccountDashboard";

export default function AccountOverviewPage() {
  return <Suspense fallback={null}><AccountDashboard /></Suspense>;
}
