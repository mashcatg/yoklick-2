import { Skeleton } from "@/components/ui/skeleton";

export const HomepageSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="aspect-[16/9] rounded-lg overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>
      ))}
    </div>
  );
}; 