import React, { useState } from 'react';
import { Calculator, Target, CheckCircle, TrendingUp, Database } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxCartolaCalculator = () => {
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

  const calcularSaldosDesdeCartolas = async () => {
    setLoading(true);
    setResults(null);
    setFoundSolution(null);

    try {
      console.log('🔍 Obteniendo todas las cartolas...');
      
      // Obtener todas las cartolas con paginación
      const cartolasResponse = await chipaxService.fetchAllPaginatedData('/flujo-caja/cartolas');
      const todasLasCartolas = cartolasResponse.items;
      
      console.log(`📊 ${todasLasCartolas.length} cartolas obtenidas`);
      console.log('📋 Estructura de la primera cartola:', todasLasCartolas[0]);

      // Extraer todos los saldos de todas las cartolas
      const todosSaldos = [];
      const saldosPorCuenta = {};
      
      todasLasCartolas.forEach((cartola, index) => {
        if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
          cartola.Saldos.forEach(saldo => {
            todosSaldos.push({
              ...saldo,
              cartola_id: cartola.id,
              cuenta_corriente_id: cartola.cuenta_corriente_id,
              fecha: cartola.fecha,
              descripcion: cartola.descripcion
            });

            // Agrupar por cuenta corriente (solo los últimos registros)
            if (saldo.last_record === 1) {
              const cuentaId = cartola.cuenta_corriente_id;
              if (!saldosPorCuenta[cuentaId] || cartola.id > saldosPorCuenta[cuentaId].cartola_id) {
                saldosPorCuenta[cuentaId] = {
                  ...saldo,
                  cartola_id: cartola.id,
                  cuenta_corriente_id: cuentaId,
                  fecha: cartola.fecha,
                  descripcion: cartola.descripcion
                };
              }
            }
          });
        }
      });

      console.log(`💰 ${todosSaldos.length} saldos extraídos de cartolas`);
      console.log(`🏦 ${Object.keys(saldosPorCuenta).length} cuentas únicas con saldo más reciente`);

      // Probar diferentes interpretaciones de saldos
      const interpretaciones = [
        {
          nombre: 'Suma de saldo_deudor (últimos registros)',
          descripcion: 'Solo saldos deudores de registros más recientes',
          calcular: () => Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0)
        },
        {
          nombre: 'Suma de saldo_acreedor (últimos registros)',
          descripcion: 'Solo saldos acreedores de registros más recientes',
          calcular: () => Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0)
        },
        {
          nombre: 'Diferencia deudor - acreedor (últimos registros)',
          descripcion: 'saldo_deudor - saldo_acreedor de registros más recientes',
          calcular: () => Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0) - (s.saldo_acreedor || 0), 0)
        },
        {
          nombre: 'Suma de debe (últimos registros)',
          descripcion: 'Solo campo debe de registros más recientes',
          calcular: () => Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.debe || 0), 0)
        },
        {
          nombre: 'Suma de haber (últimos registros)',
          descripcion: 'Solo campo haber de registros más recientes',
          calcular: () => Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.haber || 0), 0)
        },
        {
          nombre: 'Diferencia haber - debe (últimos registros)',
          descripción: 'haber - debe de registros más recientes',
          calcular: () => Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.haber || 0) - (s.debe || 0), 0)
        },
        {
          nombre: 'Suma TODOS los saldo_deudor',
          descripcion: 'Todos los saldos deudores (sin filtrar por last_record)',
          calcular: () => todosSaldos.reduce((sum, s) => sum + (s.saldo_deudor || 0), 0)
        },
        {
          nombre: 'Suma TODOS los saldo_acreedor',
          descripcion: 'Todos los saldos acreedores (sin filtrar por last_record)',
          calcular: () => todosSaldos.reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0)
        },
        {
          nombre: 'Diferencia TODOS deudor - acreedor',
          descripcion: 'Todos: saldo_deudor - saldo_acreedor',
          calcular: () => todosSaldos.reduce((sum, s) => sum + (s.saldo_deudor || 0) - (s.saldo_acreedor || 0), 0)
        },
        {
          nombre: 'Suma TODOS los debe',
          descripcion: 'Todos los campos debe',
          calcular: () => todosSaldos.reduce((sum, s) => sum + (s.debe || 0), 0)
        },
        {
          nombre: 'Suma TODOS los haber',
          descripcion: 'Todos los campos haber',
          calcular: () => todosSaldos.reduce((sum, s) => sum + (s.haber || 0), 0)
        },
        {
          nombre: 'Diferencia TODOS haber - debe',
          descripcion: 'Todos: haber - debe',
          calcular: () => todosSaldos.reduce((sum, s) => sum + (s.haber || 0) - (s.debe || 0), 0)
        }
      ];

      // Calcular todos los resultados
      const resultadosCalculados = interpretaciones.map(interpretacion => {
        const valor = interpretacion.calcular();
        const diferencia = Math.abs(valor - TARGET_AMOUNT);
        const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
        const esExacto = diferencia < 1000;

        return {
          ...interpretacion,
          valor,
          diferencia,
          porcentaje,
          esExacto
        };
      });

      // Ordenar por menor diferencia
      resultadosCalculados.sort((a, b) => a.diferencia - b.diferencia);

      // Buscar solución exacta
      const solucionExacta = resultadosCalculados.find(r => r.esExacto);
      if (solucionExacta) {
        setFoundSolution(solucionExacta);
        console.log('🎯 SOLUCIÓN ENCONTRADA:', solucionExacta);
      }

      // Log de resultados
      console.log('📊 RESULTADOS DE CÁLCULOS:');
      resultadosCalculados.forEach(resultado => {
        const icon = resultado.esExacto ? '✅' : '❌';
        console.log(`${icon} ${resultado.nombre}: ${formatCurrency(resultado.valor)} (error: ${resultado.porcentaje.toFixed(2)}%)`);
      });

      setResults({
        todasLasCartolas,
        todosSaldos,
        saldosPorCuenta,
        interpretaciones: resultadosCalculados,
        mejorResultado: resultadosCalculados[0],
        estadisticas: {
          totalCartolas: todasLasCartolas.length,
          totalSaldos: todosSaldos.length,
          cuentasUnicas: Object.keys(saldosPorCuenta).length,
          ultimosRegistros: Object.values(saldosPorCuenta).length
        }
      });

    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generarCodigoImplementacion = (interpretacion) => {
    if (interpretacion.nombre.includes('últimos registros')) {
      return `// SOLUCIÓN ENCONTRADA - Usar saldos de últimos registros de cartolas
export const obtenerSaldosBancarios = async () => {
  const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
  const cartolas = cartolasResponse.items;
  
  const saldosPorCuenta = {};
  
  cartolas.forEach(cartola => {
    if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
      cartola.Saldos.forEach(saldo => {
        if (saldo.last_record === 1) {
          const cuentaId = cartola.cuenta_corriente_id;
          if (!saldosPorCuenta[cuentaId] || cartola.id > saldosPorCuenta[cuentaId].cartola_id) {
            saldosPorCuenta[cuentaId] = saldo;
          }
        }
      });
    }
  });
  
  ${interpretacion.nombre.includes('saldo_deudor') ? 
    `return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0);` :
    interpretacion.nombre.includes('saldo_acreedor') ?
    `return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0);` :
    interpretacion.nombre.includes('deudor - acreedor') ?
    `return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0) - (s.saldo_acreedor || 0), 0);` :
    interpretacion.nombre.includes('haber') && interpretacion.nombre.includes('debe') ?
    `return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.haber || 0) - (s.debe || 0), 0);` :
    interpretacion.nombre.includes('haber') ?
    `return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.haber || 0), 0);` :
    `return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.debe || 0), 0);`}
};`;
    } else {
      return `// SOLUCIÓN ENCONTRADA - Usar todos los saldos de cartolas
export const obtenerSaldosBancarios = async () => {
  const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
  const cartolas = cartolasResponse.items;
  
  const todosSaldos = [];
  cartolas.forEach(cartola => {
    if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
      todosSaldos.push(...cartola.Saldos);
    }
  });
  
  ${interpretacion.nombre.includes('saldo_deudor') ? 
    `return todosSaldos.reduce((sum, s) => sum + (s.saldo_deudor || 0), 0);` :
    interpretacion.nombre.includes('saldo_acreedor') ?
    `return todosSaldos.reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0);` :
    interpretacion.nombre.includes('deudor - acreedor') ?
    `return todosSaldos.reduce((sum, s) => sum + (s.saldo_deudor || 0) - (s.saldo_acreedor || 0), 0);` :
    interpretacion.nombre.includes('haber') && interpretacion.nombre.includes('debe') ?
    `return todosSaldos.reduce((sum, s) => sum + (s.haber || 0) - (s.debe || 0), 0);` :
    interpretacion.nombre.includes('haber') ?
    `return todosSaldos.reduce((sum, s) => sum + (s.haber || 0), 0);` :
    `return todosSaldos.reduce((sum, s) => sum + (s.debe || 0), 0);`}
};`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calculator className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Calculadora de Saldos desde Cartolas
          </h3>
        </div>
        <button
          onClick={calcularSaldosDesdeCartolas}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4" />
            <span>{loading ? 'Calculando...' : 'Calcular Saldos'}</span>
          </div>
        </button>
      </div>

      {/* Target */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">Objetivo</span>
        </div>
        <p className="text-green-700">
          Calcular desde cartolas: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
        <p className="text-green-600 text-sm mt-1">
          Extraerá saldos del array Saldos de cada cartola y probará 12 interpretaciones diferentes
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-semibold text-green-800 mb-2">
                  {foundSolution.nombre}
                </div>
                <div className="text-green-700 text-sm">
                  {foundSolution.descripcion}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-800">
                  {formatCurrency(foundSolution.valor)}
                </div>
                <div className="text-green-600">
                  Diferencia: {formatCurrency(foundSolution.diferencia)} ({foundSolution.porcentaje.toFixed(3)}%)
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded border border-green-300">
              <div className="text-sm font-medium text-green-800 mb-3">
                🚀 Código para chipaxService.js:
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                <code>{generarCodigoImplementacion(foundSolution)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 animate-pulse text-blue-600" />
            <span className="text-blue-800">
              Obteniendo todas las cartolas y calculando saldos...
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Total Cartolas</div>
              <div className="text-2xl font-bold text-blue-800">
                {results.estadisticas.totalCartolas}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600">Total Saldos</div>
              <div className="text-2xl font-bold text-purple-800">
                {results.estadisticas.totalSaldos}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600">Cuentas Únicas</div>
              <div className="text-2xl font-bold text-orange-800">
                {results.estadisticas.cuentasUnicas}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Últimos Registros</div>
              <div className="text-2xl font-bold text-green-800">
                {results.estadisticas.ultimosRegistros}
              </div>
            </div>
          </div>

          {/* Interpretations Results */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Resultados de las 12 Interpretaciones
            </h4>
            <div className="space-y-3">
              {results.interpretaciones.map((interpretacion, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    interpretacion.esExacto ? 'bg-green-50 border-green-300' :
                    interpretacion.porcentaje < 5 ? 'bg-yellow-50 border-yellow-300' :
                    'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {interpretacion.esExacto ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          #{index + 1} {interpretacion.nombre}
                        </div>
                        <div className="text-sm text-gray-600">
                          {interpretacion.descripcion}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {formatCurrency(interpretacion.valor)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Error: {interpretacion.porcentaje.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {interpretacion.esExacto && (
                    <div className="mt-3 p-3 bg-green-100 rounded">
                      <div className="text-green-800 font-medium text-sm">
                        ✅ ¡Esta interpretación es CORRECTA! 
                        Diferencia: {formatCurrency(interpretacion.diferencia)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Raw Data Preview */}
          <details>
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Ver muestra de datos de cartolas y saldos
            </summary>
            <div className="mt-2 space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Primera cartola:</div>
                <div className="p-3 bg-gray-50 rounded text-xs font-mono overflow-auto">
                  <pre>{JSON.stringify(results.todasLasCartolas[0], null, 2)}</pre>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Primeros 3 saldos extraídos:</div>
                <div className="p-3 bg-gray-50 rounded text-xs font-mono overflow-auto">
                  <pre>{JSON.stringify(results.todosSaldos.slice(0, 3), null, 2)}</pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ChipaxCartolaCalculator;
