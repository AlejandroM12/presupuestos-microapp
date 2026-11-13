import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { CustomerForm } from "@/components/dashboard/customer-form";
import { requirePro } from "@/server/pro";

export const metadata: Metadata = { title: "Nuevo cliente", robots: { index: false } };

export default async function NewCustomerPage() {
  await requirePro("/dashboard/clientes/nuevo");
  return (
    <>
      <PageHeader title="Nuevo cliente" />
      <Card>
        <CustomerForm />
      </Card>
    </>
  );
}
