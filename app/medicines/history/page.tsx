import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllMedicines } from "@/lib/db/medicines";
import { getLogsForRange } from "@/lib/db/logs";
import { PageHeader } from "@/components/ui/PageHeader";
import { MedicineHistoryTable } from "@/components/medicine/MedicineHistoryTable";

export default async function MedicineHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const toDate = today.toISOString().split("T")[0];
  const fromDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [medicines, logs] = await Promise.all([
    getAllMedicines(supabase),
    getLogsForRange(supabase, fromDate, toDate),
  ]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="Medicine History" showBack backHref="/medicines" />

      <div className="px-4 py-5">
        <p className="text-gray-500 text-base mb-5">
          Showing last 30 days · {logs.length} record{logs.length !== 1 ? "s" : ""}
        </p>
        <MedicineHistoryTable logs={logs} medicines={medicines} />
      </div>
    </div>
  );
}
