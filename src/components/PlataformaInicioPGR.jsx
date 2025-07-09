// src/components/PlataformaInicioPGR.jsx
import React, { useState } from 'react';
import { Shield, FileCheck, Building2, Lock, User, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import DashboardFinancieroIntegrado from '../pages/DashboardFinancieroIntegrado';
import DashboardCumplimiento from './DashboardCumplimiento';

const PlataformaInicioPGR = () => {
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [tipoAcceso, setTipoAcceso] = useState('');
  const [credenciales, setCredenciales] = useState({ rut: '', clave: '' });
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState('');
  const [accesoAutorizado, setAccesoAutorizado] = useState(false);
  const [dashboardActivo, setDashboardActivo] = useState('');

  // Credenciales de acceso para finanzas
  const CREDENCIALES_FINANZAS = {
    rut: '18808139-8',
    clave: 'PGR"="%'
  };

  const handleAcceso = (tipo) => {
    setTipoAcceso(tipo);
    if (tipo === 'finanzas') {
      setMostrarLogin(true);
    } else {
      setAccesoAutorizado(true);
      setDashboardActivo('contratos');
    }
    setError('');
  };

  const validarCredenciales = () => {
    if (credenciales.rut === CREDENCIALES_FINANZAS.rut && 
        credenciales.clave === CREDENCIALES_FINANZAS.clave) {
      setAccesoAutorizado(true);
      setDashboardActivo('finanzas');
      setMostrarLogin(false);
      setError('');
    } else {
      setError('Credenciales incorrectas. Verifique RUT y clave.');
    }
  };

  const cerrarSesion = () => {
    setAccesoAutorizado(false);
    setDashboardActivo('');
    setMostrarLogin(false);
    setCredenciales({ rut: '', clave: '' });
    setError('');
  };

  // Renderizar dashboard activo
  if (accesoAutorizado) {
    if (dashboardActivo === 'finanzas') {
      return (
        <div>
          <div className="bg-white shadow-sm border-b px-6 py-4 mb-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="text-green-600" />
                Dashboard Finanzas Corporativas - PGR Seguridad
              </h1>
              <button
                onClick={cerrarSesion}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
          <DashboardFinancieroIntegrado />
        </div>
      );
    } else if (dashboardActivo === 'contratos') {
      return <DashboardCumplimiento onCerrarSesion={cerrarSesion} />;
    }
  }

  // Pantalla de login
  if (mostrarLogin && !accesoAutorizado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <Shield className="mx-auto mb-4 text-blue-600" size={48} />
            <h2 className="text-2xl font-bold text-gray-900">Acceso Restringido</h2>
            <p className="text-gray-600 mt-2">Finanzas Corporativas</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RUT
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={credenciales.rut}
                  onChange={(e) => setCredenciales({...credenciales, rut: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="18808139-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clave
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={mostrarClave ? "text" : "password"}
                  value={credenciales.clave}
                  onChange={(e) => setCredenciales({...credenciales, clave: e.target.value})}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ingrese su clave"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave(!mostrarClave)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarClave ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={validarCredenciales}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Acceder
            </button>

            <button
              onClick={() => setMostrarLogin(false)}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal de inicio
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-4xl">
        <div className="text-center mb-8">
          <Shield className="mx-auto mb-4 text-blue-600" size={64} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PGR Seguridad
          </h1>
          <p className="text-gray-600">
            Plataforma de Gestión y Control de Documentación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Acceso a Finanzas Corporativas */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg border border-green-200">
            <div className="text-center">
              <Building2 className="mx-auto mb-4 text-green-600" size={48} />
              <h2 className="text-xl font-bold text-green-900 mb-3">
                Finanzas Corporativas
              </h2>
              <p className="text-green-700 mb-4 text-sm">
                Dashboard financiero integrado con datos de Chipax. Requiere autenticación especial.
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Lock size={16} className="text-green-600" />
                <span className="text-sm text-green-600 font-medium">Acceso Restringido</span>
              </div>
              <button
                onClick={() => handleAcceso('finanzas')}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Acceder a Finanzas
              </button>
            </div>
          </div>

          {/* Acceso a Cumplimiento de Contratos */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border border-blue-200">
            <div className="text-center">
              <FileCheck className="mx-auto mb-4 text-blue-600" size={48} />
              <h2 className="text-xl font-bold text-blue-900 mb-3">
                Cumplimiento de Contratos
              </h2>
              <p className="text-blue-700 mb-4 text-sm">
                Control y seguimiento de documentación requerida por cada cliente según sus especificaciones.
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <FileCheck size={16} className="text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Acceso Público</span>
              </div>
              <button
                onClick={() => handleAcceso('contratos')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Ver Dashboard de Contratos
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Seleccione el área a la que desea acceder. El sistema mantendrá un registro de todos los accesos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlataformaInicioPGR;
