import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

        {/* Facebook Reviews Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-full p-3">
                <svg className="h-8 w-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Also Check Our Facebook Reviews!</h3>
                <p className="text-blue-100">See what customers are saying about us on Facebook</p>
              </div>
            </div>
            <a
              href="https://www.facebook.com/share/1ANRsm8bFG/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <span>View Facebook Reviews</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

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
                {reviews
                  .filter(review => review._id || review.id) // Only render reviews with valid IDs
                  .map((review, index) => (
                    <ReviewCard 
                      key={review._id || review.id || `review-${index}`} // Guaranteed unique key
                      review={{
                        ...review,
                        id: review._id || review.id || `generated-id-${index}` // Guaranteed valid ID
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
          <Link
            to="/booking"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            Book Appointment
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReviewsPage;
