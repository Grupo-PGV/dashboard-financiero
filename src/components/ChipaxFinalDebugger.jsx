import React, { useState } from 'react';
import { Play, Target, CheckCircle, Zap, Eye } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxFinalDebugger = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [foundSolution, setFoundSolution] = useState(null);

  const TARGET_AMOUNT = 186648977;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Los 4 endpoints que funcionaron
  const endpointsExitosos = [
    { 
      path: '/flujo-caja/cartolas', 
      name: 'Cartolas', 
      description: 'Object{3} - Más prometedor para saldos',
      priority: 'highest'
    },
    { 
      path: '/movimientos', 
      name: 'Movimientos', 
      description: 'Array[4669] - Muchos datos, posible suma',
      priority: 'high'
    },
    { 
      path: '/cuentas-corrientes?fecha=2024-12-01', 
      name: 'Cuentas con Fecha', 
      description: 'Array[5] - Podría tener saldos con fecha',
      priority: 'medium'
    },
    { 
      path: '/monedas', 
      name: 'Monedas', 
      description: 'Object{2} - Menos probable pero revisar',
      priority: 'low'
    }
  ];

  const buscarValorExhaustivo = (data, endpointName, path = '') => {
    const resultados = [];
    
    if (typeof data === 'number') {
      const diferencia = Math.abs(data - TARGET_AMOUNT);
      const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
      
      // Buscar valores exactos o muy cercanos
      if (diferencia < TARGET_AMOUNT * 0.1) { // Dentro del 10%
        resultados.push({
          endpoint: endpointName,
          path,
          valor: data,
          diferencia,
          porcentaje,
          esExacto: diferencia < 1000,
          esCercano: diferencia < TARGET_AMOUNT * 0.01 // Dentro del 1%
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        // Analizar array
        data.forEach((item, index) => {
          resultados.push(...buscarValorExhaustivo(item, endpointName, `${path}[${index}]`));
        });
        
        // Calcular sumas de campos numéricos en arrays
        if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
          const todosLosCampos = new Set();
          
          // Recopilar todos los campos numéricos posibles
          data.forEach(item => {
            const extraerCampos = (obj, prefix = '') => {
              Object.keys(obj || {}).forEach(key => {
                const valor = obj[key];
                const campoCompleto = prefix ? `${prefix}.${key}` : key;
                
                if (typeof valor === 'number') {
                  todosLosCampos.add(campoCompleto);
                } else if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
                  extraerCampos(valor, campoCompleto);
                }
              });
            };
            extraerCampos(item);
          });
          
          // Calcular sumas para cada campo
          todosLosCampos.forEach(campo => {
            let suma = 0;
            let count = 0;
            
            data.forEach(item => {
              const valor = campo.split('.').reduce((obj, key) => obj?.[key], item);
              if (typeof valor === 'number') {
                suma += valor;
                count++;
              }
            });
            
            if (count > 0) {
              const diferencia = Math.abs(suma - TARGET_AMOUNT);
              const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
              
              if (diferencia < TARGET_AMOUNT * 0.1) {
                resultados.push({
                  endpoint: endpointName,
                  path: `SUM(${campo})`,
                  valor: suma,
                  diferencia,
                  porcentaje,
                  esExacto: diferencia < 1000,
                  esCercano: diferencia < TARGET_AMOUNT * 0.01,
                  esSuma: true,
                  itemsContados: count
                });
              }
            }
          });
        }
      } else {
        // Analizar objeto
        Object.keys(data).forEach(key => {
          resultados.push(...buscarValorExhaustivo(data[key], endpointName, path ? `${path}.${key}` : key));
        });
      }
    }
    
    return resultados;
  };

  const analizarEndpoint = async (endpoint) => {
    console.log(`🔍 Analizando ${endpoint.name} (${endpoint.path})...`);
    
    try {
      const data = await chipaxService.fetchFromChipax(endpoint.path);
      
      if (!data) {
        return {
          ...endpoint,
          status: 'empty',
          message: 'Sin datos',
          data: null,
          resultados: []
        };
      }

      console.log(`📊 Datos obtenidos de ${endpoint.name}:`, data);
      
      // Buscar el valor objetivo
      const resultados = buscarValorExhaustivo(data, endpoint.name);
      
      // Ordenar por menor diferencia
      resultados.sort((a, b) => a.diferencia - b.diferencia);
      
      const exactos = resultados.filter(r => r.esExacto);
      const cercanos = resultados.filter(r => r.esCercano && !r.esExacto);
      
      let status = 'success';
      let message = 'Datos analizados';
      
      if (exactos.length > 0) {
        status = 'exact_match';
        message = `🎯 ¡${exactos.length} COINCIDENCIA(S) EXACTA(S)!`;
        console.log(`🎯 ¡EXACTO en ${endpoint.path}!`, exactos);
      } else if (cercanos.length > 0) {
        status = 'close_match';
        message = `🟡 ${cercanos.length} resultado(s) muy cercano(s)`;
        console.log(`🟡 Cercano en ${endpoint.path}:`, cercanos);
      } else if (resultados.length > 0) {
        status = 'far_match';
        message = `📊 ${resultados.length} resultado(s) lejano(s)`;
      }

      return {
        ...endpoint,
        status,
        message,
        data,
        resultados: resultados.slice(0, 5), // Top 5
        dataSize: Array.isArray(data) ? data.length : Object.keys(data).length,
        dataType: Array.isArray(data) ? 'Array' : 'Object'
      };
      
    } catch (error) {
      console.error(`❌ Error en ${endpoint.path}:`, error);
      return {
        ...endpoint,
        status: 'error',
        message: error.message,
        data: null,
        resultados: []
      };
    }
  };

  const ejecutarAnalisisFinal = async () => {
    setLoading(true);
    setResults(null);
    setFoundSolution(null);

    try {
      const resultadosPorEndpoint = [];

      // Analizar cada endpoint en orden de prioridad
      const endpointsOrdenados = [...endpointsExitosos].sort((a, b) => {
        const orderMap = { 'highest': 0, 'high': 1, 'medium': 2, 'low': 3 };
        return orderMap[a.priority] - orderMap[b.priority];
      });

      for (const endpoint of endpointsOrdenados) {
        const resultado = await analizarEndpoint(endpoint);
        resultadosPorEndpoint.push(resultado);

        // Si encontramos una coincidencia exacta, marcarla como solución
        if (resultado.status === 'exact_match' && !foundSolution) {
          const solucion = {
            endpoint: resultado.path,
            name: resultado.name,
            resultadosExactos: resultado.resultados.filter(r => r.esExacto),
            data: resultado.data
          };
          setFoundSolution(solucion);
          console.log('🎯 SOLUCIÓN ENCONTRADA:', solucion);
        }
      }

      // Ordenar resultados por relevancia
      resultadosPorEndpoint.sort((a, b) => {
        const orderMap = { 'exact_match': 0, 'close_match': 1, 'far_match': 2, 'success': 3, 'empty': 4, 'error': 5 };
        return orderMap[a.status] - orderMap[b.status];
      });

      setResults({
        endpoints: resultadosPorEndpoint,
        mejorResultado: resultadosPorEndpoint[0],
        resumen: {
          total: resultadosPorEndpoint.length,
          exactos: resultadosPorEndpoint.filter(r => r.status === 'exact_match').length,
          cercanos: resultadosPorEndpoint.filter(r => r.status === 'close_match').length,
          lejanos: resultadosPorEndpoint.filter(r => r.status === 'far_match').length
        }
      });

    } catch (error) {
      console.error('❌ Error general:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exact_match':
        return <Target className="w-5 h-5 text-green-500" />;
      case 'close_match':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'far_match':
        return <Eye className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'exact_match':
        return 'bg-green-50 border-green-300';
      case 'close_match':
        return 'bg-yellow-50 border-yellow-300';
      case 'far_match':
        return 'bg-blue-50 border-blue-300';
      case 'success':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'highest': 'bg-red-100 text-red-800',
      'high': 'bg-orange-100 text-orange-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Análisis Final - Endpoints Exitosos
          </h3>
        </div>
        <button
          onClick={ejecutarAnalisisFinal}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>{loading ? 'Analizando...' : 'Análisis Final'}</span>
          </div>
        </button>
      </div>

      {/* Target */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">Análisis Final</span>
        </div>
        <p className="text-green-700">
          Buscando en 4 endpoints exitosos: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
        <p className="text-green-600 text-sm mt-1">
          Análisis exhaustivo de los únicos endpoints que respondieron
        </p>
      </div>

      {/* Solution Found */}
      {foundSolution && (
        <div className="mb-6 p-6 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-8 h-8 text-green-500" />
            <span className="font-bold text-green-800 text-xl">🎯 ¡SOLUCIÓN ENCONTRADA!</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold text-green-800">
                Endpoint: <code className="bg-green-100 px-2 py-1 rounded">{foundSolution.endpoint}</code>
              </div>
              <div className="text-green-700">
                Fuente: {foundSolution.name}
              </div>
            </div>
            
            {foundSolution.resultadosExactos.map((resultado, index) => (
              <div key={index} className="p-4 bg-green-100 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-green-800 mb-1">Campo/Cálculo:</div>
                    <div className="font-mono text-sm bg-white p-2 rounded">
                      {resultado.path}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-green-800 mb-1">Valor:</div>
                    <div className="text-2xl font-bold text-green-800">
                      {formatCurrency(resultado.valor)}
                    </div>
                    <div className="text-sm text-green-600">
                      Diferencia: {formatCurrency(resultado.diferencia)} ({resultado.porcentaje.toFixed(3)}%)
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-white rounded border border-green-300">
                  <div className="text-sm font-medium text-green-800 mb-2">
                    🚀 Código de Implementación:
                  </div>
                  <code className="text-sm block">
                    {resultado.esSuma ? (
                      `// Endpoint: ${foundSolution.endpoint}
// Calcular suma del campo: ${resultado.path.replace('SUM(', '').replace(')', '')}
const saldoTotal = data.reduce((suma, item) => {
  return suma + (item.${resultado.path.replace('SUM(', '').replace(')', '')} || 0);
}, 0);

// En chipaxService.js:
export const obtenerSaldosBancarios = async () => {
  const data = await fetchFromChipax('${foundSolution.endpoint}');
  return data.reduce((suma, item) => suma + (item.${resultado.path.replace('SUM(', '').replace(')', '')} || 0), 0);
};`
                    ) : (
                      `// Endpoint: ${foundSolution.endpoint}
// Campo directo: ${resultado.path}
const saldoTotal = data.${resultado.path};

// En chipaxService.js:
export const obtenerSaldosBancarios = async () => {
  const data = await fetchFromChipax('${foundSolution.endpoint}');
  return data.${resultado.path};
};`
                    )}
                  </code>
                </div>
                
                {resultado.itemsContados && (
                  <div className="mt-2 text-sm text-green-700">
                    📊 Basado en {resultado.itemsContados} elementos
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Endpoints to analyze */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Endpoints a Analizar</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {endpointsExitosos.map((endpoint, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{endpoint.name}</div>
                {getPriorityBadge(endpoint.priority)}
              </div>
              <code className="text-xs text-gray-600 block mb-2">{endpoint.path}</code>
              <div className="text-sm text-gray-700">{endpoint.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Endpoints Analizados</div>
              <div className="text-2xl font-bold text-gray-900">
                {results.resumen.total}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Coincidencias Exactas</div>
              <div className="text-2xl font-bold text-green-600">
                {results.resumen.exactos}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-600">Muy Cercanos</div>
              <div className="text-2xl font-bold text-yellow-600">
                {results.resumen.cercanos}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Lejanos</div>
              <div className="text-2xl font-bold text-blue-600">
                {results.resumen.lejanos}
              </div>
            </div>
          </div>

          {/* Detailed Results */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Resultados Detallados
            </h4>
            <div className="space-y-4">
              {results.endpoints.map((resultado, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(resultado.status)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(resultado.status)}
                      <div>
                        <div className="font-medium text-lg">{resultado.name}</div>
                        <code className="text-sm text-gray-600">{resultado.path}</code>
                        <div className="text-xs text-gray-500 mt-1">
                          {resultado.dataType}[{resultado.dataSize}] - {resultado.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {resultado.status.replace('_', ' ').toUpperCase()}
                      </div>
                      {getPriorityBadge(resultado.priority)}
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 mb-3 font-medium">
                    {resultado.message}
                  </div>

                  {/* Resultados encontrados */}
                  {resultado.resultados.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="text-sm font-medium text-gray-800">
                        Resultados encontrados:
                      </div>
                      {resultado.resultados.map((res, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded text-sm ${
                            res.esExacto ? 'bg-green-100 border border-green-300' :
                            res.esCercano ? 'bg-yellow-100 border border-yellow-300' :
                            'bg-blue-100 border border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-mono text-xs flex-1 mr-2">{res.path}</span>
                            <span className="font-bold">{formatCurrency(res.valor)}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Diferencia: {formatCurrency(res.diferencia)} | Error: {res.porcentaje.toFixed(2)}%
                            {res.esExacto && <span className="ml-2 font-bold text-green-600">🎯 EXACTO!</span>}
                            {res.esSuma && <span className="ml-2 text-blue-600">📊 SUMA</span>}
                            {res.itemsContados && <span className="ml-2 text-gray-500">({res.itemsContados} items)</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ver datos originales */}
                  <details>
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Ver datos originales
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-64">
                      <pre>{JSON.stringify(resultado.data, null, 2)}</pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipaxFinalDebugger;
