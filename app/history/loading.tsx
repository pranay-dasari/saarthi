import { PageHeader } from "@/components/ui/PageHeader";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-gray-100 p-5 bg-white flex flex-col gap-3 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-5 w-36 bg-gray-200 rounded-lg" />
          <div className="h-4 w-24 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-7 w-16 bg-gray-200 rounded-full shrink-0 mt-0.5" />
      </div>
      <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-4/5 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function HistoryLoading() {
  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <PageHeader title="Symptom History" />
      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse px-1" />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
