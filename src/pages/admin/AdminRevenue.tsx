import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Revenue } from '../../types';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';

const AdminRevenue: React.FC = () => {
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);

  useEffect(() => {
    fetchRevenue();
  }, [selectedMonth]);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      if (error) throw error;

      // Process data for revenue calculations
      const revenueData: Revenue[] = [];
      const dailyRevenue: { [key: string]: { total: number; count: number; services: any } } = {};

      data?.forEach(appointment => {
        const date = appointment.appointment_date;
        if (!dailyRevenue[date]) {
          dailyRevenue[date] = { total: 0, count: 0, services: {} };
        }
        
        dailyRevenue[date].total += appointment.service_price;
        dailyRevenue[date].count += 1;
        
        const serviceName = appointment.service_name;
        if (!dailyRevenue[date].services[serviceName]) {
          dailyRevenue[date].services[serviceName] = { count: 0, revenue: 0 };
        }
        dailyRevenue[date].services[serviceName].count += 1;
        dailyRevenue[date].services[serviceName].revenue += appointment.service_price;
      });

      Object.entries(dailyRevenue).forEach(([date, data]) => {
        revenueData.push({
          date,
          total_revenue: data.total,
          appointment_count: data.count,
          services: data.services
        });
      });

      setRevenue(revenueData);
      setTotalRevenue(revenueData.reduce((sum, day) => sum + day.total_revenue, 0));
      setTotalAppointments(revenueData.reduce((sum, day) => sum + day.appointment_count, 0));
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Date', 'Revenue', 'Appointments', 'Services'],
      ...revenue.map(day => [
        day.date,
        day.total_revenue.toFixed(2),
        day.appointment_count,
        Object.entries(day.services).map(([name, data]) => `${name}: ${data.count}`).join('; ')
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${format(selectedMonth, 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const month = subMonths(new Date(), i);
      months.push(month);
    }
    return months;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
          <p className="mt-2 text-gray-600">Track your salon's financial performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {generateMonthOptions().map(month => (
              <option key={format(month, 'yyyy-MM')} value={format(month, 'yyyy-MM')}>
                {format(month, 'MMMM yyyy')}
              </option>
            ))}
          </select>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Appointments</div>
              <div className="text-2xl font-bold text-gray-900">{totalAppointments}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Average per Appointment</div>
              <div className="text-2xl font-bold text-gray-900">
                ${totalAppointments > 0 ? (totalRevenue / totalAppointments).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Daily Revenue - {format(selectedMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Services
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No revenue data for this month
                  </td>
                </tr>
              ) : (
                revenue.map(day => (
                  <tr key={day.date}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(new Date(day.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="text-green-600 font-semibold">
                        ${day.total_revenue.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.appointment_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {Object.entries(day.services).map(([serviceName, data]) => (
                          <div key={serviceName} className="text-xs">
                            <span className="font-medium">{serviceName}:</span> {data.count} (${data.revenue.toFixed(2)})
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;