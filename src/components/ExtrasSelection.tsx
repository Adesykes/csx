import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import type { Extra } from '../types';
import { apiClient } from '../lib/api';

interface ExtrasSelectionProps {
  onExtrasChange: (selectedExtras: { extra: Extra; qty: number }[], totalPrice: number) => void;
  selectedExtras: { extra: Extra; qty: number }[];
}

const ExtrasSelection: React.FC<ExtrasSelectionProps> = ({
  onExtrasChange,
  selectedExtras
}) => {
  const [availableExtras, setAvailableExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExtras();
  }, []);

  const fetchExtras = async () => {
    try {
      setLoading(true);
      const extras = await apiClient.getExtras();
      setAvailableExtras(extras.filter(extra => extra.active));
      setError(null);
    } catch (err) {
      console.error('Error fetching extras:', err);
      setError('Failed to load extras');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (extra: Extra, newQty: number) => {
    const updatedExtras = [...selectedExtras];
    const existingIndex = updatedExtras.findIndex(item => item.extra._id === extra._id);

    if (newQty === 0) {
      // Remove from selection
      if (existingIndex !== -1) {
        updatedExtras.splice(existingIndex, 1);
      }
    } else {
      // Add or update quantity
      if (existingIndex !== -1) {
        updatedExtras[existingIndex].qty = newQty;
      } else {
        updatedExtras.push({ extra, qty: newQty });
      }
    }

    const totalPrice = updatedExtras.reduce((sum, item) => sum + (item.extra.price * item.qty), 0);
    onExtrasChange(updatedExtras, totalPrice);
  };

  const getSelectedQuantity = (extra: Extra): number => {
    const found = selectedExtras.find(item => item.extra._id === extra._id);
    return found ? found.qty : 0;
  };

  // Group extras by category
  const groupedExtras = availableExtras.reduce((acc, extra) => {
    const category = extra.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(extra);
    return acc;
  }, {} as Record<string, Extra[]>);

  const totalSelectedPrice = selectedExtras.reduce((sum, item) => sum + (item.extra.price * item.qty), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading extras...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchExtras}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (availableExtras.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        No extras available at this time.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Available Extras</h3>
      
      {Object.entries(groupedExtras).map(([category, extras]) => (
        <div key={category} className="space-y-4">
          <h4 className="text-md font-medium text-gray-700 border-b border-gray-200 pb-2">
            {category}
          </h4>
          
          <div className="grid gap-3">
            {extras.map((extra) => {
              const selectedQty = getSelectedQuantity(extra);
              
              return (
                <div
                  key={extra._id}
                  className={`
                    border rounded-lg p-4 transition-all duration-200
                    ${selectedQty > 0 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{extra.name}</h5>
                      {extra.description && (
                        <p className="text-sm text-gray-600 mt-1">{extra.description}</p>
                      )}
                      <p className="text-lg font-semibold text-blue-600 mt-2">
                        £{extra.price.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-3 ml-4">
                      <button
                        onClick={() => updateQuantity(extra, Math.max(0, selectedQty - 1))}
                        disabled={selectedQty === 0}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center transition-colors
                          ${selectedQty === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }
                        `}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className={`
                        w-8 text-center font-medium
                        ${selectedQty > 0 ? 'text-blue-600' : 'text-gray-600'}
                      `}>
                        {selectedQty}
                      </span>
                      
                      <button
                        onClick={() => updateQuantity(extra, Math.min(10, selectedQty + 1))}
                        disabled={selectedQty >= 10}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center transition-colors
                          ${selectedQty >= 10
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }
                        `}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {selectedQty > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {selectedQty} × £{extra.price.toFixed(2)}
                        </span>
                        <span className="font-medium text-gray-900">
                          £{(extra.price * selectedQty).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selectedExtras.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Selected Extras Summary</h4>
          <div className="space-y-2">
            {selectedExtras.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.extra.name} × {item.qty}
                </span>
                <span className="font-medium">
                  £{(item.extra.price * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between font-medium text-gray-900">
              <span>Total Extras:</span>
              <span>£{totalSelectedPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtrasSelection;
