import { useState, useEffect } from 'react';
import { Star, Users } from 'lucide-react';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import { apiClient } from '../lib/api';
import { Review } from '../types';

const ReviewsPage = (): JSX.Element => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await apiClient.getReviews();
      
      // Filter to show only approved reviews
      const approvedReviews = reviewsData.filter(review => review.status === 'approved');
      setReviews(approvedReviews);
      setTotalReviews(approvedReviews.length);
      
      // Calculate average rating
      if (approvedReviews.length > 0) {
        const sum = approvedReviews.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(sum / approvedReviews.length);
      }
    } catch (err) {
      setError('Failed to load reviews');
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleReviewSubmitted = () => {
    // Optionally reload reviews or show success message
    loadReviews();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Customer Reviews</h1>
          <p className="text-gray-600 text-lg">See what our customers say about our nail services</p>
        </div>

        {/* Statistics */}
        {totalReviews > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-8 w-8 text-yellow-400 fill-current" />
                  <span className="text-3xl font-bold text-gray-900 ml-2">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
                <p className="text-gray-600">Average Rating</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-8 w-8 text-blue-600" />
                  <span className="text-3xl font-bold text-gray-900 ml-2">
                    {totalReviews}
                  </span>
                </div>
                <p className="text-gray-600">Total Reviews</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reviews List */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Reviews ({totalReviews})
            </h2>
            
            {reviews.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                <p className="text-gray-600">Be the first to leave a review for our nail salon!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <ReviewCard 
                    key={review._id || review.id} 
                    review={{
                      ...review,
                      id: review._id || review.id || ''
                    }} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Review Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ReviewForm onReviewSubmitted={handleReviewSubmitted} />
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Ready to experience our nail services?
          </h3>
          <p className="text-gray-600 mb-6">
            Book your appointment today and see why our customers love us!
          </p>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            Book Appointment
          </a>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
