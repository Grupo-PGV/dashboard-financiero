// PaginationDebugger.jsx - Componente para diagnosticar y probar paginación
import React, { useState } from 'react';
import { 
  Play, RefreshCw, CheckCircle, AlertTriangle, Info, 
  BarChart, FileText, Users, DollarSign, Clock, 
  ChevronRight, ChevronDown, Eye, Bug
} from 'lucide-react';
import chipaxService from '../services/chipaxService';

const PaginationDebugger = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState('/compras?pagado=false');
  const [expandedResult, setExpandedResult] = useState(null);

  // Lista de endpoints para probar
  const endpoints = [
    { 
      path: '/compras?pagado=false', 
      name: 'Facturas de Compra (Pendientes)', 
      icon: <FileText size={16} />,
      description: 'Facturas de compra pendientes de pago'
    },
    { 
      path: '/compras', 
      name: 'Todas las Facturas de Compra', 
      icon: <FileText size={16} />,
      description: 'Todas las facturas de compra sin filtro'
    },
    { 
      path: '/dtes?porCobrar=1', 
      name: 'Facturas por Cobrar', 
      icon: <DollarSign size={16} />,
      description: 'Facturas de venta pendientes de cobro'
    },
    { 
      path: '/dtes', 
      name: 'Todas las Facturas de Venta', 
      icon: <BarChart size={16} />,
      description: 'Todas las facturas de venta'
    },
    { 
      path: '/clientes', 
      name: 'Clientes', 
      icon: <Users size={16} />,
      description: 'Lista completa de clientes'
    },
    { 
      path: '/honorarios', 
      name: 'Honorarios', 
      icon: <FileText size={16} />,
      description: 'Boletas de honorarios'
    }
  ];

  // Función para probar un endpoint específico
  const testEndpoint = async (endpoint) => {
    const testResult = {
      endpoint: endpoint.path,
      name: endpoint.name,
      startTime: Date.now(),
      status: 'testing',
      phases: []
    };

    try {
      // Fase 1: Primera página
      testResult.phases.push({ phase: 'first_page', status: 'testing', startTime: Date.now() });
      
      const firstPageResponse = await chipaxService.fetchFromChipax(`${endpoint.path}${endpoint.path.includes('?') ? '&' : '?'}page=1`);
      
      testResult.phases[0].status = 'completed';
      testResult.phases[0].endTime = Date.now();
      testResult.phases[0].data = {
        hasItems: !!firstPageResponse.items,
        itemCount: firstPageResponse.items?.length || 0,
        hasPagination: !!firstPageResponse.paginationAttributes,
        paginationInfo: firstPageResponse.paginationAttributes
      };

      // Si no hay paginación, terminar aquí
      if (!firstPageResponse.paginationAttributes) {
        testResult.status = 'completed';
        testResult.endTime = Date.now();
        testResult.totalItems = firstPageResponse.items?.length || 0;
        testResult.totalPages = 1;
        testResult.summary = 'Sin paginación - datos completos en una página';
        return testResult;
      }

      // Fase 2: Análisis de paginación
      const { totalPages, totalCount } = firstPageResponse.paginationAttributes;
      testResult.phases.push({ 
        phase: 'pagination_analysis', 
        status: 'completed', 
        data: { totalPages, totalCount, needsMultipleRequests: totalPages > 1 }
      });

      // Fase 3: Carga completa con paginación
      if (totalPages > 1) {
        testResult.phases.push({ phase: 'full_pagination', status: 'testing', startTime: Date.now() });
        
        const fullResponse = await chipaxService.fetchAllPaginatedData(endpoint.path);
        
        testResult.phases[2].status = 'completed';
        testResult.phases[2].endTime = Date.now();
        testResult.phases[2].data = {
          totalItemsLoaded: fullResponse.items?.length || 0,
          paginationInfo: fullResponse.paginationInfo,
          success: true
        };

        testResult.totalItems = fullResponse.items?.length || 0;
        testResult.paginationInfo = fullResponse.paginationInfo;
      } else {
        testResult.totalItems = firstPageResponse.items?.length || 0;
      }

      testResult.status = 'completed';
      testResult.totalPages = totalPages;
      testResult.summary = `Éxito: ${testResult.totalItems} items obtenidos de ${totalPages} páginas`;

    } catch (error) {
      testResult.status = 'error';
      testResult.error = error.message;
      testResult.summary = `Error: ${error.message}`;
      
      // Marcar la fase actual como error
      const currentPhase = testResult.phases.find(p => p.status === 'testing');
      if (currentPhase) {
        currentPhase.status = 'error';
        currentPhase.error = error.message;
        currentPhase.endTime = Date.now();
      }
    }

    testResult.endTime = Date.now();
    testResult.duration = testResult.endTime - testResult.startTime;
    
    return testResult;
  };

  // Probar endpoint seleccionado
  const handleTestSingle = async () => {
    const endpoint = endpoints.find(e => e.path === selectedEndpoint);
    if (!endpoint) return;

    setLoading(true);
    try {
      const result = await testEndpoint(endpoint);
      setResults(prev => [result, ...prev.slice(0, 9)]); // Mantener últimos 10 resultados
    } catch (error) {
      console.error('Error en test:', error);
    } finally {
      setLoading(false);
    }
  };

  // Probar todos los endpoints
  const handleTestAll = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      for (const endpoint of endpoints) {
        console.log(`🧪 Probando: ${endpoint.name}`);
        const result = await testEndpoint(endpoint);
        setResults(prev => [...prev, result]);
        
        // Pequeña pausa entre tests para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error en test completo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'testing': return 'text-blue-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Función para obtener el icono del estado
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} />;
      case 'testing': return <RefreshCw size={16} className="animate-spin" />;
      case 'error': return <AlertTriangle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Formatear duración
  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bug size={20} className="mr-2 text-purple-600" />
          Diagnóstico de Paginación - Chipax API
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Herramienta para diagnosticar y probar la paginación en diferentes endpoints
        </p>
      </div>

      {/* Controles */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endpoint a probar:
            </label>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            >
              {endpoints.map(endpoint => (
                <option key={endpoint.path} value={endpoint.path}>
                  {endpoint.name} - {endpoint.path}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleTestSingle}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center"
            >
              {loading ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Play size={16} className="mr-2" />}
              Probar Seleccionado
            </button>
            
            <button
              onClick={handleTestAll}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center"
            >
              {loading ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <BarChart size={16} className="mr-2" />}
              Probar Todos
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="p-4">
        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bug size={48} className="mx-auto mb-3 text-gray-300" />
            <p>No hay resultados de pruebas aún</p>
            <p className="text-sm">Selecciona un endpoint y haz clic en "Probar"</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                {/* Header del resultado */}
                <div 
                  className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedResult(expandedResult === index ? null : index)}
                >
                  <div className="flex items-center">
                    <div className={`mr-3 ${getStatusColor(result.status)}`}>
                      {getStatusIcon(result.status)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{result.name}</h3>
                      <p className="text-sm text-gray-500">{result.endpoint}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="text-right mr-4">
                      <p className="text-sm font-medium">
                        {result.totalItems ? `${result.totalItems.toLocaleString()} items` : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {result.duration ? formatDuration(result.duration) : 'N/A'}
                      </p>
                    </div>
                    {expandedResult === index ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </div>

                {/* Detalle expandido */}
                {expandedResult === index && (
                  <div className="p-4 border-t">
                    {/* Resumen */}
                    <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <Info size={16} className="inline mr-1" />
                        {result.summary}
                      </p>
                    </div>

                    {/* Error si existe */}
                    {result.error && (
                      <div className="mb-4 p-3 bg-red-50 rounded border border-red-100">
                        <p className="text-sm text-red-800">
                          <AlertTriangle size={16} className="inline mr-1" />
                          {result.error}
                        </p>
                      </div>
                    )}

                    {/* Información de paginación */}
                    {result.paginationInfo && (
                      <div className="mb-4 p-3 bg-green-50 rounded border border-green-100">
                        <h4 className="text-sm font-medium text-green-800 mb-2">Información de Paginación:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-green-700">Páginas solicitadas:</span>
                            <p className="font-medium">{result.paginationInfo.totalPagesRequested}</p>
                          </div>
                          <div>
                            <span className="text-green-700">Páginas cargadas:</span>
                            <p className="font-medium">{result.paginationInfo.totalPagesLoaded}</p>
                          </div>
                          <div>
                            <span className="text-green-700">Items esperados:</span>
                            <p className="font-medium">{result.paginationInfo.totalItemsExpected}</p>
                          </div>
                          <div>
                            <span className="text-green-700">Completitud:</span>
                            <p className="font-medium">{result.paginationInfo.completenessPercent.toFixed(1)}%</p>
                          </div>
                        </div>
                        
                        {result.paginationInfo.failedPages?.length > 0 && (
                          <div className="mt-2">
                            <span className="text-red-700 text-xs">Páginas fallidas:</span>
                            <p className="font-medium text-red-800">{result.paginationInfo.failedPages.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fases del test */}
                    {result.phases && result.phases.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-3">Fases del Test:</h4>
                        <div className="space-y-2">
                          {result.phases.map((phase, phaseIndex) => (
                            <div key={phaseIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <div className={`mr-2 ${getStatusColor(phase.status)}`}>
                                  {getStatusIcon(phase.status)}
                                </div>
                                <span className="text-sm font-medium">
                                  {phase.phase === 'first_page' && 'Primera Página'}
                                  {phase.phase === 'pagination_analysis' && 'Análisis de Paginación'}
                                  {phase.phase === 'full_pagination' && 'Carga Completa'}
                                </span>
                              </div>
                              
                              <div className="text-xs text-gray-500">
                                {phase.endTime && phase.startTime && formatDuration(phase.endTime - phase.startTime)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaginationDebugger;
