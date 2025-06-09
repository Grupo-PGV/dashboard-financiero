import React, { useState } from 'react';
import { Play, Target, CheckCircle, XCircle, AlertTriangle, Eye, Download, RefreshCw } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxCartolaDebugger = () => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState([]);

  const TARGET_AMOUNT = 186648977;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const obtenerSaldosDesdeCartolas = async () => {
    addLog('🔍 Iniciando análisis de cartolas...', 'info');
    
    try {
      // 1. Obtener cartolas
      addLog('📡 Obteniendo cartolas desde /flujo-caja/cartolas', 'info');
      const cartolasResponse = await chipaxService.fetchAllPaginatedData('/flujo-caja/cartolas');
      const cartolas = cartolasResponse.items;
      
      addLog(`✅ ${cartolas.length} cartolas obtenidas`, 'success');

      if (cartolas.length === 0) {
        addLog('⚠️ No se encontraron cartolas', 'warning');
        return null;
      }

      // 2. Analizar estructura de la primera cartola
      const primeraCartola = cartolas[0];
      addLog('📋 Estructura de la primera cartola:', 'info');
      addLog(JSON.stringify(primeraCartola, null, 2), 'data');

      // 3. Extraer saldos por cuenta corriente
      addLog('🔄 Procesando saldos por cuenta corriente...', 'info');
      const saldosPorCuenta = {};

      cartolas.forEach((cartola, index) => {
        const cuentaId = cartola.cuenta_corriente_id;
        
        if (cuentaId && cartola.Saldo) {
          // Tomar el saldo más reciente por cuenta
          if (!saldosPorCuenta[cuentaId] || cartola.id > saldosPorCuenta[cuentaId].ultimaCartola) {
            saldosPorCuenta[cuentaId] = {
              saldoDeudor: cartola.Saldo.saldo_deudor || 0,
              saldoAcreedor: cartola.Saldo.saldo_acreedor || 0,
              debe: cartola.Saldo.debe || 0,
              haber: cartola.Saldo.haber || 0,
              ultimaCartola: cartola.id,
              fecha: cartola.fecha,
              totalCartolas: 1
            };
          }
        }
      });

      const cuentasConSaldo = Object.keys(saldosPorCuenta).length;
      addLog(`📊 ${cuentasConSaldo} cuentas con saldos encontradas`, 'success');

      // 4. Probar interpretaciones
      addLog('🧪 Probando interpretaciones de saldos...', 'info');
      
      const interpretaciones = [
        {
          id: 'deudor_menos_acreedor',
          nombre: 'saldo_deudor - saldo_acreedor',
          descripcion: 'Lógica contable estándar',
          calcular: (saldo) => saldo.saldoDeudor - saldo.saldoAcreedor
        },
        {
          id: 'acreedor_menos_deudor', 
          nombre: 'saldo_acreedor - saldo_deudor',
          descripcion: 'Lógica inversa',
          calcular: (saldo) => saldo.saldoAcreedor - saldo.saldoDeudor
        },
        {
          id: 'solo_deudor',
          nombre: 'solo saldo_deudor',
          descripcion: 'Solo campo deudor',
          calcular: (saldo) => saldo.saldoDeudor
        },
        {
          id: 'solo_acreedor',
          nombre: 'solo saldo_acreedor', 
          descripcion: 'Solo campo acreedor',
          calcular: (saldo) => saldo.saldoAcreedor
        },
        {
          id: 'haber_menos_debe',
          nombre: 'haber - debe',
          descripcion: 'Usando campos haber/debe',
          calcular: (saldo) => saldo.haber - saldo.debe
        },
        {
          id: 'debe_menos_haber',
          nombre: 'debe - haber',
          descripcion: 'Usando campos debe/haber inverso', 
          calcular: (saldo) => saldo.debe - saldo.haber
        },
        {
          id: 'suma_ambos',
          nombre: 'saldo_deudor + saldo_acreedor',
          descripcion: 'Suma de ambos campos',
          calcular: (saldo) => saldo.saldoDeudor + saldo.saldoAcreedor
        }
      ];

      const resultados = interpretaciones.map(interpretacion => {
        let totalCalculado = 0;
        const saldosPorCuentaDetalle = [];

        Object.keys(saldosPorCuenta).forEach(cuentaId => {
          const saldoInfo = saldosPorCuenta[cuentaId];
          const saldoCalculado = interpretacion.calcular(saldoInfo);
          totalCalculado += saldoCalculado;
          
          saldosPorCuentaDetalle.push({
            cuentaId,
            saldo: saldoCalculado,
            fecha: saldoInfo.fecha
          });
        });

        const diferencia = Math.abs(totalCalculado - TARGET_AMOUNT);
        const porcentajeError = (diferencia / TARGET_AMOUNT) * 100;
        const esCorrecta = diferencia < 1000;

        const logType = esCorrecta ? 'success' : porcentajeError < 5 ? 'warning' : 'error';
        const icon = esCorrecta ? '✅' : porcentajeError < 5 ? '🟡' : '❌';
        
        addLog(`${icon} ${interpretacion.nombre}: ${formatCurrency(totalCalculado)} (error: ${porcentajeError.toFixed(2)}%)`, logType);

        if (esCorrecta) {
          addLog(`🎯 ¡INTERPRETACIÓN CORRECTA ENCONTRADA: ${interpretacion.nombre}!`, 'success');
        }

        return {
          ...interpretacion,
          totalCalculado,
          diferencia,
          porcentajeError,
          esCorrecta,
          saldosPorCuentaDetalle
        };
      });

      // Ordenar por menor diferencia
      resultados.sort((a, b) => a.diferencia - b.diferencia);

      return {
        cartolasOriginales: cartolas,
        saldosPorCuenta,
        interpretaciones: resultados,
        mejorInterpretacion: resultados[0]
      };

    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      throw error;
    }
  };

  const obtenerCuentasCorrientes = async () => {
    addLog('📡 Obteniendo cuentas corrientes...', 'info');
    
    try {
      const cuentasResponse = await chipaxService.fetchAllPaginatedData('/cuentas-corrientes');
      addLog(`✅ ${cuentasResponse.items.length} cuentas corrientes obtenidas`, 'success');
      
      if (cuentasResponse.items.length > 0) {
        addLog('📋 Estructura de la primera cuenta:', 'info');
        addLog(JSON.stringify(cuentasResponse.items[0], null, 2), 'data');
      }

      return cuentasResponse.items;
    } catch (error) {
      addLog(`❌ Error obteniendo cuentas: ${error.message}`, 'error');
      throw error;
    }
  };

  const ejecutarAnalisisCompleto = async () => {
    setLoading(true);
    setError(null);
    setDebugData(null);
    clearLogs();
    setStep(0);

    try {
      // Paso 1: Obtener cuentas corrientes
      setStep(1);
      addLog('=== PASO 1: CUENTAS CORRIENTES ===', 'info');
      const cuentas = await obtenerCuentasCorrientes();

      // Paso 2: Analizar cartolas
      setStep(2);
      addLog('=== PASO 2: ANÁLISIS DE CARTOLAS ===', 'info');
      const datosCartolas = await obtenerSaldosDesdeCartolas();

      if (!datosCartolas) {
        throw new Error('No se pudieron obtener datos de cartolas');
      }

      // Paso 3: Combinar datos
      setStep(3);
      addLog('=== PASO 3: COMBINANDO DATOS ===', 'info');
      
      const cuentasConSaldos = cuentas.map(cuenta => {
        const saldoInfo = datosCartolas.saldosPorCuenta[cuenta.id];
        return {
          ...cuenta,
          saldoInfo: saldoInfo || null,
          tieneCartolas: !!saldoInfo
        };
      });

      addLog(`✅ ${cuentasConSaldos.filter(c => c.tieneCartolas).length} cuentas con cartolas de ${cuentas.length} total`, 'success');

      setDebugData({
        ...datosCartolas,
        cuentasCorrientes: cuentasConSaldos,
        resumen: {
          totalCuentas: cuentas.length,
          cuentasConCartolas: cuentasConSaldos.filter(c => c.tieneCartolas).length,
          totalCartolas: datosCartolas.cartolasOriginales.length,
          mejorInterpretacion: datosCartolas.mejorInterpretacion
        }
      });

      setStep(4);
      addLog('🎉 ¡Análisis completado exitosamente!', 'success');

    } catch (err) {
      addLog(`💥 Error crítico: ${err.message}`, 'error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'data': return '📄';
      default: return '📝';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-700';
      case 'warning': return 'text-yellow-700'; 
      case 'error': return 'text-red-700';
      case 'data': return 'text-blue-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Debugger de Cartolas - Análisis de Saldos
          </h3>
        </div>
        <button
          onClick={ejecutarAnalisisCompleto}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{loading ? 'Analizando...' : 'Iniciar Análisis'}</span>
          </div>
        </button>
      </div>

      {/* Target Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">Objetivo</span>
        </div>
        <p className="text-blue-700">
          Encontrar la interpretación que sume: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
      </div>

      {/* Progress Steps */}
      {loading && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <RefreshCw className="w-5 h-5 animate-spin text-yellow-600" />
            <span className="font-medium text-yellow-800">Progreso</span>
          </div>
          <div className="space-y-1">
            <div className={`text-sm ${step >= 1 ? 'text-green-600' : 'text-gray-500'}`}>
              {step >= 1 ? '✅' : '⏳'} Paso 1: Obteniendo cuentas corrientes
            </div>
            <div className={`text-sm ${step >= 2 ? 'text-green-600' : 'text-gray-500'}`}>
              {step >= 2 ? '✅' : '⏳'} Paso 2: Analizando cartolas
            </div>
            <div className={`text-sm ${step >= 3 ? 'text-green-600' : 'text-gray-500'}`}>
              {step >= 3 ? '✅' : '⏳'} Paso 3: Combinando datos
            </div>
            <div className={`text-sm ${step >= 4 ? 'text-green-600' : 'text-gray-500'}`}>
              {step >= 4 ? '✅' : '⏳'} Paso 4: Análisis completado
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-800">Error</span>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results Summary */}
      {debugData && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Cartolas</div>
            <div className="text-2xl font-bold text-gray-900">
              {debugData.resumen.totalCartolas}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Cuentas Corrientes</div>
            <div className="text-2xl font-bold text-gray-900">
              {debugData.resumen.totalCuentas}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Con Cartolas</div>
            <div className="text-2xl font-bold text-green-600">
              {debugData.resumen.cuentasConCartolas}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Mejor Precisión</div>
            <div className="text-2xl font-bold text-blue-600">
              {debugData.resumen.mejorInterpretacion.porcentajeError.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Best Interpretation */}
      {debugData?.mejorInterpretacion && (
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          debugData.mejorInterpretacion.esCorrecta 
            ? 'bg-green-50 border-green-300' 
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {debugData.mejorInterpretacion.esCorrecta ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
            <span className="font-medium">
              {debugData.mejorInterpretacion.esCorrecta ? 'Solución Encontrada' : 'Mejor Aproximación'}
            </span>
          </div>
          <div className="space-y-2">
            <p className="font-medium">{debugData.mejorInterpretacion.nombre}</p>
            <p className="text-sm text-gray-600">{debugData.mejorInterpretacion.descripcion}</p>
            <p className="text-lg font-bold">
              Total: {formatCurrency(debugData.mejorInterpretacion.totalCalculado)}
            </p>
            <p className="text-sm">
              Error: {debugData.mejorInterpretacion.porcentajeError.toFixed(2)}%
            </p>
            
            {debugData.mejorInterpretacion.esCorrecta && (
              <div className="mt-3 p-3 bg-green-100 rounded">
                <p className="text-green-800 font-medium text-sm">
                  🎯 ¡Usar esta interpretación en el adaptador!
                </p>
                <code className="block mt-1 p-2 bg-white rounded text-xs">
                  saldoFinal = cuenta.Saldo?.{debugData.mejorInterpretacion.id.replace('_', '_')};
                </code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All Interpretations */}
      {debugData?.interpretaciones && (
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Todas las Interpretaciones
          </h4>
          <div className="space-y-2">
            {debugData.interpretaciones.map((interpretacion, index) => (
              <div
                key={interpretacion.id}
                className={`p-3 rounded border ${
                  interpretacion.esCorrecta ? 'bg-green-50 border-green-200' :
                  interpretacion.porcentajeError < 5 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{interpretacion.nombre}</span>
                    <p className="text-sm text-gray-600">{interpretacion.descripcion}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(interpretacion.totalCalculado)}</div>
                    <div className="text-sm text-gray-600">
                      Error: {interpretacion.porcentajeError.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">Logs de Análisis</h4>
          <button
            onClick={clearLogs}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Limpiar
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay logs aún. Ejecuta el análisis para ver los detalles.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  <span className="text-gray-500">[{log.timestamp}]</span>
                  <span className={`ml-2 ${getLogColor(log.type)}`}>
                    {getLogIcon(log.type)} {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChipaxCartolaDebugger;
