import React, { useState } from 'react';
import { Eye, EyeOff, Shield, BarChart3, FileCheck, FileText, LogOut } from 'lucide-react';
import DashboardFinancieroIntegrado from '../pages/DashboardFinancieroIntegrado';
import DashboardCumplimiento from './DashboardCumplimiento';

/**
 * Plataforma de Inicio PGR Seguridad - VERSIÓN FINAL
 * 
 * Solo 2 opciones principales:
 * 1. 💼 Dashboard Financiero Integrado (Chipax + Cartolas + KPIs + Proyecciones)
 * 2. 📋 Gestión de Contratos (Control de cumplimiento)
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
    rut: '18808139-8',
    rutFormatted: '18.808.139-8',
    password: 'PGR"="%'
  };

  // ===== FUNCIÓN PARA LIMPIAR RUT =====
  const cleanRUT = (rut) => {
    return rut.replace(/[^0-9kK]/g, '');
  };

  // ===== FUNCIÓN DE AUTENTICACIÓN =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 800));

    // Validación: Comparar RUT limpio
    const rutLimpio = cleanRUT(loginForm.rut);
    const rutEsperado = cleanRUT(CREDENTIALS.rut);
    
    if (rutLimpio === rutEsperado && loginForm.password === CREDENTIALS.password) {
      setIsAuthenticated(true);
      setCurrentView('inicio');
      setLoginForm({ rut: '', password: '' });
      setLoginError('');
    } else {
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
    const cleanValue = value.replace(/[^0-9kK]/g, '');
    
    if (cleanValue.length <= 1) return cleanValue;
    
    const number = cleanValue.slice(0, -1);
    const dv = cleanValue.slice(-1);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo y Header */}
          <div className="text-center mb-8">
            <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">PGR Seguridad</h1>
            <p className="text-blue-200 text-lg">Plataforma de Gestión Integrada</p>
          </div>

          {/* Formulario de Login */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-95">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
              Acceso al Sistema
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Campo RUT */}
              <div>
                <label htmlFor="rut" className="block text-sm font-semibold text-gray-700 mb-2">
                  RUT
                </label>
                <input
                  id="rut"
                  type="text"
                  placeholder="12.345.678-9"
                  value={loginForm.rut}
                  onChange={handleRutChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Campo Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ingrese su contraseña"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 text-sm font-medium">{loginError}</p>
                </div>
              )}

              {/* Botón Login */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all transform hover:scale-105"
              >
                {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </form>

            {/* Información de Credenciales */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-600 text-center">
                <strong>Credenciales de acceso:</strong><br />
                RUT: {CREDENTIALS.rutFormatted} | Contraseña: {CREDENTIALS.password}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDERIZADO SEGÚN VISTA ACTUAL =====
  
  // Vista Dashboard Financiero Integrado (Chipax + Cartolas)
  if (currentView === 'financiero') {
    return (
      <DashboardFinancieroIntegrado 
        onBack={() => setCurrentView('inicio')}
        onLogout={handleLogout}
      />
    );
  }

  // Vista Dashboard de Gestión de Contratos
  if (currentView === 'contratos') {
    return (
      <DashboardCumplimiento 
        onBack={() => setCurrentView('inicio')}
        onLogout={handleLogout}
      />
    );
  }

  // ===== VISTA PRINCIPAL DE INICIO =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">PGR Seguridad</h1>
                <p className="text-gray-600 font-medium">Plataforma de Gestión Integrada</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-medium"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Título de Bienvenida */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Centro de Control Empresarial
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Accede a los sistemas de gestión financiera integrada y control de cumplimiento 
            contractual para una administración eficiente y completa de PGR Seguridad.
          </p>
        </div>

        {/* DASHBOARDS PRINCIPALES - Solo 2 opciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          
          {/* DASHBOARD FINANCIERO INTEGRADO */}
          <div className="group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-600 p-10">
              <BarChart3 className="h-20 w-20 text-white mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-3xl font-bold text-white mb-3">
                💼 Dashboard Financiero
              </h3>
              <p className="text-blue-100 text-xl font-medium">
                Chipax + Cartolas + KPIs + Proyecciones
              </p>
            </div>
            
            {/* Content Card */}
            <div className="p-10">
              <p className="text-gray-700 mb-8 text-lg leading-relaxed">
                Sistema financiero integral que combina datos de API Chipax con 
                procesamiento inteligente de cartolas bancarias, generando KPIs 
                consolidados, flujos de caja y proyecciones financieras.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                  <span className="font-medium">Integración completa con API Chipax</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                  <span className="font-medium">Procesamiento automático de cartolas bancarias</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-4"></div>
                  <span className="font-medium">Detección inteligente por banco (BCI, Banco Chile, etc.)</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-4"></div>
                  <span className="font-medium">KPIs consolidados y proyecciones de flujo</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-4"></div>
                  <span className="font-medium">Análisis de liquidez y cobertura financiera</span>
                </div>
              </div>
              
              <button
                onClick={() => setCurrentView('financiero')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-colors font-semibold text-lg transform group-hover:scale-105 transition-transform shadow-lg"
              >
                Acceder al Dashboard Financiero
              </button>
            </div>
          </div>

          {/* DASHBOARD DE GESTIÓN DE CONTRATOS */}
          <div className="group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-600 p-10">
              <FileCheck className="h-20 w-20 text-white mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-3xl font-bold text-white mb-3">
                📋 Gestión de Contratos
              </h3>
              <p className="text-purple-100 text-xl font-medium">
                Control de Cumplimiento Contractual
              </p>
            </div>
            
            {/* Content Card */}
            <div className="p-10">
              <p className="text-gray-700 mb-8 text-lg leading-relaxed">
                Sistema completo de seguimiento y control de documentación 
                requerida por cada cliente según especificaciones contractuales, 
                con gestión de trabajadores y alertas automáticas.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-4"></div>
                  <span className="font-medium">17 clientes con seguimiento activo</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                  <span className="font-medium">Control por documentos y trabajadores</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-4"></div>
                  <span className="font-medium">Alertas automáticas de cumplimiento</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                  <span className="font-medium">Gestión de nóminas por cliente</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-4"></div>
                  <span className="font-medium">Reportes de estado por período</span>
                </div>
              </div>
              
              <button
                onClick={() => setCurrentView('contratos')}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-colors font-semibold text-lg transform group-hover:scale-105 transition-transform shadow-lg"
              >
                Gestionar Contratos
              </button>
            </div>
          </div>

        </div>

        {/* Información del Sistema */}
        <div className="bg-white rounded-2xl shadow-xl p-10">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            🚀 Capacidades del Sistema Integrado
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Análisis Integrado</h4>
              <p className="text-gray-600 leading-relaxed">
                Combina múltiples fuentes de datos financieros para una visión 
                completa y actualizada de la situación empresarial
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-100 to-green-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <FileText className="h-10 w-10 text-green-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Procesamiento Inteligente</h4>
              <p className="text-gray-600 leading-relaxed">
                Detección automática de formatos bancarios y procesamiento 
                inteligente de cartolas de diferentes entidades financieras
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <FileCheck className="h-10 w-10 text-purple-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Control Total</h4>
              <p className="text-gray-600 leading-relaxed">
                Seguimiento exhaustivo de cumplimiento contractual con 
                alertas automáticas y gestión documental completa
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-orange-100 to-orange-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-10 w-10 text-orange-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Seguridad Avanzada</h4>
              <p className="text-gray-600 leading-relaxed">
                Acceso controlado y procesamiento seguro de información 
                financiera sensible con respaldo automático
              </p>
            </div>
          </div>
        </div>

        {/* Footer Informativo */}
        <div className="mt-16 text-center text-gray-500">
          <p className="text-lg">© 2025 PGR Seguridad - Plataforma de Gestión Integrada</p>
          <p className="text-base mt-2">
            Dashboard Financiero con Chipax + Cartolas Bancarias • Sistema de Gestión Contractual
          </p>
          <p className="text-sm mt-1">
            Desarrollado con React • Desplegado en Netlify • Procesamiento inteligente de datos
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlataformaInicioPGR;
