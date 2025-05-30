// PaginationDebugger.jsx - Debug específico para paginación
import React, { useState } from 'react';
import { Play, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import chipaxService from '../services/chipaxService';

/**
 * Componente especializado para debuggear problemas de paginación
 */
const PaginationDebugger = () => {
  const [results, setResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('/compras?pagado=false');

  // Endpoints que sabemos que están paginados
  const paginatedEndpoints = [
    {
      id: 'compras-por-pagar',
      endpoint: '/compras?pagado=false',
      name: '💸 Compras Por Pagar',
      description: 'El que está dando problemas'
    },
    {
      id: 'dtes-por-cobrar',
      endpoint: '/dtes?porCobrar=1',
      name: '📄 DTEs Por Cobrar',
      description: 'Para comparar'
    },
    {
      id: 'compras-todas',
      endpoint: '/compras',
      name: '🛒 Compras (Todas)',
      description: 'Sin filtro de pagado'
    },
    {
      id: 'honorarios',
      endpoint: '/honorarios',
      name: '🧾 Honorarios',
      description: 'Otro endpoint paginado'
    }
  ];

  // Función para probar paginación paso a paso
  const testPaginationDetailed = async (endpoint) => {
    console.log(`🔍 INICIANDO DEBUG DETALLADO DE PAGINACIÓN: ${endpoint}`);
    
    const debugResult = {
      endpoint,
      steps: [],
      finalResult: null,
      error: null
    };

    try {
      // PASO 1: Obtener primera página
      debugResult.steps.push({ step: 1, action: 'Obteniendo primera página...', status: 'loading' });
      setResults({ ...debugResult });

      const firstPageUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=1`;
      console.log(`📡 PASO 1: Petición a ${firstPageUrl}`);
      
      const firstPage = await chipaxService.fetchFromChipax(firstPageUrl);
      
      console.log(`📦 PASO 1 - RESPUESTA:`, {
        tieneItems: !!firstPage.items,
        cantidadItems: firstPage.items?.length || 0,
        tienePaginacion: !!firstPage.paginationAttributes,
        paginationData: firstPage.paginationAttributes
      });

      debugResult.steps[0] = {
        step: 1,
        action: 'Primera página obtenida',
        status: 'success',
        data: {
          itemsCount: firstPage.items?.length || 0,
          hasPagination: !!firstPage.paginationAttributes,
          pagination: firstPage.paginationAttributes
        }
      };

      // Verificar si hay paginación
      if (!firstPage.items || !firstPage.paginationAttributes) {
        debugResult.steps.push({
          step: 2,
          action: 'No hay paginación detectada',
          status: 'warning',
          data: { reason: 'Sin items o sin paginationAttributes' }
        });
        debugResult.finalResult = { items: firstPage.items || [], totalFromFirstPage: firstPage.items?.length || 0 };
        setResults({ ...debugResult });
        return debugResult;
      }

      const { totalPages, totalCount, currentPage } = firstPage.paginationAttributes;
      
      console.log(`📊 PASO 2 - ANÁLISIS DE PAGINACIÓN:`);
      console.log(`   Total de páginas: ${totalPages}`);
      console.log(`   Total de items: ${totalCount}`);
      console.log(`   Página actual: ${currentPage}`);
      console.log(`   Items en primera página: ${firstPage.items.length}`);

      debugResult.steps.push({
        step: 2,
        action: 'Paginación analizada',
        status: 'success',
        data: {
          totalPages,
          totalCount,
          currentPage,
          firstPageItems: firstPage.items.length
        }
      });

      setResults({ ...debugResult });

      if (totalPages <= 1) {
        debugResult.steps.push({
          step: 3,
          action: 'Solo una página disponible',
          status: 'info',
          data: { totalPages }
        });
        debugResult.finalResult = { items: firstPage.items, totalFromFirstPage: firstPage.items.length };
        setResults({ ...debugResult });
        return debugResult;
      }

      // PASO 3: Obtener páginas adicionales de forma secuencial para debugging
      let allItems = [...firstPage.items];
      let pagesProcessed = 1;

      console.log(`🚀 PASO 3: Obteniendo ${totalPages - 1} páginas adicionales...`);

      for (let page = 2; page <= Math.min(totalPages, 5); page++) { // Limitar a 5 páginas para debug
        debugResult.steps.push({
          step: 2 + page,
          action: `Obteniendo página ${page}...`,
          status: 'loading'
        });
        setResults({ ...debugResult });

        try {
          const pageUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}`;
          console.log(`📡 PASO 3.${page}: Petición a ${pageUrl}`);
          
          const pageData = await chipaxService.fetchFromChipax(pageUrl, {}, false);
          
          console.log(`📦 PASO 3.${page} - RESPUESTA:`, {
            tieneItems: !!pageData.items,
            cantidadItems: pageData.items?.length || 0,
            paginationPage: pageData.paginationAttributes?.currentPage
          });

          if (pageData.items && Array.isArray(pageData.items)) {
            allItems = [...allItems, ...pageData.items];
            pagesProcessed++;
            
            debugResult.steps[debugResult.steps.length - 1] = {
              step: 2 + page,
              action: `Página ${page} obtenida`,
              status: 'success',
              data: {
                itemsInPage: pageData.items.length,
                totalAccumulated: allItems.length
              }
            };
          } else {
            debugResult.steps[debugResult.steps.length - 1] = {
              step: 2 + page,
              action: `Página ${page} sin datos`,
              status: 'error',
              data: { reason: 'No items in response' }
            };
          }

          setResults({ ...debugResult });

          // Pausa entre páginas
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (pageError) {
          console.error(`❌ Error en página ${page}:`, pageError);
          debugResult.steps[debugResult.steps.length - 1] = {
            step: 2 + page,
            action: `Error en página ${page}`,
            status: 'error',
            data: { error: pageError.message }
          };
          setResults({ ...debugResult });
        }
      }

      // RESULTADO FINAL
      console.log(`🎯 RESULTADO FINAL DEL DEBUG:`);
      console.log(`   Páginas procesadas: ${pagesProcessed}/${Math.min(totalPages, 5)}`);
      console.log(`   Items totales obtenidos: ${allItems.length}`);
      console.log(`   Esperados (según API): ${totalCount}`);

      debugResult.finalResult = {
        items: allItems,
        totalObtained: allItems.length,
        totalExpected: totalCount,
        pagesProcessed: pagesProcessed,
        totalPagesAvailable: totalPages
      };

      debugResult.steps.push({
        step: 'final',
        action: 'Proceso completado',
        status: allItems.length > firstPage.items.length ? 'success' : 'warning',
        data: debugResult.finalResult
      });

      setResults({ ...debugResult });
      return debugResult;

    } catch (error) {
      console.error('❌ Error en debug de paginación:', error);
      debugResult.error = error.message;
      debugResult.steps.push({
        step: 'error',
        action: 'Error en el proceso',
        status: 'error',
        data: { error: error.message }
      });
      setResults({ ...debugResult });
      return debugResult;
    }
  };

  // Función para probar con la función oficial
  const testWithOfficialFunction = async (endpoint) => {
    console.log(`🔧 Probando con función oficial fetchAllPaginatedData: ${endpoint}`);
    
    try {
      const result = await chipaxService.fetchAllPaginatedData(endpoint);
      console.log(`📊 Resultado de función oficial:`, {
        itemsCount: result.items?.length || 0,
        hasPagination: !!result.paginationAttributes,
        paginationData: result.paginationAttributes
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error con función oficial:', error);
      throw error;
    }
  };

  // Ejecutar ambas pruebas
  const runFullTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      console.log(`\n🧪 ======= INICIANDO PRUEBA COMPLETA DE PAGINACIÓN =======`);
      console.log(`🎯 Endpoint: ${selectedEndpoint}`);
      
      // Prueba 1: Debug detallado
      console.log(`\n🔍 ===== PRUEBA 1: DEBUG PASO A PASO =====`);
      const debugResult = await testPaginationDetailed(selectedEndpoint);
      
      // Pausa entre pruebas
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Prueba 2: Función oficial
      console.log(`\n🔧 ===== PRUEBA 2: FUNCIÓN OFICIAL =====`);
      const officialResult = await testWithOfficialFunction(selectedEndpoint);
      
      // Comparación final
      console.log(`\n📊 ===== COMPARACIÓN DE RESULTADOS =====`);
      console.log(`Debug paso a paso: ${debugResult.finalResult?.totalObtained || 0} items`);
      console.log(`Función oficial: ${officialResult.items?.length || 0} items`);
      
      if (debugResult.finalResult?.totalObtained !== officialResult.items?.length) {
        console.warn(`⚠️ DISCREPANCIA DETECTADA!`);
      } else {
        console.log(`✅ Ambos métodos obtuvieron la misma cantidad`);
      }

      // Actualizar resultados finales
      setResults({
        ...debugResult,
        officialResult: {
          itemsCount: officialResult.items?.length || 0,
          pagination: officialResult.paginationAttributes
        },
        comparison: {
          debugCount: debugResult.finalResult?.totalObtained || 0,
          officialCount: officialResult.items?.length || 0,
          match: (debugResult.finalResult?.totalObtained || 0) === (officialResult.items?.length || 0)
        }
      });

    } catch (error) {
      console.error('❌ Error en prueba completa:', error);
      setResults({
        error: error.message,
        steps: [{ step: 'error', action: 'Error general', status: 'error', data: { error: error.message } }]
      });
    } finally {
      setTesting(false);
    }
  };

  // Renderizar estado de un paso
  const renderStepStatus = (step) => {
    switch (step.status) {
      case 'loading':
        return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'info':
        return <Clock size={16} className="text-blue-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            🔍 Pagination Debugger
          </h2>
          <p className="text-sm text-gray-500">
            Debug específico para problemas de paginación en Chipax
          </p>
        </div>
        
        <button
          onClick={runFullTest}
          disabled={testing}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Play size={16} className="mr-1" />
          {testing ? 'Probando...' : 'Probar Paginación'}
        </button>
      </div>

      {/* Selector de endpoint */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Endpoint a probar:
        </label>
        <select
          value={selectedEndpoint}
          onChange={(e) => setSelectedEndpoint(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 w-full"
          disabled={testing}
        >
          {paginatedEndpoints.map(ep => (
            <option key={ep.id} value={ep.endpoint}>
              {ep.name} - {ep.description}
            </option>
          ))}
        </select>
      </div>

      {/* Resultados */}
      {results && (
        <div className="space-y-4">
          {/* Pasos del proceso */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Proceso paso a paso:</h3>
            <div className="space-y-2">
              {results.steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                  <div className="mt-1">
                    {renderStepStatus(step)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      Paso {step.step}: {step.action}
                    </div>
                    {step.data && (
                      <div className="text-xs text-gray-600 mt-1">
                        <pre className="bg-white p-1 rounded text-xs overflow-x-auto">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resultado final */}
          {results.finalResult && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Resultado Final:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-medium text-blue-900">Items Obtenidos</div>
                  <div className="text-xl font-bold text-blue-600">
                    {results.finalResult.totalObtained}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="font-medium text-green-900">Items Esperados</div>
                  <div className="text-xl font-bold text-green-600">
                    {results.finalResult.totalExpected}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <div className="font-medium text-purple-900">Páginas Procesadas</div>
                  <div className="text-xl font-bold text-purple-600">
                    {results.finalResult.pagesProcessed}/{results.finalResult.totalPagesAvailable}
                  </div>
                </div>
                <div className={`p-3 rounded ${
                  results.finalResult.totalObtained === results.finalResult.totalExpected 
                    ? 'bg-green-50' 
                    : 'bg-red-50'
                }`}>
                  <div className={`font-medium ${
                    results.finalResult.totalObtained === results.finalResult.totalExpected 
                      ? 'text-green-900' 
                      : 'text-red-900'
                  }`}>
                    Estado
                  </div>
                  <div className={`text-xl font-bold ${
                    results.finalResult.totalObtained === results.finalResult.totalExpected 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {results.finalResult.totalObtained === results.finalResult.totalExpected ? '✅' : '❌'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comparación con función oficial */}
          {results.comparison && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Comparación de Métodos:</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-medium text-blue-900">Debug Manual</div>
                  <div className="text-xl font-bold text-blue-600">
                    {results.comparison.debugCount}
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="font-medium text-green-900">Función Oficial</div>
                  <div className="text-xl font-bold text-green-600">
                    {results.comparison.officialCount}
                  </div>
                </div>
                <div className={`p-3 rounded ${
                  results.comparison.match ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className={`font-medium ${
                    results.comparison.match ? 'text-green-900' : 'text-red-900'
                  }`}>
                    Coinciden
                  </div>
                  <div className={`text-xl font-bold ${
                    results.comparison.match ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {results.comparison.match ? '✅' : '❌'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error general */}
          {results.error && (
            <div className="border-t pt-4">
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="font-medium text-red-900">Error:</div>
                <div className="text-red-700">{results.error}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaginationDebugger;
