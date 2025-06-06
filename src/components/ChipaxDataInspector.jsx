// ChipaxDataInspector.jsx - Inspector de datos para debugging
import React, { useState } from 'react';
import { Eye, Download, AlertCircle, CheckCircle, Database } from 'lucide-react';
import chipaxService from '../services/chipaxService';
import { adaptarDatosChipax } from '../services/chipaxAdapter';

const ChipaxDataInspector = () => {
  const [inspectionResults, setInspectionResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');

  const endpoints = [
    {
      id: 'ventas',
      name: 'Ventas/Cuentas por Cobrar',
      endpoint: '/ventas',
      adapter: 'cuentasPorCobrar'
    },
    {
      id: 'compras',
      name: 'Compras/Cuentas por Pagar',
      endpoint: '/compras?pagado=false',
      adapter: 'cuentasPorPagar'
    },
    {
      id: 'dtes',
      name: 'DTEs por Cobrar',
      endpoint: '/dtes?porCobrar=1',
      adapter: 'cuentasPorCobrar'
    },
    {
      id: 'flujo-caja',
      name: 'Flujo de Caja',
      endpoint: '/flujo-caja/init',
      adapter: 'saldosBancarios'
    }
  ];

  const inspectEndpoint = async (endpointConfig) => {
    setLoading(true);
    setSelectedEndpoint(endpointConfig.id);

    try {
      console.log(`\n🔍 === INSPECCIONANDO ${endpointConfig.name} ===`);
      
      // 1. Obtener datos crudos
      const startTime = Date.now();
      const rawData = await chipaxService.fetchFromChipax(endpointConfig.endpoint);
      const fetchTime = Date.now() - startTime;
      
      console.log('📦 Datos crudos:', rawData);
      
      // 2. Determinar estructura de datos
      const dataStructure = {
        hasItems: !!rawData.items,
        isArray: Array.isArray(rawData),
        hasArrFlujoCaja: !!rawData.arrFlujoCaja,
        keys: Object.keys(rawData || {}),
        itemCount: rawData.items?.length || (Array.isArray(rawData) ? rawData.length : 0)
      };
      
      // 3. Extraer muestra de datos
      let sampleData = null;
      let itemsToAdapt = null;
      
      if (rawData.items) {
        sampleData = rawData.items.slice(0, 3);
        itemsToAdapt = rawData.items;
      } else if (Array.isArray(rawData)) {
        sampleData = rawData.slice(0, 3);
        itemsToAdapt = rawData;
      } else if (rawData.arrFlujoCaja) {
        sampleData = rawData.arrFlujoCaja.slice(0, 3);
        itemsToAdapt = rawData;
      }
      
      // 4. Intentar adaptar datos
      let adaptedData = [];
      let adapterError = null;
      
      try {
        if (itemsToAdapt) {
          adaptedData = adaptarDatosChipax(endpointConfig.adapter, itemsToAdapt);
          console.log('✅ Datos adaptados:', adaptedData);
        }
      } catch (error) {
        adapterError = error.message;
        console.error('❌ Error adaptando datos:', error);
      }
      
      // 5. Guardar resultados
      const results = {
        endpoint: endpointConfig.endpoint,
        fetchTime,
        dataStructure,
        rawDataSample: sampleData,
        adaptedDataSample: adaptedData.slice(0, 3),
        totalRawItems: dataStructure.itemCount,
        totalAdaptedItems: adaptedData.length,
        adapterError,
        timestamp: new Date().toISOString()
      };
      
      setInspectionResults(prev => ({
        ...prev,
        [endpointConfig.id]: results
      }));
      
      console.log('📊 Resultados de inspección:', results);
      
    } catch (error) {
      console.error('❌ Error en inspección:', error);
      setInspectionResults(prev => ({
        ...prev,
        [endpointConfig.id]: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setLoading(false);
      setSelectedEndpoint('');
    }
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(inspectionResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `chipax_inspection_${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="w-6 h-6 mr-2 text-purple-600" />
          Inspector de Datos Chipax
        </h2>
        {Object.keys(inspectionResults).length > 0 && (
          <button
            onClick={downloadResults}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Resultados
          </button>
        )}
      </div>

      <div className="space-y-4">
        {endpoints.map(endpoint => (
          <div key={endpoint.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800">{endpoint.name}</h3>
              <button
                onClick={() => inspectEndpoint(endpoint)}
                disabled={loading && selectedEndpoint === endpoint.id}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                {loading && selectedEndpoint === endpoint.id ? 'Inspeccionando...' : 'Inspeccionar'}
              </button>
            </div>

            {inspectionResults[endpoint.id] && (
              <div className="mt-4 space-y-3">
                {inspectionResults[endpoint.id].error ? (
                  <div className="p-3 bg-red-50 rounded flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error:</p>
                      <p className="text-sm text-red-700">{inspectionResults[endpoint.id].error}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">Tiempo de carga:</p>
                        <p className="font-medium">{inspectionResults[endpoint.id].fetchTime}ms</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">Items crudos:</p>
                        <p className="font-medium">{inspectionResults[endpoint.id].totalRawItems}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">Items adaptados:</p>
                        <p className="font-medium">{inspectionResults[endpoint.id].totalAdaptedItems}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-gray-600">Estructura:</p>
                        <p className="font-medium text-xs">
                          {inspectionResults[endpoint.id].dataStructure.hasItems ? 'items[]' : 
                           inspectionResults[endpoint.id].dataStructure.isArray ? 'array' :
                           inspectionResults[endpoint.id].dataStructure.hasArrFlujoCaja ? 'arrFlujoCaja' : 'objeto'}
                        </p>
                      </div>
                    </div>

                    {inspectionResults[endpoint.id].adapterError && (
                      <div className="p-3 bg-amber-50 rounded">
                        <p className="text-sm font-medium text-amber-800">Error en adaptador:</p>
                        <p className="text-sm text-amber-700">{inspectionResults[endpoint.id].adapterError}</p>
                      </div>
                    )}

                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                        Ver muestra de datos crudos
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(inspectionResults[endpoint.id].rawDataSample, null, 2)}
                      </pre>
                    </details>

                    {inspectionResults[endpoint.id].totalAdaptedItems > 0 && (
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                          Ver muestra de datos adaptados
                        </summary>
                        <pre className="mt-2 p-3 bg-green-50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(inspectionResults[endpoint.id].adaptedDataSample, null, 2)}
                        </pre>
                      </details>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Instrucciones:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Inspecciona cada endpoint para ver la estructura de datos</li>
          <li>Verifica que los datos crudos se están recibiendo correctamente</li>
          <li>Revisa si el adaptador está transformando los datos correctamente</li>
          <li>Compara "Items crudos" vs "Items adaptados" para ver si hay pérdida de datos</li>
          <li>Descarga los resultados para análisis detallado</li>
        </ol>
      </div>
    </div>
  );
};

export default ChipaxDataInspector;
