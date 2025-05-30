// PaginationDebugger.jsx - Debug avanzado para paginación completa
import React, { useState } from 'react';
import { 
  Play, AlertTriangle, CheckCircle, Clock, RefreshCw, 
  BarChart, Database, FileText, Users, ChevronDown, ChevronUp,
  Zap, Target, Settings
} from 'lucide-react';
import chipaxService from '../services/chipaxService';

/**
 * Componente especializado para debuggear la paginación completa de Chipax
 */
const PaginationDebugger = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugResults, setDebugResults] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState('/dtes?porCobrar=1');
  const [maxPagesToTest, setMaxPagesToTest] = useState(5);
  const [loadAllPages, setLoadAllPages] = useState(false);
  const [liveProgress, setLiveProgress] = useState(null);

  const endpoints = [
    { value: '/dtes?porCobrar=1', label: 'Facturas de Venta (CxC)', icon: <FileText size={16} /> },
    { value: '/compras', label: 'Facturas de Compra (CxP)', icon: <BarChart size={16} /> },
    { value: '/clientes', label: 'Clientes', icon: <Users size={16} /> },
    { value: '/flujo-caja/init', label: 'Flujo de Caja', icon: <Database size={16} /> }
  ];

  // =====================================================
  // FUNCIÓN DE DEBUG BÁSICO
  // =====================================================

  const runBasicPaginationDebug = async () => {
    setIsLoading(true);
    setDebugResults(null);
    setLiveProgress({ step: 'Iniciando debug...', progress: 0 });

    try {
      console.log('🔍 Iniciando debug básico de paginación...');
      
      // Llamar a la función de debug del servicio
      const result = await chipaxService.Ingresos.debugPagination(
        selectedEndpoint, 
        maxPagesToTest
      );
      
      setDebugResults({
        type: 'basic',
        ...result,
        timestamp: new Date().toISOString()
      });
      
      setLiveProgress({ step: 'Debug básico completado', progress: 100 });
      
    } catch (error) {
      console.error('Error en debug básico:', error);
      setDebugResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // FUNCIÓN DE CARGA COMPLETA
  // =====================================================

  const runFullPaginationTest = async () => {
    setIsLoading(true);
    setDebugResults(null);
    setLiveProgress({ step: 'Preparando carga completa...', progress: 0 });

    try {
      console.log('🚀 Iniciando test de paginación completa...');
      
      const startTime = Date.now();
      let result;
      
      // Progreso personalizado para la carga completa
      const progressCallback = (step, progress, data) => {
        setLiveProgress({ step, progress, data });
      };
      
      // Determinar qué servicio usar según el endpoint
      if (selectedEndpoint === '/dtes?porCobrar=1') {
        result = await chipaxService.Ingresos.getFacturasVenta(loadAllPages ? null : maxPagesToTest);
      } else if (selectedEndpoint === '/compras') {
        result = await chipaxService.Egresos.getFacturasCompra(loadAllPages ? null : maxPagesToTest);
      } else if (selectedEndpoint === '/clientes') {
        result = await chipaxService.Ajustes.getClientes(loadAllPages ? null : maxPagesToTest);
      } else {
        // Para otros endpoints, usar la función genérica
        result = await chipaxService.fetchAllPaginatedData(selectedEndpoint, loadAllPages ? null : maxPagesToTest);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setDebugResults({
        type: 'full',
        endpoint: selectedEndpoint,
        result,
        performance: {
          duration,
          itemsPerSecond: Math.round((result.items?.length || 0) / (duration / 1000)),
          averageTimePerPage: result.paginationAttributes?.pagesLoaded 
            ? Math.round(duration / result.paginationAttributes.pagesLoaded) 
            : 0
        },
        timestamp: new Date().toISOString()
      });
      
      setLiveProgress({ step: 'Carga completa finalizada', progress: 100 });
      
    } catch (error) {
      console.error('Error en test completo:', error);
      setDebugResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // FUNCIÓN DE COMPARACIÓN
  // =====================================================

  const runComparisonTest = async () => {
    setIsLoading(true);
    setDebugResults(null);
    setLiveProgress({ step: 'Ejecutando comparación...', progress: 0 });

    try {
      console.log('⚖️ Iniciando test de comparación...');
      
      const startTime = Date.now();
      
      // Test 1: Debug básico (pocas páginas)
      setLiveProgress({ step: 'Ejecutando debug básico...', progress: 25 });
      const basicResult = await chipaxService.Ingresos.debugPagination(selectedEndpoint, 3);
      
      // Test 2: Carga completa (limitada)
      setLiveProgress({ step: 'Ejecutando carga limitada...', progress: 50 });
      const limitedResult = await chipaxService.fetchAllPaginatedData(selectedEndpoint, 10);
      
      // Test 3: Verificar consistencia
      setLiveProgress({ step: 'Verificando consistencia...', progress: 75 });
      const consistencyCheck = {
        basicVsLimited: {
          basicItems: basicResult.summary?.totalItemsTested || 0,
          limitedItems: limitedResult.items?.length || 0,
          consistent: (basicResult.summary?.totalItemsTested || 0) <= (limitedResult.items?.length || 0)
        },
        pagination: {
          expectedTotal: basicResult.pagination?.totalCount || 0,
          actualObtained: limitedResult.items?.length || 0,
          efficiency: basicResult.pagination?.totalCount ? 
            Math.round(((limitedResult.items?.length || 0) / basicResult.pagination.totalCount) * 100) : 0
        }
      };
      
      const endTime = Date.now();
      
      setDebugResults({
        type: 'comparison',
        basicResult,
        limitedResult,
        consistencyCheck,
        performance: {
          totalDuration: endTime - startTime,
          testsExecuted: 3
        },
        timestamp: new Date().toISOString()
      });
      
      setLiveProgress({ step: 'Comparación completada', progress: 100 });
      
    } catch (error) {
      console.error('Error en comparación:', error);
      setDebugResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // RENDER DE RESULTADOS
  // =====================================================

  const renderResults = () => {
    if (!debugResults) return null;

    if (debugResults.type === 'error') {
      return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle size={20} className="text-red-600 mr-2" />
            <h4 className="font-medium text-red-800">Error en Debug</h4>
          </div>
          <p className="text-red-700 text-sm">{debugResults.error}</p>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-4">
        {/* Resultados básicos */}
        {debugResults.type === 'basic' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-3 flex items-center">
              <Target size={18} className="mr-2" />
              Resultados del Debug Básico
            </h4>
            
            {debugResults.pagination && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {debugResults.pagination.totalPages}
                  </div>
                  <div className="text-xs text-blue-700">Total Páginas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {debugResults.pagination.totalCount}
                  </div>
                  <div className="text-xs text-blue-700">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {debugResults.analysis?.avgItemsPerPage || 0}
                  </div>
                  <div className="text-xs text-blue-700">Items/Página</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {debugResults.summary?.totalItemsTested || 0}
                  </div>
                  <div className="text-xs text-blue-700">Items Probados</div>
                </div>
              </div>
            )}
            
            {debugResults.testResults && (
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Resultados por Página:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {debugResults.testResults.map((test, index) => (
                    <div key={index} className={`p-2 rounded text-xs ${
                      test.hasItems ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      Página {test.page}: {test.itemCount} items
                      {test.error && <div className="text-red-600">Error: {test.error}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resultados completos */}
        {debugResults.type === 'full' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-3 flex items-center">
              <Zap size={18} className="mr-2" />
              Resultados de Carga Completa
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">
                  {debugResults.result.items?.length || 0}
                </div>
                <div className="text-xs text-green-700">Total Items Cargados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">
                  {debugResults.result.paginationAttributes?.pagesLoaded || 0}
                </div>
                <div className="text-xs text-green-700">Páginas Cargadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">
                  {debugResults.performance.duration}ms
                </div>
                <div className="text-xs text-green-700">Duración Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">
                  {debugResults.performance.itemsPerSecond}
                </div>
                <div className="text-xs text-green-700">Items/Segundo</div>
              </div>
            </div>
            
            {debugResults.result.paginationAttributes?.pagesFailed > 0 && (
              <div className="p-2 bg-amber-100 rounded text-amber-800 text-sm">
                ⚠️ {debugResults.result.paginationAttributes.pagesFailed} páginas fallaron durante la carga
              </div>
            )}
          </div>
        )}

        {/* Resultados de comparación */}
        {debugResults.type === 'comparison' && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-3 flex items-center">
              <BarChart size={18} className="mr-2" />
              Resultados de Comparación
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-purple-800 mb-2">Test Básico vs Limitado</h5>
                <div className="space-y-1 text-sm">
                  <div>Items básico: {debugResults.consistencyCheck.basicVsLimited.basicItems}</div>
                  <div>Items limitado: {debugResults.consistencyCheck.basicVsLimited.limitedItems}</div>
                  <div className={`font-medium ${
                    debugResults.consistencyCheck.basicVsLimited.consistent ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {debugResults.consistencyCheck.basicVsLimited.consistent ? '✅ Consistente' : '❌ Inconsistente'}
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium text-purple-800 mb-2">Eficiencia de Paginación</h5>
                <div className="space-y-1 text-sm">
                  <div>Total esperado: {debugResults.consistencyCheck.pagination.expectedTotal}</div>
                  <div>Total obtenido: {debugResults.consistencyCheck.pagination.actualObtained}</div>
                  <div className="font-medium text-purple-700">
                    Eficiencia: {debugResults.consistencyCheck.pagination.efficiency}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // RENDER PRINCIPAL
  // =====================================================

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings size={18} className="mr-2 text-purple-600" />
            Debug de Paginación Avanzado
          </h2>
          <p className="text-sm text-gray-600">
            Herramientas para debuggear y optimizar la carga completa de datos
          </p>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-sm text-purple-600 hover:text-purple-800"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} className="mr-1" />
              Ocultar
            </>
          ) : (
            <>
              <ChevronDown size={16} className="mr-1" />
              Expandir Debug
            </>
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          {/* Configuración */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint a probar
              </label>
              <select
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                disabled={isLoading}
              >
                {endpoints.map(endpoint => (
                  <option key={endpoint.value} value={endpoint.value}>
                    {endpoint.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Páginas máximas (debug)
              </label>
              <input
                type="number"
                value={maxPagesToTest}
                onChange={(e) => setMaxPagesToTest(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                min="1"
                max="20"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opciones
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="loadAll"
                  checked={loadAllPages}
                  onChange={(e) => setLoadAllPages(e.target.checked)}
                  className="mr-2"
                  disabled={isLoading}
                />
                <label htmlFor="loadAll" className="text-sm text-gray-700">
                  Cargar todas las páginas
                </label>
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={runBasicPaginationDebug}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <Target size={16} className="mr-2" />
              Debug Básico
            </button>
            
            <button
              onClick={runFullPaginationTest}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              <Zap size={16} className="mr-2" />
              Carga Completa
            </button>
            
            <button
              onClick={runComparisonTest}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              <BarChart size={16} className="mr-2" />
              Comparación
            </button>
          </div>
          
          {/* Progreso en vivo */}
          {liveProgress && (
            <div className="mb-4 p-3 bg-gray-50 rounded border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {liveProgress.step}
                </span>
                <span className="text-sm text-gray-500">
                  {liveProgress.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${liveProgress.progress}%` }}
                ></div>
              </div>
              {liveProgress.data && (
                <div className="mt-2 text-xs text-gray-600">
                  {JSON.stringify(liveProgress.data, null, 2)}
                </div>
              )}
            </div>
          )}
          
          {/* Indicador de carga */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={24} className="animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Ejecutando debug...</span>
            </div>
          )}
          
          {/* Resultados */}
          {renderResults()}
        </div>
      )}
    </div>
  );
};

export default PaginationDebugger;
