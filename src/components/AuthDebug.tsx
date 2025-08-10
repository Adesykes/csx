import React, { useState } from 'react';
import { apiClient } from '../lib/api';

const AuthDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpass123');

  const runDiagnostics = async () => {
    const info: string[] = [];
    
    // Environment info
    info.push('=== ENVIRONMENT INFO ===');
    info.push(`Hostname: ${window.location.hostname}`);
    info.push(`Protocol: ${window.location.protocol}`);
    info.push(`Port: ${window.location.port}`);
    info.push(`Origin: ${window.location.origin}`);
    info.push(`User Agent: ${navigator.userAgent}`);
    
    // LocalStorage test
    info.push('\n=== LOCALSTORAGE TEST ===');
    try {
      localStorage.setItem('test', 'value');
      const retrieved = localStorage.getItem('test');
      info.push(`LocalStorage working: ${retrieved === 'value' ? 'YES' : 'NO'}`);
      localStorage.removeItem('test');
    } catch (e) {
      info.push(`LocalStorage error: ${e}`);
    }
    
    // Current auth state
    info.push('\n=== CURRENT AUTH STATE ===');
    const authToken = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    info.push(`Auth token exists: ${!!authToken}`);
    info.push(`User info exists: ${!!userInfo}`);
    if (authToken) {
      info.push(`Token length: ${authToken.length}`);
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        info.push(`Token payload: ${JSON.stringify(payload, null, 2)}`);
      } catch (e) {
        info.push(`Token parsing error: ${e}`);
      }
    }
    
    // API connectivity test
    info.push('\n=== API CONNECTIVITY TEST ===');
    try {
      const response = await fetch('/api/services');
      info.push(`Services API status: ${response.status}`);
      info.push(`Services API ok: ${response.ok}`);
    } catch (e) {
      info.push(`Services API error: ${e}`);
    }
    
    setDebugInfo(info.join('\n'));
  };

  const testLogin = async () => {
    const info: string[] = [debugInfo, '\n=== LOGIN TEST ==='];
    
    try {
      info.push(`Attempting login with: ${testEmail}`);
      const response = await apiClient.clientLogin(testEmail, testPassword);
      info.push(`Login successful: ${JSON.stringify(response, null, 2)}`);
    } catch (e) {
      info.push(`Login error: ${e}`);
    }
    
    setDebugInfo(info.join('\n'));
  };

  const clearAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    setDebugInfo(debugInfo + '\n\n=== AUTH CLEARED ===');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug Tool</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={runDiagnostics}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Run Diagnostics
        </button>
        
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Test email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Test password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <button
            onClick={testLogin}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Login
          </button>
        </div>
        
        <button
          onClick={clearAuth}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Clear Auth
        </button>
      </div>
      
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
        {debugInfo || 'Click "Run Diagnostics" to see debug information'}
      </pre>
    </div>
  );
};

export default AuthDebug;
