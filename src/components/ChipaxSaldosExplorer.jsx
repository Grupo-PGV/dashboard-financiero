// REEMPLAZA COMPLETAMENTE el archivo: src/components/ChipaxSaldosExplorer.jsx

import React, { useState, useEffect } from 'react';
import { 
  Search, Target, CheckCircle, XCircle, Globe, Eye, AlertTriangle,
  Wallet, TrendingUp, TrendingDown, CreditCard, RefreshCw, Clock
} from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxSaldosExplorer = () => {
  // Estados para los saldos
  const [saldos, setSaldos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  
  // Estados para exploración (mantener funcionalidad original)
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState('');
  const [mostrarExplorador, setMostrarExplorador] = useState(false);

  const TARGET_AMOUNT = 107645045; // Target actualizado

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Función para obtener el color según el saldo
  const getColorSaldo = (saldo) => {
    if (saldo > 1000000) return 'text-green-600';
    if (saldo > 0) return 'text-blue-600';
    if (saldo < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Función para obtener el icono según el saldo
  const getIconoSaldo = (saldo) => {
    if (saldo > 0) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (saldo < 0) return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
  };

  // Cargar saldos bancarios
  const cargarSaldos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🏦 Cargando saldos bancarios...');
      const datos = await chipaxService.obtenerSaldosBancarios();
      
      if (Array.isArray(datos) && datos.length > 0) {
        setSaldos(datos);
        setUltimaActualizacion(new Date().toLocaleString('es-CL'));
        console.log('✅ Saldos cargados exitosamente:', datos.length);
        console.log('📊 Estructura del primer saldo:', datos[0]);
      } else {
        setError('No se encontraron cuentas corrientes');
        setSaldos([]);
      }
    } catch (err) {
      console.error('❌ Error cargando saldos:', err);
      setError(`Error: ${err.message}`);
      setSaldos([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarSaldos();
  }, []);

  // Calcular totales CORREGIDOS
  const totalSaldoEfectivo = saldos.reduce((sum, cuenta) => {
    return sum + (cuenta.saldoSinCredito || cuenta.saldoCalculado || cuenta.saldo || 0);
  }, 0);
  
  const totalLineasCredito = saldos.reduce((sum, cuenta) => {
    return sum + (cuenta.lineaCreditoTotal || 0);
  }, 0);
  
  // TOTAL DISPONIBLE = SALDO EFECTIVO (no suma líneas, solo las muestra como referencia)
  const totalDisponible = totalSaldoEfectivo;
  
  const totalUsoCredito = saldos.reduce((sum, cuenta) => {
    return sum + (cuenta.usoLineaCredito || 0);
  }, 0);
  
  const totalCreditoDisponible = totalLineasCredito - totalUsoCredito;

  // Endpoints para exploración (funcionalidad original)
  const endpointsParaSaldos = [
    { path: '/saldos', name: 'Saldos', priority: 'high' },
    { path: '/saldos-bancarios', name: 'Saldos Bancarios', priority: 'high' },
    { path: '/balance', name: 'Balance', priority: 'high' },
    { path: '/cuentas-corrientes', name: 'Cuentas Corrientes', priority: 'high' }
  ];

  // Función de testeo (funcionalidad original simplificada)
  const testEndpoint = async (endpoint) => {
    try {
      const data = await chipaxService.fetchFromChipax(endpoint.path);
      return {
        endpoint: endpoint.name,
        success: true,
        data: Array.isArray(data) ? `${data.length} items` : typeof data
      };
    } catch (error) {
      return {
        endpoint: endpoint.name,
        success: false,
        error: error.message
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header principal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wallet className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🏦 Saldos Bancarios</h2>
            {ultimaActualizacion && (
              <p className="text-sm text-gray-500">
                Última actualización: {ultimaActualizacion}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMostrarExplorador(!mostrarExplorador)}
            className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>{mostrarExplorador ? 'Ocultar' : 'Mostrar'} Explorador</span>
          </button>
          
          <button
            onClick={cargarSaldos}
            disabled={loading}
            className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Resumen Total - Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center space-x-2 mb-2">
            <Wallet className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Saldo Efectivo</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(totalSaldoEfectivo)}
          </div>
          <div className="text-sm opacity-80">
            Dinero disponible real
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center space-x-2 mb-2">
            <CreditCard className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Líneas de Crédito</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(totalLineasCredito)}
          </div>
          <div className="text-sm opacity-80">
            Crédito total disponible
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Crédito Disponible</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(totalCreditoDisponible)}
          </div>
          <div className="text-sm opacity-80">
            Líneas no utilizadas
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">Saldo Total</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {formatCurrency(totalDisponible)}
          </div>
          <div className="text-sm opacity-80">
            Target: {formatCurrency(TARGET_AMOUNT)}
          </div>
        </div>
      </div>

      {/* Lista detallada de cuentas */}
      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-lg text-gray-600">Cargando saldos bancarios...</span>
          </div>
        </div>
      ) : saldos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-500 mb-4">No hay cuentas corrientes disponibles</p>
          <button
            onClick={cargarSaldos}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Intentar cargar nuevamente
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          {/* Header de la tabla */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Detalle por Cuenta Corriente ({saldos.length} cuentas)
            </h3>
          </div>
          
          {/* Lista de cuentas */}
          <div className="divide-y divide-gray-200">
            {saldos.map((cuenta, index) => {
              const saldoMostrar = cuenta.saldoCalculado || cuenta.saldo || 0;
              const saldoEfectivo = cuenta.saldoSinCredito || cuenta.saldo || 0;
              const lineaCredito = cuenta.lineaCreditoTotal || 0;
              const usoCredito = cuenta.usoLineaCredito || 0;

              return (
                <div key={cuenta.id || index} className="p-6 hover:bg-gray-50">
                  {/* Header de la cuenta */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getIconoSaldo(saldoMostrar)}
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {cuenta.banco?.toUpperCase() || 'BANCO'} - {cuenta.numeroCuenta || cuenta.nombre}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {cuenta.tipo || 'Cuenta Corriente'} • 
                          {cuenta.movimientosCount || 0} movimientos
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getColorSaldo(saldoMostrar)}`}>
                        {formatCurrency(saldoMostrar)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cuenta.ultimaActualizacion && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(cuenta.ultimaActualizacion).toLocaleDateString('es-CL')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalle financiero */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Saldo Efectivo</div>
                      <div className={`text-lg font-semibold ${getColorSaldo(saldoMostrar)}`}>
                        {formatCurrency(saldoMostrar)}
                      </div>
                    </div>
                    
                    {lineaCredito > 0 && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Línea Total</div>
                          <div className="text-lg font-semibold text-purple-600">
                            {formatCurrency(lineaCredito)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Uso Actual</div>
                          <div className="text-lg font-semibold text-orange-600">
                            {formatCurrency(usoCredito)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Crédito Disponible</div>
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(creditoDisponible)}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {!lineaCredito && (
                      <div className="md:col-span-3">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Estado</div>
                        <div className="text-sm text-gray-600">Sin línea de crédito asociada</div>
                      </div>
                    )}
                  </div>

                  {/* Último movimiento */}
                  {cuenta.ultimoMovimiento && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Último Movimiento</div>
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{cuenta.ultimoMovimiento.descripcion}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(cuenta.ultimoMovimiento.fecha).toLocaleDateString('es-CL')}</span>
                        {cuenta.ultimoMovimiento.abono > 0 && (
                          <span className="ml-2 text-green-600">+{formatCurrency(cuenta.ultimoMovimiento.abono)}</span>
                        )}
                        {cuenta.ultimoMovimiento.cargo > 0 && (
                          <span className="ml-2 text-red-600">-{formatCurrency(cuenta.ultimoMovimiento.cargo)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Footer con totales */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">
                  {saldos.length} cuenta{saldos.length !== 1 ? 's' : ''} corriente{saldos.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Saldo Efectivo</div>
                <div className={`text-2xl font-bold ${Math.abs(totalDisponible - TARGET_AMOUNT) < TARGET_AMOUNT * 0.05 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(totalDisponible)}
                </div>
                <div className="text-xs text-gray-500">
                  Target: {formatCurrency(TARGET_AMOUNT)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explorador de endpoints (funcionalidad original) */}
      {mostrarExplorador && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🔍 Explorador de Endpoints</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {endpointsParaSaldos.map((endpoint, index) => (
              <button
                key={index}
                onClick={() => testEndpoint(endpoint)}
                className="p-2 text-sm border rounded hover:bg-gray-50"
              >
                {endpoint.name}
              </button>
            ))}
          </div>
          
          {/* Verificación del target */}
          {totalDisponible > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Verificación Target: {formatCurrency(TARGET_AMOUNT)}</span>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Calculado: {formatCurrency(totalDisponible)}</span>
                <span className="mx-2">•</span>
                <span className={`font-medium ${Math.abs(totalDisponible - TARGET_AMOUNT) < TARGET_AMOUNT * 0.05 ? 'text-green-600' : 'text-orange-600'}`}>
                  Diferencia: {formatCurrency(Math.abs(totalDisponible - TARGET_AMOUNT))}
                </span>
                <span className="mx-2">•</span>
                <span className="text-gray-500">
                  Error: {((Math.abs(totalDisponible - TARGET_AMOUNT) / TARGET_AMOUNT) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChipaxSaldosExplorer;
