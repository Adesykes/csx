import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { Calendar, X, Plus, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface ClosureDate {
  _id?: string;
  date: string; // YYYY-MM-DD format
  reason: string;
  createdAt?: string;
}

const AdminClosureDates: React.FC = () => {
  const [closureDates, setClosureDates] = useState<ClosureDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load existing closure dates
  useEffect(() => {
    const loadClosureDates = async () => {
      try {
        const dates = await apiClient.getClosureDates();
        setClosureDates(dates);
      } catch (error) {
        console.error('Error loading closure dates:', error);
        setError('Failed to load closure dates');
      }
    };

    void loadClosureDates();
  }, []);

  const handleAddClosureDate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !reason.trim()) {
      setError('Please select a date and provide a reason');
      return;
    }

    // Check if date is already added
    const dateExists = closureDates.some(closure => closure.date === selectedDate);
    if (dateExists) {
      setError('This date is already marked as closed');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const newClosure = await apiClient.addClosureDate({
        date: selectedDate,
        reason: reason.trim()
      });

      setClosureDates(prev => [...prev, newClosure].sort((a, b) => a.date.localeCompare(b.date)));
      setSelectedDate('');
      setReason('');
      setSuccess('Closure date added successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error adding closure date:', error);
      setError('Failed to add closure date');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveClosureDate = async (closureId: string) => {
    if (!confirm('Are you sure you want to remove this closure date?')) {
      return;
    }

    try {
      await apiClient.removeClosureDate(closureId);
      setClosureDates(prev => prev.filter(closure => closure._id !== closureId));
      setSuccess('Closure date removed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error removing closure date:', error);
      setError('Failed to remove closure date');
    }
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const getMinDate = () => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  };

  const getMaxDate = () => {
    const oneYearFromNow = addDays(new Date(), 365);
    return format(oneYearFromNow, 'yyyy-MM-dd');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Business Closure Dates</h1>
        </div>

        <p className="text-gray-600 mb-6">
          Manage dates when your business will be closed. Customers will not be able to book appointments on these dates.
        </p>

        {/* Add New Closure Date Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Closure Date</h2>
          
          <form onSubmit={handleAddClosureDate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="closure-date" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  id="closure-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="closure-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Closure
                </label>
                <input
                  type="text"
                  id="closure-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Holiday, Maintenance, Personal day"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Adding...' : 'Add Closure Date'}
            </button>
          </form>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Existing Closure Dates */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Scheduled Closure Dates ({closureDates.length})
          </h2>
          
          {closureDates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No closure dates scheduled</p>
              <p className="text-sm">Add dates above when your business will be closed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {closureDates.map((closure) => (
                <div
                  key={closure._id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDisplayDate(closure.date)}
                      </p>
                      <p className="text-sm text-gray-600">{closure.reason}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveClosureDate(closure._id!)}
                    className="flex-shrink-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove closure date"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClosureDates;
