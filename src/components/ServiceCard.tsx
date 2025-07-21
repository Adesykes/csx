import React from 'react';
import { Clock } from 'lucide-react';
import { Service } from '../types';

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onSelect: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  // Updated to use darker pink background for unselected cards
  return (
    <div
      onClick={() => onSelect(service)}
      className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-pink-200 hover:border-blue-300'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
        <div className="flex items-center space-x-1 text-green-600 font-bold">
          <span>£</span>
          <span>{service.price}</span>
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-3">{service.description}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 text-gray-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{service.duration} min</span>
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-wide">
          {service.category}
        </span>
      </div>
    </div>
  );
};

export default ServiceCard;