import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  availableDates: Date[];
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, availableDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDateStrings, setAvailableDateStrings] = useState<Set<string>>(new Set());

  useEffect(() => {
    const dateStrings = new Set(availableDates.map(date => format(date, 'yyyy-MM-dd')));
    setAvailableDateStrings(dateStrings);
  }, [availableDates]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Get the start and end of the calendar view (including padding days)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 0 = Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  // Get all days to display in the calendar grid
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isDateAvailable = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return availableDateStrings.has(dateString);
  };

  const isDateSelectable = (date: Date) => {
    const today = startOfDay(new Date());
    return !isBefore(date, today) && isDateAvailable(date);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(date => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isTodayDate = isToday(date);
          const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          const isSelectable = isDateSelectable(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => isSelectable && onDateSelect(date)}
              disabled={!isSelectable}
              className={`
                p-2 sm:p-3 text-xs sm:text-sm rounded-md transition-all duration-200 font-medium touch-manipulation min-h-10 sm:min-h-12
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${isTodayDate ? 'bg-blue-100 text-blue-700' : ''}
                ${isSelected ? 'bg-blue-600 text-white' : ''}
                ${isSelectable && !isSelected ? 'hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100' : ''}
                ${!isSelectable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;