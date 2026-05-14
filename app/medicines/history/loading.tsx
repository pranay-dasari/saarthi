import { PageHeader } from "@/components/ui/PageHeader";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 animate-pulse">
      <div className="h-4 w-20 bg-gray-200 rounded" />
      <div className="h-4 flex-1 bg-gray-200 rounded" />
      <div className="h-4 w-16 bg-gray-100 rounded" />
      <div className="h-6 w-16 bg-gray-200 rounded-full" />
    </div>
  );
}

export default function MedicineHistoryLoading() {
  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="Medicine History" showBack backHref="/medicines" />
      <div className="px-4 py-5">
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-5" />
        <div className="bg-white rounded-2xl border border-gray-100 px-4 divide-y divide-gray-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
