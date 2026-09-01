import { getDonorPledges } from "../_actions/admin-actions";
import { BenfeitoresClient } from "./client";
import type { DonorPledge } from "../_components/donor-card";
import { requireStaff } from "@/lib/auth/authorization";
import { SecretariatDonorsClient, type SecretariatDonorPledge } from "./client";

export default async function BenfeitoresPage() {
  const staff = await requireStaff();
  const { data: donors } = await getDonorPledges();

  return (
    <div>
      <h1 className="font-heading text-[22px] font-semibold leading-tight tracking-tight">
        Benfeitores
      </h1>
      <p className="mt-1 text-sm text-muted">
        Cadastros recebidos pelo formulário público &ldquo;Seja um benfeitor&rdquo;.
      </p>
      <div className="mt-6">
        {staff.role === "secretaria" ? (
          <SecretariatDonorsClient initialDonors={(donors as SecretariatDonorPledge[]) ?? []} />
        ) : (
          <BenfeitoresClient initialDonors={(donors as unknown as DonorPledge[]) ?? []} />
        )}
      </div>
    </div>
  );
}
