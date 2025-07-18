import React from 'react';
import { format } from 'date-fns';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface TimeSlotPickerProps {
  selectedDate: Date;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  availableSlots: TimeSlot[];
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({ 
  selectedDate, 
  selectedTime, 
  onTimeSelect, 
  availableSlots 
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Available Times for {format(selectedDate, 'EEEE, MMMM d')}
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {availableSlots.map(slot => (
          <button
            key={slot.time}
            onClick={() => slot.available && onTimeSelect(slot.time)}
            disabled={!slot.available}
            className={`
              p-3 text-sm font-medium rounded-md transition-all duration-200
              ${selectedTime === slot.time 
                ? 'bg-blue-600 text-white' 
                : slot.available 
                  ? 'bg-gray-100 text-gray-900 hover:bg-blue-50 hover:text-blue-600' 
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {slot.time}
          </button>
        ))}
      </div>
      
      {availableSlots.filter(slot => slot.available).length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No available time slots for this date. Please select another date.
        </p>
      )}
    </div>
  );
};

export default TimeSlotPicker;