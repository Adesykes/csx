import { useState, useEffect } from 'react';
import { Star, Check, X, Trash2, Eye } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Review } from '../../types';
import StarRating from '../../components/StarRating';
import { format } from 'date-fns';

const AdminReviews = (): JSX.Element => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await apiClient.getReviews();
      setReviews(reviewsData.map(review => ({
        ...review,
        id: review._id,
        updatedAt: review.updatedAt || review.createdAt
      })));
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleStatusUpdate = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(reviewId);
      await apiClient.updateReviewStatus(reviewId, status);
      await loadReviews();
    } catch (error) {
      console.error('Error updating review status:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      setProcessingId(reviewId);
      await apiClient.deleteReview(reviewId);
      await loadReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    return review.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="mt-2 text-gray-600">Manage customer reviews and ratings</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Reviews' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({reviews.filter(r => tab.key === 'all' || r.status === tab.key).length})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12">
          <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews found</h3>
          <p className="text-gray-600">
            {filter === 'all' ? 'No reviews have been submitted yet.' : `No ${filter} reviews found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{review.customerName}</h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(review.createdAt), 'MMM dd, yyyy at h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <StarRating rating={review.rating} readonly size="sm" />
                      {getStatusBadge(review.status)}
                    </div>
                  </div>

                  {review.service && (
                    <p className="text-sm text-blue-600 mb-3">Service: {review.service}</p>
                  )}

                  <p className="text-gray-700 mb-4">{review.comment}</p>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(review.id!, 'approved')}
                          disabled={processingId === review.id}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(review.id!, 'rejected')}
                          disabled={processingId === review.id}
                          className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                    
                    {review.status === 'approved' && (
                      <button
                        onClick={() => handleStatusUpdate(review.id!, 'rejected')}
                        disabled={processingId === review.id}
                        className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Hide
                      </button>
                    )}
                    
                    {review.status === 'rejected' && (
                      <button
                        onClick={() => handleStatusUpdate(review.id!, 'approved')}
                        disabled={processingId === review.id}
                        className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(review.id!)}
                      disabled={processingId === review.id}
                      className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
