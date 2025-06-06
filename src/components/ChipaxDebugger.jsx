// ChipaxDebugger.jsx - Herramienta de diagnóstico para la API de Chipax
import React, { useState } from 'react';
import { Play, AlertCircle, CheckCircle, Info, Copy, RefreshCw } from 'lucide-react';

const ChipaxDebugger = () => {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  // Configuraciones a probar
  const API_CONFIGS = [
    {
      name: 'Directo v2',
      url: 'https://api.chipax.com/v2/login',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      name: 'Directo API',
      url: 'https://api.chipax.com/api/login',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      name: 'Proxy Netlify',
      url: '/api/login',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      name: 'Proxy v2',
      url: '/v2/login',
      headers: { 'Content-Type': 'application/json' }
    }
  ];

  const AUTH_METHODS = [
    {
      name: 'app_id/secret_key',
      body: {
        app_id: '605e0aa5-ca0c-4513-b6ef-0030ac1f0849',
        secret_key: 'f01974df-86e1-45a0-924f-75961ea926fc'
      }
    },
    {
      name: 'email/password',
      body: {
        email: 'emilio@quickentrada.com',
        password: 'Quick2024$$'
      }
    }
  ];

  const testConfiguration = async (config, authMethod) => {
    const testId = `${config.name}-${authMethod.name}`;
    setCurrentTest(testId);

    try {
      const startTime = Date.now();
      
      const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(authMethod.body)
      });

      const duration = Date.now() - startTime;
      let responseData = null;
      let responseText = '';

      try {
        responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = null;
      }

      return {
        id: testId,
        config: config.name,
        auth: authMethod.name,
        url: config.url,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        duration: duration,
        responseData: responseData,
        responseText: responseText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        id: testId,
        config: config.name,
        auth: authMethod.name,
        url: config.url,
        status: 'ERROR',
        statusText: error.message,
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    
    const allResults = [];

    for (const config of API_CONFIGS) {
      for (const authMethod of AUTH_METHODS) {
        const result = await testConfiguration(config, authMethod);
        allResults.push(result);
        setResults(prev => [...prev, result]);
        
        // Pequeña pausa entre pruebas
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setTesting(false);
    setCurrentTest('');
  };

  const copyResults = () => {
    const text = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(text);
    alert('Resultados copiados al portapapeles');
  };

  const getStatusIcon = (result) => {
    if (result.success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (result.status === 'ERROR') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    if (status === 200) return 'text-green-600 bg-green-100';
    if (status === 401) return 'text-yellow-600 bg-yellow-100';
    if (status === 404) return 'text-orange-600 bg-orange-100';
    if (status === 'ERROR') return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🔧 Diagnóstico de Conexión Chipax
        </h2>
        <p className="text-gray-600">
          Esta herramienta prueba diferentes configuraciones de URL y autenticación
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Información de pruebas:</p>
            <ul className="mt-1 space-y-1 text-blue-800">
              <li>• Se probarán {API_CONFIGS.length} configuraciones de URL</li>
              <li>• Se probarán {AUTH_METHODS.length} métodos de autenticación</li>
              <li>• Total: {API_CONFIGS.length * AUTH_METHODS.length} pruebas</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={runAllTests}
          disabled={testing}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Probando {currentTest}...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Ejecutar Todas las Pruebas
            </>
          )}
        </button>

        {results.length > 0 && (
          <button
            onClick={copyResults}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar Resultados
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Resultados:</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Configuración
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Autenticación
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Respuesta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiempo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result.id}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusIcon(result)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.config}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {result.auth}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {result.url}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                        {result.status} {result.statusText}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {result.duration ? `${result.duration}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalles de respuestas exitosas */}
          {results.filter(r => r.success).length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-green-800 mb-3">
                ✅ Respuestas Exitosas:
              </h4>
              <div className="space-y-3">
                {results.filter(r => r.success).map(result => (
                  <div key={result.id} className="bg-green-50 p-4 rounded-lg">
                    <p className="font-medium text-green-900">
                      {result.config} + {result.auth}
                    </p>
                    <pre className="mt-2 text-xs text-green-800 overflow-x-auto">
                      {JSON.stringify(result.responseData, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detalles de errores */}
          {results.filter(r => !r.success).length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-red-800 mb-3">
                ❌ Errores Encontrados:
              </h4>
              <div className="space-y-3">
                {results.filter(r => !r.success).map(result => (
                  <div key={result.id} className="bg-red-50 p-4 rounded-lg">
                    <p className="font-medium text-red-900">
                      {result.config} + {result.auth}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Estado: {result.status} - {result.statusText || result.error}
                    </p>
                    {result.responseText && (
                      <pre className="mt-2 text-xs text-red-600 overflow-x-auto">
                        {result.responseText}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChipaxDebugger;
