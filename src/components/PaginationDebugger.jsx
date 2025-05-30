// PaginationDebugger.jsx - Debug de paginación para GitHub Web
import React, { useState } from 'react';
import { 
  Play, AlertTriangle, CheckCircle, Clock, RefreshCw, 
  BarChart, Database, FileText, Users, ChevronDown, ChevronUp,
  Zap, Target, Settings
} from 'lucide-react';
import chipaxService from '../services/chipaxService';

const PaginationDebugger = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugResults, setDebugResults] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState('/dtes?porCobrar=1');
  const [maxPagesToTest, setMaxPagesToTest] = useState(5);
  const [loadAllPages, setLoadAllPages] = useState(false);

  const endpoints = [
    { value: '/dtes?porCobrar=1', label: 'Facturas de Venta (CxC)', icon: <FileText size={16} /> },
    { value: '/compras', label: 'Facturas de Compra (CxP)', icon: <BarChart size={16} /> },
    { value: '/clientes', label: 'Clientes', icon: <Users size={16} /> }
  ];

  const runBasicPaginationDebug = async () => {
    setIsLoading(true);
    setDebugResults(null);

    try {
      console.log('🔍 Iniciando debug básico...');
      
      const result = await chipaxService.Ingresos.debugPagination(
        selectedEndpoint, 
        maxPagesToTest
      );
      
      setDebugResults({
        type: 'basic',
        ...result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error en debug:', error);
      setDebugResults({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runFullPaginationTest = async () => {
    setIsLoading(true);
    setDebugResults(null);

    try {
      console.log('🚀 Iniciando test completo...');
      
      const startTime = Date.now();
      let result;
      
      if (selectedEndpoint === '/dtes?porCobrar=1') {
        result = await chipaxService.Ingresos.getFacturasVenta(loadAllPages ? null : maxPagesToTest);
      } else if (selectedEndpoint === '/compras') {
        result = await chipaxService.Egresos.getFacturasCompra(loadAllPages ? null : maxPagesToTest);
      } else if (selectedEndpoint === '/clientes') {
        result = await chipaxService.Ajustes.getClientes(loadAllPages ? null : maxPagesToTest);
      } else {
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
                ⚠️ {debugResults.result.paginationAttributes.pagesFailed} páginas fallaron
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings size={18} className="mr-2 text-purple-600" />
            Debug de Paginación Avanzado
          </h2>
          <p className="text-sm text-gray-600">
            Herramientas para verificar que la paginación obtiene todos los datos
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
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={24} className="animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">Ejecutando debug...</span>
            </div>
          )}
          
          {renderResults()}
        </div>
      )}
    </div>
  );
};

export default PaginationDebugger;
