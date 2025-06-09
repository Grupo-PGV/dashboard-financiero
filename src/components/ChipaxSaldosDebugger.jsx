import React, { useState } from 'react';
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Calculator, Eye } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxSaldosDebugger = () => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedInterpretation, setSelectedInterpretation] = useState(null);

  // Total objetivo de Chipax
  const TOTAL_OBJETIVO = 186648977;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const interpretaciones = [
    {
      id: 'deudor_menos_acreedor',
      nombre: 'saldo_deudor - saldo_acreedor',
      descripcion: 'Lógica contable estándar',
      calcular: (saldo) => (saldo?.saldo_deudor || 0) - (saldo?.saldo_acreedor || 0)
    },
    {
      id: 'acreedor_menos_deudor',
      nombre: 'saldo_acreedor - saldo_deudor',
      descripcion: 'Lógica inversa',
      calcular: (saldo) => (saldo?.saldo_acreedor || 0) - (saldo?.saldo_deudor || 0)
    },
    {
      id: 'suma_ambos',
      nombre: 'saldo_deudor + saldo_acreedor',
      descripcion: 'Suma de ambos campos',
      calcular: (saldo) => (saldo?.saldo_deudor || 0) + (saldo?.saldo_acreedor || 0)
    },
    {
      id: 'solo_deudor',
      nombre: 'solo saldo_deudor',
      descripcion: 'Solo campo deudor',
      calcular: (saldo) => saldo?.saldo_deudor || 0
    },
    {
      id: 'solo_acreedor',
      nombre: 'solo saldo_acreedor',
      descripcion: 'Solo campo acreedor',
      calcular: (saldo) => saldo?.saldo_acreedor || 0
    },
    {
      id: 'haber_menos_debe',
      nombre: 'haber - debe',
      descripcion: 'Usando campos haber/debe',
      calcular: (saldo) => (saldo?.haber || 0) - (saldo?.debe || 0)
    },
    {
      id: 'debe_menos_haber',
      nombre: 'debe - haber',
      descripcion: 'Usando campos debe/haber inverso',
      calcular: (saldo) => (saldo?.debe || 0) - (saldo?.haber || 0)
    },
    {
      id: 'absoluto',
      nombre: 'Math.abs(saldo_deudor - saldo_acreedor)',
      descripcion: 'Valor absoluto de la diferencia',
      calcular: (saldo) => Math.abs((saldo?.saldo_deudor || 0) - (saldo?.saldo_acreedor || 0))
    }
  ];

  const ejecutarDebug = async () => {
    setLoading(true);
    setError(null);
    setDebugData(null);

    try {
      console.log('🔍 Iniciando debugging de saldos...');
      
      // Obtener datos de cuentas corrientes
      const response = await chipaxService.obtenerSaldosBancarios();
      
      if (!response.items || response.items.length === 0) {
        throw new Error('No se obtuvieron cuentas corrientes');
      }

      console.log(`📊 ${response.items.length} cuentas obtenidas`);

      // Analizar estructura de datos
      const primeracuenta = response.items[0];
      console.log('📋 Estructura de la primera cuenta:', JSON.stringify(primeracuenta, null, 2));

      // Probar todas las interpretaciones
      const resultados = interpretaciones.map(interpretacion => {
        let totalCalculado = 0;
        const saldosPorCuenta = [];

        response.items.forEach(cuenta => {
          const saldoCalculado = interpretacion.calcular(cuenta.Saldo);
          totalCalculado += saldoCalculado;
          
          saldosPorCuenta.push({
            id: cuenta.id,
            nombre: cuenta.numeroCuenta || cuenta.id,
            banco: cuenta.banco || cuenta.TipoCuentaCorriente?.tipoCuenta || 'Sin banco',
            saldo: saldoCalculado,
            saldoOriginal: cuenta.Saldo
          });
        });

        const diferencia = Math.abs(totalCalculado - TOTAL_OBJETIVO);
        const porcentajeError = (diferencia / TOTAL_OBJETIVO) * 100;
        const esCorrecta = diferencia < 1000; // Tolerancia de $1000

        return {
          ...interpretacion,
          totalCalculado,
          diferencia,
          porcentajeError,
          esCorrecta,
          saldosPorCuenta
        };
      });

      // Ordenar por menor diferencia
      resultados.sort((a, b) => a.diferencia - b.diferencia);

      // Marcar la mejor interpretación
      if (resultados.length > 0) {
        setSelectedInterpretation(resultados[0]);
      }

      setDebugData({
        cuentasOriginales: response.items,
        interpretaciones: resultados,
        totalObjetivo: TOTAL_OBJETIVO
      });

      console.log('✅ Debugging completado');

    } catch (err) {
      console.error('❌ Error en debugging:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (interpretacion) => {
    if (interpretacion.esCorrecta) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (interpretacion.porcentajeError < 5) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (interpretacion) => {
    if (interpretacion.esCorrecta) {
      return 'bg-green-50 border-green-200';
    } else if (interpretacion.porcentajeError < 5) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calculator className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Debugger de Saldos Bancarios - Chipax
          </h3>
        </div>
        <button
          onClick={ejecutarDebug}
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
            <span>{loading ? 'Analizando...' : 'Ejecutar Debug'}</span>
          </div>
        </button>
      </div>

      {/* Target Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Eye className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">Objetivo</span>
        </div>
        <p className="text-blue-700">
          Total esperado de Chipax: <span className="font-bold">{formatCurrency(TOTAL_OBJETIVO)}</span>
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

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
              <div className="text-sm text-gray-600">Interpretaciones</div>
              <div className="text-2xl font-bold text-gray-900">
                {debugData.interpretaciones.length}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Coincidencias Exactas</div>
              <div className="text-2xl font-bold text-green-600">
                {debugData.interpretaciones.filter(i => i.esCorrecta).length}
              </div>
            </div>
          </div>

          {/* Interpretations Results */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Resultados de Interpretaciones
            </h4>
            <div className="space-y-3">
              {debugData.interpretaciones.map((interpretacion, index) => (
                <div
                  key={interpretacion.id}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(interpretacion)} ${
                    selectedInterpretation?.id === interpretacion.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(interpretacion)}
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
                        {formatCurrency(interpretacion.totalCalculado)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Error: {interpretacion.porcentajeError.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {interpretacion.esCorrecta && (
                    <div className="mt-3 p-3 bg-green-100 rounded">
                      <div className="text-green-800 font-medium text-sm">
                        ✅ ¡Esta interpretación es CORRECTA! Diferencia: {formatCurrency(interpretacion.diferencia)}
                      </div>
                    </div>
                  )}

                  {/* Detalles por cuenta */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Ver saldos por cuenta
                    </summary>
                    <div className="mt-2 space-y-1">
                      {interpretacion.saldosPorCuenta.map(cuenta => (
                        <div key={cuenta.id} className="flex justify-between text-sm">
                          <span>{cuenta.nombre} ({cuenta.banco})</span>
                          <span className="font-mono">{formatCurrency(cuenta.saldo)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Action */}
          {selectedInterpretation && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">
                🎯 Recomendación
              </h4>
              <p className="text-blue-800">
                Usar la interpretación: <strong>{selectedInterpretation.nombre}</strong>
              </p>
              <p className="text-blue-700 text-sm mt-1">
                Esta lógica produce el total más cercano al objetivo de Chipax.
              </p>
              
              {selectedInterpretation.esCorrecta && (
                <div className="mt-3 p-3 bg-green-100 rounded border border-green-300">
                  <p className="text-green-800 font-medium">
                    ✅ Código a usar en adaptarCuentasCorrientes():
                  </p>
                  <code className="block mt-1 p-2 bg-white rounded text-sm">
                    saldoFinal = {selectedInterpretation.nombre.replace('saldo_', 'cuenta.Saldo?.saldo_')};
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Raw Data Preview */}
          <details>
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Ver datos originales de cuentas
            </summary>
            <div className="mt-2 p-4 bg-gray-50 rounded text-xs">
              <pre>{JSON.stringify(debugData.cuentasOriginales[0], null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ChipaxSaldosDebugger;
