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
  Clock,
  CheckSquare,
  Square,
  FileText,
  X,
  ExternalLink,
  Bell,
  AlertOctagon,
  CalendarClock,
  Plus
} from 'lucide-react';

const DashboardCumplimiento = ({ onCerrarSesion }) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [clientesExpandidos, setClientesExpandidos] = useState({});
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-01');
  const [mostrarTablaCriticos, setMostrarTablaCriticos] = useState(true);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [mostrarMatrizWalmart, setMostrarMatrizWalmart] = useState(false);
  const [estadoPorPeriodo, setEstadoPorPeriodo] = useState({});
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [fechasVencimiento, setFechasVencimiento] = useState({});

  // Base de datos real de clientes PGR Seguridad
  const clientes = {
    'INCOPORT': {
      modalidad: 'Envío directo',
      icono: '📋',
      categoria: 'Logística',
      contacto: 'documentos@incoport.cl',
      frecuencia: 'Mensual',
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
      categoria: 'Inmobiliario',
      contacto: 'documentos@alianza.cl',
      frecuencia: 'Mensual',
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
      contacto: 'documentos@imel.cl',
      frecuencia: 'Mensual',
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
      contacto: 'documentos@fulllogistic.cl',
      frecuencia: 'Mensual',
      documentos: [
        'Certificado F30',
        'Certificado F30-1'
      ]
    },
    'JOSÉ MORENO': {
      modalidad: 'Envío directo',
      icono: '👤',
      categoria: 'Personal',
      contacto: 'jmoreno@gmail.com',
      frecuencia: 'Mensual',
      documentos: [
        'Certificado F30',
        'Certificado F30-1'
      ]
    },
    'CAROZZI': {
      modalidad: 'Envío directo',
      icono: '🍪',
      categoria: 'Alimentario',
      contacto: 'proveedores@carozzi.cl',
      frecuencia: 'Mensual',
      documentos: [
        // Documentos de la empresa
        'Certificado de Adhesión a Seguro de Accidentes (vigente)',
        'Detalle de Pago de Cotizaciones Previsionales de PreviRed (últimos 3 meses)',
        'Certificado de la Inspección del Trabajo sobre cumplimiento de obligaciones laborales y previsionales (Ley de subcontratación, F30 y F30-1)',
        'Reglamento interno de la empresa',
        'Escritura de la empresa y modificaciones',
        'Pago del IVA',
        'Balance',
        'Estado de resultado',
        // Documentos de trabajadores
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
      contacto: 'documentos@cimolai.cl',
      frecuencia: 'Mensual',
      documentos: [
        // Documentos mensuales
        'Listado de trabajadores periodo mensual',
        'Liquidaciones de Sueldo mensual',
        'Certificado Cumplimientos Laborales F30-1 y Planilla Cotizaciones Previsionales mensual',
        'Certificado Antecedentes laborales emitido por la Inspección del Trabajo mensual',
        'Finiquito mensual',
        'Certificado Siniestralidad mensual 2025',
        'Planilla Cotizaciones Mutualidad mensual 2025',
        'Certificado aclaración no aplica comité paritario mensual',
        'Certificado cotizaciones al día ACHS mensual',
        // Documentos una sola vez
        'Certificado Afiliación Mutualidad'
      ]
    },
    'CBB - INACAL Y READY MIX PARGUA': {
      modalidad: 'Prevsis',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'proveedores@cbb.cl',
      plataforma: 'Prevsis',
      frecuencia: 'Mensual',
      documentos: [
        // Documentos de personal
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
        // Documentos de empresa
        'Calendario Negociaciones Colectivas',
        'Certificado de tasas o siniestralidad',
        'Plan de Seguridad y Salud Ocupacional (SSO)',
        'Procedimiento de trabajo seguro de tarea a realizar por parte de contratista/transportista + carta de validación CBB',
        'Recepción Reglamento especial de empresas contratistas y subcontratistas (REECS)',
        'Recepción y adherencia a plan de emergencia CBB',
        'Reglamento Interno de Orden, Higiene y Seguridad (RIOHS) y formalidades (DT-SEREMI DE SALUD)',
        // Documentos mensuales
        'Certificado F30',
        'Certificado F30-1',
        'Nómina de personal',
        'Liquidaciones de Sueldo firmada o Comprobante pago remuneraciones'
      ]
    },
    'TODO MELON': {
      modalidad: 'Prevsis + InfoControl',
      icono: '🍈',
      categoria: 'Agrícola',
      contacto: 'documentos@todomelon.cl',
      plataforma: 'Prevsis + InfoControl',
      frecuencia: 'Mensual',
      documentos: [
        // Plataforma InfoControl
        'Cédula de Identidad',
        'Certificado Cotizaciones Previsionales',
        'Contrato y Anexos de Trabajo empleado',
        'Recibo de sueldo o transferencia'
      ]
    },
    'NOVASOURCE': {
      modalidad: 'Seyse',
      icono: '🔧',
      categoria: 'Tecnología',
      contacto: 'documentos@novasource.cl',
      plataforma: 'Seyse',
      frecuencia: 'Mensual',
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
      modalidad: 'SubcontrataLey',
      icono: '🛒',
      categoria: 'Retail',
      contacto: 'proveedores@walmart.cl',
      plataforma: 'SubcontrataLey',
      frecuencia: 'Variable',
      documentos: [
        'Criterios de revisión de la matriz documental (archivo CSV)'
      ],
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
      }
    },
    'AGROSUPER': {
      modalidad: 'KSEC',
      icono: '🐷',
      categoria: 'Agrícola',
      contacto: 'proveedores@agrosuper.cl',
      plataforma: 'KSEC',
      frecuencia: 'Mensual',
      documentos: [
        'Certificado F30',
        'Certificado F30-1',
        'Contrato de trabajo',
        'Anexos',
        'Finiquitos'
      ]
    },
    'EBCO': {
      modalidad: 'Ebco Conecta',
      icono: '⚡',
      categoria: 'Energía',
      contacto: 'proveedores@ebco.cl',
      plataforma: 'Ebco Conecta',
      frecuencia: 'Mensual',
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
      icono: '❌',
      categoria: 'Sin categoría',
      contacto: 'N/A',
      frecuencia: 'N/A',
      documentos: []
    },
    'BANCO DE CHILE': {
      modalidad: 'Sin requerimientos',
      icono: '❌',
      categoria: 'Financiero',
      contacto: 'N/A',
      frecuencia: 'N/A',
      documentos: []
    },
    'BIOILS': {
      modalidad: 'Sin requerimientos',
      icono: '❌',
      categoria: 'Energía',
      contacto: 'N/A',
      frecuencia: 'N/A',
      documentos: []
    },
    'ARSA GROUP': {
      modalidad: 'Sin requerimientos',
      icono: '❌',
      categoria: 'Sin categoría',
      contacto: 'N/A',
      frecuencia: 'N/A',
      documentos: []
    }
  };

  // Períodos disponibles
  const periodos = [
    { valor: '2025-01', etiqueta: 'Enero 2025' },
    { valor: '2025-02', etiqueta: 'Febrero 2025' },
    { valor: '2025-03', etiqueta: 'Marzo 2025' },
    { valor: '2025-04', etiqueta: 'Abril 2025' },
    { valor: '2025-05', etiqueta: 'Mayo 2025' },
    { valor: '2025-06', etiqueta: 'Junio 2025' },
    { valor: '2025-07', etiqueta: 'Julio 2025' },
    { valor: '2025-08', etiqueta: 'Agosto 2025' },
    { valor: '2025-09', etiqueta: 'Septiembre 2025' },
    { valor: '2025-10', etiqueta: 'Octubre 2025' },
    { valor: '2025-11', etiqueta: 'Noviembre 2025' },
    { valor: '2025-12', etiqueta: 'Diciembre 2025' }
  ];

  // Estado de documentos por período y cliente
  const [estadoDocumentos, setEstadoDocumentos] = useState(() => {
    const estadoInicial = {};
    Object.keys(clientes).forEach(cliente => {
      estadoInicial[cliente] = {};
      clientes[cliente].documentos.forEach(doc => {
        estadoInicial[cliente][doc] = Math.random() > 0.6; // 40% completado inicialmente
      });
    });
    return estadoInicial;
  });

  // Funciones de cálculo
  const calcularPorcentaje = (cliente) => {
    const documentos = clientes[cliente].documentos;
    if (documentos.length === 0) return 100;
    const completados = documentos.filter(doc => estadoDocumentos[cliente]?.[doc]).length;
    return Math.round((completados / documentos.length) * 100);
  };

  const obtenerEstadisticas = () => {
    const clientesList = Object.keys(clientes);
    const total = clientesList.length;
    const criticos = clientesList.filter(cliente => calcularPorcentaje(cliente) < 50).length;
    const proceso = clientesList.filter(cliente => {
      const p = calcularPorcentaje(cliente);
      return p >= 50 && p < 90;
    }).length;
    const completos = clientesList.filter(cliente => calcularPorcentaje(cliente) >= 90).length;
    const promedio = Math.round(
      clientesList.reduce((sum, cliente) => sum + calcularPorcentaje(cliente), 0) / total
    );
    
    return { total, criticos, proceso, completos, promedio };
  };

  const estadisticas = obtenerEstadisticas();
  
  // Calcular próximos vencimientos (simulado)
  const proximos = Math.floor(Math.random() * 15) + 8;

  // Filtrado de clientes
  const clientesFiltrados = Object.entries(clientes).filter(([nombre, data]) => {
    const cumpleBusqueda = !busqueda || 
      nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      data.categoria.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleFiltroCliente = !clienteFiltro || clienteFiltro === nombre;
    
    const porcentaje = calcularPorcentaje(nombre);
    const cumpleFiltroEstado = filtroEstado === 'todos' ||
      (filtroEstado === 'criticos' && porcentaje < 50) ||
      (filtroEstado === 'proceso' && porcentaje >= 50 && porcentaje < 90) ||
      (filtroEstado === 'completos' && porcentaje >= 90);

    return cumpleBusqueda && cumpleFiltroCliente && cumpleFiltroEstado;
  });

  // Funciones para manejar estados
  const toggleCliente = (cliente) => {
    setClientesExpandidos(prev => ({
      ...prev,
      [cliente]: !prev[cliente]
    }));
  };

  const toggleDocumento = (cliente, documento) => {
    setEstadoDocumentos(prev => ({
      ...prev,
      [cliente]: {
        ...prev[cliente],
        [documento]: !prev[cliente]?.[documento]
      }
    }));
    setUltimoGuardado(new Date());
  };

  // Auto-guardado
  useEffect(() => {
    const interval = setInterval(() => {
      setUltimoGuardado(new Date());
    }, 30000); // Auto-guardado cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Matriz Walmart
  const MatrizWalmart = () => {
    const categorias = [
      {
        categoria: 'Documentos Corporativos',
        documentos: [
          {
            nombre: 'Certificado Registro de Comercio',
            criterios: [
              'Vigente (no mayor a 90 días)',
              'Legible',
              'Aparece la razón social completa',
              'Documento completo',
              'Timbrado por el Registro Civil',
              'Nombre y Rut de la empresa'
            ]
          },
          {
            nombre: 'Poder de Representación',
            criterios: [
              'Vigente',
              'Legible',
              'Aparece nombre completo del representante',
              'Documento completo',
              'Notarizado',
              'Corresponde a la empresa solicitante'
            ]
          }
        ]
      },
      {
        categoria: 'Documentos Laborales',
        documentos: [
          {
            nombre: 'Anexos de Contrato',
            criterios: [
              'Nombre y Rut de la empresa',
              'Legible',
              'Aparece firma de ambas partes',
              'Documento completo',
              'Vigente',
              'Corresponde al trabajador solicitado'
            ]
          },
          {
            nombre: 'Contrato de Trabajo',
            criterios: [
              'Legible',
              'Documento completo',
              'Aparece firma de ambas partes',
              'Vigente',
              'Corresponde al trabajador solicitado',
              'Nombre y Rut de la empresa'
            ]
          }
        ]
      },
      {
        categoria: 'Documentos Previsionales',
        documentos: [
          {
            nombre: 'Certificado F30',
            criterios: [
              'Vigente (no mayor a 60 días)',
              'Legible',
              'Documento completo',
              'Timbrado por la DT',
              'Nombre y Rut de la empresa',
              'Sin multas pendientes'
            ]
          },
          {
            nombre: 'Certificado F30-1',
            criterios: [
              'Vigente (no mayor a 60 días)',
              'Legible',
              'Documento completo',
              'Timbrado por la DT',
              'Nombre y Rut de la empresa'
            ]
          }
        ]
      },
      {
        categoria: 'Seguros y Mutualidades',
        documentos: [
          {
            nombre: 'Certificado de Afiliación Mutualidad',
            criterios: [
              'Vigente',
              'Legible',
              'Documento completo',
              'Nombre y Rut de la empresa',
              'Corresponde al organismo administrador'
            ]
          }
        ]
      }
    ];

    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-xl shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-xl">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <FileCheck size={32} />
                <div>
                  <h1 className="text-2xl font-bold">Matriz de Cumplimiento - WALMART</h1>
                  <p className="text-blue-100">Criterios específicos de validación documental</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarMatrizWalmart(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cerrar
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <Download size={16} />
                  Exportar Matriz
                </button>
              </div>
            </div>
          </div>

          {/* Contenido de la matriz */}
          <div className="p-6">
            {categorias.map((categoria, catIndex) => (
              <div key={catIndex} className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">
                  {categoria.categoria}
                </h2>
                
                <div className="grid gap-6">
                  {categoria.documentos.map((documento, docIndex) => (
                    <div key={docIndex} className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3">
                        📄 {documento.nombre}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {documento.criterios.map((criterio, index) => (
                          <div key={index} className="bg-white p-3 rounded border-l-4 border-blue-400">
                            <div className="flex items-start gap-2">
                              <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{criterio}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Si está mostrando la matriz de Walmart
  if (mostrarMatrizWalmart) {
    return <MatrizWalmart />;
  }

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
          {/* Banner de período actual con auto-guardado */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar size={24} className="text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-900">
                    📅 Período Activo: {periodos.find(p => p.valor === periodoSeleccionado)?.etiqueta}
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Los cambios se guardan automáticamente.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Auto-guardado activo</span>
                </div>
                {ultimoGuardado && (
                  <p className="text-xs text-blue-500">
                    Último guardado: {new Date(ultimoGuardado).toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
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
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Bell size={20} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Próximos</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{proximos}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock size={20} className="text-red-600" />
                <span className="text-sm font-medium text-red-900">Vencidos</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{Math.floor(Math.random() * 8) + 2}</p>
            </div>
          </div>

          {/* Alerta especial para clientes críticos */}
          {estadisticas.criticos > 10 && (
            <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="text-red-600" size={20} />
                <div>
                  <h4 className="font-bold text-red-900">⚠️ Alerta: Alto número de clientes críticos</h4>
                  <p className="text-red-700 text-sm">
                    {estadisticas.criticos} clientes tienen menos del 50% de documentación completa. 
                    Se recomienda priorizar estos casos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla resumen de clientes críticos */}
        {mostrarTablaCriticos && estadisticas.criticos > 0 && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-100 px-4 py-3 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-600" size={20} />
                  <h3 className="font-bold text-red-900">
                    Resumen Críticos - {periodos.find(p => p.valor === periodoSeleccionado)?.etiqueta}
                  </h3>
                </div>
                <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-sm font-medium">
                  {estadisticas.criticos} clientes
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-red-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Cliente</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Docs</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Estado</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Contacto</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Object.entries(clientes)
                    .filter(([nombre]) => calcularPorcentaje(nombre) < 50)
                    .slice(0, 8)
                    .map(([nombre, data], index) => {
                      const porcentaje = calcularPorcentaje(nombre);
                      const docsCompletados = data.documentos.filter(doc => estadoDocumentos[nombre]?.[doc]).length;
                      
                      return (
                        <tr key={nombre} className={index % 2 === 0 ? 'bg-white' : 'bg-red-25'}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{data.icono}</span>
                              <div>
                                <div className="font-medium text-gray-900">{nombre}</div>
                                <div className="text-xs text-gray-500">{data.categoria}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {docsCompletados}/{data.documentos.length}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-red-500"
                                  style={{ width: `${porcentaje}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-red-700">{porcentaje}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {data.contacto}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button 
                                onClick={() => toggleCliente(nombre)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              >
                                <Eye size={14} />
                              </button>
                              <button className="p-1 text-green-600 hover:bg-green-100 rounded">
                                <Mail size={14} />
                              </button>
                              {data.plataforma && (
                                <a 
                                  href={data.plataforma} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Controles y filtros */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-600" />
              <select
                value={clienteFiltro}
                onChange={(e) => setClienteFiltro(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los clientes</option>
                {Object.entries(clientes).map(([nombre, data]) => (
                  <option key={nombre} value={nombre}>
                    {data.icono} {nombre}
                  </option>
                ))}
              </select>
            </div>
            
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
              onClick={() => setMostrarTablaCriticos(!mostrarTablaCriticos)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                mostrarTablaCriticos 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <AlertTriangle size={16} />
              {mostrarTablaCriticos ? 'Ocultar' : 'Mostrar'} Críticos
            </button>
            
            <button
              onClick={() => setMostrarDetalles(!mostrarDetalles)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Eye size={16} />
              {mostrarDetalles ? 'Ocultar' : 'Mostrar'} Detalles
            </button>
            
            <button
              onClick={() => setMostrarMatrizWalmart(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <FileText size={16} />
              Ver Matriz Walmart
            </button>
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="p-6">
          <div className="space-y-4">
            {clientesFiltrados.map(([nombre, data]) => {
              const porcentaje = calcularPorcentaje(nombre);
              const expandido = clientesExpandidos[nombre];
              const docsCompletados = data.documentos.filter(doc => estadoDocumentos[nombre]?.[doc]).length;
              
              return (
                <div
                  key={nombre}
                  className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header del cliente */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => toggleCliente(nombre)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {expandido ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          <span className="text-2xl">{data.icono}</span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{nombre}</h3>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {data.categoria}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {data.modalidad}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    porcentaje >= 90 ? 'bg-green-600' :
                                    porcentaje >= 70 ? 'bg-blue-600' :
                                    porcentaje >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                                  }`}
                                  style={{ width: `${porcentaje}%` }}
                                ></div>
                              </div>
                              <span className={`text-sm font-medium ${
                                porcentaje >= 90 ? 'text-green-600' :
                                porcentaje >= 70 ? 'text-blue-600' :
                                porcentaje >= 50 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {porcentaje}%
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              {docsCompletados}/{data.documentos.length} documentos
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              {data.frecuencia}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {porcentaje < 50 && (
                          <AlertTriangle className="text-red-500" size={20} />
                        )}
                        {porcentaje >= 90 && (
                          <CheckCircle className="text-green-500" size={20} />
                        )}
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`mailto:${data.contacto}`, '_blank');
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Mail size={16} />
                          </button>
                          {data.plataforma && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(data.plataforma, '_blank', 'noopener,noreferrer');
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              <ExternalLink size={16} />
                            </button>
                          )}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {data.documentos.map((documento, index) => {
                              const completado = estadoDocumentos[nombre]?.[documento];
                              
                              return (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm ${
                                    completado 
                                      ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                  }`}
                                  onClick={() => toggleDocumento(nombre, documento)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      {completado ? (
                                        <CheckSquare className="text-green-600 flex-shrink-0" size={16} />
                                      ) : (
                                        <Square className="text-gray-400 flex-shrink-0" size={16} />
                                      )}
                                      <span className={`text-sm ${completado ? 'text-green-800' : 'text-gray-700'}`}>
                                        {documento}
                                      </span>
                                    </div>
                                    {completado && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <CheckCircle size={12} className="text-green-600" />
                                        <span className="text-xs text-green-700">Completado</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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

          {clientesFiltrados.length === 0 && clienteFiltro && (
            <div className="text-center py-12 text-gray-500">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Cliente no encontrado</h3>
              <p>Intenta ajustar los filtros de búsqueda o selecciona otro cliente</p>
            </div>
          )}

          {clientesFiltrados.length === 0 && !clienteFiltro && busqueda && (
            <div className="text-center py-12 text-gray-500">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Sin resultados</h3>
              <p>No se encontraron clientes que coincidan con "{busqueda}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardCumplimiento;
