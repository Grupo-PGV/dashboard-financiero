import React, { useState, useEffect } from 'react';
import { ArrowLeft, Database, TrendingUp, BarChart3, FileText, Settings, RefreshCw, DollarSign, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import ModuloSaldosBancarios from './ModuloSaldosBancarios';

/**
 * Dashboard Financiero Integrado con Saldos Bancarios - PGR Seguridad
 * 
 * Combina la funcionalidad existente de Chipax con el nuevo módulo de cartolas bancarias
 * para ofrecer una visión financiera completa y unificada.
 * 
 * Funcionalidades:
 * - Resumen ejecutivo consolidado (Chipax + Cartolas)
 * - Dashboard de saldos bancarios con carga de cartolas
 * - Integración con datos existentes de Chipax
 * - Sistema de navegación por pestañas
 * - Persistencia de datos con localStorage
 */
const DashboardFinancieroConSaldos = ({ onBack, onLogout }) => {
  // ===== ESTADOS PRINCIPALES =====
  const [vistaActiva, setVistaActiva] = useState('resumen'); // resumen, chipax, saldos, configuracion
  const [saldosBancarios, setSaldosBancarios] = useState(0); // Saldo calculado desde cartolas
  const [datosChipax, setDatosChipax] = useState(null); // Datos de la API de Chipax
  const [isLoadingChipax, setIsLoadingChipax] = useState(false); // Estado de carga Chipax
  const [lastUpdate, setLastUpdate] = useState(null); // Última actualización de datos
  const [errorChipax, setErrorChipax] = useState(null); // Errores de conexión Chipax

  // ===== CARGAR DATOS AL INICIALIZAR COMPONENTE =====
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  /**
   * Carga todos los datos necesarios al inicializar el dashboard
   * - Saldos bancarios desde localStorage
   * - Última actualización registrada
   * - Datos de Chipax (si están disponibles)
   */
  const cargarDatosIniciales = async () => {
    try {
      // Cargar saldos bancarios desde localStorage
      const saldosGuardados = localStorage.getItem('pgr_saldo_actual');
      if (saldosGuardados) {
        setSaldosBancarios(parseFloat(saldosGuardados));
        console.log('✅ Saldos bancarios cargados:', parseFloat(saldosGuardados));
      }

      // Cargar última actualización
      const ultimaActualizacion = localStorage.getItem('pgr_last_financial_update');
      if (ultimaActualizacion) {
        setLastUpdate(new Date(ultimaActualizacion));
      }

      // Cargar datos de Chipax
      await cargarDatosChipax();
      
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
    }
  };

  /**
   * Carga datos desde la API de Chipax
   * IMPORTANTE: Esta función debe ser personalizada con tu implementación real de Chipax
   */
  const cargarDatosChipax = async () => {
    setIsLoadingChipax(true);
    setErrorChipax(null);
    
    try {
      console.log('🔄 Cargando datos de Chipax...');
      
      // Intentar cargar datos reales de Chipax
      const chipaxData = await obtenerDatosChipax();
      setDatosChipax(chipaxData);
      
      // Actualizar timestamp
      const now = new Date();
      setLastUpdate(now);
      localStorage.setItem('pgr_last_financial_update', now.toISOString());
      
      console.log('✅ Datos de Chipax cargados exitosamente');
      
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar datos de Chipax:', error.message);
      setErrorChipax(error.message);
      
      // Cargar datos demo si falla la conexión real
      setDatosChipax(obtenerDatosDemo());
    } finally {
      setIsLoadingChipax(false);
    }
  };

  /**
   * Función para obtener datos reales de Chipax
   * PERSONALIZAR: Reemplaza esta función con tu implementación real
   */
  const obtenerDatosChipax = async () => {
    // ===== CONFIGURACIÓN DE TU API CHIPAX =====
    const API_URL = process.env.REACT_APP_CHIPAX_API_URL;
    const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
    const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

    // Verificar que las variables de entorno estén configuradas
    if (!API_URL || !APP_ID || !SECRET_KEY) {
      console.warn('⚠️ Variables de entorno de Chipax no configuradas, usando datos demo');
      throw new Error('Variables de entorno de Chipax no configuradas');
    }

    try {
      // ===== LLAMADA REAL A TU API CHIPAX =====
      // PERSONALIZAR: Ajusta esta llamada según tu implementación específica
      const response = await fetch(`${API_URL}/financial-summary`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'X-App-ID': APP_ID,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error API Chipax: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // ===== MAPEAR RESPUESTA A FORMATO ESTÁNDAR =====
      // PERSONALIZAR: Ajusta el mapeo según la estructura de respuesta de tu API
      return {
        cuentasPorCobrar: data.accounts_receivable || 0,
        cuentasPorPagar: data.accounts_payable || 0,
        flujoEfectivo: data.cash_flow || 0,
        ingresosMensuales: data.monthly_income || 0,
        gastosMensuales: data.monthly_expenses || 0,
        utilidadNeta: data.net_profit || 0,
        kpis: {
          liquidez: data.kpis?.liquidity || 0,
          rentabilidad: data.kpis?.profitability || 0,
          endeudamiento: data.kpis?.debt_ratio || 0
        },
        ultimaActualizacion: data.last_updated || new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error en API Chipax:', error);
      throw error;
    }
  };

  /**
   * Datos demo para cuando no se puede conectar a Chipax
   * Útil para desarrollo y testing
   */
  const obtenerDatosDemo = () => {
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
      },
      esDemo: true // Flag para indicar que son datos demo
    };
  };

  // ===== CÁLCULOS FINANCIEROS CONSOLIDADOS =====
  /**
   * Calcula el resumen financiero consolidando datos de Chipax y cartolas bancarias
   */
  const calcularResumenFinanciero = () => {
    const saldosCartolas = saldosBancarios || 0;
    const saldosChipax = datosChipax?.flujoEfectivo || 0;
    
    return {
      // Efectivo total combinado
      totalEfectivo: saldosCartolas + saldosChipax,
      saldosCartolas: saldosCartolas,
      saldosChipax: saldosChipax,
      
      // Datos de Chipax
      cuentasPorCobrar: datosChipax?.cuentasPorCobrar || 0,
      cuentasPorPagar: datosChipax?.cuentasPorPagar || 0,
      ingresosMensuales: datosChipax?.ingresosMensuales || 0,
      gastosMensuales: datosChipax?.gastosMensuales || 0,
      utilidadNeta: datosChipax?.utilidadNeta || 0,
      
      // Cálculos derivados
      patrimonioNeto: (saldosCartolas + saldosChipax + (datosChipax?.cuentasPorCobrar || 0)) - (datosChipax?.cuentasPorPagar || 0),
      flujoNeto: (datosChipax?.ingresosMensuales || 0) - (datosChipax?.gastosMensuales || 0),
      
      // KPIs
      kpis: datosChipax?.kpis || { liquidez: 0, rentabilidad: 0, endeudamiento: 0 }
    };
  };

  const resumenFinanciero = calcularResumenFinanciero();

  // ===== COMPONENTE DE NAVEGACIÓN SUPERIOR =====
  const NavegacionDashboard = () => (
    <div className="bg-white shadow-sm border-b">
      <div className="px-6 py-4">
        {/* Header con título y controles */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver a Inicio
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              💰 Dashboard Financiero Completo
            </h1>
            {datosChipax?.esDemo && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                MODO DEMO
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Información de última actualización */}
            {lastUpdate && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Última actualización:</p>
                <p className="text-sm font-medium text-gray-700">
                  {lastUpdate.toLocaleString('es-CL')}
                </p>
              </div>
            )}
            
            {/* Botones de acción */}
            <button
              onClick={cargarDatosChipax}
              disabled={isLoadingChipax}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingChipax ? 'animate-spin' : ''}`} />
              {isLoadingChipax ? 'Actualizando...' : 'Actualizar Chipax'}
            </button>
            
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Alerta de error de Chipax */}
        {errorChipax && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800 text-sm">
              Usando datos demo - Error de conexión Chipax: {errorChipax}
            </span>
          </div>
        )}

        {/* Pestañas de navegación */}
        <div className="flex space-x-1">
          {[
            { id: 'resumen', label: 'Resumen Ejecutivo', icon: BarChart3, description: 'Vista consolidada' },
            { id: 'saldos', label: 'Saldos Bancarios', icon: Database, description: 'Cartolas y movimientos' },
            { id: 'chipax', label: 'Dashboard Chipax', icon: TrendingUp, description: 'Datos contables' },
            { id: 'configuracion', label: 'Configuración', icon: Settings, description: 'Ajustes del sistema' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = vistaActiva === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setVistaActiva(tab.id)}
                className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={tab.description}
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
    <div className="p-6 space-y-8">
      {/* KPIs Principales - Tarjetas destacadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Efectivo */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Total Efectivo</h3>
            <DollarSign className="h-8 w-8 text-green-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            ${resumenFinanciero.totalEfectivo.toLocaleString('es-CL')}
          </p>
          <p className="text-green-100 text-sm">
            Cartolas (${resumenFinanciero.saldosCartolas.toLocaleString('es-CL')}) + 
            Chipax (${resumenFinanciero.saldosChipax.toLocaleString('es-CL')})
          </p>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Por Cobrar</h3>
            <TrendingUp className="h-8 w-8 text-blue-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            ${resumenFinanciero.cuentasPorCobrar.toLocaleString('es-CL')}
          </p>
          <p className="text-blue-100 text-sm">Desde Chipax</p>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Por Pagar</h3>
            <AlertCircle className="h-8 w-8 text-orange-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            ${resumenFinanciero.cuentasPorPagar.toLocaleString('es-CL')}
          </p>
          <p className="text-orange-100 text-sm">Desde Chipax</p>
        </div>

        {/* Patrimonio Neto */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Patrimonio Neto</h3>
            <CheckCircle className="h-8 w-8 text-purple-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            ${resumenFinanciero.patrimonioNeto.toLocaleString('es-CL')}
          </p>
          <p className="text-purple-100 text-sm">Calculado</p>
        </div>
      </div>

      {/* Desglose detallado por fuente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Saldos Bancarios (Cartolas) */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b">
            <h3 className="text-xl font-semibold mb-2 flex items-center text-blue-900">
              <Database className="h-6 w-6 mr-3 text-blue-600" />
              Saldos Bancarios (Cartolas)
            </h3>
            <p className="text-blue-700 text-sm">Calculado desde cartolas cargadas</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Efectivo Disponible</span>
              <span className="font-bold text-xl text-green-600">
                ${resumenFinanciero.saldosCartolas.toLocaleString('es-CL')}
              </span>
            </div>
            
            <div className="text-center text-gray-600">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">
                {resumenFinanciero.saldosCartolas > 0 
                  ? 'Datos calculados desde movimientos bancarios'
                  : 'No hay cartolas cargadas'
                }
              </p>
            </div>
            
            <button
              onClick={() => setVistaActiva('saldos')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Ver Detalle de Movimientos
            </button>
          </div>
        </div>

        {/* Datos Chipax */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 border-b">
            <h3 className="text-xl font-semibold mb-2 flex items-center text-green-900">
              <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
              Datos Chipax
            </h3>
            <p className="text-green-700 text-sm">
              {isLoadingChipax ? 'Cargando...' : 'Desde API de Chipax'}
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Flujo de Efectivo</span>
                <span className="font-semibold text-blue-600">
                  ${resumenFinanciero.saldosChipax.toLocaleString('es-CL')}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Utilidad Neta</span>
                <span className="font-semibold text-green-600">
                  ${resumenFinanciero.utilidadNeta.toLocaleString('es-CL')}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Flujo Neto Mensual</span>
                <span className={`font-semibold ${resumenFinanciero.flujoNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${resumenFinanciero.flujoNeto.toLocaleString('es-CL')}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setVistaActiva('chipax')}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Ver Dashboard Chipax Completo
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Adicionales */}
      {resumenFinanciero.kpis && (resumenFinanciero.kpis.liquidez > 0 || resumenFinanciero.kpis.rentabilidad > 0) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6 text-center">📊 Indicadores Clave de Rendimiento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-3xl font-bold text-blue-600 mb-2">
                {resumenFinanciero.kpis.liquidez.toFixed(1)}
              </p>
              <p className="text-blue-700 font-medium">Índice de Liquidez</p>
              <p className="text-blue-600 text-sm mt-1">
                {resumenFinanciero.kpis.liquidez >= 2 ? '✅ Excelente' : 
                 resumenFinanciero.kpis.liquidez >= 1.5 ? '⚠️ Aceptable' : '❌ Bajo'}
              </p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-xl border border-green-100">
              <p className="text-3xl font-bold text-green-600 mb-2">
                {resumenFinanciero.kpis.rentabilidad.toFixed(1)}%
              </p>
              <p className="text-green-700 font-medium">Rentabilidad</p>
              <p className="text-green-600 text-sm mt-1">
                {resumenFinanciero.kpis.rentabilidad >= 15 ? '✅ Excelente' : 
                 resumenFinanciero.kpis.rentabilidad >= 10 ? '⚠️ Aceptable' : '❌ Bajo'}
              </p>
            </div>
            
            <div className="text-center p-6 bg-orange-50 rounded-xl border border-orange-100">
              <p className="text-3xl font-bold text-orange-600 mb-2">
                {resumenFinanciero.kpis.endeudamiento.toFixed(1)}%
              </p>
              <p className="text-orange-700 font-medium">Endeudamiento</p>
              <p className="text-orange-600 text-sm mt-1">
                {resumenFinanciero.kpis.endeudamiento <= 30 ? '✅ Saludable' : 
                 resumenFinanciero.kpis.endeudamiento <= 50 ? '⚠️ Moderado' : '❌ Alto'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Análisis de Flujo Mensual */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">💹 Análisis de Flujo Mensual</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">Ingresos</h4>
            <p className="text-2xl font-bold text-green-600">
              ${resumenFinanciero.ingresosMensuales.toLocaleString('es-CL')}
            </p>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Gastos</h4>
            <p className="text-2xl font-bold text-red-600">
              ${resumenFinanciero.gastosMensuales.toLocaleString('es-CL')}
            </p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Flujo Neto</h4>
            <p className={`text-2xl font-bold ${resumenFinanciero.flujoNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${resumenFinanciero.flujoNeto.toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== VISTA: DATOS CHIPAX =====
  const VistaChipax = () => (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold mb-2 flex items-center">
            <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
            Dashboard Chipax Completo
          </h3>
          <p className="text-gray-600">Datos contables y financieros desde la plataforma Chipax</p>
        </div>

        <div className="p-6">
          {/* Instrucción para integración */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Instrucción de Integración</h4>
            <p className="text-blue-800 mb-3">
              <strong>Para el desarrollador:</strong> Aquí debes integrar tu componente existente 
              <code className="bg-blue-100 px-2 py-1 rounded text-sm mx-1">DashboardFinancieroIntegrado.jsx</code>
            </p>
            <div className="bg-blue-100 p-3 rounded text-sm text-blue-900">
              <p className="font-mono">
                {`// Agregar esta importación al inicio del archivo:`}<br/>
                {`import DashboardFinancieroIntegrado from '../pages/DashboardFinancieroIntegrado';`}<br/><br/>
                {`// Y reemplazar esta sección con:`}<br/>
                {`<DashboardFinancieroIntegrado />`}
              </p>
            </div>
          </div>
          
          {/* Estado de carga */}
          {isLoadingChipax ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-lg text-gray-600">Cargando datos de Chipax...</p>
                <p className="text-sm text-gray-500 mt-2">Conectando con la API</p>
              </div>
            </div>
          ) : datosChipax ? (
            <div className="space-y-6">
              {/* Vista previa de datos disponibles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Ingresos Mensuales</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${datosChipax.ingresosMensuales.toLocaleString('es-CL')}
                  </p>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">Gastos Mensuales</h4>
                  <p className="text-2xl font-bold text-red-600">
                    ${datosChipax.gastosMensuales.toLocaleString('es-CL')}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Utilidad Neta</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    ${datosChipax.utilidadNeta.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
              
              {/* Placeholder para dashboard completo */}
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  Aquí se mostraría tu Dashboard Chipax completo
                </h4>
                <p className="text-gray-600 mb-4">
                  Reemplaza esta sección con tu componente DashboardFinancieroIntegrado.jsx
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                  <p className="text-sm text-gray-700 font-mono">
                    {`<DashboardFinancieroIntegrado />`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-semibold text-gray-700 mb-2">
                No se pudieron cargar los datos de Chipax
              </h4>
              <p className="text-gray-600 mb-6">
                Verifica la configuración de la API o revisa la conectividad
              </p>
              <button
                onClick={cargarDatosChipax}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reintentar Conexión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ===== VISTA: CONFIGURACIÓN =====
  const VistaConfiguracion = () => (
    <div className="p-6 space-y-6">
      {/* Configuración de Chipax */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="h-6 w-6 mr-3 text-gray-600" />
          Configuración del Sistema
        </h3>
        
        <div className="space-y-6">
          {/* Variables de entorno */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">🔧 Configuración de Chipax</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                Variables de entorno necesarias en tu archivo <code className="bg-gray-200 px-2 py-1 rounded">.env</code>:
              </p>
              <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-sm overflow-x-auto">
                <div>REACT_APP_CHIPAX_API_URL=https://api.chipax.com/v2</div>
                <div>REACT_APP_CHIPAX_APP_ID=tu_app_id_aqui</div>
                <div>REACT_APP_CHIPAX_SECRET_KEY=tu_secret_key_aqui</div>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-blue-800 text-sm">
                  <strong>Estado actual:</strong> {
                    process.env.REACT_APP_CHIPAX_API_URL ? 
                    '✅ Variables configuradas' : 
                    '❌ Variables no configuradas (usando datos demo)'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Gestión de datos */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">📊 Gestión de Datos</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-2">Datos de Cartolas</h5>
                <p className="text-sm text-gray-600 mb-3">
                  Limpiar todos los datos de cartolas bancarias cargadas
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de eliminar todos los datos de cartolas?')) {
                      localStorage.removeItem('pgr_movimientos_bancarios');
                      localStorage.removeItem('pgr_saldo_actual');
                      setSaldosBancarios(0);
                      alert('✅ Datos de cartolas eliminados correctamente');
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Limpiar Cartolas
                </button>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-2">Reset Completo</h5>
                <p className="text-sm text-gray-600 mb-3">
                  Eliminar todos los datos y reiniciar la aplicación
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de hacer un reset completo? Se perderán todos los datos.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Reset Completo
                </button>
              </div>
            </div>
          </div>

          {/* Información del sistema */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">ℹ️ Información del Sistema</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Versión:</span>
                <span className="font-medium">Dashboard PGR v2.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Última actualización:</span>
                <span className="font-medium">
                  {lastUpdate ? lastUpdate.toLocaleString('es-CL') : 'No disponible'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Saldo actual:</span>
                <span className="font-medium text-green-600">
                  ${saldosBancarios.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado Chipax:</span>
                <span className={`font-medium ${errorChipax ? 'text-red-600' : 'text-green-600'}`}>
                  {errorChipax ? 'Desconectado' : 'Conectado'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== RENDER PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navegación superior */}
      <NavegacionDashboard />
      
      {/* Contenido principal */}
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
