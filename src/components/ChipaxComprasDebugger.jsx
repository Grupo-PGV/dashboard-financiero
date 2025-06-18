// ChipaxComprasDebugger.jsx - Componente para explorar endpoints de Chipax
import React, { useState } from 'react';
import { Play, Search, CheckCircle, AlertCircle, FileText, Calendar, Filter, Database } from 'lucide-react';

// Servicio integrado para el debugger
const chipaxDebugService = {
  tokenCache: { token: null, expiry: null },

  async getChipaxToken() {
    const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
    const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
    const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

    if (this.tokenCache.token && this.tokenCache.expiry && Date.now() < this.tokenCache.expiry - 300000) {
      return this.tokenCache.token;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: APP_ID, secret_key: SECRET_KEY })
      });

      const data = await response.json();
      const token = data.access_token || data.token || data.jwt;
      
      this.tokenCache.token = token;
      this.tokenCache.expiry = Date.now() + (50 * 60 * 1000);
      
      return token;
    } catch (error) {
      throw new Error(`Error de autenticación: ${error.message}`);
    }
  },

  async fetchFromChipax(endpoint) {
    const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
    
    try {
      const token = await this.getChipaxToken();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
};

const ChipaxComprasDebugger = () => {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);

  // Endpoints específicos para facturas de compra
  const endpointsToTest = [
    {
      path: '/compras/libro_compras',
      name: 'Libro de Compras (NUEVO)',
      description: 'Posible endpoint con todas las facturas salvo pendientes de aprobación',
      priority: 'high',
      params: [
        { param: '', desc: 'Sin parámetros' },
        { param: '?limit=10&page=1', desc: 'Con paginación' },
        { param: '?year=2025', desc: 'Solo 2025' },
        { param: '?year=2024', desc: 'Solo 2024' }
      ]
    },
    {
      path: '/compras',
      name: 'Compras Actual (2025 rápido)',
      description: 'Endpoint actual pero optimizado para 2025',
      priority: 'high',
      params: [
        { param: '?year=2025&limit=100', desc: 'Solo 2025 con más items' },
        { param: '?desde=2025-01-01&limit=100', desc: 'Desde enero 2025' },
        { param: '?fechaDesde=2025-01-01', desc: 'Fecha desde 2025' }
      ]
    },
    {
      path: '/compras/pendientes',
      name: 'Compras Pendientes',
      description: 'Facturas pendientes de aprobación',
      priority: 'high',
      params: [
        { param: '', desc: 'Sin parámetros' },
        { param: '?estado=pendiente', desc: 'Estado pendiente' },
        { param: '?aprobacion=pendiente', desc: 'Pendientes aprobación' }
      ]
    },
    {
      path: '/facturas/pendientes-aprobacion',
      name: 'Facturas Pendientes Aprobación',
      description: 'Endpoint específico para aprobaciones',
      priority: 'medium',
      params: [
        { param: '', desc: 'Sin parámetros' },
        { param: '?limit=50', desc: 'Con limit' }
      ]
    },
    {
      path: '/dtes/recibidos',
      name: 'DTEs Recibidos',
      description: 'DTEs recibidos como alternativa',
      priority: 'medium',
      params: [
        { param: '?year=2025', desc: 'Solo 2025' },
        { param: '?porPagar=1&year=2025', desc: 'Por pagar 2025' }
      ]
    },
    {
      path: '/workflow/compras',
      name: 'Workflow Compras',
      description: 'Posible endpoint de workflow/aprobaciones',
      priority: 'medium',
      params: [
        { param: '', desc: 'Sin parámetros' },
        { param: '?estado=pendiente', desc: 'Pendientes' }
      ]
    }
  ];

  const testAllEndpoints = async () => {
    setTesting(true);
    setResults({});

    for (const endpoint of endpointsToTest) {
      for (const paramOption of endpoint.params) {
        const fullPath = `${endpoint.path}${paramOption.param}`;
        const testKey = `${endpoint.name} - ${paramOption.desc}`;
        
        try {
          console.log(`🔍 Probando: ${fullPath}`);
          
          setResults(prev => ({
            ...prev,
            [testKey]: { status: 'testing', endpoint: fullPath }
          }));

          const startTime = Date.now();
          const data = await chipaxDebugService.fetchFromChipax(fullPath);
          const responseTime = Date.now() - startTime;

          // Analizar la respuesta
          let analysis = { items: [], structure: 'unknown', itemCount: 0 };
          
          if (Array.isArray(data)) {
            analysis.items = data.slice(0, 3);
            analysis.structure = 'array';
            analysis.itemCount = data.length;
          } else if (data?.items && Array.isArray(data.items)) {
            analysis.items = data.items.slice(0, 3);
            analysis.structure = 'object_with_items';
            analysis.itemCount = data.items.length;
            analysis.pagination = data.pagination || data.meta;
          } else if (data?.data && Array.isArray(data.data)) {
            analysis.items = data.data.slice(0, 3);
            analysis.structure = 'object_with_data';
            analysis.itemCount = data.data.length;
          }

          // Análisis de fechas
          let fechaAnalysis = null;
          if (analysis.items.length > 0) {
            const fechas = analysis.items.map(item => ({
              fechaEmision: item.fechaEmision || item.fecha_emision || item.fecha,
              fechaRecepcion: item.fechaRecepcion || item.fecha_recepcion,
              created: item.created,
              estado: item.estado,
              folio: item.folio
            }));
            
            fechaAnalysis = {
              muestraFechas: fechas,
              tieneFacturas2025: fechas.some(f => 
                (f.fechaEmision && f.fechaEmision.includes('2025')) ||
                (f.fechaRecepcion && f.fechaRecepcion.includes('2025')) ||
                (f.created && f.created.includes('2025'))
              )
            };
          }

          setResults(prev => ({
            ...prev,
            [testKey]: {
              status: 'success',
              endpoint: fullPath,
              responseTime,
              analysis,
              fechaAnalysis,
              rawData: data
            }
          }));

          console.log(`✅ ${fullPath}: ${analysis.itemCount} items`);

        } catch (error) {
          setResults(prev => ({
            ...prev,
            [testKey]: {
              status: 'error',
              endpoint: fullPath,
              error: error.message
            }
          }));
          
          console.log(`❌ ${fullPath}: ${error.message}`);
        }

        // Pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setTesting(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'testing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const formatJson = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Database className="text-blue-600" />
          Chipax Compras Debugger
        </h2>
        <p className="text-gray-600">
          Explora diferentes endpoints para encontrar facturas de 2025 y pendientes de aprobación
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={testAllEndpoints}
          disabled={testing}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Probando endpoints...
            </>
          ) : (
            <>
              <Play size={16} />
              Probar Todos los Endpoints
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Resultados */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resultados de Pruebas</h3>
          
          {Object.entries(results).map(([testKey, result]) => (
            <div
              key={testKey}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedEndpoint === testKey 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedEndpoint(testKey)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-sm">{testKey}</span>
                  </div>
                  
                  <code className="text-xs text-gray-600 block mb-2">
                    {result.endpoint}
                  </code>

                  {result.status === 'success' && (
                    <div className="text-sm">
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs mr-2">
                        {result.analysis.itemCount} items
                      </span>
                      
                      {result.fechaAnalysis?.tieneFacturas2025 && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-2">
                          🎯 Tiene 2025
                        </span>
                      )}
                      
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        {result.responseTime}ms
                      </span>
                    </div>
                  )}

                  {result.status === 'error' && (
                    <span className="text-xs text-red-600">
                      {result.error}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Panel de Detalles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detalles del Endpoint</h3>
          
          {selectedEndpoint && results[selectedEndpoint] ? (
            <div className="border rounded-lg p-4">
              <div className="mb-4">
                <h4 className="font-medium mb-2">{selectedEndpoint}</h4>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {results[selectedEndpoint].endpoint}
                </code>
              </div>

              {results[selectedEndpoint].status === 'success' && (
                <div className="space-y-4">
                  {/* Análisis de estructura */}
                  <div>
                    <h5 className="font-medium mb-2">Estructura de Respuesta</h5>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Tipo:</span> {results[selectedEndpoint].analysis.structure}</p>
                      <p><span className="font-medium">Items:</span> {results[selectedEndpoint].analysis.itemCount}</p>
                      <p><span className="font-medium">Tiempo:</span> {results[selectedEndpoint].responseTime}ms</p>
                    </div>
                  </div>

                  {/* Análisis de fechas */}
                  {results[selectedEndpoint].fechaAnalysis && (
                    <div>
                      <h5 className="font-medium mb-2">Análisis de Fechas</h5>
                      <div className="text-sm space-y-2">
                        {results[selectedEndpoint].fechaAnalysis.tieneFacturas2025 && (
                          <p className="text-blue-600 font-medium">🎯 Contiene facturas de 2025</p>
                        )}
                        
                        <div className="space-y-1">
                          {results[selectedEndpoint].fechaAnalysis.muestraFechas.slice(0, 3).map((fecha, i) => (
                            <div key={i} className="bg-gray-50 p-2 rounded text-xs">
                              <p><span className="font-medium">Folio:</span> {fecha.folio}</p>
                              <p><span className="font-medium">Emisión:</span> {fecha.fechaEmision || 'N/A'}</p>
                              <p><span className="font-medium">Recepción:</span> {fecha.fechaRecepcion || 'N/A'}</p>
                              <p><span className="font-medium">Estado:</span> {fecha.estado || 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Muestra de datos */}
                  <div>
                    <h5 className="font-medium mb-2">Muestra de Datos (primeros 3 items)</h5>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-40">
                      {formatJson(results[selectedEndpoint].analysis.items)}
                    </pre>
                  </div>

                  {/* Respuesta completa (colapsable) */}
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer font-medium text-sm">Ver respuesta completa</summary>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-60 mt-2">
                      {formatJson(results[selectedEndpoint].rawData)}
                    </pre>
                  </details>
                </div>
              )}

              {results[selectedEndpoint].status === 'error' && (
                <div className="text-red-600 text-sm">
                  <p className="font-medium">Error:</p>
                  <p>{results[selectedEndpoint].error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-2 opacity-50" />
              <p>Selecciona un endpoint para ver los detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de hallazgos */}
      {!testing && Object.keys(results).length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Search className="text-blue-600" size={16} />
            Resumen de Hallazgos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-green-600">
                Exitosos: {Object.values(results).filter(r => r.status === 'success').length}
              </p>
            </div>
            <div>
              <p className="font-medium text-red-600">
                Errores: {Object.values(results).filter(r => r.status === 'error').length}
              </p>
            </div>
            <div>
              <p className="font-medium text-blue-600">
                Con 2025: {Object.values(results).filter(r => r.fechaAnalysis?.tieneFacturas2025).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipaxComprasDebugger;
