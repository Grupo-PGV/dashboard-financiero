import React, { useState, useEffect } from 'react';
import { ArrowLeft, Database, TrendingUp, BarChart3, FileText, Settings, RefreshCw } from 'lucide-react';
import ModuloSaldosBancarios from './ModuloSaldosBancarios';

/**
 * Dashboard Financiero Integrado con Saldos Bancarios
 * Combina la funcionalidad existente de Chipax con el nuevo módulo de cartolas
 */
const DashboardFinancieroConSaldos = ({ onBack }) => {
  // ===== ESTADOS PRINCIPALES =====
  const [vistaActiva, setVistaActiva] = useState('resumen'); // resumen, chipax, saldos, configuracion
  const [saldosBancarios, setSaldosBancarios] = useState(0);
  const [datosChipax, setDatosChipax] = useState(null);
  const [isLoadingChipax, setIsLoadingChipax] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ===== CARGAR DATOS AL INICIALIZAR =====
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    // Cargar saldos bancarios desde localStorage
    const saldosGuardados = localStorage.getItem('pgr_saldo_actual');
    if (saldosGuardados) {
      setSaldosBancarios(parseFloat(saldosGuardados));
    }

    // Cargar última actualización
    const ultimaActualizacion = localStorage.getItem('pgr_last_financial_update');
    if (ultimaActualizacion) {
      setLastUpdate(new Date(ultimaActualizacion));
    }

    // Intentar cargar datos de Chipax si están disponibles
    await cargarDatosChipax();
  };

  const cargarDatosChipax = async () => {
    setIsLoadingChipax(true);
    try {
      // Simular llamada a API de Chipax (reemplazar con tu implementación existente)
      const chipaxData = await obtenerDatosChipax();
      setDatosChipax(chipaxData);
      setLastUpdate(new Date());
      localStorage.setItem('pgr_last_financial_update', new Date().toISOString());
    } catch (error) {
      console.warn('No se pudieron cargar datos de Chipax:', error);
    } finally {
      setIsLoadingChipax(false);
    }
  };

  // ===== FUNCIÓN SIMULADA PARA CHIPAX (reemplazar con tu implementación) =====
  const obtenerDatosChipax = async () => {
    // Esta función debe ser reemplazada con tu implementación existente
    // de conexión a la API de Chipax
    
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Datos simulados - reemplazar con datos reales de Chipax
    return {
      cuentasPorCobrar: 2450000,
      cuentasPorPagar: 890000,
      flujoEfectivo: 1560000,
      ingresosMensuales: 3200000,
      gastosMensuales: 2100000,
      utilidadNeta: 1100000,
      kpis: {
        liquidez: 2.8,
        rentabilidad: 18.5,
        endeudamiento: 32.1
      }
    };
  };

  // ===== CÁLCULOS FINANCIEROS CONSOLIDADOS =====
  const calcularResumenFinanciero = () => {
    const saldosCartolas = saldosBancarios;
    const saldosChipax = datosChipax?.flujoEfectivo || 0;
    
    return {
      totalEfectivo: saldosCartolas + saldosChipax,
      saldosCartolas: saldosCartolas,
      saldosChipax: saldosChipax,
      cuentasPorCobrar: datosChipax?.cuentasPorCobrar || 0,
      cuentasPorPagar: datosChipax?.cuentasPorPagar || 0,
      patrimonioNeto: (saldosCartolas + saldosChipax + (datosChipax?.cuentasPorCobrar || 0)) - (datosChipax?.cuentasPorPagar || 0),
      utilizadNeta: datosChipax?.utilidadNeta || 0
    };
  };

  const resumenFinanciero = calcularResumenFinanciero();

  // ===== COMPONENTE DE NAVEGACIÓN =====
  const NavegacionDashboard = () => (
    <div className="bg-white shadow-sm border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver a Inicio
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard Financiero Integrado
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Última actualización: {lastUpdate.toLocaleString('es-CL')}
              </span>
            )}
            <button
              onClick={cargarDatosChipax}
              disabled={isLoadingChipax}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingChipax ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex space-x-1">
          {[
            { id: 'resumen', label: 'Resumen Ejecutivo', icon: BarChart3 },
            { id: 'saldos', label: 'Saldos Bancarios', icon: Database },
            { id: 'chipax', label: 'Datos Chipax', icon: TrendingUp },
            { id: 'configuracion', label: 'Configuración', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setVistaActiva(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
                  vistaActiva === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ===== VISTA: RESUMEN EJECUTIVO =====
  const VistaResumenEjecutivo = () => (
    <div className="p-6 space-y-6">
      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Total Efectivo</h3>
          <p className="text-3xl font-bold">
            ${resumenFinanciero.totalEfectivo.toLocaleString('es-CL')}
          </p>
          <p className="text-green-100 text-sm mt-2">
            Cartolas + Chipax
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Por Cobrar</h3>
          <p className="text-3xl font-bold">
            ${resumenFinanciero.cuentasPorCobrar.toLocaleString('es-CL')}
          </p>
          <p className="text-blue-100 text-sm mt-2">
            Desde Chipax
          </p>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Por Pagar</h3>
          <p className="text-3xl font-bold">
            ${resumenFinanciero.cuentasPorPagar.toLocaleString('es-CL')}
          </p>
          <p className="text-orange-100 text-sm mt-2">
            Desde Chipax
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Patrimonio Neto</h3>
          <p className="text-3xl font-bold">
            ${resumenFinanciero.patrimonioNeto.toLocaleString('es-CL')}
          </p>
          <p className="text-purple-100 text-sm mt-2">
            Calculado
          </p>
        </div>
      </div>

      {/* Desglose por Fuente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-600" />
            Saldos Bancarios (Cartolas)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Efectivo Disponible</span>
              <span className="font-semibold text-green-600">
                ${resumenFinanciero.saldosCartolas.toLocaleString('es-CL')}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Calculado desde cartolas bancarias cargadas
            </p>
            <button
              onClick={() => setVistaActiva('saldos')}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver Detalle de Movimientos
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Datos Chipax
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Flujo de Efectivo</span>
              <span className="font-semibold text-blue-600">
                ${resumenFinanciero.saldosChipax.toLocaleString('es-CL')}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Utilidad Neta</span>
              <span className="font-semibold text-green-600">
                ${resumenFinanciero.utilizadNeta.toLocaleString('es-CL')}
              </span>
            </div>
            <button
              onClick={() => setVistaActiva('chipax')}
              className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Ver Dashboard Chipax
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Adicionales */}
      {datosChipax?.kpis && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Indicadores Clave</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {datosChipax.kpis.liquidez}
              </p>
              <p className="text-sm text-gray-600">Índice de Liquidez</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {datosChipax.kpis.rentabilidad}%
              </p>
              <p className="text-sm text-gray-600">Rentabilidad</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {datosChipax.kpis.endeudamiento}%
              </p>
              <p className="text-sm text-gray-600">Endeudamiento</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ===== VISTA: DATOS CHIPAX (Tu dashboard existente) =====
  const VistaChipax = () => (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Dashboard Chipax Existente</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <p className="text-yellow-800">
            <strong>Instrucción:</strong> Aquí debes integrar tu componente existente 
            DashboardFinancieroIntegrado.jsx. Simplemente importa y renderiza ese componente aquí.
          </p>
        </div>
        
        {isLoadingChipax ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg">Cargando datos de Chipax...</span>
          </div>
        ) : datosChipax ? (
          <div className="space-y-6">
            {/* Aquí renderizar tu dashboard existente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Ingresos Mensuales</h4>
                <p className="text-2xl font-bold text-green-600">
                  ${datosChipax.ingresosMensuales.toLocaleString('es-CL')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Gastos Mensuales</h4>
                <p className="text-2xl font-bold text-red-600">
                  ${datosChipax.gastosMensuales.toLocaleString('es-CL')}
                </p>
              </div>
            </div>
            
            <div className="text-center text-gray-600">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Aquí se mostraría tu dashboard Chipax completo</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No se pudieron cargar los datos de Chipax</p>
            <button
              onClick={cargarDatosChipax}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ===== VISTA: CONFIGURACIÓN =====
  const VistaConfiguracion = () => (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Configuración del Dashboard</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Configuración Chipax</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Variables de entorno necesarias:
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• REACT_APP_CHIPAX_API_URL</li>
                <li>• REACT_APP_CHIPAX_APP_ID</li>
                <li>• REACT_APP_CHIPAX_SECRET_KEY</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Gestión de Datos</h4>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  localStorage.removeItem('pgr_movimientos_bancarios');
                  localStorage.removeItem('pgr_saldo_actual');
                  setSaldosBancarios(0);
                  alert('Datos de cartolas eliminados');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Limpiar Cartolas
              </button>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Reset Completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== RENDER PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gray-50">
      <NavegacionDashboard />
      
      <div className="max-w-7xl mx-auto">
        {/* Renderizar vista según selección */}
        {vistaActiva === 'resumen' && <VistaResumenEjecutivo />}
        {vistaActiva === 'saldos' && (
          <div className="p-6">
            <ModuloSaldosBancarios />
          </div>
        )}
        {vistaActiva === 'chipax' && <VistaChipax />}
        {vistaActiva === 'configuracion' && <VistaConfiguracion />}
      </div>
    </div>
  );
};

export default DashboardFinancieroConSaldos;
