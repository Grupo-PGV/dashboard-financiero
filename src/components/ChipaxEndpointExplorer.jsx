import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxEndpointExplorer = () => {
  const [exploring, setExploring] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);

  // Lista exhaustiva de endpoints a probar
  const endpointsToExplore = [
    // Compras y facturas recibidas
    { path: '/compras', name: 'Compras (actual)', category: 'compras' },
    { path: '/compras?recientes=1', name: 'Compras Recientes', category: 'compras' },
    { path: '/compras?estado=pendiente', name: 'Compras Pendientes', category: 'compras' },
    { path: '/compras?year=2025', name: 'Compras 2025', category: 'compras' },
    { path: '/compras?year=2024', name: 'Compras 2024', category: 'compras' },
    
    // DTEs recibidos
    { path: '/dtes', name: 'Todos los DTEs', category: 'dtes' },
    { path: '/dtes?recibidos=1', name: 'DTEs Recibidos', category: 'dtes' },
    { path: '/dtes?tipo=33', name: 'DTEs Tipo 33 (Facturas)', category: 'dtes' },
    { path: '/dtes?tipo=34', name: 'DTEs Tipo 34 (No Afectas)', category: 'dtes' },
    { path: '/dtes?enviados=0', name: 'DTEs No Enviados (Recibidos)', category: 'dtes' },
    { path: '/dtes?porPagar=1', name: 'DTEs Por Pagar', category: 'dtes' },
    
    // Documentos recibidos
    { path: '/documentos-recibidos', name: 'Documentos Recibidos', category: 'documentos' },
    { path: '/facturas-recibidas', name: 'Facturas Recibidas', category: 'documentos' },
    { path: '/documentos?tipo=recibido', name: 'Documentos Tipo Recibido', category: 'documentos' },
    
    // Otros posibles
    { path: '/facturas', name: 'Facturas', category: 'otros' },
    { path: '/invoices', name: 'Invoices', category: 'otros' },
    { path: '/recibidos', name: 'Recibidos', category: 'otros' },
    { path: '/inbox', name: 'Inbox', category: 'otros' },
  ];

  const exploreEndpoints = async () => {
    setExploring(true);
    setResults([]);
    setSelectedResult(null);

    const newResults = [];

    for (const endpoint of endpointsToExplore) {
      try {
        console.log(`🔍 Explorando: ${endpoint.path}`);
        
        const startTime = Date.now();
        const data = await chipaxService.fetchFromChipax(`${endpoint.path}?limit=5&page=1`);
        const responseTime = Date.now() - startTime;

        // Analizar estructura de respuesta
        let items = [];
        let structure = 'unknown';
        
        if (Array.isArray(data)) {
          items = data;
          structure = 'array';
        } else if (data && data.items && Array.isArray(data.items)) {
          items = data.items;
          structure = 'object_with_items';
        } else if (data && data.data && Array.isArray(data.data)) {
          items = data.data;
          structure = 'object_with_data';
        }

        // Analizar fechas en los datos
        let fechaAnalysis = null;
        if (items.length > 0) {
          const primeraFecha = items[0];
          fechaAnalysis = {
            fechaEmision: primeraFecha.fechaEmision || primeraFecha.fecha_emision,
            fechaRecepcion: primeraFecha.fechaRecepcion || primeraFecha.fecha_recepcion,
            created: primeraFecha.created,
            modified: primeraFecha.modified,
            campos: Object.keys(primeraFecha).filter(key => 
              key.toLowerCase().includes('fecha') || 
              key.toLowerCase().includes('date') ||
              key.toLowerCase().includes('created') ||
              key.toLowerCase().includes('modified')
            )
          };
        }

        newResults.push({
          endpoint: endpoint.path,
          name: endpoint.name,
          category: endpoint.category,
          status: 'success',
          responseTime,
          itemCount: items.length,
          structure,
          fechaAnalysis,
          sampleData: items.slice(0, 2), // Muestra de 2 items
          fullResponse: data
        });

        console.log(`✅ ${endpoint.path}: ${items.length} items, ${responseTime}ms`);

      } catch (error) {
        newResults.push({
          endpoint: endpoint.path,
          name: endpoint.name,
          category: endpoint.category,
          status: 'error',
          error: error.message
        });
        
        console.log(`❌ ${endpoint.path}: ${error.message}`);
      }

      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Ordenar resultados por éxito y fecha más reciente
    newResults.sort((a, b) => {
      if (a.status === 'success' && b.status === 'error') return -1;
      if (a.status === 'error' && b.status === 'success') return 1;
      
      if (a.status === 'success' && b.status === 'success') {
        // Priorizar endpoints con más items
        if (a.itemCount !== b.itemCount) {
          return b.itemCount - a.itemCount;
        }
        
        // Luego por fecha más reciente
        const fechaA = a.fechaAnalysis?.fechaEmision || a.fechaAnalysis?.created || '2000-01-01';
        const fechaB = b.fechaAnalysis?.fechaEmision || b.fechaAnalysis?.created || '2000-01-01';
        return new Date(fechaB) - new Date(fechaA);
      }
      
      return 0;
    });

    setResults(newResults);
    setExploring(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Loader className="w-4 h-4 text-gray-400" />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'compras': 'bg-blue-100 text-blue-800',
      'dtes': 'bg-green-100 text-green-800',
      'documentos': 'bg-purple-100 text-purple-800',
      'otros': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.otros;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('es-CL');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Explorador de Endpoints de Chipax
            </h1>
            <p className="text-gray-600 mt-1">
              Descubre qué endpoints contienen facturas de compra recientes
            </p>
          </div>
          
          <button
            onClick={exploreEndpoints}
            disabled={exploring}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Search className={`w-4 h-4 mr-2 ${exploring ? 'animate-spin' : ''}`} />
            {exploring ? 'Explorando...' : 'Explorar Endpoints'}
          </button>
        </div>

        {exploring && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <Loader className="w-5 h-5 text-blue-500 mr-2 animate-spin" />
              <span className="text-blue-700">
                Explorando {endpointsToExplore.length} endpoints...
              </span>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de resultados */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Resultados de Exploración</h2>
              
              {results.map((result, index) => (
                <div
                  key={result.endpoint}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedResult?.endpoint === result.endpoint
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium text-gray-900">{result.name}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(result.category)}`}>
                          {result.category}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{result.endpoint}</p>
                      
                      {result.status === 'success' ? (
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>📊 {result.itemCount} items encontrados</p>
                          {result.fechaAnalysis?.fechaEmision && (
                            <p>📅 Fecha más reciente: {formatDate(result.fechaAnalysis.fechaEmision)}</p>
                          )}
                          <p>⚡ Tiempo: {result.responseTime}ms</p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">❌ {result.error}</p>
                      )}
                    </div>
                    
                    {result.status === 'success' && (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Detalles del resultado seleccionado */}
            {selectedResult && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Detalles: {selectedResult.name}
                </h2>
                
                {selectedResult.status === 'success' ? (
                  <div className="space-y-4">
                    {/* Información general */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Información General</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Estructura:</span>
                          <span className="ml-2 font-medium">{selectedResult.structure}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Items:</span>
                          <span className="ml-2 font-medium">{selectedResult.itemCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Análisis de fechas */}
                    {selectedResult.fechaAnalysis && (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Análisis de Fechas</h3>
                        <div className="space-y-2 text-sm">
                          {selectedResult.fechaAnalysis.fechaEmision && (
                            <p>
                              <span className="text-gray-600">Fecha Emisión:</span>
                              <span className="ml-2 font-medium">{formatDate(selectedResult.fechaAnalysis.fechaEmision)}</span>
                            </p>
                          )}
                          {selectedResult.fechaAnalysis.fechaRecepcion && (
                            <p>
                              <span className="text-gray-600">Fecha Recepción:</span>
                              <span className="ml-2 font-medium">{formatDate(selectedResult.fechaAnalysis.fechaRecepcion)}</span>
                            </p>
                          )}
                          {selectedResult.fechaAnalysis.created && (
                            <p>
                              <span className="text-gray-600">Created:</span>
                              <span className="ml-2 font-medium">{formatDate(selectedResult.fechaAnalysis.created)}</span>
                            </p>
                          )}
                          
                          <div className="mt-2 pt-2 border-t border-yellow-200">
                            <span className="text-gray-600">Campos de fecha disponibles:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedResult.fechaAnalysis.campos.map(campo => (
                                <span key={campo} className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                                  {campo}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Muestra de datos */}
                    {selectedResult.sampleData.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Muestra de Datos</h3>
                        <div className="space-y-2">
                          {selectedResult.sampleData.map((item, idx) => (
                            <div key={idx} className="text-sm bg-white p-3 rounded border">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-600">ID:</span>
                                  <span className="ml-2">{item.id}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Folio:</span>
                                  <span className="ml-2">{item.folio || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Razón Social:</span>
                                  <span className="ml-2">{item.razonSocial || item.razon_social || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Monto:</span>
                                  <span className="ml-2">{item.montoTotal || item.monto_total || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendación */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">💡 Evaluación</h3>
                      <div className="text-sm text-blue-800">
                        {selectedResult.itemCount === 0 ? (
                          <p>❌ Este endpoint no contiene datos útiles</p>
                        ) : selectedResult.fechaAnalysis?.fechaEmision ? (
                          new Date(selectedResult.fechaAnalysis.fechaEmision) > new Date('2024-01-01') ? (
                            <p>✅ ¡Excelente! Contiene datos recientes (2024+)</p>
                          ) : (
                            <p>⚠️ Contiene datos pero pueden ser antiguos (pre-2024)</p>
                          )
                        ) : (
                          <p>⚠️ Tiene datos pero sin análisis de fechas claro</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-medium text-red-900 mb-2">Error</h3>
                    <p className="text-sm text-red-800">{selectedResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {results.length === 0 && !exploring && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Haz clic en "Explorar Endpoints" para comenzar la búsqueda
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChipaxEndpointExplorer;
