export function MarketTrendSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-72"></div>
        </div>
      </div>

      {/* Top majors section skeleton */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-12 ml-2"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart section skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Clusters list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
                <div className="flex flex-wrap gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-6 bg-gray-200 rounded w-16"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="mb-4">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="h-80 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
