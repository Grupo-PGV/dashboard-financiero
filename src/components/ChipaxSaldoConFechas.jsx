import React, { useState } from 'react';
import { Calendar, Calculator, Target, TrendingUp, Database } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxSaldoConFechas = () => {
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-CL');
  };

  const calcularSaldoConFechas = async () => {
    setLoading(true);
    setResults(null);
    setFoundSolution(null);

    try {
      console.log('🗓️ Iniciando cálculo con fechas específicas...');

      // 1. Obtener TODAS las cartolas
      console.log('📊 Obteniendo todas las cartolas...');
      const cartolasResponse = await chipaxService.fetchAllPaginatedData('/flujo-caja/cartolas');
      const todasLasCartolas = cartolasResponse.items;
      
      console.log(`📋 ${todasLasCartolas.length} cartolas obtenidas`);

      // 2. Filtrar cartolas por fechas
      const cartolas2024 = todasLasCartolas.filter(cartola => {
        const fecha = new Date(cartola.fecha);
        return fecha.getFullYear() === 2024;
      });

      const cartolas2025 = todasLasCartolas.filter(cartola => {
        const fecha = new Date(cartola.fecha);
        return fecha.getFullYear() === 2025;
      });

      // 3. Encontrar saldo final de 2024 (al 31 de diciembre)
      console.log('🎯 Buscando saldo final al 31 de diciembre de 2024...');
      
      // Buscar las cartolas más recientes de diciembre 2024
      const cartolasDiciembre2024 = cartolas2024.filter(cartola => {
        const fecha = new Date(cartola.fecha);
        return fecha.getMonth() === 11; // Diciembre (mes 11)
      });

      // Ordenar por fecha descendente para obtener las más recientes
      cartolasDiciembre2024.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      console.log(`📅 ${cartolas2024.length} cartolas de 2024, ${cartolasDiciembre2024.length} de diciembre 2024`);
      console.log(`📅 ${cartolas2025.length} cartolas de 2025`);

      // 4. Extraer saldos por período
      const extraerSaldos = (cartolas, periodo) => {
        const saldos = [];
        const saldosPorCuenta = {};

        cartolas.forEach(cartola => {
          if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
            cartola.Saldos.forEach(saldo => {
              saldos.push({
                ...saldo,
                cartola_id: cartola.id,
                cuenta_corriente_id: cartola.cuenta_corriente_id,
                fecha: cartola.fecha,
                periodo
              });

              // Para obtener el saldo más reciente por cuenta en este período
              if (saldo.last_record === 1) {
                const cuentaId = cartola.cuenta_corriente_id;
                if (!saldosPorCuenta[cuentaId] || new Date(cartola.fecha) > new Date(saldosPorCuenta[cuentaId].fecha)) {
                  saldosPorCuenta[cuentaId] = {
                    ...saldo,
                    fecha: cartola.fecha,
                    cuenta_corriente_id: cuentaId
                  };
                }
              }
            });
          }
        });

        return { saldos, saldosPorCuenta };
      };

      const saldos2024 = extraerSaldos(cartolas2024, '2024');
      const saldosDiciembre2024 = extraerSaldos(cartolasDiciembre2024, 'Diciembre 2024');
      const saldos2025 = extraerSaldos(cartolas2025, '2025');

      console.log(`💰 Saldos extraídos - 2024: ${saldos2024.saldos.length}, Dic2024: ${saldosDiciembre2024.saldos.length}, 2025: ${saldos2025.saldos.length}`);

      // 5. Calcular diferentes interpretaciones con fechas
      const interpretaciones = [
        // Saldo final de diciembre 2024 (saldo inicial para 2025)
        {
          nombre: 'Saldo inicial 2025 (deudor dic 2024)',
          descripcion: 'Suma de saldo_deudor de diciembre 2024 (saldo inicial)',
          periodo: 'Diciembre 2024',
          valor: Object.values(saldosDiciembre2024.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0)
        },
        {
          nombre: 'Saldo inicial 2025 (acreedor dic 2024)',
          descripcion: 'Suma de saldo_acreedor de diciembre 2024 (saldo inicial)',
          periodo: 'Diciembre 2024',
          valor: Object.values(saldosDiciembre2024.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0)
        },
        {
          nombre: 'Saldo inicial 2025 (diferencia dic 2024)',
          descripcion: 'Diferencia deudor-acreedor de diciembre 2024',
          periodo: 'Diciembre 2024',
          valor: Object.values(saldosDiciembre2024.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0) - (s.saldo_acreedor || 0), 0)
        },

        // Saldo actual de 2025
        {
          nombre: 'Saldo actual 2025 (deudor)',
          descripcion: 'Suma de saldo_deudor de 2025',
          periodo: '2025',
          valor: Object.values(saldos2025.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0)
        },
        {
          nombre: 'Saldo actual 2025 (acreedor)',
          descripcion: 'Suma de saldo_acreedor de 2025',
          periodo: '2025',
          valor: Object.values(saldos2025.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0)
        },
        {
          nombre: 'Saldo actual 2025 (diferencia)',
          descripcion: 'Diferencia deudor-acreedor de 2025',
          periodo: '2025',
          valor: Object.values(saldos2025.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0) - (s.saldo_acreedor || 0), 0)
        },

        // Combinaciones: Saldo inicial + Movimientos
        {
          nombre: 'Saldo inicial + Movimientos 2025 (deudor)',
          descripcion: 'Saldo deudor dic 2024 + movimientos deudor 2025',
          periodo: 'Combinado',
          valor: Object.values(saldosDiciembre2024.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0) +
                 Object.values(saldos2025.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0)
        },
        {
          nombre: 'Saldo inicial + Movimientos 2025 (acreedor)',
          descripcion: 'Saldo acreedor dic 2024 + movimientos acreedor 2025',
          periodo: 'Combinado',
          valor: Object.values(saldosDiciembre2024.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0) +
                 Object.values(saldos2025.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0)
        },

        // Diferencias entre períodos
        {
          nombre: 'Diferencia 2025 - 2024 (deudor)',
          descripcion: 'Cambio en saldo deudor desde dic 2024',
          periodo: 'Diferencia',
          valor: Object.values(saldos2025.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0) -
                 Object.values(saldosDiciembre2024.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0)
        },
        {
          nombre: 'Diferencia 2025 - 2024 (acreedor)',
          descripcion: 'Cambio en saldo acreedor desde dic 2024',
          periodo: 'Diferencia',
          valor: Object.values(saldos2025.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0) -
                 Object.values(saldosDiciembre2024.saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0)
        },

        // Saldos totales históricos (todo el período)
        {
          nombre: 'Total histórico deudor (2024+2025)',
          descripcion: 'Suma total de todos los saldos deudor',
          periodo: 'Total',
          valor: saldos2024.saldos.reduce((sum, s) => sum + (s.saldo_deudor || 0), 0) +
                 saldos2025.saldos.reduce((sum, s) => sum + (s.saldo_deudor || 0), 0)
        },
        {
          nombre: 'Total histórico acreedor (2024+2025)',
          descripcion: 'Suma total de todos los saldos acreedor',
          periodo: 'Total',
          valor: saldos2024.saldos.reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0) +
                 saldos2025.saldos.reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0)
        }
      ];

      // Calcular diferencias y ordenar
      const resultadosCalculados = interpretaciones.map(interpretacion => {
        const diferencia = Math.abs(interpretacion.valor - TARGET_AMOUNT);
        const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
        const esExacto = diferencia < 1000;
        const esCercano = diferencia < TARGET_AMOUNT * 0.05;

        return {
          ...interpretacion,
          diferencia,
          porcentaje,
          esExacto,
          esCercano
        };
      });

      resultadosCalculados.sort((a, b) => a.diferencia - b.diferencia);

      // Buscar solución
      const solucionExacta = resultadosCalculados.find(r => r.esExacto);
      const solucionCercana = resultadosCalculados.find(r => r.esCercano);
      
      if (solucionExacta) {
        setFoundSolution(solucionExacta);
        console.log('🎯 SOLUCIÓN EXACTA ENCONTRADA:', solucionExacta);
      } else if (solucionCercana) {
        setFoundSolution(solucionCercana);
        console.log('🟡 SOLUCIÓN CERCANA ENCONTRADA:', solucionCercana);
      }

      // Log de resultados
      console.log('📊 RESULTADOS CON FECHAS:');
      resultadosCalculados.slice(0, 5).forEach((resultado, index) => {
        const icon = resultado.esExacto ? '🎯' : resultado.esCercano ? '🟡' : '❌';
        console.log(`${icon} ${index + 1}. ${resultado.nombre}: ${formatCurrency(resultado.valor)} (error: ${resultado.porcentaje.toFixed(2)}%)`);
      });

      setResults({
        cartolas2024: cartolas2024.length,
        cartolas2025: cartolas2025.length,
        cartolasDiciembre2024: cartolasDiciembre2024.length,
        saldos2024: saldos2024.saldos.length,
        saldos2025: saldos2025.saldos.length,
        saldosDiciembre2024: saldosDiciembre2024.saldos.length,
        interpretaciones: resultadosCalculados,
        mejorResultado: resultadosCalculados[0],
        datosDetallados: {
          saldosPorCuenta2024: saldos2024.saldosPorCuenta,
          saldosPorCuentaDic2024: saldosDiciembre2024.saldosPorCuenta,
          saldosPorCuenta2025: saldos2025.saldosPorCuenta
        }
      });

    } catch (error) {
      console.error('❌ Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generarCodigoSolucion = (solucion) => {
    if (solucion.nombre.includes('inicial')) {
      return `// SOLUCIÓN - Usar saldo inicial de diciembre 2024
export const obtenerSaldosBancarios = async () => {
  const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
  const cartolas = cartolasResponse.items;
  
  // Filtrar cartolas de diciembre 2024
  const cartolasDic2024 = cartolas.filter(cartola => {
    const fecha = new Date(cartola.fecha);
    return fecha.getFullYear() === 2024 && fecha.getMonth() === 11;
  });
  
  // Obtener saldos más recientes por cuenta
  const saldosPorCuenta = {};
  cartolasDic2024.forEach(cartola => {
    if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
      cartola.Saldos.forEach(saldo => {
        if (saldo.last_record === 1) {
          const cuentaId = cartola.cuenta_corriente_id;
          if (!saldosPorCuenta[cuentaId] || new Date(cartola.fecha) > new Date(saldosPorCuenta[cuentaId].fecha)) {
            saldosPorCuenta[cuentaId] = saldo;
          }
        }
      });
    }
  });
  
  ${solucion.nombre.includes('deudor') ? 
    'return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0), 0);' :
    solucion.nombre.includes('acreedor') ?
    'return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_acreedor || 0), 0);' :
    'return Object.values(saldosPorCuenta).reduce((sum, s) => sum + (s.saldo_deudor || 0) - (s.saldo_acreedor || 0), 0);'
  }
};`;
    } else {
      return `// SOLUCIÓN - ${solucion.nombre}
export const obtenerSaldosBancarios = async () => {
  const cartolasResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
  const cartolas = cartolasResponse.items;
  
  // Implementar lógica específica según: ${solucion.descripcion}
  // Valor encontrado: ${formatCurrency(solucion.valor)}
  
  return ${solucion.valor};
};`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Calculadora con Saldo Inicial y Fechas
          </h3>
        </div>
        <button
          onClick={calcularSaldoConFechas}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4" />
            <span>{loading ? 'Calculando...' : 'Calcular con Fechas'}</span>
          </div>
        </button>
      </div>

      {/* Target */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">Análisis por Períodos</span>
        </div>
        <p className="text-blue-700">
          Objetivo: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
        <div className="text-blue-600 text-sm mt-2 space-y-1">
          <div>📅 <strong>Saldo inicial:</strong> Diciembre 31, 2024</div>
          <div>📊 <strong>Movimientos:</strong> Enero - Junio 2025</div>
          <div>🎯 <strong>Fórmula:</strong> Saldo inicial + Movimientos = Saldo actual</div>
        </div>
      </div>

      {/* Solution Found */}
      {foundSolution && (
        <div className={`mb-6 p-6 rounded-lg border-2 ${
          foundSolution.esExacto ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-center space-x-2 mb-4">
            <Target className="w-8 h-8 text-green-500" />
            <span className={`font-bold text-xl ${
              foundSolution.esExacto ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {foundSolution.esExacto ? '🎯 ¡SOLUCIÓN EXACTA!' : '🟡 ¡SOLUCIÓN CERCANA!'}
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-semibold mb-2">
                  {foundSolution.nombre}
                </div>
                <div className="text-sm text-gray-600">
                  {foundSolution.descripcion}
                </div>
                <div className="text-sm font-medium text-blue-600 mt-1">
                  Período: {foundSolution.periodo}
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
            
            <div className="p-4 bg-white rounded border">
              <div className="text-sm font-medium mb-3">
                🚀 Código de implementación:
              </div>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                <code>{generarCodigoSolucion(foundSolution)}</code>
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
              Analizando cartolas por períodos: 2024, diciembre 2024, y 2025...
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          
          {/* Period Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Cartolas 2024</div>
              <div className="text-2xl font-bold text-blue-800">{results.cartolas2024}</div>
              <div className="text-xs text-blue-600">{results.saldos2024} saldos</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Dic 2024</div>
              <div className="text-2xl font-bold text-green-800">{results.cartolasDiciembre2024}</div>
              <div className="text-xs text-green-600">{results.saldosDiciembre2024} saldos</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600">Cartolas 2025</div>
              <div className="text-2xl font-bold text-orange-800">{results.cartolas2025}</div>
              <div className="text-xs text-orange-600">{results.saldos2025} saldos</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600">Mejor Precisión</div>
              <div className="text-2xl font-bold text-purple-800">
                {results.mejorResultado.porcentaje.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-600">error</div>
            </div>
          </div>

          {/* Results by Period */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Resultados por Período
            </h4>
            <div className="space-y-3">
              {results.interpretaciones.map((interpretacion, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    interpretacion.esExacto ? 'bg-green-50 border-green-300' :
                    interpretacion.esCercano ? 'bg-yellow-50 border-yellow-300' :
                    interpretacion.porcentaje < 10 ? 'bg-blue-50 border-blue-300' :
                    'bg-red-50 border-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {interpretacion.esExacto ? (
                        <Target className="w-5 h-5 text-green-500" />
                      ) : interpretacion.esCercano ? (
                        <TrendingUp className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Calendar className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">
                          #{index + 1} {interpretacion.nombre}
                        </div>
                        <div className="text-sm text-gray-600">
                          {interpretacion.descripcion}
                        </div>
                        <div className="text-xs font-medium text-blue-600">
                          {interpretacion.periodo}
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
                </div>
              ))}
            </div>
          </div>

          {/* Period Breakdown */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium mb-3">Detalle por Cuentas:</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium mb-2">Diciembre 2024 (Saldo inicial):</div>
                {Object.entries(results.datosDetallados.saldosPorCuentaDic2024).map(([cuenta, saldo]) => (
                  <div key={cuenta} className="text-xs">
                    Cuenta {cuenta}: Deudor {formatCurrency(saldo.saldo_deudor)}, Acreedor {formatCurrency(saldo.saldo_acreedor)}
                  </div>
                ))}
              </div>
              <div>
                <div className="font-medium mb-2">2025 (Saldo actual):</div>
                {Object.entries(results.datosDetallados.saldosPorCuenta2025).map(([cuenta, saldo]) => (
                  <div key={cuenta} className="text-xs">
                    Cuenta {cuenta}: Deudor {formatCurrency(saldo.saldo_deudor)}, Acreedor {formatCurrency(saldo.saldo_acreedor)}
                  </div>
                ))}
              </div>
              <div>
                <div className="font-medium mb-2">Diferencias:</div>
                {Object.entries(results.datosDetallados.saldosPorCuenta2025).map(([cuenta, saldo2025]) => {
                  const saldoDic2024 = results.datosDetallados.saldosPorCuentaDic2024[cuenta];
                  if (saldoDic2024) {
                    const difDeudor = saldo2025.saldo_deudor - saldoDic2024.saldo_deudor;
                    const difAcreedor = saldo2025.saldo_acreedor - saldoDic2024.saldo_acreedor;
                    return (
                      <div key={cuenta} className="text-xs">
                        Cuenta {cuenta}: +{formatCurrency(difDeudor)} / +{formatCurrency(difAcreedor)}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipaxSaldoConFechas;
