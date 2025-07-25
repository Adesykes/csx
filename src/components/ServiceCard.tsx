import React from 'react';
import { Clock, Plus, Minus } from 'lucide-react';
import { Service } from '../types';

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  quantity?: number; // For 0-duration services
  onSelect: (service: Service) => void;
  onQuantityChange?: (service: Service, quantity: number) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  isSelected, 
  quantity = 0, 
  onSelect, 
  onQuantityChange 
}) => {
  const isQuantityService = (service.duration === 0 || 
    service.category?.toLowerCase() === 'nail art' || 
    service.category?.toLowerCase() === 'nail repair') &&
    service.category?.toLowerCase() !== 'block colour';
  
  const handleCardClick = () => {
    if (isQuantityService) {
      // For quantity services, clicking toggles selection
      if (isSelected) {
        // If already selected, deselect by setting quantity to 0
        handleQuantityUpdate(0);
      } else {
        // If not selected, add to selection
        onSelect(service);
      }
    } else {
      // For regular services, clicking toggles selection
      onSelect(service);
    }
  };

  const handleQuantityUpdate = (newQty: number) => {
    if (onQuantityChange) {
      onQuantityChange(service, newQty);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`p-4 sm:p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-lg relative cursor-pointer touch-manipulation ${
        isSelected
          ? 'border-purple-500 bg-purple-100 shadow-md'
          : 'border-purple-300 bg-purple-50 hover:border-purple-500'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
          ✓
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 space-y-2 sm:space-y-0">
        <h3 className="text-lg font-semibold text-gray-900 pr-0 sm:pr-8">{service.name}</h3>
        <div className="flex items-center space-x-1 text-green-600 font-bold flex-shrink-0">
          <span>£</span>
          <span>{service.price}</span>
          {isQuantityService && quantity > 0 && (
            <span className="text-sm text-gray-600 ml-2">
              × {quantity} = £{(service.price * quantity).toFixed(2)}
            </span>
          )}
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-3 leading-relaxed">{service.description}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 text-gray-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            {isQuantityService ? 'Per item' : 'Service'}
          </span>
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {service.category}
        </span>
      </div>

      {isQuantityService && isSelected && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Quantity:</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newQty = Math.max(0, quantity - 1);
                  handleQuantityUpdate(newQty);
                }}
                disabled={quantity === 0}
                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                  quantity === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300'
                }`}
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <span className={`w-8 text-center font-medium ${
                quantity > 0 ? 'text-purple-600' : 'text-gray-600'
              }`}>
                {quantity}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityUpdate(Math.min(10, quantity + 1));
                }}
                disabled={quantity >= 10}
                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors touch-manipulation ${
                  quantity >= 10
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-100 text-green-600 hover:bg-green-200 active:bg-green-300'
                }`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCard;