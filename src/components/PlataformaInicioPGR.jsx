import React, { useState } from 'react';
import { Eye, EyeOff, Shield, BarChart3, FileCheck, DollarSign, LogOut, ArrowRight } from 'lucide-react';
import DashboardFinancieroIntegrado from '../pages/DashboardFinancieroIntegrado';
import DashboardCumplimiento from './DashboardCumplimiento';
import DashboardFinancieroConSaldos from './DashboardFinancieroConSaldos';

/**
 * Plataforma de Inicio PGR Seguridad - VERSIÓN CORREGIDA
 * Página principal con acceso a todos los dashboards del sistema
 * Incluye autenticación y navegación centralizada
 */
const PlataformaInicioPGR = () => {
  // ===== ESTADOS PRINCIPALES =====
  const [currentView, setCurrentView] = useState('inicio');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({
    rut: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ===== CREDENCIALES DE ACCESO =====
  const CREDENTIALS = {
    rut: '18808139-8',        // SIN formato
    rutFormatted: '18.808.139-8',  // CON formato (para mostrar)
    password: 'PGR"="%'
  };

  // ===== FUNCIÓN PARA LIMPIAR RUT (sin formato) =====
  const cleanRUT = (rut) => {
    return rut.replace(/[^0-9kK]/g, ''); // Eliminar todos los caracteres excepto números y K
  };

  // ===== FUNCIÓN DE AUTENTICACIÓN CORREGIDA =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    console.log('🔐 Intentando login...');
    console.log('📝 RUT ingresado:', loginForm.rut);
    console.log('📝 RUT limpio:', cleanRUT(loginForm.rut));
    console.log('📝 RUT esperado:', CREDENTIALS.rut);
    console.log('🔑 Password ingresado:', loginForm.password);
    console.log('🔑 Password esperado:', CREDENTIALS.password);

    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 800));

    // VALIDACIÓN CORREGIDA: Comparar RUT limpio
    const rutLimpio = cleanRUT(loginForm.rut);
    const rutEsperado = cleanRUT(CREDENTIALS.rut);
    
    if (rutLimpio === rutEsperado && loginForm.password === CREDENTIALS.password) {
      console.log('✅ Login exitoso');
      setIsAuthenticated(true);
      setCurrentView('inicio');
      
      // Limpiar formulario
      setLoginForm({ rut: '', password: '' });
      setLoginError('');
    } else {
      console.log('❌ Login fallido');
      console.log('❌ RUT match:', rutLimpio === rutEsperado);
      console.log('❌ Password match:', loginForm.password === CREDENTIALS.password);
      
      setLoginError('RUT o contraseña incorrectos. Verifique sus credenciales.');
    }

    setIsLoading(false);
  };

  // ===== FUNCIÓN DE LOGOUT =====
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('inicio');
    setLoginForm({ rut: '', password: '' });
    setLoginError('');
  };

  // ===== FORMATEAR RUT CHILENO =====
  const formatRUT = (value) => {
    // Eliminar caracteres no numéricos excepto K
    const cleanValue = value.replace(/[^0-9kK]/g, '');
    
    if (cleanValue.length <= 1) return cleanValue;
    
    // Separar número y dígito verificador
    const number = cleanValue.slice(0, -1);
    const dv = cleanValue.slice(-1);
    
    // Formatear con puntos cada 3 dígitos
    const formattedNumber = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${formattedNumber}-${dv}`;
  };

  const handleRutChange = (e) => {
    const formattedValue = formatRUT(e.target.value);
    setLoginForm(prev => ({ ...prev, rut: formattedValue }));
  };

  // ===== PANTALLA DE LOGIN =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo y Header */}
          <div className="text-center mb-8">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">PGR Seguridad</h1>
            <p className="text-blue-200">Plataforma de Gestión Integrada</p>
          </div>

          {/* Formulario de Login */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
              Acceso al Sistema
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Campo RUT */}
              <div>
                <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-2">
                  RUT
                </label>
                <input
                  id="rut"
                  type="text"
                  placeholder="12.345.678-9"
                  value={loginForm.rut}
                  onChange={handleRutChange}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Campo Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingrese su contraseña"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-700 text-sm">{loginError}</p>
                </div>
              )}

              {/* Botón Login */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </form>

            {/* Información de Credenciales (Solo para desarrollo) */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600 text-center">
                <strong>Credenciales de acceso:</strong><br />
                RUT: {CREDENTIALS.rutFormatted} | Contraseña: {CREDENTIALS.password}
              </p>
            </div>

            {/* DEBUG INFO - Solo visible en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-xs text-yellow-800">
                  <strong>DEBUG:</strong><br />
                  RUT ingresado limpio: {cleanRUT(loginForm.rut)}<br />
                  RUT esperado limpio: {cleanRUT(CREDENTIALS.rut)}<br />
                  Match RUT: {cleanRUT(loginForm.rut) === cleanRUT(CREDENTIALS.rut) ? '✅' : '❌'}<br />
                  Match Password: {loginForm.password === CREDENTIALS.password ? '✅' : '❌'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDERIZADO SEGÚN VISTA ACTUAL =====
  
  // Vista Dashboard Financiero Original (Chipax)
  if (currentView === 'financiero') {
    return (
      <DashboardFinancieroIntegrado 
        onBack={() => setCurrentView('inicio')}
        onLogout={handleLogout}
      />
    );
  }

  // Vista Dashboard de Cumplimiento
  if (currentView === 'cumplimiento') {
    return (
      <DashboardCumplimiento 
        onBack={() => setCurrentView('inicio')}
        onLogout={handleLogout}
      />
    );
  }

  // Vista Dashboard Financiero Completo (Chipax + Saldos)
  if (currentView === 'financiero-completo') {
    return (
      <DashboardFinancieroConSaldos 
        onBack={() => setCurrentView('inicio')}
        onLogout={handleLogout}
      />
    );
  }

  // ===== VISTA PRINCIPAL DE INICIO =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PGR Seguridad</h1>
                <p className="text-sm text-gray-600">Plataforma de Gestión Integrada</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Título de Bienvenida */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenido al Centro de Control
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Gestiona de manera eficiente las finanzas corporativas, cumplimiento de contratos 
            y análisis financiero integral de PGR Seguridad.
          </p>
        </div>

        {/* Grid de Dashboards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Dashboard Financiero Original (solo Chipax) */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
              <BarChart3 className="h-12 w-12 text-white mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                📊 Dashboard Financiero Chipax
              </h3>
              <p className="text-blue-100">
                Datos financieros desde Chipax
              </p>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Accede a saldos bancarios, cuentas por cobrar/pagar y KPIs financieros 
                integrados con la plataforma Chipax.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  ✅ Integración Chipax<br />
                  ✅ KPIs en tiempo real<br />
                  ✅ Reportes automáticos
                </div>
              </div>
              <button
                onClick={() => setCurrentView('financiero')}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center group-hover:bg-blue-700"
              >
                Acceder a Finanzas Chipax
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Dashboard Financiero Completo (Chipax + Saldos Bancarios) */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
              <DollarSign className="h-12 w-12 text-white mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                💰 Dashboard Financiero Completo
              </h3>
              <p className="text-green-100">
                Chipax + Saldos Bancarios integrados
              </p>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Dashboard integral que combina datos de Chipax con análisis de cartolas 
                bancarias para una visión financiera completa.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  ✅ Carga de cartolas CSV/Excel<br />
                  ✅ Análisis de movimientos<br />
                  ✅ Integración con Chipax<br />
                  ✅ Dashboard unificado
                </div>
              </div>
              <button
                onClick={() => setCurrentView('financiero-completo')}
                className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center group-hover:bg-green-700"
              >
                Acceder a Finanzas Completas
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Dashboard de Cumplimiento */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
              <FileCheck className="h-12 w-12 text-white mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                📋 Dashboard de Cumplimiento
              </h3>
              <p className="text-purple-100">
                Control de documentación por cliente
              </p>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Sistema de seguimiento de documentación y certificaciones para 
                todos los clientes de PGR Seguridad.
              </p>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  ✅ 17 clientes incluidos<br />
                  ✅ Seguimiento por cliente<br />
                  ✅ Alertas de cumplimiento
                </div>
              </div>
              <button
                onClick={() => setCurrentView('cumplimiento')}
                className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center group-hover:bg-purple-700"
              >
                Gestionar Contratos
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* Sección de Funcionalidades */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🚀 Funcionalidades Disponibles
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Análisis Financiero</h4>
              <p className="text-gray-600 text-sm">
                Integración con Chipax y procesamiento de cartolas bancarias 
                para análisis completo de flujos financieros.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Saldos Bancarios</h4>
              <p className="text-gray-600 text-sm">
                Carga automática de cartolas en CSV/Excel para cálculo 
                de saldos y categorización de movimientos.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Control de Cumplimiento</h4>
              <p className="text-gray-600 text-sm">
                Seguimiento de documentación de certificaciones para 
                17 clientes con alertas automáticas.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p>© 2025 PGR Seguridad - Plataforma de Gestión Integrada</p>
          <p className="text-sm mt-1">Desarrollado con React • Desplegado en Netlify</p>
        </div>
      </div>
    </div>
  );
};

export default PlataformaInicioPGR;
