import React, { useState } from 'react';
import { Play, Target, CheckCircle, Calculator, Eye } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const SimpleSaldosDebugger = () => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);

  const TARGET_AMOUNT = 186648977;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const analizarCuentasCorrientes = async () => {
    setLoading(true);
    setDebugData(null);

    try {
      // Obtener cuentas corrientes directamente
      console.log('🔍 Obteniendo cuentas corrientes...');
      const response = await chipaxService.fetchAllPaginatedData('/cuentas-corrientes');
      const cuentas = response.items;

      console.log(`📊 ${cuentas.length} cuentas obtenidas`);
      console.log('📋 Primera cuenta completa:', cuentas[0]);

      // Extraer TODOS los campos numéricos de todas las cuentas
      const todosLosCampos = new Set();
      const valoresPorCampo = {};

      cuentas.forEach(cuenta => {
        const extraerCamposNumericos = (obj, prefix = '') => {
          Object.keys(obj || {}).forEach(key => {
            const valor = obj[key];
            const campoCompleto = prefix ? `${prefix}.${key}` : key;
            
            if (typeof valor === 'number') {
              todosLosCampos.add(campoCompleto);
              if (!valoresPorCampo[campoCompleto]) {
                valoresPorCampo[campoCompleto] = [];
              }
              valoresPorCampo[campoCompleto].push(valor);
            } else if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
              extraerCamposNumericos(valor, campoCompleto);
            }
          });
        };

        extraerCamposNumericos(cuenta);
      });

      console.log('🔍 Campos numéricos encontrados:', Array.from(todosLosCampos));

      // Calcular totales para cada campo
      const totalesPorCampo = {};
      Array.from(todosLosCampos).forEach(campo => {
        const valores = valoresPorCampo[campo];
        const total = valores.reduce((sum, val) => sum + val, 0);
        const diferencia = Math.abs(total - TARGET_AMOUNT);
        const porcentajeError = (diferencia / TARGET_AMOUNT) * 100;
        
        totalesPorCampo[campo] = {
          campo,
          valores,
          total,
          diferencia,
          porcentajeError,
          esCorrecta: diferencia < 1000,
          valoresIndividuales: valores.map((val, index) => ({
            cuenta: cuentas[index]?.numeroCuenta || cuentas[index]?.id || `Cuenta ${index}`,
            valor: val
          }))
        };
      });

      // Ordenar por menor diferencia
      const resultadosOrdenados = Object.values(totalesPorCampo)
        .sort((a, b) => a.diferencia - b.diferencia);

      console.log('🎯 Resultados ordenados por precisión:');
      resultadosOrdenados.slice(0, 10).forEach(resultado => {
        const icon = resultado.esCorrecta ? '✅' : '❌';
        console.log(`${icon} ${resultado.campo}: ${formatCurrency(resultado.total)} (error: ${resultado.porcentajeError.toFixed(2)}%)`);
      });

      // También buscar combinaciones de campos
      const combinaciones = [];
      const camposLista = Array.from(todosLosCampos);
      
      // Probar combinaciones de 2 campos
      for (let i = 0; i < camposLista.length; i++) {
        for (let j = i + 1; j < camposLista.length; j++) {
          const campo1 = camposLista[i];
          const campo2 = camposLista[j];
          
          // Suma
          const totalSuma = totalesPorCampo[campo1].total + totalesPorCampo[campo2].total;
          const diferenciaSuma = Math.abs(totalSuma - TARGET_AMOUNT);
          
          // Resta
          const totalResta = totalesPorCampo[campo1].total - totalesPorCampo[campo2].total;
          const diferenciaResta = Math.abs(totalResta - TARGET_AMOUNT);
          
          combinaciones.push({
            tipo: 'suma',
            campos: [campo1, campo2],
            formula: `${campo1} + ${campo2}`,
            total: totalSuma,
            diferencia: diferenciaSuma,
            porcentajeError: (diferenciaSuma / TARGET_AMOUNT) * 100,
            esCorrecta: diferenciaSuma < 1000
          });
          
          combinaciones.push({
            tipo: 'resta',
            campos: [campo1, campo2], 
            formula: `${campo1} - ${campo2}`,
            total: totalResta,
            diferencia: diferenciaResta,
            porcentajeError: (diferenciaResta / TARGET_AMOUNT) * 100,
            esCorrecta: diferenciaResta < 1000
          });
        }
      }

      // Ordenar combinaciones
      combinaciones.sort((a, b) => a.diferencia - b.diferencia);

      console.log('🔄 Mejores combinaciones:');
      combinaciones.slice(0, 10).forEach(comb => {
        const icon = comb.esCorrecta ? '✅' : '❌';
        console.log(`${icon} ${comb.formula}: ${formatCurrency(comb.total)} (error: ${comb.porcentajeError.toFixed(2)}%)`);
      });

      setDebugData({
        cuentasOriginales: cuentas,
        camposEncontrados: Array.from(todosLosCampos),
        resultadosCampos: resultadosOrdenados,
        combinaciones: combinaciones.slice(0, 20), // Top 20
        mejorCampo: resultadosOrdenados[0],
        mejorCombinacion: combinaciones[0]
      });

    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calculator className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Debugger Simple - Saldos Directos
          </h3>
        </div>
        <button
          onClick={analizarCuentasCorrientes}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Play className="w-4 h-4" />
            <span>{loading ? 'Analizando...' : 'Analizar Cuentas'}</span>
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
          Encontrar campos que sumen: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
        <p className="text-blue-600 text-sm mt-1">
          Analizará TODOS los campos numéricos del endpoint /cuentas-corrientes
        </p>
      </div>

      {/* Results */}
      {debugData && (
        <div className="space-y-6">
          
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Cuentas Analizadas</div>
              <div className="text-2xl font-bold text-gray-900">
                {debugData.cuentasOriginales.length}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Campos Numéricos</div>
              <div className="text-2xl font-bold text-gray-900">
                {debugData.camposEncontrados.length}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Combinaciones Probadas</div>
              <div className="text-2xl font-bold text-gray-900">
                {debugData.combinaciones.length}
              </div>
            </div>
          </div>

          {/* Best Field */}
          {debugData.mejorCampo && (
            <div className={`p-4 rounded-lg border-2 ${
              debugData.mejorCampo.esCorrecta 
                ? 'bg-green-50 border-green-300' 
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {debugData.mejorCampo.esCorrecta ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Target className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-medium">
                  {debugData.mejorCampo.esCorrecta ? '🎯 ¡CAMPO CORRECTO ENCONTRADO!' : 'Mejor Campo Individual'}
                </span>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-lg">{debugData.mejorCampo.campo}</p>
                <p className="text-xl font-bold">
                  Total: {formatCurrency(debugData.mejorCampo.total)}
                </p>
                <p className="text-sm">
                  Error: {debugData.mejorCampo.porcentajeError.toFixed(2)}%
                </p>
                
                {debugData.mejorCampo.esCorrecta && (
                  <div className="mt-3 p-3 bg-green-100 rounded">
                    <p className="text-green-800 font-medium text-sm">
                      🎯 ¡Usar este campo en el adaptador!
                    </p>
                    <code className="block mt-1 p-2 bg-white rounded text-xs">
                      saldoFinal = cuenta.{debugData.mejorCampo.campo};
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Best Combination */}
          {debugData.mejorCombinacion && (
            <div className={`p-4 rounded-lg border-2 ${
              debugData.mejorCombinacion.esCorrecta 
                ? 'bg-green-50 border-green-300' 
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {debugData.mejorCombinacion.esCorrecta ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Target className="w-5 h-5 text-yellow-500" />
                )}
                <span className="font-medium">
                  {debugData.mejorCombinacion.esCorrecta ? '🎯 ¡COMBINACIÓN CORRECTA!' : 'Mejor Combinación'}
                </span>
              </div>
              <div className="space-y-2">
                <p className="font-mono text-lg">{debugData.mejorCombinacion.formula}</p>
                <p className="text-xl font-bold">
                  Total: {formatCurrency(debugData.mejorCombinacion.total)}
                </p>
                <p className="text-sm">
                  Error: {debugData.mejorCombinacion.porcentajeError.toFixed(2)}%
                </p>
                
                {debugData.mejorCombinacion.esCorrecta && (
                  <div className="mt-3 p-3 bg-green-100 rounded">
                    <p className="text-green-800 font-medium text-sm">
                      🎯 ¡Usar esta fórmula en el adaptador!
                    </p>
                    <code className="block mt-1 p-2 bg-white rounded text-xs">
                      saldoFinal = cuenta.{debugData.mejorCombinacion.formula.replace(' + ', ' + cuenta.').replace(' - ', ' - cuenta.')};
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Fields */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Top 10 Campos por Precisión
            </h4>
            <div className="space-y-2">
              {debugData.resultadosCampos.slice(0, 10).map((resultado, index) => (
                <div
                  key={resultado.campo}
                  className={`p-3 rounded border ${
                    resultado.esCorrecta ? 'bg-green-50 border-green-200' :
                    resultado.porcentajeError < 10 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono text-sm">{resultado.campo}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(resultado.total)}</div>
                      <div className="text-xs text-gray-600">
                        Error: {resultado.porcentajeError.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Data Preview */}
          <details>
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Ver datos originales de la primera cuenta</span>
            </summary>
            <div className="mt-2 p-4 bg-gray-50 rounded text-xs font-mono overflow-auto">
              <pre>{JSON.stringify(debugData.cuentasOriginales[0], null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default SimpleSaldosDebugger;
