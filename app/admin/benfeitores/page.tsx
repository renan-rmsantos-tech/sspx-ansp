import { getDonorPledges } from "../_actions/admin-actions";
import type { DonorPledge } from "../_components/donor-card";
import { requireStaff } from "@/lib/auth/authorization";
import { materializeCurrentAndNextMonthlyPayments } from "@/lib/donor-payment-ledger";
import { BenfeitoresClient, SecretariatDonorsClient, type SecretariatDonorPledge } from "./client";

export default async function BenfeitoresPage({
  searchParams,
}: {
  searchParams: Promise<{ "boas-vindas"?: string | string[] }>;
}) {
  const staff = await requireStaff();
  const { "boas-vindas": boasVindas } = await searchParams;
  if (staff.role === "admin") await materializeCurrentAndNextMonthlyPayments();
  const { data: donors } = await getDonorPledges();

  if (staff.role === "secretaria") {
    return <SecretariatDonorsClient initialDonors={(donors as SecretariatDonorPledge[]) ?? []} />;
  }

  return (
    <BenfeitoresClient
      initialDonors={(donors as unknown as DonorPledge[]) ?? []}
      initialWelcomePendingOnly={boasVindas === "pendentes"}
    />
  );
}
