const ServiceCardSkeleton = (): JSX.Element => {
  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-md border border-gray-200 animate-pulse">
      {/* Service name skeleton */}
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
      
      {/* Description skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      
      {/* Price and duration skeleton */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
      
      {/* Button skeleton */}
      <div className="h-12 bg-gray-200 rounded-md w-full"></div>
    </div>
  );
};

export default ServiceCardSkeleton;