import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  RefreshCw, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
// import chipaxService from '../services/chipaxService'; // Se importará desde el componente padre

const SaldosCuentasCorrientes = ({ saldosIniciales = [], onCargarSaldos }) => {
  const [saldos, setSaldos] = useState(saldosIniciales);
  const [loading, setLoading] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // Función para formatear moneda chilena
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

  // Cargar saldos usando función prop
  const cargarSaldos = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🏦 Cargando saldos bancarios...');
      
      if (onCargarSaldos && typeof onCargarSaldos === 'function') {
        const datos = await onCargarSaldos();
        
        if (Array.isArray(datos) && datos.length > 0) {
          setSaldos(datos);
          setUltimaActualizacion(new Date().toLocaleString('es-CL'));
          console.log('✅ Saldos cargados exitosamente:', datos.length);
        } else {
          setError('No se encontraron cuentas corrientes');
          setSaldos([]);
        }
      } else {
        setError('Función de carga no disponible');
      }
    } catch (err) {
      console.error('❌ Error cargando saldos:', err);
      setError(`Error: ${err.message}`);
      setSaldos([]);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar con saldos externos
  useEffect(() => {
    if (Array.isArray(saldosIniciales) && saldosIniciales.length > 0) {
      setSaldos(saldosIniciales);
      setUltimaActualizacion(new Date().toLocaleString('es-CL'));
    }
  }, [saldosIniciales]);

  // Cargar datos al montar solo si hay función de carga
  useEffect(() => {
    if (onCargarSaldos && saldosIniciales.length === 0) {
      cargarSaldos();
    }
  }, []);

  // Calcular totales
  const totalSaldoEfectivo = saldos.reduce((sum, cuenta) => sum + (cuenta.saldoSinCredito || cuenta.saldo || 0), 0);
  const totalLineasCredito = saldos.reduce((sum, cuenta) => sum + (cuenta.lineaCreditoTotal || 0), 0);
  const totalDisponible = saldos.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || cuenta.saldo || 0), 0);
  const totalUsoCredito = saldos.reduce((sum, cuenta) => sum + (cuenta.usoLineaCredito || 0), 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Wallet className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Saldos por Cuenta Corriente</h2>
            <p className="text-sm text-gray-500">
              {ultimaActualizacion && `Última actualización: ${ultimaActualizacion}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMostrarDetalle(!mostrarDetalle)}
            className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {mostrarDetalle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{mostrarDetalle ? 'Ocultar' : 'Mostrar'} Detalle</span>
          </button>
          
          <button
            onClick={cargarSaldos}
            disabled={loading || !onCargarSaldos}
            className="flex items-center space-x-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Resumen Total */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Saldo Efectivo</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {formatCurrency(totalSaldoEfectivo)}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 mb-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Líneas de Crédito</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {formatCurrency(totalLineasCredito)}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Uso de Crédito</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {formatCurrency(totalUsoCredito)}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Total Disponible</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(totalDisponible)}
          </div>
        </div>
      </div>

      {/* Lista de Cuentas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-lg text-gray-600">Cargando saldos bancarios...</span>
          </div>
        </div>
      ) : saldos.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-500">No hay cuentas corrientes disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {saldos.map((cuenta, index) => {
            const saldoEfectivo = cuenta.saldoSinCredito || cuenta.saldo || 0;
            const saldoTotal = cuenta.saldoCalculado || cuenta.saldo || 0;
            const lineaCredito = cuenta.lineaCreditoTotal || 0;
            const usoCredito = cuenta.usoLineaCredito || 0;

            return (
              <div key={cuenta.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header de la cuenta */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getIconoSaldo(saldoTotal)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {cuenta.banco?.toUpperCase() || 'BANCO'} - {cuenta.numeroCuenta || cuenta.nombre}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {cuenta.tipo || 'Cuenta Corriente'} • 
                        {cuenta.movimientosCount || 0} movimientos
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getColorSaldo(saldoTotal)}`}>
                      {formatCurrency(saldoTotal)}
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

                {/* Detalle expandible */}
                {mostrarDetalle && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Saldo Efectivo</div>
                      <div className={`text-lg font-semibold ${getColorSaldo(saldoEfectivo)}`}>
                        {formatCurrency(saldoEfectivo)}
                      </div>
                    </div>
                    
                    {lineaCredito > 0 && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Línea de Crédito</div>
                          <div className="text-lg font-semibold text-purple-600">
                            {formatCurrency(lineaCredito)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Uso de Crédito</div>
                          <div className="text-lg font-semibold text-orange-600">
                            {formatCurrency(usoCredito)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Crédito Disponible</div>
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(cuenta.lineaCreditoDisponible || 0)}
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
                )}

                {/* Último movimiento */}
                {mostrarDetalle && cuenta.ultimoMovimiento && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
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
      )}

      {/* Footer con totales */}
      {saldos.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600">
                {saldos.length} cuenta{saldos.length !== 1 ? 's' : ''} corriente{saldos.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">Total General</div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(totalDisponible)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaldosCuentasCorrientes;
