import { Review } from '../types';
import StarRating from './StarRating';
import { format } from 'date-fns';

interface ReviewCardProps {
  review: Review;
}

const ReviewCard = ({ review }: ReviewCardProps): JSX.Element => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{review.customerName}</h3>
          <p className="text-sm text-gray-500">
            {format(new Date(review.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
        <StarRating rating={review.rating} readonly size="sm" />
      </div>
      
      {review.service && (
        <p className="text-sm text-blue-600 mb-2">Service: {review.service}</p>
      )}
      
      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
      
      {review.status === 'pending' && (
        <div className="mt-4 flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending Approval
          </span>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
