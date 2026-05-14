import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getContacts } from "@/lib/db/profile";
import { getAllMedicines } from "@/lib/db/medicines";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileView } from "@/components/profile/ProfileView";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let [profile, contacts, medicines] = await Promise.all([
    getProfile(supabase),
    getContacts(supabase),
    getAllMedicines(supabase),
  ]);

  // Auto-bootstrap: the profile INSERT during signup can fail silently when
  // email confirmation is required (no active session → RLS blocks it).
  // We are server-side here and the user IS authenticated, so the INSERT
  // satisfies RLS (auth.uid() = user_id). Derive a readable starter name from
  // their email so the avatar shows something sensible immediately.
  if (!profile) {
    const emailPrefix = user.email?.split("@")[0] ?? "";
    const starterName = emailPrefix
      .replace(/[._\-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "Friend";

    await supabase.from("profiles").insert({
      user_id: user.id,
      name: starterName,
      age: null,
      gender: null,
      conditions: [],
      doctor_phone: null,
    });

    profile = await getProfile(supabase);
  }

  // isNewProfile: profile exists but has no age/gender → prompt user to fill it
  const isNewProfile = !!profile && profile.age === null && profile.gender === null;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="My Profile" />

      {profile ? (
        <ProfileView
          profile={profile}
          contacts={contacts}
          medicines={medicines}
          isNewProfile={isNewProfile}
        />
      ) : (
        // Extremely unlikely after the bootstrap above — only if DB is down.
        <div className="px-4 py-5 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 text-lg">
              Could not load your profile. Please try again in a moment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
