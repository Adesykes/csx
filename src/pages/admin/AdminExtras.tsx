import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { apiClient } from '../../lib/api';
import type { Extra } from '../../types';

const AdminExtras: React.FC = () => {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const [newExtra, setNewExtra] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    active: true
  });
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    fetchExtras();
  }, []);

  const fetchExtras = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getExtrasAdmin();
      setExtras(data);
    } catch (error) {
      console.error('Error fetching extras:', error);
      setError('Failed to load extras');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExtra = async () => {
    try {
      // Validate required fields
      if (!newExtra.name.trim()) {
        setError('Extra name is required');
        return;
      }
      if (!newExtra.price || parseFloat(newExtra.price) <= 0) {
        setError('Valid price is required');
        return;
      }
      if (!newExtra.category.trim()) {
        setError('Category is required');
        return;
      }

      const extraData = {
        name: newExtra.name.trim(),
        description: newExtra.description.trim(),
        price: parseFloat(newExtra.price),
        category: newExtra.category.trim(),
        active: newExtra.active
      };
      
      console.log('Creating extra with data:', extraData);
      await apiClient.createExtra(extraData);
      
      setNewExtra({
        name: '',
        description: '',
        price: '',
        category: '',
        active: true
      });
      setShowNewForm(false);
      setError(null); // Clear any previous errors
      fetchExtras();
    } catch (error) {
      console.error('Error creating extra:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create extra';
      setError(`Failed to create extra: ${errorMessage}`);
    }
  };

  const handleUpdateExtra = async (extra: Extra) => {
    try {
      if (!extra._id && !extra.id) return;
      const id = extra._id || extra.id;
      await apiClient.updateExtra(id!, extra);
      setEditingExtra(null);
      fetchExtras();
    } catch (error) {
      console.error('Error updating extra:', error);
      setError('Failed to update extra');
    }
  };

  const handleDeleteExtra = async (extraId: string) => {
    if (!confirm('Are you sure you want to delete this extra?')) return;
    
    try {
      await apiClient.deleteExtra(extraId);
      fetchExtras();
    } catch (error) {
      console.error('Error deleting extra:', error);
      setError('Failed to delete extra');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading extras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Manage Extras
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Add, edit, and manage service extras for your clients
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Extra
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* New Extra Form */}
        {showNewForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Extra</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newExtra.name}
                  onChange={(e) => setNewExtra({ ...newExtra, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Extra name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newExtra.category}
                  onChange={(e) => setNewExtra({ ...newExtra, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Nail Art, Add-ons"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newExtra.price}
                  onChange={(e) => setNewExtra({ ...newExtra, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newExtra.description}
                  onChange={(e) => setNewExtra({ ...newExtra, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this extra service..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={handleCreateExtra}
                disabled={!newExtra.name || !newExtra.price}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 inline mr-2" />
                Create Extra
              </button>
            </div>
          </div>
        )}

        {/* Extras Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {extras.map((extra) => (
                <tr key={extra._id || extra.id}>
                  {editingExtra && (editingExtra._id === extra._id || editingExtra.id === extra.id) ? (
                    // Edit mode
                    <>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          value={editingExtra.name}
                          onChange={(e) => setEditingExtra({ ...editingExtra, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          value={editingExtra.category}
                          onChange={(e) => setEditingExtra({ ...editingExtra, category: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="number"
                          step="0.01"
                          value={editingExtra.price}
                          onChange={(e) => setEditingExtra({ ...editingExtra, price: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={editingExtra.active ? 'active' : 'inactive'}
                          onChange={(e) => setEditingExtra({ ...editingExtra, active: e.target.value === 'active' })}
                          className="px-2 py-1 rounded border border-gray-300 text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateExtra(editingExtra)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingExtra(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // View mode
                    <>
                      <td className="py-4 px-6">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{extra.name}</div>
                          <div className="text-sm text-gray-500">{extra.description}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-900">{extra.category}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-900">£{extra.price}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          extra.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {extra.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingExtra(extra)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExtra(extra._id || extra.id!)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {extras.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No extras found. Create your first extra to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminExtras;
