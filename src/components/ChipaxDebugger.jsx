// ChipaxDebugger.jsx
import React, { useState } from 'react';
import { Play, Code, CheckCircle, AlertTriangle, Clock, Download } from 'lucide-react';
import chipaxService from '../services/chipaxService';

/**
 * Componente para debugging y testing de la API de Chipax
 */
const ChipaxDebugger = () => {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('all');

  // Lista de endpoints a probar (basado en documentación oficial)
  const endpoints = [
    {
      id: 'token',
      name: '🔑 Token de Acceso',
      description: 'Verificar autenticación',
      test: () => chipaxService.getChipaxToken()
    },
    // === SALDOS Y CUENTAS BANCARIAS ===
    {
      id: 'cuentas-corrientes', 
      name: '🏦 Cuentas Corrientes',
      description: 'Saldos bancarios principales',
      test: () => chipaxService.fetchFromChipax('/cuentas_corrientes')
    },
    {
      id: 'cartolas',
      name: '🏧 Cartolas Bancarias',
      description: 'Movimientos bancarios detallados',
      test: () => chipaxService.fetchFromChipax('/cartolas')
    },
    {
      id: 'bancos',
      name: '🏦 Lista de Bancos',
      description: 'Bancos disponibles',
      test: () => chipaxService.fetchFromChipax('/bancos')
    },
    // === FACTURAS Y DOCUMENTOS ===
    {
      id: 'dtes',
      name: '📄 DTEs (Todos)',
      description: 'Documentos tributarios electrónicos',
      test: () => chipaxService.fetchFromChipax('/dtes')
    },
    {
      id: 'dtes-venta',
      name: '📄 DTEs de Venta (Por Cobrar)',
      description: 'Facturas de venta pendientes',
      test: () => chipaxService.fetchFromChipax('/dtes?porCobrar=1')
    },
    {
      id: 'facturas',
      name: '🧾 Facturas',
      description: 'Facturas emitidas',
      test: () => chipaxService.fetchFromChipax('/facturas')
    },
    // === COMPRAS Y PROVEEDORES ===
    {
      id: 'compras-todas',
      name: '🛒 Compras (Todas)',
      description: 'Todas las facturas de compra',
      test: () => chipaxService.fetchFromChipax('/compras')
    },
    {
      id: 'compras-por-pagar',
      name: '💸 Compras Por Pagar',
      description: 'Compras pendientes de pago',
      test: () => chipaxService.fetchFromChipax('/compras?pagado=false')
    },
    {
      id: 'compras-estado',
      name: '⏳ Compras Por Estado',
      description: 'Compras filtradas por estado',
      test: () => chipaxService.fetchFromChipax('/compras?estado=por_pagar')
    },
    {
      id: 'proveedores',
      name: '🏢 Proveedores',
      description: 'Lista de proveedores',
      test: () => chipaxService.fetchFromChipax('/proveedores')
    },
    // === PAGOS Y COBROS ===
    {
      id: 'pagos',
      name: '💰 Pagos',
      description: 'Pagos realizados',
      test: () => chipaxService.fetchFromChipax('/pagos')
    },
    {
      id: 'cobros',
      name: '💳 Cobros',
      description: 'Cobros realizados',
      test: () => chipaxService.fetchFromChipax('/cobros')
    },
    // === FLUJO DE CAJA Y PROYECCIONES ===
    {
      id: 'flujo-caja-init',
      name: '💰 Flujo de Caja (Init)',
      description: 'Datos principales de flujo de caja',
      test: () => chipaxService.fetchFromChipax('/flujo-caja/init')
    },
    {
      id: 'proyecciones',
      name: '📈 Proyecciones',
      description: 'Proyecciones financieras',
      test: () => chipaxService.fetchFromChipax('/proyecciones')
    },
    {
      id: 'kpis',
      name: '📊 KPIs',
      description: 'Indicadores clave',
      test: () => chipaxService.fetchFromChipax('/kpis')
    },
    // === CONFIGURACIÓN ===
    {
      id: 'clientes',
      name: '👥 Clientes',
      description: 'Lista de clientes',
      test: () => chipaxService.fetchFromChipax('/clientes')
    },
    {
      id: 'productos',
      name: '📦 Productos',
      description: 'Catálogo de productos',
      test: () => chipaxService.fetchFromChipax('/productos')
    },
    {
      id: 'monedas',
      name: '💱 Monedas',
      description: 'Monedas disponibles',
      test: () => chipaxService.fetchFromChipax('/monedas')
    },
    // === OTROS DOCUMENTOS ===
    {
      id: 'honorarios',
      name: '🧾 Honorarios',
      description: 'Boletas de honorarios',
      test: () => chipaxService.fetchFromChipax('/honorarios')
    },
    {
      id: 'boletas-terceros',
      name: '🧾 Boletas de Terceros',
      description: 'Boletas de terceros',
      test: () => chipaxService.fetchFromChipax('/boletas_terceros')
    },
    // === EXPERIMENTAL ===
    {
      id: 'empresas',
      name: '🏢 Empresas',
      description: 'Empresas disponibles',
      test: () => chipaxService.fetchFromChipax('/empresas')
    },
    {
      id: 'alertas',
      name: '🔔 Alertas',
      description: 'Alertas financieras',
      test: () => chipaxService.fetchFromChipax('/alertas')
    }
  ];

  // Función para probar un endpoint específico
  const testEndpoint = async (endpoint) => {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Probando endpoint: ${endpoint.name}`);
      
      const result = await endpoint.test();
      const duration = Date.now() - startTime;
      
      // Analizar la respuesta
      let analysis = {
        success: true,
        duration,
        dataType: typeof result,
        hasData: false,
        itemCount: 0,
        structure: {},
        sample: null
      };

      // Analizar estructura de datos
      if (result) {
        if (result.items && Array.isArray(result.items)) {
          analysis.hasData = result.items.length > 0;
          analysis.itemCount = result.items.length;
          analysis.structure.hasItems = true;
          analysis.structure.hasPagination = !!result.paginationAttributes;
          if (result.items.length > 0) {
            analysis.sample = result.items[0];
          }
        } else if (Array.isArray(result)) {
          analysis.hasData = result.length > 0;
          analysis.itemCount = result.length;
          analysis.structure.isArray = true;
          if (result.length > 0) {
            analysis.sample = result[0];
          }
        } else if (typeof result === 'object') {
          analysis.hasData = Object.keys(result).length > 0;
          analysis.structure.isObject = true;
          analysis.sample = result;
        } else {
          analysis.hasData = !!result;
          analysis.sample = result;
        }
      }

      return {
        status: 'success',
        data: result,
        analysis,
        error: null
      };

    } catch (error) {
      console.error(`❌ Error en ${endpoint.name}:`, error);
      
      return {
        status: 'error',
        data: null,
        analysis: null,
        error: {
          message: error.message,
          duration: Date.now() - startTime
        }
      };
    }
  };

  // Función para probar todos los endpoints
  const testAllEndpoints = async () => {
    setTesting(true);
    setResults({});
    
    console.log('🚀 Iniciando prueba completa de API de Chipax...');
    
    for (const endpoint of endpoints) {
      console.log(`\n📡 Probando: ${endpoint.name}`);
      
      const result = await testEndpoint(endpoint);
      
      setResults(prev => ({
        ...prev,
        [endpoint.id]: result
      }));

      // Pequeña pausa entre requests para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTesting(false);
    console.log('✅ Prueba completa finalizada');
  };

  // Función para probar un endpoint individual
  const testSingleEndpoint = async (endpointId) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    setTesting(true);
    
    const result = await testEndpoint(endpoint);
    
    setResults(prev => ({
      ...prev,
      [endpoint.id]: result
    }));
    
    setTesting(false);
  };

  // Función para exportar resultados
  const exportResults = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      totalEndpoints: endpoints.length,
      successfulEndpoints: Object.values(results).filter(r => r.status === 'success').length,
      failedEndpoints: Object.values(results).filter(r => r.status === 'error').length,
      results: results
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chipax-api-test-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Renderizar resultado de un endpoint
  const renderResult = (endpointId, result) => {
    if (!result) return null;

    const getStatusIcon = () => {
      switch (result.status) {
        case 'success':
          return <CheckCircle size={16} className="text-green-500" />;
        case 'error':
          return <AlertTriangle size={16} className="text-red-500" />;
        default:
          return <Clock size={16} className="text-gray-500" />;
      }
    };

    const getStatusColor = () => {
      switch (result.status) {
        case 'success':
          return result.analysis?.hasData ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50';
        case 'error':
          return 'border-red-500 bg-red-50';
        default:
          return 'border-gray-300 bg-gray-50';
      }
    };

    return (
      <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            {getStatusIcon()}
            <span className="ml-2 font-medium">
              {endpoints.find(e => e.id === endpointId)?.name}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {result.analysis?.duration || result.error?.duration}ms
          </span>
        </div>

        {result.status === 'success' && result.analysis && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Estado:</span>
                <span className={`ml-1 ${result.analysis.hasData ? 'text-green-600' : 'text-yellow-600'}`}>
                  {result.analysis.hasData ? '✅ Con datos' : '⚠️ Sin datos'}
                </span>
              </div>
              <div>
                <span className="font-medium">Elementos:</span>
                <span className="ml-1">{result.analysis.itemCount}</span>
              </div>
            </div>

            {result.analysis.structure && (
              <div>
                <span className="font-medium">Estructura:</span>
                <span className="ml-1 text-gray-600">
                  {result.analysis.structure.hasItems && '📄 Con items array'}
                  {result.analysis.structure.hasPagination && ' | 📃 Paginado'}
                  {result.analysis.structure.isArray && '📋 Array directo'}
                  {result.analysis.structure.isObject && '📦 Objeto'}
                </span>
              </div>
            )}

            {result.analysis.sample && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                  Ver muestra de datos
                </summary>
                <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(result.analysis.sample, null, 2).substring(0, 500)}
                  {JSON.stringify(result.analysis.sample, null, 2).length > 500 && '...'}
                </pre>
              </details>
            )}
          </div>
        )}

        {result.status === 'error' && (
          <div className="text-sm text-red-600">
            <span className="font-medium">Error:</span>
            <span className="ml-1">{result.error.message}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Code size={20} className="mr-2 text-blue-600" />
            Chipax API Debugger
          </h2>
          <p className="text-sm text-gray-500">
            Prueba y analiza todos los endpoints disponibles de la API de Chipax
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={exportResults}
            disabled={Object.keys(results).length === 0}
            className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={16} className="mr-1" />
            Exportar
          </button>
          
          <button
            onClick={testAllEndpoints}
            disabled={testing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Play size={16} className="mr-1" />
            {testing ? 'Probando...' : 'Probar Todos'}
          </button>
        </div>
      </div>

      {/* Selector de endpoint individual */}
      <div className="mb-4">
        <div className="flex space-x-2">
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
            disabled={testing}
          >
            <option value="all">Seleccionar endpoint individual</option>
            {endpoints.map(endpoint => (
              <option key={endpoint.id} value={endpoint.id}>
                {endpoint.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => testSingleEndpoint(selectedEndpoint)}
            disabled={testing || selectedEndpoint === 'all'}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Probar
          </button>
        </div>
      </div>

      {/* Resumen de resultados */}
      {Object.keys(results).length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Resumen de Pruebas:</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-green-600">✅ Exitosos:</span>
              <span className="ml-1 font-medium">
                {Object.values(results).filter(r => r.status === 'success').length}
              </span>
            </div>
            <div>
              <span className="text-red-600">❌ Con errores:</span>
              <span className="ml-1 font-medium">
                {Object.values(results).filter(r => r.status === 'error').length}
              </span>
            </div>
            <div>
              <span className="text-blue-600">📊 Con datos:</span>
              <span className="ml-1 font-medium">
                {Object.values(results).filter(r => r.status === 'success' && r.analysis?.hasData).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Resultados de pruebas */}
      <div className="space-y-3">
        {endpoints.map(endpoint => (
          <div key={endpoint.id}>
            {results[endpoint.id] ? (
              renderResult(endpoint.id, results[endpoint.id])
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center">
                  <Clock size={16} className="text-gray-400" />
                  <span className="ml-2 text-gray-600">{endpoint.name}</span>
                  <span className="ml-2 text-xs text-gray-500">- {endpoint.description}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChipaxDebugger;
