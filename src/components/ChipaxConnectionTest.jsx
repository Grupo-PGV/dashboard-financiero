import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxConnectionTest = () => {
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  const endpoints = [
    { name: 'Autenticación', test: () => chipaxService.getChipaxToken() },
    { name: 'Bancos', test: () => chipaxService.fetchFromChipax('/bancos?page=1&limit=1') },
    { name: 'Cuentas Bancarias', test: () => chipaxService.fetchFromChipax('/cuentas_bancarias?page=1&limit=1') },
    { name: 'Facturas (DTE)', test: () => chipaxService.fetchFromChipax('/dtes?page=1&limit=1') },
    { name: 'Compras', test: () => chipaxService.fetchFromChipax('/compras?page=1&limit=1') },
    { name: 'Clientes', test: () => chipaxService.fetchFromChipax('/clientes?page=1&limit=1') },
    { name: 'Proveedores', test: () => chipaxService.fetchFromChipax('/proveedores?page=1&limit=1') }
  ];

  const runTests = async () => {
    setTesting(true);
    setTestResults({});

    for (const endpoint of endpoints) {
      try {
        setTestResults(prev => ({
          ...prev,
          [endpoint.name]: { status: 'testing' }
        }));

        const startTime = Date.now();
        await endpoint.test();
        const duration = Date.now() - startTime;

        setTestResults(prev => ({
          ...prev,
          [endpoint.name]: { 
            status: 'success', 
            message: `OK (${duration}ms)` 
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          [endpoint.name]: { 
            status: 'error', 
            message: error.message 
          }
        }));
      }
    }

    setTesting(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'testing':
        return <Loader className="text-blue-500 animate-spin" size={20} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Test de Conexión Chipax API v2</h2>
        <button
          onClick={runTests}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={testing ? 'animate-spin' : ''} />
          {testing ? 'Probando...' : 'Ejecutar Pruebas'}
        </button>
      </div>

      <div className="space-y-3">
        {endpoints.map(endpoint => (
          <div 
            key={endpoint.name}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <span className="font-medium">{endpoint.name}</span>
            <div className="flex items-center gap-2">
              {testResults[endpoint.name] && (
                <>
                  {getStatusIcon(testResults[endpoint.name].status)}
                  <span className={`text-sm ${
                    testResults[endpoint.name].status === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {testResults[endpoint.name].message}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Resumen:</h3>
          <ul className="text-sm space-y-1">
            <li>✅ Exitosos: {Object.values(testResults).filter(r => r.status === 'success').length}</li>
            <li>❌ Fallidos: {Object.values(testResults).filter(r => r.status === 'error').length}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChipaxConnectionTest;
