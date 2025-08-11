import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

export const usePendingReviews = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingCount = async () => {
    try {
      const reviews = await apiClient.getReviews();
      const pending = reviews.filter(review => review.status === 'pending');
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Error fetching pending reviews count:', error);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCount();
    
    // Refresh every 5 minutes to catch new reviews
    const interval = setInterval(fetchPendingCount, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { pendingCount, loading, refetch: fetchPendingCount };
};
