import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { apiClient } from '../../lib/api';
import { DollarSign, TrendingUp, Calendar, Download, CreditCard, Banknote, RefreshCw } from 'lucide-react';

type DateRangeType = 'month' | 'financial-year' | 'custom';

// Define the actual API response type
interface ApiRevenueData {
  date: string;
  totalRevenue: number;
  appointmentCount: number;
  onlinePayments: number; // This represents bank transfers
  cashPayments: number;
  services: Record<string, { 
    count: number; 
    revenue: number; 
    onlineRevenue: number; // This represents bank transfer revenue
    cashRevenue: number; 
  }>;
}

const AdminRevenue: React.FC = () => {
  const [revenue, setRevenue] = useState<ApiRevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [totalBankTransfers, setTotalBankTransfers] = useState(0);
  const [totalCashPayments, setTotalCashPayments] = useState(0);

  useEffect(() => {
    fetchRevenue();
  }, [selectedMonth, selectedFinancialYear, customStartDate, customEndDate, dateRangeType]);

  const getDateRange = () => {
    switch (dateRangeType) {
      case 'month':
        return {
          start: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
          end: format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
        };
      case 'financial-year':
        // Financial year runs from April to March
        const financialStart = new Date(selectedFinancialYear, 3, 1); // April 1st
        const financialEnd = new Date(selectedFinancialYear + 1, 2, 31); // March 31st next year
        return {
          start: format(financialStart, 'yyyy-MM-dd'),
          end: format(financialEnd, 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        };
      default:
        return {
          start: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
          end: format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
        };
    }
  };

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      
      if (!start || !end) {
        setLoading(false);
        return;
      }

      const revenueData = await apiClient.getRevenue(start, end);

      // Temporary debug for production issue
      console.log('🐛 PRODUCTION DEBUG - Revenue Data:', JSON.stringify(revenueData, null, 2));
      
      setRevenue(revenueData as unknown as ApiRevenueData[]);
      setTotalRevenue(revenueData.reduce((sum: number, day: any) => sum + day.totalRevenue, 0));
      setTotalAppointments(revenueData.reduce((sum: number, day: any) => sum + day.appointmentCount, 0));
      
      // Debug the bank transfers calculation
      const bankTransfers = revenueData.reduce((sum: number, day: any) => {
        console.log('🐛 Day:', day.date, 'onlinePayments:', day.onlinePayments, 'type:', typeof day.onlinePayments);
        return sum + (day.onlinePayments || 0);
      }, 0);
      console.log('🐛 Total Bank Transfers:', bankTransfers);
      setTotalBankTransfers(bankTransfers);
      
      // Debug the cash calculation
      const cashPayments = revenueData.reduce((sum: number, day: any) => {
        console.log('🐛 Day:', day.date, 'cashPayments:', day.cashPayments, 'type:', typeof day.cashPayments);
        return sum + (day.cashPayments || 0);
      }, 0);
      console.log('🐛 Total Cash Payments:', cashPayments);
      setTotalCashPayments(cashPayments);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const { start, end } = getDateRange();
    const csvData = [
      ['Date', 'Revenue', 'Appointments', 'Bank Transfers', 'Cash Payments', 'Services'],
      ...revenue.map(day => [
        day.date,
        day.totalRevenue.toFixed(2),
        day.appointmentCount,
        day.onlinePayments?.toFixed(2) || '0.00',
        day.cashPayments?.toFixed(2) || '0.00',
        Object.entries(day.services).map(([name, data]) => `${name}: ${data.count}`).join('; ')
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let filename = 'revenue';
    if (dateRangeType === 'month') {
      filename += `-${format(selectedMonth, 'yyyy-MM')}`;
    } else if (dateRangeType === 'financial-year') {
      filename += `-FY${selectedFinancialYear}-${selectedFinancialYear + 1}`;
    } else if (dateRangeType === 'custom') {
      filename += `-${start}_to_${end}`;
    }
    
    a.download = `${filename}.csv`;
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

  const generateFinancialYearOptions = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const getDateRangeLabel = () => {
    switch (dateRangeType) {
      case 'month':
        return format(selectedMonth, 'MMMM yyyy');
      case 'financial-year':
        return `Financial Year ${selectedFinancialYear}/${selectedFinancialYear + 1} (Apr-Mar)`;
      case 'custom':
        return customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : 'Custom Range';
      default:
        return '';
    }
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
          <button
            onClick={fetchRevenue}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Range Type</label>
            <select
              value={dateRangeType}
              onChange={(e) => setDateRangeType(e.target.value as DateRangeType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">Monthly</option>
              <option value="financial-year">Financial Year (Apr-Mar)</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRangeType === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
              <select
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {generateMonthOptions().map(month => (
                  <option key={format(month, 'yyyy-MM')} value={format(month, 'yyyy-MM')}>
                    {format(month, 'MMMM yyyy')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {dateRangeType === 'financial-year' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year</label>
              <select
                value={selectedFinancialYear}
                onChange={(e) => setSelectedFinancialYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {generateFinancialYearOptions().map(year => (
                  <option key={year} value={year}>
                    {year}/{year + 1} (Apr {year} - Mar {year + 1})
                  </option>
                ))}
              </select>
            </div>
          )}

          {dateRangeType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">£{totalRevenue.toFixed(2)}</div>
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
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Bank Transfers</div>
              <div className="text-2xl font-bold text-gray-900">£{totalBankTransfers.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Banknote className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Cash Payments</div>
              <div className="text-2xl font-bold text-gray-900">£{totalCashPayments.toFixed(2)}</div>
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
                £{totalAppointments > 0 ? (totalRevenue / totalAppointments).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Daily Revenue - {getDateRangeLabel()}
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
                        £{day.totalRevenue.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.appointmentCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {Object.entries(day.services).map(([serviceName, data]) => (
                          <div key={serviceName} className="text-xs">
                            <span className="font-medium">{serviceName}:</span> {data.count} (£{data.revenue.toFixed(2)})
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