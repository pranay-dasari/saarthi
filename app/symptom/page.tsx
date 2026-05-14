import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getContacts } from "@/lib/db/profile";
import { PageHeader } from "@/components/ui/PageHeader";
import { SymptomChecker } from "@/components/symptom/SymptomChecker";

export default async function SymptomPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, contacts] = await Promise.all([
    getProfile(supabase),
    getContacts(supabase),
  ]);

  if (!profile) redirect("/");

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="How are you feeling?" showBack />
      <div className="flex-1 pb-6">
        <SymptomChecker profile={profile} contacts={contacts} />
      </div>
    </div>
  );
}
