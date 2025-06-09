import React, { useState } from 'react';
import { Play, Target, CheckCircle, Eye, AlertTriangle } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxCuentasConSaldosDebugger = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const TARGET_AMOUNT = 186648977;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Los 5 endpoints que funcionaron
  const endpointsExitosos = [
    { path: '/cuentas-corrientes?incluirSaldos=true', name: 'incluirSaldos=true' },
    { path: '/cuentas-corrientes?withBalance=1', name: 'withBalance=1' },
    { path: '/cuentas-corrientes?expand=saldo', name: 'expand=saldo' },
    { path: '/cuentas-corrientes?include=balance', name: 'include=balance' },
    { path: '/cuentas-corrientes?fields=*,saldo', name: 'fields=*,saldo' }
  ];

  const analizarNumeroEnObjeto = (obj, path = '') => {
    const resultados = [];
    
    if (typeof obj === 'number') {
      const diferencia = Math.abs(obj - TARGET_AMOUNT);
      const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
      
      resultados.push({
        path,
        valor: obj,
        diferencia,
        porcentaje,
        esExacto: diferencia < 1000,
        esCercano: diferencia < TARGET_AMOUNT * 0.1
      });
    } else if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      Object.keys(obj).forEach(key => {
        resultados.push(...analizarNumeroEnObjeto(obj[key], path ? `${path}.${key}` : key));
      });
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        resultados.push(...analizarNumeroEnObjeto(item, `${path}[${index}]`));
      });
    }
    
    return resultados;
  };

  const analizarSumasDeArrays = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    // Encontrar todos los campos numéricos
    const camposNumericos = new Set();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        const extraerCampos = (obj, prefix = '') => {
          Object.keys(obj).forEach(key => {
            const valor = obj[key];
            const campoCompleto = prefix ? `${prefix}.${key}` : key;
            
            if (typeof valor === 'number') {
              camposNumericos.add(campoCompleto);
            } else if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
              extraerCampos(valor, campoCompleto);
            }
          });
        };
        extraerCampos(item);
      }
    });

    // Calcular sumas para cada campo
    const sumasResultados = [];
    Array.from(camposNumericos).forEach(campo => {
      let suma = 0;
      const valores = [];
      
      data.forEach((item, index) => {
        const valor = campo.split('.').reduce((obj, key) => obj?.[key], item);
        if (typeof valor === 'number') {
          suma += valor;
          valores.push({ cuenta: index, valor });
        }
      });
      
      const diferencia = Math.abs(suma - TARGET_AMOUNT);
      const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
      
      sumasResultados.push({
        campo,
        suma,
        diferencia,
        porcentaje,
        esExacto: diferencia < 1000,
        esCercano: diferencia < TARGET_AMOUNT * 0.1,
        valores
      });
    });
    
    return sumasResultados.sort((a, b) => a.diferencia - b.diferencia);
  };

  const ejecutarAnalisis = async () => {
    setLoading(true);
    setResults(null);

    try {
      const resultadosPorEndpoint = [];

      for (const endpoint of endpointsExitosos) {
        console.log(`🔍 Analizando ${endpoint.path}...`);
        
        try {
          const data = await chipaxService.fetchFromChipax(endpoint.path);
          
          if (!data || !Array.isArray(data) || data.length === 0) {
            resultadosPorEndpoint.push({
              ...endpoint,
              status: 'empty',
              message: 'Sin datos o estructura incorrecta',
              numerosTotales: [],
              sumasCalculadas: []
            });
            continue;
          }

          console.log(`📊 ${data.length} cuentas obtenidas de ${endpoint.path}`);
          
          // Log de la primera cuenta para ver la estructura
          if (data.length > 0) {
            console.log(`📋 Estructura con ${endpoint.name}:`, JSON.stringify(data[0], null, 2));
          }

          // Analizar todos los números en los datos
          const numerosTotales = analizarNumeroEnObjeto(data, endpoint.name);
          
          // Analizar sumas de campos
          const sumasCalculadas = analizarSumasDeArrays(data);
          
          const exactos = [...numerosTotales, ...sumasCalculadas].filter(n => n.esExacto);
          const cercanos = [...numerosTotales, ...sumasCalculadas].filter(n => n.esCercano);
          
          let status = 'success';
          let message = 'Datos analizados';
          
          if (exactos.length > 0) {
            status = 'exact';
            message = `🎯 ¡${exactos.length} COINCIDENCIA(S) EXACTA(S)!`;
          } else if (cercanos.length > 0) {
            status = 'close';
            message = `🟡 ${cercanos.length} resultado(s) cercano(s)`;
          }

          resultadosPorEndpoint.push({
            ...endpoint,
            status,
            message,
            data,
            numerosTotales: numerosTotales.slice(0, 10), // Top 10
            sumasCalculadas: sumasCalculadas.slice(0, 10), // Top 10
            todosLosResultados: [...numerosTotales, ...sumasCalculadas].sort((a, b) => a.diferencia - b.diferencia)
          });

          // Si encontramos algo exacto, logearlo
          if (exactos.length > 0) {
            console.log(`🎯 ¡EXACTO en ${endpoint.path}!`);
            exactos.forEach(exacto => {
              console.log(`   ${exacto.path || exacto.campo}: ${formatCurrency(exacto.valor || exacto.suma)}`);
            });
          }

        } catch (error) {
          console.error(`❌ Error en ${endpoint.path}:`, error);
          resultadosPorEndpoint.push({
            ...endpoint,
            status: 'error',
            message: error.message,
            numerosTotales: [],
            sumasCalculadas: []
          });
        }
      }

      // Ordenar resultados por relevancia
      resultadosPorEndpoint.sort((a, b) => {
        const orderMap = { 'exact': 0, 'close': 1, 'success': 2, 'empty': 3, 'error': 4 };
        return orderMap[a.status] - orderMap[b.status];
      });

      setResults({
        endpointResults: resultadosPorEndpoint,
        mejorEndpoint: resultadosPorEndpoint[0],
        resumen: {
          total: resultadosPorEndpoint.length,
          exactos: resultadosPorEndpoint.filter(r => r.status === 'exact').length,
          cercanos: resultadosPorEndpoint.filter(r => r.status === 'close').length,
          exitosos: resultadosPorEndpoint.filter(r => r.status === 'success').length
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
      case 'exact':
        return <Target className="w-5 h-5 text-green-500" />;
      case 'close':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Eye className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'exact':
        return 'bg-green-50 border-green-300';
      case 'close':
        return 'bg-yellow-50 border-yellow-300';
      case 'success':
        return 'bg-blue-50 border-blue-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Análisis de Cuentas Corrientes con Saldos
          </h3>
        </div>
        <button
          onClick={ejecutarAnalisis}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>{loading ? 'Analizando...' : 'Analizar Endpoints'}</span>
          </div>
        </button>
      </div>

      {/* Target */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">Objetivo</span>
        </div>
        <p className="text-blue-700">
          Buscar en endpoints exitosos: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
        <p className="text-blue-600 text-sm mt-1">
          Analizará los 5 endpoints de cuentas-corrientes que respondieron correctamente
        </p>
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
              <div className="text-sm text-yellow-600">Resultados Cercanos</div>
              <div className="text-2xl font-bold text-yellow-600">
                {results.resumen.cercanos}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Análisis Exitosos</div>
              <div className="text-2xl font-bold text-blue-600">
                {results.resumen.exitosos}
              </div>
            </div>
          </div>

          {/* Best Result */}
          {results.mejorEndpoint && results.mejorEndpoint.status === 'exact' && (
            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Target className="w-5 h-5 text-green-500" />
                <span className="font-bold text-green-800">¡SOLUCIÓN ENCONTRADA!</span>
              </div>
              <div className="space-y-2">
                <p className="font-medium">Endpoint: <code className="bg-green-100 px-2 py-1 rounded">{results.mejorEndpoint.path}</code></p>
                <p className="text-green-800">{results.mejorEndpoint.message}</p>
                
                {/* Mostrar los resultados exactos */}
                {results.mejorEndpoint.todosLosResultados.filter(r => r.esExacto).map((resultado, index) => (
                  <div key={index} className="p-3 bg-green-100 rounded">
                    <div className="font-mono text-sm">
                      {resultado.path || resultado.campo}
                    </div>
                    <div className="font-bold text-lg">
                      {formatCurrency(resultado.valor || resultado.suma)}
                    </div>
                    <div className="text-xs text-green-700">
                      Error: {resultado.porcentaje.toFixed(3)}%
                    </div>
                    
                    {/* Código para usar */}
                    <div className="mt-2 p-2 bg-white rounded">
                      <div className="text-xs text-green-800 font-medium">Código para el adaptador:</div>
                      <code className="text-xs">
                        {resultado.campo ? 
                          `// Usar suma de campo: ${resultado.campo}\nsaldoFinal = cuentas.reduce((sum, c) => sum + (c.${resultado.campo} || 0), 0);` :
                          `// Usar campo directo: ${resultado.path}\nsaldoFinal = cuenta.${resultado.path};`
                        }
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Results */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Resultados Detallados por Endpoint
            </h4>
            <div className="space-y-4">
              {results.endpointResults.map((resultado, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(resultado.status)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(resultado.status)}
                      <div>
                        <div className="font-medium">{resultado.name}</div>
                        <code className="text-xs text-gray-600">{resultado.path}</code>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {resultado.status.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 mb-3">
                    {resultado.message}
                  </div>

                  {/* Top results para este endpoint */}
                  {resultado.todosLosResultados && resultado.todosLosResultados.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Top 5 resultados:</div>
                      {resultado.todosLosResultados.slice(0, 5).map((res, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded text-sm ${
                            res.esExacto ? 'bg-green-100' :
                            res.esCercano ? 'bg-yellow-100' :
                            'bg-gray-100'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span className="font-mono text-xs">{res.path || res.campo}</span>
                            <span className="font-bold">{formatCurrency(res.valor || res.suma)}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Error: {res.porcentaje.toFixed(2)}%
                            {res.esExacto && <span className="ml-2 font-bold text-green-600">🎯 EXACTO!</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ver datos raw */}
                  {resultado.data && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        Ver datos originales
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-64">
                        <pre>{JSON.stringify(resultado.data[0], null, 2)}</pre>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipaxCuentasConSaldosDebugger;
