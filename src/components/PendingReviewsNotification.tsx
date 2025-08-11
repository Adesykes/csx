import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Star } from 'lucide-react';
import { usePendingReviews } from '../hooks/usePendingReviews';

const PendingReviewsNotification: React.FC = () => {
  const { pendingCount } = usePendingReviews();

  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
          <div>
            <p className="text-sm text-yellow-700">
              <strong>{pendingCount}</strong> review{pendingCount !== 1 ? 's' : ''} waiting for approval
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              New customer reviews need to be reviewed before they appear on the website
            </p>
          </div>
        </div>
        <Link
          to="/admin/reviews?filter=pending"
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          <Star className="h-4 w-4 mr-1" />
          Review Now
        </Link>
      </div>
    </div>
  );
};

export default PendingReviewsNotification;
