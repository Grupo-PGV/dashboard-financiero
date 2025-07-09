import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Eye,
  Calendar,
  Building,
  Mail,
  Globe,
  ChevronDown,
  ChevronRight,
  Users,
  Clock
} from 'lucide-react';

const DashboardCumplimiento = ({ onCerrarSesion }) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [estadoDocumentos, setEstadoDocumentos] = useState({});
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [clientesExpandidos, setClientesExpandidos] = useState({});
  const [mostrarDetalles, setMostrarDetalles] = useState(false);

  // Base de datos completa de clientes con información del manual
  const clientes = {
    'INCOPORT': {
      modalidad: 'Envío directo',
      icono: '📋',
      categoria: 'Logística',
      contacto: 'documentos@incoport.cl',
      documentos: [
        'Liquidaciones de Sueldo',
        'Libro Asistencia',
        'Certificado F30',
        'Certificado F30-1',
        'Planilla Cotizaciones Previsionales'
      ]
    },
    'ALIANZA INMOBILIARIO': {
      modalidad: 'Envío directo',
      icono: '🏢',
      categoria: 'Inmobiliaria',
      contacto: 'rrhh@alianzainmobiliario.cl',
      documentos: [
        'Nómina de Personal',
        'Certificado F30',
        'Certificado F30-1',
        'Liquidación y Transferencias',
        'Certificado Cotizaciones'
      ]
    },
    'IMEL': {
      modalidad: 'Envío directo',
      icono: '⚙️',
      categoria: 'Industrial',
      contacto: 'administracion@imel.cl',
      documentos: [
        'Certificado F30',
        'Certificado F30-1',
        'Planilla Cotizaciones Previsionales',
        'Liquidaciones',
        'Transferencias'
      ]
    },
    'FULL LOGISTIC': {
      modalidad: 'Envío directo',
      icono: '🚛',
      categoria: 'Logística',
      contacto: 'operaciones@fulllogistic.cl',
      documentos: [
        'Certificado F30',
        'Certificado F30-1'
      ]
    },
    'JOSÉ MORENO': {
      modalidad: 'Envío directo',
      icono: '👤',
      categoria: 'Persona Natural',
      contacto: 'jose.moreno@email.cl',
      documentos: [
        'Certificado F30',
        'Certificado F30-1'
      ]
    },
    'CAROZZI': {
      modalidad: 'Envío directo',
      icono: '🍪',
      categoria: 'Alimentos',
      contacto: 'contratistas@carozzi.cl',
      documentos: [
        'Certificado de Adhesión a Seguro de Accidentes (vigente)',
        'Detalle de Pago de Cotizaciones Previsionales de PreviRed (últimos 3 meses)',
        'Certificado de la Inspección del Trabajo sobre cumplimiento de obligaciones laborales y previsionales (Ley de subcontratación, F30 y F30-1)',
        'Reglamento interno de la empresa',
        'Escritura de la empresa y modificaciones',
        'Pago del IVA',
        'Balance',
        'Estado de resultado',
        'Contrato de Trabajo vigente y sus anexos (No boleta de honorarios)',
        'Nómina de trabajadores para validarlos',
        'Fotocopia de cédula de Identidad vigente por ambos lados',
        'Certificado de antecedentes',
        'Certificado curso OS10',
        'Documentación preventiva (recepción EPP, Reglamento interno y Charla de Derecho a Saber) ODI/DAS',
        'Inducción contratistas martes y jueves online (Obligatoria)'
      ]
    },
    'CIMOLAI': {
      modalidad: 'Envío directo',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'documentacion@cimolai.cl',
      frecuencia: 'Mensual',
      documentos: [
        'Listado de trabajadores periodo mensual',
        'Liquidaciones de Sueldo mensual',
        'Certificado Cumplimientos Laborales F30-1 y Planilla Cotizaciones Previsionales mensual',
        'Certificado Antecedentes laborales emitido por la Inspección del Trabajo mensual',
        'Finiquito mensual',
        'Certificado Siniestralidad mensual 2025',
        'Planilla Cotizaciones Mutualidad mensual 2025',
        'Certificado aclaración no aplica comité paritario mensual',
        'Certificado cotizaciones al día ACHS mensual',
        'Certificado Afiliación Mutualidad'
      ]
    },
    'CBB - INACAL Y READY MIX PARGUA': {
      modalidad: 'Plataforma Prevsis',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'seguridad@cbb.cl',
      plataforma: 'https://prevsis.cl',
      documentos: [
        'Cédula de Identidad',
        'Contrato de Trabajo',
        'Examen Ocupacional Ruido',
        'Examen Ocupacional Sílice',
        'Examen Alcohol y drogas (Cannabinoides, Cocaína, Anfetamina, Opiáceos, Benzodiacepinas, Alcohol)',
        'Obligación de Informar Riesgos -ODI (Derecho a Saber)',
        'Curso de Herramientas SSO (BCN)',
        'Curso Alcohol y Drogas (BCN)',
        'Inducción Planta',
        'Anexo de vinculación obra - faena',
        'Registro Entrega Elementos Protección Personal (EPP)',
        'Recepción Reglamento Interno de Orden, Higiene y Seguridad (RIOHS)',
        'Difusión procedimiento trabajo seguro',
        'Anexo de traslado mandante o Finiquito del trabajador',
        'Calendario Negociaciones Colectivas',
        'Certificado de tasas o siniestralidad',
        'Plan de Seguridad y Salud Ocupacional (SSO)',
        'Procedimiento de trabajo seguro de tarea a realizar por parte de contratista/transportista + carta de validación CBB',
        'Recepción Reglamento especial de empresas contratistas y subcontratistas (REECS)',
        'Recepción y adherencia a plan de emergencia CBB',
        'Reglamento Interno de Orden, Higiene y Seguridad (RIOHS) y formalidades (DT-SEREMI DE SALUD)',
        'Certificado F30',
        'Certificado F30-1',
        'Nómina de personal',
        'Liquidaciones de Sueldo firmada o Comprobante pago remuneraciones'
      ]
    },
    'TODO MELON': {
      modalidad: 'Plataforma Prevsis + InfoControl',
      icono: '🍈',
      categoria: 'Agrícola',
      contacto: 'rrhh@todomelon.cl',
      plataforma: 'https://prevsis.cl + https://infocontrol.cl',
      documentos: [
        'Cédula de Identidad',
        'Certificado Cotizaciones Previsionales',
        'Contrato y Anexos de Trabajo empleado',
        'Recibo de sueldo o transferencia'
      ]
    },
    'NOVASOURCE': {
      modalidad: 'Plataforma Seyse',
      icono: '🔧',
      categoria: 'Tecnología',
      contacto: 'compliance@novasource.cl',
      plataforma: 'https://seyse.cl',
      documentos: [
        'Certificado de Antecedentes Laborales y Previsionales (F-30)',
        'Certificado de Cumplimiento de las Obligaciones Laborales y Previsionales (F30-1)',
        'Certificado de Pago de Cotizaciones Previsionales (PREVIRED)',
        'Certificado de Siniestralidad y Listado de Accidentados (Indicadores Estadísticos)',
        'Comprobante de Pago de Remuneraciones',
        'Nómina de Reporte Mensual de la Empresa'
      ]
    },
    'WALMART': {
      modalidad: 'Plataforma SubcontrataLey',
      icono: '🛒',
      categoria: 'Retail',
      contacto: 'proveedores@walmart.cl',
      plataforma: 'https://subcontrataley.cl',
      proximosCambios: {
        mayo2025: [
          'Programa de Trabajo Preventivo (SGSST)',
          'Registro Difusión Trabajador Reglamento Interno',
          'Toma de Conoc. de Trab. Información de Riesgos Laborales',
          'Toma Conoc. Trab. Matriz IPER del Contratista',
          'Toma Conoc. Trab. Programa de Trabajo Preventivo',
          'Capacitación Uso y Mantención de EPP',
          'Capacitación de Prevención de Riesgos',
          'Información de riesgos laborales'
        ],
        diciembre2025: [
          'Evaluación de Desempeño del Programa (SGSST)',
          'Mejora Continua (SGSST)'
        ]
      },
      documentos: [
        'Criterios de revisión de la matriz documental (archivo CSV)'
      ]
    },
    'AGROSUPER': {
      modalidad: 'Plataforma KSEC',
      icono: '🐷',
      categoria: 'Agrícola',
      contacto: 'contratistas@agrosuper.cl',
      plataforma: 'https://ksec.cl',
      documentos: [
        'Certificado F30',
        'Certificado F30-1',
        'Contrato de trabajo',
        'Anexos',
        'Finiquitos'
      ]
    },
    'EBCO': {
      modalidad: 'Plataforma Ebco Conecta',
      icono: '⚡',
      categoria: 'Energía',
      contacto: 'seguridad@ebco.cl',
      plataforma: 'https://ebcoconecta.cl',
      documentos: [
        'Liquidaciones',
        'Libro de asistencia',
        'Contrato de trabajo',
        'Charlas de prevención mensuales',
        'F-30',
        'F30-1',
        'Libro de remuneraciones',
        'Cotizaciones',
        'Certificados de la ACHS',
        'Anexos',
        'Finiquitos'
      ]
    },
    'SEMPER': {
      modalidad: 'Sin requerimientos',
      icono: '✅',
      categoria: 'Servicios',
      contacto: 'info@semper.cl',
      documentos: []
    },
    'BANCO DE CHILE': {
      modalidad: 'Sin requerimientos',
      icono: '🏦',
      categoria: 'Financiero',
      contacto: 'proveedores@bancochile.cl',
      documentos: []
    },
    'BIOILS': {
      modalidad: 'Sin requerimientos',
      icono: '🛢️',
      categoria: 'Energía',
      contacto: 'contacto@bioils.cl',
      documentos: []
    },
    'ARSA GROUP': {
      modalidad: 'Sin requerimientos',
      icono: '🏢',
      categoria: 'Servicios',
      contacto: 'info@arsagroup.cl',
      documentos: []
    }
  };

  // Inicializar estado de documentos - INICIO ENERO 2025 - TODO EN 0%
  useEffect(() => {
    const estadoInicial = {};
    Object.entries(clientes).forEach(([cliente, data]) => {
      estadoInicial[cliente] = {};
      data.documentos.forEach((doc) => {
        // Todos los documentos inician en FALSE (0% cumplimiento)
        estadoInicial[cliente][doc] = false;
      });
    });
    setEstadoDocumentos(estadoInicial);
  }, []);

  const calcularPorcentaje = (cliente) => {
    const docs = clientes[cliente].documentos;
    if (docs.length === 0) return 100; // Clientes sin requerimientos
    const completados = docs.filter(doc => estadoDocumentos[cliente]?.[doc]).length;
    return Math.round((completados / docs.length) * 100);
  };

  const getColorPorcentaje = (porcentaje) => {
    if (porcentaje >= 90) return 'text-green-700 bg-green-100 border-green-300';
    if (porcentaje >= 70) return 'text-blue-700 bg-blue-100 border-blue-300';
    if (porcentaje >= 50) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    return 'text-red-700 bg-red-100 border-red-300';
  };

  const getIconoModalidad = (modalidad) => {
    if (modalidad.includes('Plataforma')) return <Globe size={16} className="text-blue-600" />;
    if (modalidad === 'Envío directo') return <Mail size={16} className="text-green-600" />;
    return <CheckCircle size={16} className="text-gray-600" />;
  };

  const toggleDocumento = (cliente, documento) => {
    setEstadoDocumentos(prev => ({
      ...prev,
      [cliente]: {
        ...prev[cliente],
        [documento]: !prev[cliente]?.[documento]
      }
    }));
  };

  const toggleClienteExpandido = (cliente) => {
    setClientesExpandidos(prev => ({
      ...prev,
      [cliente]: !prev[cliente]
    }));
  };

  // Filtrar clientes según búsqueda y estado
  const clientesFiltrados = Object.entries(clientes).filter(([nombre, data]) => {
    const cumpleBusqueda = nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                          data.categoria.toLowerCase().includes(busqueda.toLowerCase());
    
    if (filtroEstado === 'todos') return cumpleBusqueda;
    
    const porcentaje = calcularPorcentaje(nombre);
    if (filtroEstado === 'criticos') return cumpleBusqueda && porcentaje < 50;
    if (filtroEstado === 'proceso') return cumpleBusqueda && porcentaje >= 50 && porcentaje < 90;
    if (filtroEstado === 'completos') return cumpleBusqueda && porcentaje >= 90;
    
    return cumpleBusqueda;
  });

  const estadisticas = {
    total: Object.keys(clientes).length,
    criticos: Object.keys(clientes).filter(c => calcularPorcentaje(c) < 50).length,
    proceso: Object.keys(clientes).filter(c => {
      const p = calcularPorcentaje(c);
      return p >= 50 && p < 90;
    }).length,
    completos: Object.keys(clientes).filter(c => calcularPorcentaje(c) >= 90).length,
    promedio: Math.round(Object.keys(clientes).reduce((sum, c) => sum + calcularPorcentaje(c), 0) / Object.keys(clientes).length)
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <FileCheck size={32} />
              <div>
                <h1 className="text-2xl font-bold">Dashboard de Cumplimiento de Contratos</h1>
                <p className="text-blue-100">Control integral de documentación por cliente • Período: Enero 2025 en adelante</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-200">Estado inicial: Requiere actualización completa de información</span>
                </div>
              </div>
            </div>
            <button
              onClick={onCerrarSesion}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Volver al Inicio
            </button>
          </div>
        </div>

        {/* Estadísticas generales */}
        <div className="p-6 border-b">
          {/* Banner de inicio período */}
          <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-orange-600" />
              <div>
                <h3 className="font-bold text-orange-900">🚀 Inicio de Período - Enero 2025</h3>
                <p className="text-orange-700 text-sm">
                  Todos los clientes inician con 0% de cumplimiento. Se requiere actualización completa de la información y documentación.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building size={20} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Clientes</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{estadisticas.total}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-red-600" />
                <span className="text-sm font-medium text-red-900">Críticos</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{estadisticas.criticos}</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={20} className="text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">En Proceso</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{estadisticas.proceso}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-sm font-medium text-green-900">Completos</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{estadisticas.completos}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Promedio</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{estadisticas.promedio}%</p>
            </div>
          </div>
        </div>

        {/* Controles y filtros */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente o categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos los estados</option>
                <option value="criticos">Críticos (&lt;50%)</option>
                <option value="proceso">En proceso (50-89%)</option>
                <option value="completos">Completos (≥90%)</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarDetalles(!mostrarDetalles)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Eye size={16} />
                {mostrarDetalles ? 'Ocultar' : 'Mostrar'} Detalles
              </button>
              
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <Download size={16} />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            <span className="font-medium text-red-900">
              ⚠️ ATENCIÓN: Todos los clientes requieren actualización de documentación para el período 2025
            </span>
          </div>
          <p className="text-red-700 text-sm mt-2">
            Estado actual: {estadisticas.total} clientes con 0% de cumplimiento. Inicie el proceso de recopilación y validación de documentos.
          </p>
        </div>

        {/* Lista de clientes */}
        <div className="p-6">
          <div className="space-y-4">
            {clientesFiltrados.map(([nombre, data]) => {
              const porcentaje = calcularPorcentaje(nombre);
              const expandido = clientesExpandidos[nombre];
              
              return (
                <div key={nombre} className={`border rounded-lg overflow-hidden transition-all ${
                  porcentaje < 50 ? 'border-red-300 bg-red-50' : 
                  porcentaje < 90 ? 'border-yellow-300 bg-yellow-50' : 
                  'border-green-300 bg-green-50'
                }`}>
                  {/* Header del cliente */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
                    onClick={() => toggleClienteExpandido(nombre)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {expandido ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          <span className="text-2xl">{data.icono}</span>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{nombre}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              {getIconoModalidad(data.modalidad)}
                              {data.modalidad}
                            </span>
                            <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                              {data.categoria}
                            </span>
                            <span>{data.documentos.length} documentos</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getColorPorcentaje(porcentaje)}`}>
                          {porcentaje}%
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              porcentaje >= 90 ? 'bg-green-600' :
                              porcentaje >= 70 ? 'bg-blue-600' :
                              porcentaje >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${porcentaje}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detalles expandidos */}
                  {expandido && (
                    <div className="border-t bg-white">
                      {mostrarDetalles && (
                        <div className="p-4 border-b bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <strong>Contacto:</strong> {data.contacto}
                            </div>
                            {data.plataforma && (
                              <div>
                                <strong>Plataforma:</strong> 
                                <a href={data.plataforma} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                  {data.plataforma}
                                </a>
                              </div>
                            )}
                            {data.frecuencia && (
                              <div>
                                <strong>Frecuencia:</strong> {data.frecuencia}
                              </div>
                            )}
                          </div>
                          
                          {data.proximosCambios && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <h4 className="font-medium text-blue-900 mb-2">📅 Próximos cambios programados:</h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <strong>Mayo 2025:</strong> {data.proximosCambios.mayo2025.length} nuevos documentos
                                </div>
                                <div>
                                  <strong>Diciembre 2025:</strong> {data.proximosCambios.diciembre2025.length} documentos adicionales
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Lista de documentos */}
                      {data.documentos.length > 0 ? (
                        <div className="p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Documentos requeridos:</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            {data.documentos.map((documento, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => toggleDocumento(nombre, documento)}
                              >
                                {estadoDocumentos[nombre]?.[documento] ? (
                                  <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                                ) : (
                                  <Circle size={18} className="text-gray-400 flex-shrink-0" />
                                )}
                                <span className={`text-sm ${
                                  estadoDocumentos[nombre]?.[documento] 
                                    ? 'text-gray-900' 
                                    : 'text-gray-600'
                                }`}>
                                  {documento}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <CheckCircle size={24} className="mx-auto mb-2 text-green-600" />
                          <p>Cliente sin requerimientos documentales</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {clientesFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No se encontraron clientes</h3>
              <p>Intenta ajustar los filtros de búsqueda</p>
            </div>
          )}
        </div>

        {/* Footer con información adicional */}
        <div className="border-t bg-gray-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📊 Tipos de Modalidad</h4>
              <ul className="space-y-1">
                <li>• Envío directo: {Object.values(clientes).filter(c => c.modalidad === 'Envío directo').length} clientes</li>
                <li>• Plataformas digitales: {Object.values(clientes).filter(c => c.modalidad.includes('Plataforma')).length} clientes</li>
                <li>• Sin requerimientos: {Object.values(clientes).filter(c => c.modalidad === 'Sin requerimientos').length} clientes</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🏢 Categorías</h4>
              <ul className="space-y-1">
                {[...new Set(Object.values(clientes).map(c => c.categoria))].map(categoria => (
                  <li key={categoria}>
                    • {categoria}: {Object.values(clientes).filter(c => c.categoria === categoria).length} clientes
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">⚡ Acciones Rápidas</h4>
              <div className="space-y-2">
                <button className="block w-full text-left px-3 py-2 bg-white rounded border hover:bg-gray-50 transition-colors">
                  📤 Enviar recordatorios masivos
                </button>
                <button className="block w-full text-left px-3 py-2 bg-white rounded border hover:bg-gray-50 transition-colors">
                  📋 Generar reporte de cumplimiento
                </button>
                <button className="block w-full text-left px-3 py-2 bg-white rounded border hover:bg-gray-50 transition-colors">
                  🔄 Actualizar estados automáticamente
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="font-medium">PERÍODO DE INICIO: ENERO 2025</span>
            </div>
            Dashboard configurado para inicio de período • Estado: Todos los clientes requieren actualización • Última sincronización: {new Date().toLocaleString('es-CL')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCumplimiento;
