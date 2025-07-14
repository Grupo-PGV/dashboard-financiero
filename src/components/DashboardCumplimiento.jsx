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
  Plus,
  RefreshCw,
  Archive,
  Award,
  Bookmark
} from 'lucide-react';

const DashboardCumplimiento = ({ onCerrarSesion }) => {
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipoDocumento, setFiltroTipoDocumento] = useState('todos');
  const [mesSeleccionado, setMesSeleccionado] = useState('2025-07');
  const [busqueda, setBusqueda] = useState('');
  const [clientesExpandidos, setClientesExpandidos] = useState({});
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [mostrarTablaCriticos, setMostrarTablaCriticos] = useState(true);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [mostrarMatrizWalmart, setMostrarMatrizWalmart] = useState(false);
  const [estadoDocumentos, setEstadoDocumentos] = useState({});
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // Generar períodos mensuales desde enero 2025 hasta diciembre 2025
  const generarPeriodos = () => {
    const periodos = [];
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    for (let i = 0; i < 12; i++) {
      const mes = String(i + 1).padStart(2, '0');
      periodos.push({
        valor: `2025-${mes}`,
        etiqueta: `${meses[i]} 2025`
      });
    }
    return periodos;
  };

  const periodos = generarPeriodos();

  // Base de datos actualizada de clientes PGR Seguridad
  const clientes = {
    'INCOPORT': {
      modalidad: 'Envío directo',
      icono: '📋',
      categoria: 'Logística',
      contacto: 'documentos@incoport.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2021-01',
      fechaTermino: '2025-05',
      estado: 'Terminado',
      documentos: {
        mensuales: [
          'Liquidaciones de Sueldo',
          'Libro Asistencia',
          'Certificado F30',
          'Certificado F30-1',
          'Planilla Cotizaciones Previsionales'
        ],
        unicos: []
      }
    },
    'ALIANZA INMOBILIARIO': {
      modalidad: 'Envío directo',
      icono: '🏢',
      categoria: 'Inmobiliario',
      contacto: 'documentos@alianza.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2021-02',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Nómina de Personal',
          'Certificado F30',
          'Certificado F30-1',
          'Liquidación y Transferencias',
          'Certificado Cotizaciones'
        ],
        unicos: []
      }
    },
    'IMEL': {
      modalidad: 'Envío directo',
      icono: '⚙️',
      categoria: 'Industrial',
      contacto: 'administracion@imel.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2020-06',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1',
          'Planilla Cotizaciones Previsionales',
          'Liquidaciones',
          'Transferencias'
        ],
        unicos: []
      }
    },
    'FULL LOGISTIC': {
      modalidad: 'Envío directo',
      icono: '🚛',
      categoria: 'Logística',
      contacto: 'operaciones@fulllogistic.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2022-03',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1'
        ],
        unicos: []
      }
    },
    'JOSÉ MORENO': {
      modalidad: 'Envío directo',
      icono: '👤',
      categoria: 'Persona Natural',
      contacto: 'jose.moreno@email.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2019-11',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1'
        ],
        unicos: []
      }
    },
    'CAROZZI': {
      modalidad: 'Envío directo',
      icono: '🍪',
      categoria: 'Alimentos',
      contacto: 'contratistas@carozzi.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2020-01',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Detalle de Pago de Cotizaciones Previsionales',
          'Certificado F30 y F30-1',
          'Nómina de trabajadores',
          'Liquidaciones de Sueldo'
        ],
        unicos: [
          'Certificado de Adhesión a Seguro de Accidentes',
          'Reglamento interno de la empresa',
          'Escritura de la empresa y modificaciones',
          'Contrato de Trabajo vigente y anexos',
          'Fotocopia de cédula de Identidad vigente',
          'Certificado de antecedentes',
          'Certificado curso OS10',
          'Documentación preventiva (EPP, Reglamento)',
          'Inducción contratistas (Obligatoria)'
        ]
      }
    },
    'CIMOLAI': {
      modalidad: 'Envío directo',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'documentacion@cimolai.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-01',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Listado de trabajadores periodo mensual',
          'Liquidaciones de Sueldo mensual',
          'Certificado F30-1 y Planilla Cotizaciones',
          'Certificado Antecedentes laborales',
          'Finiquito mensual',
          'Certificado Siniestralidad 2025',
          'Planilla Cotizaciones Mutualidad',
          'Certificado no aplica comité paritario',
          'Certificado cotizaciones ACHS',
          'Certificado Afiliación Mutualidad'
        ],
        unicos: []
      }
    },
    'CBB - INACAL Y READY MIX PARGUA': {
      modalidad: 'Plataforma Prevsis',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'seguridad@cbb.cl',
      plataforma: 'https://prevsis.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2024-02',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1',
          'Nómina de personal',
          'Liquidaciones de Sueldo firmada'
        ],
        unicos: [
          'Cédula de Identidad',
          'Contrato de Trabajo',
          'Examen Ocupacional Ruido',
          'Examen Ocupacional Sílice',
          'Examen Alcohol y drogas',
          'Obligación de Informar Riesgos (ODI)',
          'Curso de Herramientas SSO',
          'Curso Alcohol y Drogas',
          'Inducción Planta',
          'Anexo de vinculación obra',
          'Registro Entrega EPP',
          'Recepción Reglamento Interno',
          'Plan de Seguridad y Salud Ocupacional',
          'Procedimiento de trabajo seguro'
        ]
      }
    },
    'TODO MELON': {
      modalidad: 'Plataforma Prevsis + InfoControl',
      icono: '🍈',
      categoria: 'Agrícola',
      contacto: 'rrhh@todomelon.cl',
      plataforma: 'https://prevsis.cl + https://infocontrol.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-05',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado Cotizaciones Previsionales',
          'Recibo de sueldo o transferencia'
        ],
        unicos: [
          'Cédula de Identidad',
          'Contrato y Anexos de Trabajo'
        ]
      }
    },
    'NOVASOURCE': {
      modalidad: 'Plataforma Seyse',
      icono: '🔧',
      categoria: 'Tecnología',
      contacto: 'compliance@novasource.cl',
      plataforma: 'https://seyse.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2024-01',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F-30',
          'Certificado F30-1',
          'Certificado de Pago Cotizaciones PREVIRED',
          'Certificado de Siniestralidad',
          'Comprobante de Pago de Remuneraciones',
          'Nómina de Reporte Mensual'
        ],
        unicos: []
      }
    },
    'WALMART': {
      modalidad: 'Plataforma SubcontrataLey',
      icono: '🛒',
      categoria: 'Retail',
      contacto: 'proveedores@walmart.cl',
      plataforma: 'https://subcontrataley.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2024-03',
      estado: 'Activo',
      proximosCambios: {
        mayo2025: [
          'Programa de Trabajo Preventivo (SGSST)',
          'Registro Difusión Trabajador Reglamento Interno',
          'Toma de Conoc. de Trab. Información de Riesgos Laborales',
          'Capacitación Uso y Mantención de EPP'
        ],
        diciembre2025: [
          'Evaluación de Desempeño del Programa (SGSST)',
          'Mejora Continua (SGSST)'
        ]
      },
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1',
          'Nómina de Personal',
          'Liquidaciones de Sueldo'
        ],
        unicos: [
          'Acta Constitución Comité Paritario',
          'Anexos de Contrato',
          'Contrato de Trabajo',
          'Certificado Afiliación Mutualidad'
        ]
      }
    },
    'AGROSUPER': {
      modalidad: 'Plataforma KSEC',
      icono: '🐷',
      categoria: 'Agrícola',
      contacto: 'contratistas@agrosuper.cl',
      plataforma: 'https://ksec.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-08',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1'
        ],
        unicos: [
          'Contrato de trabajo',
          'Anexos',
          'Finiquitos'
        ]
      }
    },
    'EBCO': {
      modalidad: 'Plataforma Ebco Conecta',
      icono: '⚡',
      categoria: 'Energía',
      contacto: 'seguridad@ebco.cl',
      plataforma: 'https://ebcoconecta.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2024-06',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Liquidaciones',
          'Libro de asistencia',
          'Charlas de prevención mensuales',
          'F-30',
          'F30-1',
          'Libro de remuneraciones',
          'Cotizaciones',
          'Certificados de la ACHS'
        ],
        unicos: [
          'Contrato de trabajo',
          'Anexos',
          'Finiquitos'
        ]
      }
    },
    'SEMPER': {
      modalidad: 'Sin requerimientos',
      icono: '✅',
      categoria: 'Servicios',
      contacto: 'info@semper.cl',
      frecuencia: 'N/A',
      fechaInicio: '2021-01',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    },
    'BANCO DE CHILE': {
      modalidad: 'Sin requerimientos',
      icono: '🏦',
      categoria: 'Financiero',
      contacto: 'proveedores@bancochile.cl',
      frecuencia: 'N/A',
      fechaInicio: '2022-01',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    },
    'BIOILS': {
      modalidad: 'Sin requerimientos',
      icono: '🛢️',
      categoria: 'Energía',
      contacto: 'contacto@bioils.cl',
      frecuencia: 'N/A',
      fechaInicio: '2023-01',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    },
    'ARSA GROUP': {
      modalidad: 'Sin requerimientos',
      icono: '🏢',
      categoria: 'Servicios',
      contacto: 'info@arsagroup.cl',
      frecuencia: 'N/A',
      fechaInicio: '2024-01',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    }
  };

  // Inicializar estado de documentos
  useEffect(() => {
    const datosGuardados = JSON.parse(localStorage.getItem('pgr_cumplimiento_contratos_v2') || '{}');
    
    if (Object.keys(datosGuardados).length > 0) {
      setEstadoDocumentos(datosGuardados.estadoDocumentos || {});
      setUltimoGuardado(datosGuardados.ultimoGuardado || null);
    } else {
      // Inicializar estado vacío
      const estadoInicial = {};
      Object.entries(clientes).forEach(([cliente, data]) => {
        estadoInicial[cliente] = {
          mensuales: {},
          unicos: {}
        };
        // Inicializar documentos mensuales
        data.documentos.mensuales.forEach(doc => {
          estadoInicial[cliente].mensuales[doc] = false;
        });
        // Inicializar documentos únicos
        data.documentos.unicos.forEach(doc => {
          estadoInicial[cliente].unicos[doc] = false;
        });
      });
      setEstadoDocumentos(estadoInicial);
    }
  }, []);

  // Auto-guardar cambios
  useEffect(() => {
    if (Object.keys(estadoDocumentos).length > 0) {
      const datosParaGuardar = {
        estadoDocumentos,
        ultimoGuardado: new Date().toISOString(),
        version: '2.0'
      };
      
      localStorage.setItem('pgr_cumplimiento_contratos_v2', JSON.stringify(datosParaGuardar));
      setUltimoGuardado(new Date().toISOString());
    }
  }, [estadoDocumentos]);

  // Función para calcular porcentaje de cumplimiento
  const calcularPorcentaje = (cliente, tipoFiltro = 'todos') => {
    const data = clientes[cliente];
    if (!data) return 0;
    
    let documentosRelevantes = [];
    let completados = 0;
    
    if (tipoFiltro === 'todos') {
      documentosRelevantes = [...data.documentos.mensuales, ...data.documentos.unicos];
      completados = [
        ...data.documentos.mensuales.filter(doc => estadoDocumentos[cliente]?.mensuales?.[doc]),
        ...data.documentos.unicos.filter(doc => estadoDocumentos[cliente]?.unicos?.[doc])
      ].length;
    } else if (tipoFiltro === 'mensuales') {
      documentosRelevantes = data.documentos.mensuales;
      completados = data.documentos.mensuales.filter(doc => estadoDocumentos[cliente]?.mensuales?.[doc]).length;
    } else if (tipoFiltro === 'unicos') {
      documentosRelevantes = data.documentos.unicos;
      completados = data.documentos.unicos.filter(doc => estadoDocumentos[cliente]?.unicos?.[doc]).length;
    }
    
    if (documentosRelevantes.length === 0) return 100;
    return Math.round((completados / documentosRelevantes.length) * 100);
  };

  // Obtener estadísticas
  const obtenerEstadisticas = () => {
    const clientesList = Object.keys(clientes).filter(cliente => {
      const data = clientes[cliente];
      if (cliente === 'INCOPORT') return false; // Excluir INCOPORT terminado
      return data.estado === 'Activo';
    });
    
    const total = clientesList.length;
    const criticos = clientesList.filter(cliente => calcularPorcentaje(cliente, filtroTipoDocumento) < 50).length;
    const proceso = clientesList.filter(cliente => {
      const p = calcularPorcentaje(cliente, filtroTipoDocumento);
      return p >= 50 && p < 90;
    }).length;
    const completos = clientesList.filter(cliente => calcularPorcentaje(cliente, filtroTipoDocumento) >= 90).length;
    const promedio = total > 0 ? Math.round(
      clientesList.reduce((sum, cliente) => sum + calcularPorcentaje(cliente, filtroTipoDocumento), 0) / total
    ) : 0;
    
    return { total, criticos, proceso, completos, promedio };
  };

  const estadisticas = obtenerEstadisticas();

  // Función para obtener color según porcentaje
  const getColorPorcentaje = (porcentaje) => {
    if (porcentaje >= 90) return 'text-green-700 bg-green-100 border-green-300';
    if (porcentaje >= 70) return 'text-blue-700 bg-blue-100 border-blue-300';
    if (porcentaje >= 50) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    return 'text-red-700 bg-red-100 border-red-300';
  };

  // Función para obtener ícono de modalidad
  const getIconoModalidad = (modalidad) => {
    if (modalidad.includes('Plataforma')) return <Globe size={16} className="text-blue-600" />;
    if (modalidad === 'Envío directo') return <Mail size={16} className="text-green-600" />;
    return <CheckCircle size={16} className="text-gray-600" />;
  };

  // Funciones para manejar estados
  const toggleDocumento = (cliente, documento, tipo) => {
    setEstadoDocumentos(prev => ({
      ...prev,
      [cliente]: {
        ...prev[cliente],
        [tipo]: {
          ...prev[cliente]?.[tipo],
          [documento]: !prev[cliente]?.[tipo]?.[documento]
        }
      }
    }));
  };

  const toggleCliente = (cliente) => {
    setClientesExpandidos(prev => ({
      ...prev,
      [cliente]: !prev[cliente]
    }));
  };

  const seleccionarTodoCliente = (cliente, tipo) => {
    const docs = clientes[cliente].documentos[tipo];
    const estadoActual = estadoDocumentos[cliente]?.[tipo] || {};
    const todosSeleccionados = docs.every(doc => estadoActual[doc]);
    
    setEstadoDocumentos(prev => ({
      ...prev,
      [cliente]: {
        ...prev[cliente],
        [tipo]: docs.reduce((acc, doc) => ({
          ...acc,
          [doc]: !todosSeleccionados
        }), {})
      }
    }));
  };

  // Filtrado de clientes
  const clientesFiltrados = Object.entries(clientes).filter(([nombre, data]) => {
    // Excluir INCOPORT que terminó en mayo 2025
    if (nombre === 'INCOPORT') return false;
    
    const cumpleBusqueda = !busqueda || 
      nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      data.categoria.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleFiltroCliente = !clienteFiltro || clienteFiltro === nombre;
    
    const porcentaje = calcularPorcentaje(nombre, filtroTipoDocumento);
    const cumpleFiltroEstado = filtroEstado === 'todos' ||
      (filtroEstado === 'criticos' && porcentaje < 50) ||
      (filtroEstado === 'proceso' && porcentaje >= 50 && porcentaje < 90) ||
      (filtroEstado === 'completos' && porcentaje >= 90);

    return cumpleBusqueda && cumpleFiltroCliente && cumpleFiltroEstado;
  });

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <FileCheck size={32} />
              <div>
                <h1 className="text-2xl font-bold">Dashboard de Cumplimiento de Contratos 2025</h1>
                <p className="text-blue-100">Control integral de documentación por cliente • Período: 2025 completo</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-200">
                    Activos: {Object.values(clientes).filter(c => c.estado === 'Activo').length} clientes • 
                    Terminados: 1 cliente (INCOPORT - Mayo 2025)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                className="relative px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
              >
                <Bell size={16} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
              </button>
              <button
                onClick={onCerrarSesion}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas generales */}
        <div className="p-6 border-b">
          {/* Banner de período actual */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar size={24} className="text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-900">
                    📅 Período Activo: {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta}
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Filtros por tipo de documento y seguimiento mensual. Los cambios se guardan automáticamente.
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
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building size={20} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Clientes</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{estadisticas.total}</p>
              <p className="text-xs text-blue-600">Activos en 2025</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-red-600" />
                <span className="text-sm font-medium text-red-900">Críticos</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{estadisticas.criticos}</p>
              <p className="text-xs text-red-600">&lt; 50% completado</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={20} className="text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">En Proceso</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{estadisticas.proceso}</p>
              <p className="text-xs text-yellow-600">50-89% completado</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-sm font-medium text-green-900">Completos</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{estadisticas.completos}</p>
              <p className="text-xs text-green-600">≥ 90% completado</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Promedio</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{estadisticas.promedio}%</p>
              <p className="text-xs text-purple-600">Cumplimiento general</p>
            </div>
          </div>
        </div>

        {/* Controles y filtros */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Filtro de período */}
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-gray-500" />
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {periodos.map(periodo => (
                    <option key={periodo.valor} value={periodo.valor}>
                      {periodo.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por tipo de documento */}
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-gray-500" />
                <select
                  value={filtroTipoDocumento}
                  onChange={(e) => setFiltroTipoDocumento(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="todos">📋 Todos los documentos</option>
                  <option value="mensuales">🗓️ Solo mensuales</option>
                  <option value="unicos">📄 Solo únicos</option>
                </select>
              </div>

              {/* Filtro de cliente específico */}
              <div className="flex items-center gap-2">
                <Building size={20} className="text-gray-500" />
                <select
                  value={clienteFiltro}
                  onChange={(e) => setClienteFiltro(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-48"
                >
                  <option value="">Seleccionar cliente</option>
                  <option value="todos">📋 Ver todos los clientes</option>
                  <option disabled>──────────────────</option>
                  {Object.entries(clientes)
                    .filter(([nombre]) => nombre !== 'INCOPORT')
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([nombre, data]) => (
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
              
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <Download size={16} />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla resumen de clientes críticos */}
        {mostrarTablaCriticos && estadisticas.criticos > 0 && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-100 px-4 py-3 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-600" size={20} />
                  <h3 className="font-bold text-red-900">
                    Clientes Críticos - {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta}
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
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Modalidad</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Object.entries(clientes)
                    .filter(([nombre]) => nombre !== 'INCOPORT' && calcularPorcentaje(nombre, filtroTipoDocumento) < 50)
                    .slice(0, 8)
                    .map(([nombre, data], index) => {
                      const porcentaje = calcularPorcentaje(nombre, filtroTipoDocumento);
                      const totalDocs = filtroTipoDocumento === 'mensuales' ? data.documentos.mensuales.length :
                                       filtroTipoDocumento === 'unicos' ? data.documentos.unicos.length :
                                       data.documentos.mensuales.length + data.documentos.unicos.length;
                      const docsCompletados = Math.round((porcentaje * totalDocs) / 100);
                      
                      return (
                        <tr key={nombre} className={index % 2 === 0 ? 'bg-white' : 'bg-red-25'}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{data.icono}</span>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{nombre}</div>
                                <div className="text-xs text-gray-500">{data.categoria}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm">
                              <span className="font-medium">{docsCompletados}/{totalDocs}</span>
                              <div className="text-xs text-gray-500">documentos</div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="h-1.5 rounded-full bg-red-600"
                                  style={{ width: `${porcentaje}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-medium text-red-700">{porcentaje}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {getIconoModalidad(data.modalidad)}
                              <span className="text-xs text-gray-600 truncate max-w-20">
                                {data.modalidad.split(' ')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded text-xs"
                                title="Ver detalles"
                                onClick={() => {
                                  setClienteFiltro(nombre);
                                  toggleCliente(nombre);
                                }}
                              >
                                <Eye size={12} />
                              </button>
                              <button 
                                className="p-1 text-green-600 hover:bg-green-100 rounded text-xs"
                                title="Contactar"
                              >
                                <Mail size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-red-50 px-4 py-2 border-t border-red-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700">
                  📋 {Object.entries(clientes).filter(([nombre]) => nombre !== 'INCOPORT' && calcularPorcentaje(nombre, filtroTipoDocumento) < 50).length > 8 ? 
                    `Mostrando 8 de ${Object.entries(clientes).filter(([nombre]) => nombre !== 'INCOPORT' && calcularPorcentaje(nombre, filtroTipoDocumento) < 50).length} críticos` :
                    `${estadisticas.criticos} clientes críticos`}
                </span>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors">
                    📤 Recordatorios
                  </button>
                  <button className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors">
                    📊 Exportar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cliente terminado - INCOPORT */}
        <div className="mx-6 mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive size={24} className="text-gray-500" />
              <div>
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  📋 INCOPORT <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">TERMINADO</span>
                </h3>
                <p className="text-gray-600 text-sm">
                  Cliente finalizado en Mayo 2025 • 4 años de servicio (2021-2025)
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium border">
                100% Final
              </div>
              <p className="text-xs text-gray-500 mt-1">Documentación completa</p>
            </div>
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="p-6">
          {/* Mensaje cuando no hay cliente seleccionado */}
          {!clienteFiltro && (
            <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200 mb-6">
              <Building size={48} className="mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-medium text-blue-900 mb-2">Seleccione un Cliente</h3>
              <p className="text-blue-700 text-sm mb-4">
                Utilice el filtro de cliente arriba para ver la información detallada de un cliente específico, 
                o seleccione "Ver todos los clientes" para mostrar la lista completa.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <Circle size={16} className="text-red-500" />
                  <div>
                    <div className="font-semibold text-red-700">{estadisticas.criticos}</div>
                    <div className="text-red-600">Críticos</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <Clock size={16} className="text-yellow-500" />
                  <div>
                    <div className="font-semibold text-yellow-700">{estadisticas.proceso}</div>
                    <div className="text-yellow-600">En proceso</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <CheckCircle size={16} className="text-green-500" />
                  <div>
                    <div className="font-semibold text-green-700">{estadisticas.completos}</div>
                    <div className="text-green-600">Completos</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <Award size={16} className="text-purple-500" />
                  <div>
                    <div className="font-semibold text-purple-700">{estadisticas.promedio}%</div>
                    <div className="text-purple-600">Promedio</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {clientesFiltrados.map(([nombre, data]) => {
              const porcentaje = calcularPorcentaje(nombre, filtroTipoDocumento);
              const expandido = clientesExpandidos[nombre];
              const totalMensuales = data.documentos.mensuales.length;
              const totalUnicos = data.documentos.unicos.length;
              const totalDocumentos = totalMensuales + totalUnicos;
              
              return (
                <div key={nombre} className={`border rounded-lg overflow-hidden transition-all ${
                  porcentaje < 50 ? 'border-red-300 bg-red-50' : 
                  porcentaje < 90 ? 'border-yellow-300 bg-yellow-50' : 
                  'border-green-300 bg-green-50'
                }`}>
                  {/* Header del cliente */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-white/50 transition-colors"
                    onClick={() => toggleCliente(nombre)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {expandido ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          <span className="text-2xl">{data.icono}</span>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {nombre}
                            {data.estado === 'Activo' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                ACTIVO
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              {getIconoModalidad(data.modalidad)}
                              {data.modalidad}
                            </span>
                            <span className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                              {data.categoria}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {data.frecuencia}
                            </span>
                            <span>{totalDocumentos} documentos ({totalMensuales}M + {totalUnicos}U)</span>
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
                              <strong>Contacto:</strong> 
                              <a href={`mailto:${data.contacto}`} className="text-blue-600 hover:underline ml-1">
                                {data.contacto}
                              </a>
                            </div>
                            {data.plataforma && (
                              <div>
                                <strong>Plataforma:</strong> 
                                <a href={data.plataforma} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                  Ver plataforma
                                </a>
                              </div>
                            )}
                            <div>
                              <strong>Cliente desde:</strong> {data.fechaInicio}
                            </div>
                          </div>
                          
                          {data.proximosCambios && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <h4 className="font-medium text-blue-900 mb-2">📅 Próximos cambios programados:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Mayo 2025:</strong> {data.proximosCambios.mayo2025.length} nuevos documentos
                                  <ul className="text-xs text-blue-700 mt-1 ml-4">
                                    {data.proximosCambios.mayo2025.slice(0, 2).map((doc, idx) => (
                                      <li key={idx}>• {doc}</li>
                                    ))}
                                    {data.proximosCambios.mayo2025.length > 2 && (
                                      <li>• ... y {data.proximosCambios.mayo2025.length - 2} más</li>
                                    )}
                                  </ul>
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
                      {totalDocumentos > 0 ? (
                        <div className="p-4">
                          {/* Documentos mensuales */}
                          {data.documentos.mensuales.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                  <Calendar size={16} className="text-blue-600" />
                                  Documentos Mensuales ({data.documentos.mensuales.length})
                                  <span className="text-sm text-gray-500">- Requeridos cada mes</span>
                                </h4>
                                <button
                                  onClick={() => seleccionarTodoCliente(nombre, 'mensuales')}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                  {data.documentos.mensuales.every(doc => estadoDocumentos[nombre]?.mensuales?.[doc]) ? (
                                    <>
                                      <Square size={14} />
                                      Deseleccionar
                                    </>
                                  ) : (
                                    <>
                                      <CheckSquare size={14} />
                                      Seleccionar Todo
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.documentos.mensuales.map((documento, index) => {
                                  const completado = estadoDocumentos[nombre]?.mensuales?.[documento];
                                  
                                  return (
                                    <div
                                      key={index}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm ${
                                        completado 
                                          ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                      }`}
                                      onClick={() => toggleDocumento(nombre, documento, 'mensuales')}
                                    >
                                      <div className="flex items-start gap-3">
                                        {completado ? (
                                          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                          <Circle size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                          <span className={`text-sm font-medium ${
                                            completado ? 'text-green-900' : 'text-gray-700'
                                          }`}>
                                            {documento}
                                          </span>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                              Mensual
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Documentos únicos */}
                          {data.documentos.unicos.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                  <FileText size={16} className="text-purple-600" />
                                  Documentos Únicos ({data.documentos.unicos.length})
                                  <span className="text-sm text-gray-500">- Una sola vez o según necesidad</span>
                                </h4>
                                <button
                                  onClick={() => seleccionarTodoCliente(nombre, 'unicos')}
                                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors flex items-center gap-1"
                                >
                                  {data.documentos.unicos.every(doc => estadoDocumentos[nombre]?.unicos?.[doc]) ? (
                                    <>
                                      <Square size={14} />
                                      Deseleccionar
                                    </>
                                  ) : (
                                    <>
                                      <CheckSquare size={14} />
                                      Seleccionar Todo
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.documentos.unicos.map((documento, index) => {
                                  const completado = estadoDocumentos[nombre]?.unicos?.[documento];
                                  
                                  return (
                                    <div
                                      key={index}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm ${
                                        completado 
                                          ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                      }`}
                                      onClick={() => toggleDocumento(nombre, documento, 'unicos')}
                                    >
                                      <div className="flex items-start gap-3">
                                        {completado ? (
                                          <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                          <Circle size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                          <span className={`text-sm font-medium ${
                                            completado ? 'text-green-900' : 'text-gray-700'
                                          }`}>
                                            {documento}
                                          </span>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                              Único
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Botón especial para Walmart */}
                          {nombre === 'WALMART' && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-blue-900">Matriz de Documentos Detallada</h4>
                                  <p className="text-blue-700 text-sm">Ver criterios específicos de validación por documento</p>
                                </div>
                                <button
                                  onClick={() => setMostrarMatrizWalmart(true)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <FileText size={16} />
                                  Ver Matriz Completa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <CheckCircle size={24} className="mx-auto mb-2 text-green-600" />
                          <p>Cliente sin requerimientos documentales específicos</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mensajes cuando no hay resultados */}
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
              <h3 className="text-lg font-medium mb-2">No se encontraron resultados</h3>
              <p>Intenta ajustar la búsqueda o selecciona un cliente específico</p>
            </div>
          )}
        </div>

        {/* Footer con información adicional */}
        <div className="border-t bg-gray-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📊 Distribución por Modalidad</h4>
              <ul className="space-y-1">
                <li>• Envío directo: {Object.values(clientes).filter(c => c.modalidad === 'Envío directo' && c.estado === 'Activo').length} clientes</li>
                <li>• Plataformas digitales: {Object.values(clientes).filter(c => c.modalidad.includes('Plataforma') && c.estado === 'Activo').length} clientes</li>
                <li>• Sin requerimientos: {Object.values(clientes).filter(c => c.modalidad === 'Sin requerimientos' && c.estado === 'Activo').length} clientes</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🏢 Distribución por Categorías</h4>
              <ul className="space-y-1">
                {[...new Set(Object.values(clientes).filter(c => c.estado === 'Activo').map(c => c.categoria))].map(categoria => (
                  <li key={categoria}>
                    • {categoria}: {Object.values(clientes).filter(c => c.categoria === categoria && c.estado === 'Activo').length} clientes
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
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">PERÍODO ACTIVO: {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span>Dashboard PGR Seguridad 2025</span>
              <span>•</span>
              <span>Auto-guardado: {ultimoGuardado ? 'Activo' : 'Inicializando'}</span>
              <span>•</span>
              <span>Última sincronización: {new Date().toLocaleString('es-CL')}</span>
            </div>
          </div>
        </div>

        {/* Modal de Matriz de Documentos de Walmart */}
        {mostrarMatrizWalmart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={32} />
                    <div>
                      <h2 className="text-2xl font-bold">Matriz de Documentos - WALMART</h2>
                      <p className="text-blue-100">Criterios de revisión detallados por documento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMostrarMatrizWalmart(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink size={20} className="text-blue-600" />
                    <span className="font-semibold text-blue-900">Plataforma: SubcontrataLey</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Todos los documentos deben subirse a través de la plataforma oficial de Walmart Chile.
                    <br />URL: <span className="font-mono bg-blue-100 px-1 rounded">https://subcontrataley.cl</span>
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Comité Paritario */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Building size={20} className="text-gray-600" />
                        Comité Paritario
                      </h3>
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FileText size={18} className="text-blue-600" />
                        Acta Constitución Comité Paritario
                      </h4>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Criterios de Validación:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[
                            'Legible',
                            'Existe presencia tanto femenina como masculina entre los miembros del comité (equidad de género)',
                            'Timbrada por la DT',
                            'Documento completo',
                            'Documento debe corresponder al solicitado',
                            'Vigencia del comité al periodo de revisión (vigencia de 2 años)',
                            'Identificación de los representantes que conforman el CPHYS',
                            'Nombre de la empresa'
                          ].map((criterio, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{criterio}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contratos y Anexos */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText size={20} className="text-gray-600" />
                        Contratos y Anexos
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {/* Anexos de Contrato */}
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Anexos de Contrato</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                              'Nombre y Rut de la empresa',
                              'Legible',
                              'Aparece firma de ambas partes',
                              'Documento completo',
                              'Vigente',
                              'Corresponde al trabajador solicitado'
                            ].map((criterio, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{criterio}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Contrato de Trabajo */}
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Contrato de Trabajo</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                              'Legible',
                              'Documento completo',
                              'Aparece firma de ambas partes',
                              'Vigente',
                              'Corresponde al trabajador solicitado',
                              'Nombre y Rut de la empresa'
                            ].map((criterio, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{criterio}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documentos Previsionales */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <CalendarClock size={20} className="text-gray-600" />
                        Documentos Previsionales
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {/* Certificado F30 */}
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Certificado F30</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                              'Vigente (no mayor a 60 días)',
                              'Legible',
                              'Documento completo',
                              'Timbrado por la DT',
                              'Nombre y Rut de la empresa',
                              'Sin multas pendientes'
                            ].map((criterio, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{criterio}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Certificado F30-1 */}
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Certificado F30-1</h4>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                              'Vigente (no mayor a 60 días)',
                              'Legible',
                              'Documento completo',
                              'Timbrado por la DT',
                              'Nombre y Rut de la empresa'
                            ].map((criterio, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">{criterio}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seguros y Mutualidades */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Bookmark size={20} className="text-gray-600" />
                        Seguros y Mutualidades
                      </h3>
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Certificado de Afiliación Mutualidad</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[
                            'Vigente',
                            'Legible',
                            'Documento completo',
                            'Nombre y Rut de la empresa',
                            'Corresponde al organismo administrador'
                          ].map((criterio, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">{criterio}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-900 mb-2">📋 Información Importante</h3>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• Todos los documentos deben estar vigentes y legibles</li>
                    <li>• Los certificados F30 y F30-1 no deben tener más de 60 días de antigüedad</li>
                    <li>• Verificar que el nombre y RUT de la empresa aparezcan correctamente</li>
                    <li>• Los documentos deben estar completos y sin páginas faltantes</li>
                    <li>• Las firmas de ambas partes son obligatorias en contratos y anexos</li>
                  </ul>
                </div>

                {/* Próximos cambios */}
                <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-bold text-orange-900 mb-2">🔄 Próximos Cambios Programados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-1">Mayo 2025:</h4>
                      <ul className="text-orange-700 space-y-1 text-xs">
                        <li>• Programa de Trabajo Preventivo (SGSST)</li>
                        <li>• Registro Difusión Trabajador Reglamento Interno</li>
                        <li>• Capacitación Uso y Mantención de EPP</li>
                        <li>• Información de riesgos laborales</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-1">Diciembre 2025:</h4>
                      <ul className="text-orange-700 space-y-1 text-xs">
                        <li>• Evaluación de Desempeño del Programa (SGSST)</li>
                        <li>• Mejora Continua (SGSST)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer del Modal */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Matriz basada en criterios oficiales de Walmart Chile S.A.
                </span>
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
          </div>
        )}

        {/* Panel de notificaciones */}
        {mostrarNotificaciones && (
          <div className="fixed top-20 right-6 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-40">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Bell size={20} className="text-blue-600" />
                  Notificaciones
                </h3>
                <button
                  onClick={() => setMostrarNotificaciones(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      {estadisticas.criticos} clientes críticos
                    </p>
                    <p className="text-xs text-red-700">
                      Requieren atención inmediata
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Próximos vencimientos
                    </p>
                    <p className="text-xs text-yellow-700">
                      8-15 documentos por vencer este mes
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CalendarClock size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Cambios programados
                    </p>
                    <p className="text-xs text-blue-700">
                      Walmart: nuevos requerimientos en mayo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCumplimiento;
