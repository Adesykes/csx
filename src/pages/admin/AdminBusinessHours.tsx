import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_OPEN_TIME = '08:00';
const DEFAULT_CLOSE_TIME = '20:00';

const AdminBusinessHours: React.FC = () => {
  const [schedule, setSchedule] = useState<DaySchedule[]>(() =>
    DAYS_OF_WEEK.map(day => ({
      day,
      isOpen: true, // All days open by default
      openTime: DEFAULT_OPEN_TIME,
      closeTime: DEFAULT_CLOSE_TIME
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBusinessHours();
  }, []);

  const fetchBusinessHours = async () => {
    try {
      const hours = await apiClient.getBusinessHours();
      if (hours && hours.length) {
        setSchedule(hours);
      }
    } catch (error) {
      console.error('Error fetching business hours:', error);
    }
  };

  const handleToggleDay = (day: string) => {
    setSchedule(prev =>
      prev.map(d =>
        d.day === day ? { ...d, isOpen: !d.isOpen } : d
      )
    );
  };

  const handleTimeChange = (day: string, field: 'openTime' | 'closeTime', value: string) => {
    setSchedule(prev =>
      prev.map(d =>
        d.day === day ? { ...d, [field]: value } : d
      )
    );
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      // Get current schedule state
      console.log('Current schedule before ordering:', schedule);

      // Ensure days are in correct order (Monday to Sunday - matching backend)
      const orderedSchedule = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        .map(day => {
          const daySchedule = schedule.find(s => s.day === day);
          console.log(`Looking for ${day}:`, daySchedule);
          if (!daySchedule) {
            return {
              day,
              isOpen: false,
              openTime: '08:00',
              closeTime: '20:00'
            };
          }
          return daySchedule;
        });

      console.log('Schedule after ordering:', orderedSchedule);

      // Validate times for open days
      const invalidDay = orderedSchedule.find(day => 
        day.isOpen && day.openTime >= day.closeTime
      );
      
      if (invalidDay) {
        throw new Error(`Invalid hours for ${invalidDay.day}: opening time must be before closing time`);
      }

      console.log('Final schedule being saved:', orderedSchedule);
      const response = await apiClient.updateBusinessHours(orderedSchedule);
      console.log('Save response:', response);
      alert('Business hours updated successfully!');
    } catch (error) {
      console.error('Error updating business hours:', error);
      alert(error instanceof Error ? error.message : 'Failed to update business hours. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Business Hours</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {schedule.map(({ day, isOpen, openTime, closeTime }) => (
            <div key={day} className="flex items-center space-x-4 p-4 border rounded">
              <div className="w-32">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isOpen}
                    onChange={() => handleToggleDay(day)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 font-medium">{day}</span>
                </label>
              </div>
              {isOpen && (
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm text-gray-600">Open</label>
                    <input
                      type="time"
                      value={openTime}
                      onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                      className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">Close</label>
                    <input
                      type="time"
                      value={closeTime}
                      onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
                      className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminBusinessHours;
