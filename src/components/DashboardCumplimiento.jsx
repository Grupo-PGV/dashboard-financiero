// src/components/DashboardCumplimiento.jsx - CÓDIGO COMPLETO FINAL
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
  Archive,
  Award,
  Bookmark,
  Trash2,
  Edit3,
  Save,
  XCircle,
  AlertCircle,
  Hourglass,
  UserCheck,
  FileSpreadsheet,
  PersonStanding,
  Shield
} from 'lucide-react';

const DashboardCumplimiento = ({ onCerrarSesion }) => {
  // Estados principales
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroTipoDocumento, setFiltroTipoDocumento] = useState('todos');
  const [mesSeleccionado, setMesSeleccionado] = useState('2025-07');
  const [busqueda, setBusqueda] = useState('');
  const [clientesExpandidos, setClientesExpandidos] = useState({});
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [mostrarTablaCriticos, setMostrarTablaCriticos] = useState(true);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [mostrarMatrizWalmart, setMostrarMatrizWalmart] = useState(false);
  const [estadoDocumentosPorMes, setEstadoDocumentosPorMes] = useState({});
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [guardandoAutomatico, setGuardandoAutomatico] = useState(false);
  
  // Estados para gestión de trabajadores y nóminas
  const [trabajadoresPorCliente, setTrabajadoresPorCliente] = useState({});
  const [mostrarGestionTrabajadores, setMostrarGestionTrabajadores] = useState({});
  const [subiendoNomina, setSubiendoNomina] = useState({});
  const [submenuActivo, setSubmenuActivo] = useState({});

  // Documentos que se gestionan por trabajador individual
  const documentosPorTrabajador = [
    'Liquidaciones de Sueldo',
    'Nómina de Personal', 
    'Planilla Cotizaciones Previsionales',
    'Finiquitos',
    'Cédula de Identidad',
    'Contrato y Anexos de Trabajo empleado',
    'Contrato de Trabajo vigente y anexos',
    'Fotocopia de cédula de Identidad vigente',
    'Contrato de trabajo',
    'Anexos',
    'Liquidaciones',
    'Liquidaciones de Sueldo mensual',
    'Listado de trabajadores periodo mensual',
    'Certificado Antecedentes laborales',
    'Finiquito mensual',
    'Finiquito',
    'Libro de Remuneraciones'
  ];

  // Estados de documentos
  const ESTADOS_DOCUMENTO = {
    PENDIENTE: 'pendiente',
    CARGADO: 'cargado',
    EN_REVISION: 'en_revision',
    ACEPTADO: 'aceptado',
    RECHAZADO: 'rechazado'
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

  // ============================================================
  // 🔧 BASE DE DATOS OFICIAL CORREGIDA - SEGÚN MANUAL PGR
  // ============================================================
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
      fechaInicio: '2022-01',
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
      contacto: 'documentos@fulllogistic.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2020-04',
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
      categoria: 'Personal',
      contacto: 'jmoreno@contractor.cl',
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
      categoria: 'Alimentario',
      contacto: 'contratistas@carozzi.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-11',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado de Adhesión a Seguro de Accidentes',
          'Detalle de Pago de Cotizaciones Previsionales PreviRed'
        ],
        unicos: [
          'Certificado Inspección del Trabajo F30 y F30-1',
          'Reglamento interno de la empresa',
          'Escritura de la empresa y modificaciones',
          'Pago del IVA',
          'Balance',
          'Estado de resultado',
          'Contrato de Trabajo vigente y anexos',
          'Nómina de trabajadores para validar',
          'Fotocopia cédula de Identidad vigente',
          'Certificado de antecedentes',
          'Certificado curso OS10',
          'Documentación preventiva EPP',
          'Inducción contratistas online'
        ]
      }
    },

    'CIMOLAI': {
      modalidad: 'Envío directo',
      icono: '🏗️',
      categoria: 'Construcción',
      contacto: 'documentos@cimolai.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2025-04',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Listado de trabajadores periodo mensual',
          'Liquidaciones de Sueldo mensual',
          'Certificado Cumplimientos Laborales F30-1',
          'Planilla Cotizaciones Previsionales mensual',
          'Certificado Antecedentes laborales mensual',
          'Finiquito mensual',
          'Certificado Siniestralidad mensual 2025',
          'Planilla Cotizaciones Mutualidad mensual 2025',
          'Certificado aclaración no aplica comité paritario mensual'
        ],
        unicos: [
          'Certificado Afiliación Mutualidad'
        ]
      }
    },

    'CBB - INACAL': {
      modalidad: 'Plataforma Prevsis',
      icono: '🏗️',
      categoria: 'Construcción',
      contacto: 'prevsis.cbb.com',
      frecuencia: 'Mensual',
      fechaInicio: '2023-04',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1',
          'Nómina de personal',
          'Liquidaciones de Sueldo firmadas'
        ],
        unicos: [
          'Cédula de Identidad',
          'Contrato de Trabajo',
          'Examen Ocupacional Ruido',
          'Examen Ocupacional Sílice',
          'Examen Alcohol y drogas',
          'Obligación de Informar Riesgos ODI',
          'Curso de Herramientas SSO',
          'Curso Alcohol y Drogas',
          'Inducción Planta',
          'Anexo de vinculación obra-faena',
          'Registro Entrega EPP',
          'Recepción Reglamento Interno RIOHS',
          'Difusión procedimiento trabajo seguro',
          'Anexo de traslado mandante',
          'Calendario Negociaciones Colectivas',
          'Certificado de tasas siniestralidad',
          'Plan de Seguridad y Salud Ocupacional'
        ]
      }
    },

    'CBB - READY MIX PARGUA': {
      modalidad: 'Plataforma Prevsis',
      icono: '🏗️',
      categoria: 'Construcción',
      contacto: 'prevsis.cbb.com',
      frecuencia: 'Mensual',
      fechaInicio: '2022-01',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1',
          'Nómina de personal',
          'Liquidaciones de Sueldo firmadas'
        ],
        unicos: [
          'Cédula de Identidad',
          'Contrato de Trabajo',
          'Examen Ocupacional Ruido',
          'Examen Ocupacional Sílice',
          'Examen Alcohol y drogas',
          'Obligación de Informar Riesgos ODI',
          'Curso de Herramientas SSO',
          'Curso Alcohol y Drogas',
          'Inducción Planta',
          'Anexo de vinculación obra-faena',
          'Registro Entrega EPP',
          'Recepción Reglamento Interno RIOHS',
          'Difusión procedimiento trabajo seguro',
          'Anexo de traslado mandante',
          'Calendario Negociaciones Colectivas',
          'Certificado de tasas siniestralidad',
          'Plan de Seguridad y Salud Ocupacional'
        ]
      }
    },

    'TODO MELON + INM SAN PATRICIO': {
      modalidad: 'Plataforma Prevsis + InfoControl',
      icono: '🍈',
      categoria: 'Agrícola',
      contacto: 'prevsis.com + infocontrol.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2018-03',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Recibo de sueldo o transferencia'
        ],
        unicos: [
          'Cédula de Identidad',
          'Certificado Cotizaciones Previsionales',
          'Contrato y Anexos de Trabajo empleado'
        ]
      }
    },

    'NOVASOURCE': {
      modalidad: 'Plataforma Seyse',
      icono: '🔧',
      categoria: 'Servicios',
      contacto: 'seyse.novasource.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-10',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado de Antecedentes Laborales (F-30)',
          'Certificado Cumplimiento Obligaciones Laborales (F30-1)',
          'Certificado Pago Cotizaciones Previsionales PREVIRED',
          'Certificado Siniestralidad y Listado Accidentados',
          'Comprobante de Pago de Remuneraciones',
          'Nómina de Reporte Mensual de la Empresa'
        ],
        unicos: []
      }
    },

    'WALMART': {
      modalidad: 'Plataforma SubcontrataLey',
      icono: '🛒',
      categoria: 'Retail',
      contacto: 'subcontrata.walmart.com',
      frecuencia: 'Mensual',
      fechaInicio: '2024-12',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Criterios de revisión matriz documental CSV'
        ],
        unicos: [
          'Programa de Trabajo Preventivo SGSST',
          'Registro Difusión Trabajador Reglamento Interno',
          'Toma Conocimiento Información Riesgos Laborales',
          'Toma Conocimiento Matriz IPER del Contratista',
          'Toma Conocimiento Programa Trabajo Preventivo',
          'Capacitación Uso y Mantención de EPP',
          'Capacitación de Prevención de Riesgos',
          'Información de riesgos laborales',
          'Evaluación de Desempeño del Programa SGSST',
          'Mejora Continua SGSST'
        ]
      }
    },

    'AGROSUPER': {
      modalidad: 'Plataforma KSEC',
      icono: '🐷',
      categoria: 'Agroindustrial',
      contacto: 'ksec.agrosuper.com',
      frecuencia: 'Mensual',
      fechaInicio: '2017-05',
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
      contacto: 'ebcoconecta.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-01',
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
          'Certificados de la ACHS',
          'Finiquitos'
        ],
        unicos: [
          'Contrato de trabajo',
          'Anexos'
        ]
      }
    },

    'DESARROLLO PAÍS': {
      modalidad: 'Envío directo',
      icono: '🏛️',
      categoria: 'Gobierno',
      contacto: 'documentos@desarrollopais.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2025-06',
      estado: 'Activo',
      observaciones: 'Nueva instalación - Requerimientos mínimos',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1'
        ],
        unicos: []
      }
    },

    // CLIENTES SIN REQUERIMIENTOS
    'SEMPER': {
      modalidad: 'Sin requerimientos',
      icono: '✅',
      categoria: 'Servicios',
      contacto: 'N/A',
      frecuencia: 'N/A',
      fechaInicio: '2022-07',
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
      contacto: 'N/A',
      frecuencia: 'N/A',
      fechaInicio: '2020-03',
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
      contacto: 'N/A',
      frecuencia: 'N/A',
      fechaInicio: '2024-03',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    },

    'ARSA GROUP': {
      modalidad: 'Sin requerimientos',
      icono: '🏗️',
      categoria: 'Construcción',
      contacto: 'N/A',
      frecuencia: 'N/A',
      fechaInicio: '2024-02',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    }
  };
  // ============================================================
  // FIN BASE DE DATOS CORREGIDA
  // ============================================================

  // Función para obtener display de estado
  const getEstadoDisplay = (estado) => {
    switch (estado) {
      case ESTADOS_DOCUMENTO.CARGADO:
        return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'Cargado' };
      case ESTADOS_DOCUMENTO.EN_REVISION:
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', text: 'En Revisión' };
      case ESTADOS_DOCUMENTO.ACEPTADO:
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 border-green-200', text: 'Aceptado' };
      case ESTADOS_DOCUMENTO.RECHAZADO:
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', text: 'Rechazado' };
      default:
        return { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', text: 'Pendiente' };
    }
  };

  // Función para obtener información de documento
  const obtenerInfoDocumento = (cliente, documento, tipo) => {
    const mesData = estadoDocumentosPorMes[mesSeleccionado];
    if (!mesData || !mesData[cliente] || !mesData[cliente][tipo]) {
      return {
        estado: ESTADOS_DOCUMENTO.PENDIENTE,
        fechaActualizacion: null,
        observaciones: ''
      };
    }
    return mesData[cliente][tipo][documento] || {
      estado: ESTADOS_DOCUMENTO.PENDIENTE,
      fechaActualizacion: null,
      observaciones: ''
    };
  };

  // Función para calcular estadísticas
  const calcularEstadisticas = () => {
    const clientesActivos = Object.keys(clientes).filter(cliente => clientes[cliente].estado === 'Activo');
    let criticos = 0;
    let proceso = 0;
    let completos = 0;
    let rechazados = 0;
    let enRevision = 0;
    let totalPorcentajes = 0;

    clientesActivos.forEach(cliente => {
      const porcentaje = calcularPorcentaje(cliente);
      totalPorcentajes += porcentaje;

      if (porcentaje < 50) criticos++;
      else if (porcentaje < 90) proceso++;
      else completos++;

      // Contar documentos rechazados y en revisión
      const data = clientes[cliente];
      [...data.documentos.mensuales, ...data.documentos.unicos].forEach(doc => {
        const tipo = data.documentos.mensuales.includes(doc) ? 'mensuales' : 'unicos';
        const info = obtenerInfoDocumento(cliente, doc, tipo);
        if (info.estado === ESTADOS_DOCUMENTO.RECHAZADO) rechazados++;
        if (info.estado === ESTADOS_DOCUMENTO.EN_REVISION) enRevision++;
      });
    });

    return {
      total: clientesActivos.length,
      criticos,
      proceso,
      completos,
      rechazados,
      enRevision,
      promedio: clientesActivos.length > 0 ? Math.round(totalPorcentajes / clientesActivos.length) : 0
    };
  };

  // Función para calcular porcentaje de cumplimiento
  const calcularPorcentaje = (cliente) => {
    const data = clientes[cliente];
    if (!data) return 0;

    const todosDocumentos = [...data.documentos.mensuales, ...data.documentos.unicos];
    if (todosDocumentos.length === 0) return 100;

    let aceptados = 0;
    todosDocumentos.forEach(doc => {
      const tipo = data.documentos.mensuales.includes(doc) ? 'mensuales' : 'unicos';
      const info = obtenerInfoDocumento(cliente, doc, tipo);
      if (info.estado === ESTADOS_DOCUMENTO.ACEPTADO) aceptados++;
    });

    return Math.round((aceptados / todosDocumentos.length) * 100);
  };

  // Función para cambiar estado de documento
  const cambiarEstado = (cliente, documento, tipo, nuevoEstado) => {
    setEstadoDocumentosPorMes(prev => ({
      ...prev,
      [mesSeleccionado]: {
        ...prev[mesSeleccionado],
        [cliente]: {
          ...prev[mesSeleccionado]?.[cliente],
          [tipo]: {
            ...prev[mesSeleccionado]?.[cliente]?.[tipo],
            [documento]: {
              estado: nuevoEstado,
              fechaActualizacion: new Date().toISOString(),
              observaciones: ''
            }
          }
        }
      }
    }));
  };

  // Función para cambiar estado masivo
  const cambiarEstadoMasivo = (cliente, tipo, nuevoEstado) => {
    const data = clientes[cliente];
    if (!data) return;

    const documentos = tipo === 'mensuales' ? data.documentos.mensuales : data.documentos.unicos;
    
    setEstadoDocumentosPorMes(prev => {
      const nuevoEstadoMes = { ...prev };
      
      documentos.forEach(documento => {
        if (!nuevoEstadoMes[mesSeleccionado]) nuevoEstadoMes[mesSeleccionado] = {};
        if (!nuevoEstadoMes[mesSeleccionado][cliente]) nuevoEstadoMes[mesSeleccionado][cliente] = {};
        if (!nuevoEstadoMes[mesSeleccionado][cliente][tipo]) nuevoEstadoMes[mesSeleccionado][cliente][tipo] = {};
        
        nuevoEstadoMes[mesSeleccionado][cliente][tipo][documento] = {
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString(),
          observaciones: ''
        };
      });
      
      return nuevoEstadoMes;
    });
  };

  // Función para toggle de documentos
  const toggleDocumento = (cliente, documento, tipo) => {
    const infoActual = obtenerInfoDocumento(cliente, documento, tipo);
    const nuevosEstados = [
      ESTADOS_DOCUMENTO.PENDIENTE,
      ESTADOS_DOCUMENTO.CARGADO,
      ESTADOS_DOCUMENTO.EN_REVISION,
      ESTADOS_DOCUMENTO.ACEPTADO,
      ESTADOS_DOCUMENTO.RECHAZADO
    ];
    
    const indiceActual = nuevosEstados.indexOf(infoActual.estado);
    const siguienteIndice = (indiceActual + 1) % nuevosEstados.length;
    
    cambiarEstado(cliente, documento, tipo, nuevosEstados[siguienteIndice]);
  };

  // Función para cambiar estado de documento por trabajador
  const cambiarEstadoDocumentoTrabajador = (cliente, rutTrabajador, documento, nuevoEstado) => {
    setTrabajadoresPorCliente(prev => ({
      ...prev,
      [cliente]: prev[cliente]?.map(trabajador => 
        trabajador.rut === rutTrabajador 
          ? {
              ...trabajador,
              documentos: {
                ...trabajador.documentos,
                [documento]: {
                  ...trabajador.documentos[documento],
                  estado: nuevoEstado,
                  fechaActualizacion: new Date().toISOString()
                }
              }
            }
          : trabajador
      ) || []
    }));
  };

  // Función para obtener clientes activos en un mes específico
  const obtenerClientesActivosEnMes = (mes) => {
    const fechaSeleccionada = new Date(mes + '-15'); // Día 15 del mes seleccionado
    
    return Object.entries(clientes).filter(([nombre, data]) => {
      const fechaInicio = new Date(data.fechaInicio + '-01');
      
      let fechaTermino = null;
      if (data.fechaTermino) {
        const [año, mesTermino] = data.fechaTermino.split('-');
        const ultimoDiaDelMes = new Date(año, mesTermino, 0).getDate();
        fechaTermino = new Date(data.fechaTermino + '-' + ultimoDiaDelMes);
      }
      
      // Verificar si el cliente estaba activo en la fecha seleccionada
      const estabaActivo = fechaSeleccionada >= fechaInicio && 
                  (!fechaTermino || fechaSeleccionada <= fechaTermino);
      
      return estabaActivo;
    });
  };

  // Función para inicializar estado de documentos por mes
  const inicializarEstadoDocumentos = () => {
    const estadoInicial = {};
    
    periodos.forEach(periodo => {
      estadoInicial[periodo.valor] = {};
      
      Object.entries(clientes).forEach(([cliente, data]) => {
        estadoInicial[periodo.valor][cliente] = {
          mensuales: {},
          unicos: {}
        };
        
        // Inicializar documentos mensuales
        data.documentos.mensuales.forEach(doc => {
          estadoInicial[periodo.valor][cliente].mensuales[doc] = {
            estado: ESTADOS_DOCUMENTO.PENDIENTE,
            fechaActualizacion: null,
            observaciones: ''
          };
        });
        
        // Inicializar documentos únicos
        data.documentos.unicos.forEach(doc => {
          estadoInicial[periodo.valor][cliente].unicos[doc] = {
            estado: ESTADOS_DOCUMENTO.PENDIENTE,
            fechaActualizacion: null,
            observaciones: ''
          };
        });
      });
    });
    
    return estadoInicial;
  };

  // 🔧 FUNCIÓN CORREGIDA PARA SUBIR NÓMINA EN EXCEL
  const subirNominaExcel = async (cliente, file) => {
    console.log(`📋 Iniciando procesamiento de Excel para cliente: ${cliente}`);
    setSubiendoNomina(prev => ({ ...prev, [cliente]: true }));
    
    try {
      // Validar archivo
      if (!file) {
        throw new Error('No se ha seleccionado ningún archivo');
      }

      // Validar tipo de archivo
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/excel',
        'application/x-excel',
        'application/x-msexcel'
      ];

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('Formato de archivo no válido. Solo se admiten archivos Excel (.xlsx, .xls)');
      }

      console.log(`📄 Archivo válido: ${file.name} (${file.type})`);

      // Cargar biblioteca XLSX dinámicamente
      let XLSX;
      try {
        console.log('📚 Cargando biblioteca XLSX...');
        XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        console.log('✅ XLSX cargado exitosamente');
      } catch (error) {
        console.error('❌ Error cargando XLSX:', error);
        throw new Error('Error cargando el procesador de Excel. Verifica tu conexión a internet.');
      }

      // Leer archivo
      const data = await file.arrayBuffer();
      
      if (!data || data.byteLength === 0) {
        throw new Error('El archivo está vacío o no se pudo leer correctamente. Verifica tu conexión a internet.');
      }
      
      // Leer el archivo Excel con opciones mejoradas
      console.log('📖 Leyendo archivo Excel...');
      const workbook = XLSX.read(data, { 
        type: 'array',
        cellText: false,
        cellDates: true,
        cellNF: false,
        cellStyles: false,
        sheetStubs: true,
        defval: ''
      });

      console.log(`📋 Hojas encontradas: ${workbook.SheetNames.join(', ')}`);
      
      // Usar la primera hoja
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      console.log(`📄 Procesando hoja: ${sheetName}`);

      // Convertir a JSON con manejo mejorado
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false,
        raw: false
      });
      
      console.log(`📊 Datos extraídos: ${jsonData.length} filas`);

      // Validar estructura mínima
      if (jsonData.length < 2) {
        throw new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos');
      }

      // IDENTIFICACIÓN MEJORADA DE COLUMNAS
      const headers = jsonData[0].map(h => {
        if (h === null || h === undefined) return '';
        return h.toString().toLowerCase().trim();
      });
      
      console.log('📋 Headers detectados:', headers);

      // Buscar columnas con múltiples variaciones
      const nombreCol = headers.findIndex(h => 
        h.includes('nombre') || 
        h.includes('name') || 
        h.includes('trabajador') ||
        h.includes('empleado') ||
        h.includes('persona') ||
        h === 'nombres' ||
        h === 'apellidos' ||
        h.includes('completo')
      );

      const rutCol = headers.findIndex(h => 
        h.includes('rut') || 
        h.includes('id') || 
        h.includes('identificacion') ||
        h.includes('cedula') ||
        h.includes('cédula') ||
        h.includes('dni') ||
        h.includes('documento') ||
        h === 'ci'
      );

      const cargoCol = headers.findIndex(h => 
        h.includes('cargo') || 
        h.includes('puesto') || 
        h.includes('position') || 
        h.includes('función') ||
        h.includes('funcion') ||
        h.includes('trabajo') ||
        h.includes('empleo') ||
        h.includes('rol') ||
        h.includes('area') ||
        h.includes('área')
      );

      console.log(`🔍 Índices encontrados - Nombre: ${nombreCol}, RUT: ${rutCol}, Cargo: ${cargoCol}`);

      // Validar columnas requeridas
      if (nombreCol === -1 || rutCol === -1) {
        const headersDisplay = headers.map((h, i) => `${i}: "${h}"`).join(', ');
        throw new Error(
          `El archivo debe contener columnas "Nombre" y "RUT".\n\n` +
          `Columnas encontradas: ${headersDisplay}\n\n` +
          `Nombres aceptados:\n` +
          `• Para NOMBRE: nombre, name, trabajador, empleado, persona, nombres\n` +
          `• Para RUT: rut, id, identificacion, cedula, dni, documento, ci`
        );
      }

      // PROCESAMIENTO MEJORADO DE TRABAJADORES
      const trabajadoresProcesados = [];
      const erroresProcesamiento = [];
      
      console.log('👥 Procesando trabajadores...');

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Saltar filas vacías
        if (!row || row.length === 0 || row.every(cell => !cell || cell.toString().trim() === '')) {
          console.log(`⏭️ Saltando fila vacía ${i}`);
          continue;
        }

        try {
          // Extraer datos con validación
          const nombreRaw = row[nombreCol];
          const rutRaw = row[rutCol];
          const cargoRaw = cargoCol !== -1 ? row[cargoCol] : null;

          // Validar y limpiar nombre
          const nombre = nombreRaw ? nombreRaw.toString().trim() : '';
          if (!nombre) {
            erroresProcesamiento.push(`Fila ${i + 1}: Nombre vacío`);
            continue;
          }

          // Validar y limpiar RUT
          const rut = rutRaw ? rutRaw.toString().trim() : '';
          if (!rut) {
            erroresProcesamiento.push(`Fila ${i + 1}: RUT vacío para ${nombre}`);
            continue;
          }

          // Limpiar RUT (eliminar caracteres no válidos excepto dígitos, K y guión)
          const rutLimpio = rut.replace(/[^\dkK\-\.]/gi, '').toUpperCase();
          
          // Validar formato básico de RUT
          if (!rutLimpio.match(/^\d{1,8}[\-\.]?[\dkK]$/i)) {
            erroresProcesamiento.push(`Fila ${i + 1}: RUT inválido "${rut}" para ${nombre}`);
            continue;
          }

          // Procesar cargo
          const cargo = cargoRaw ? cargoRaw.toString().trim() : 'No especificado';

          // Crear objeto trabajador
          const trabajador = {
            nombre,
            rut: rutLimpio,
            cargo,
            documentos: {},
            filaOriginal: i + 1
          };

          // Inicializar estados para documentos por trabajador
          const data = clientes[cliente];
          if (data) {
            const docsDelCliente = [...data.documentos.mensuales, ...data.documentos.unicos];
            const docsPorTrabajador = docsDelCliente.filter(doc => 
              documentosPorTrabajador.includes(doc)
            );
            
            docsPorTrabajador.forEach(doc => {
              trabajador.documentos[doc] = {
                estado: ESTADOS_DOCUMENTO.PENDIENTE,
                fechaActualizacion: null,
                observaciones: ''
              };
            });
          }

          trabajadoresProcesados.push(trabajador);
          console.log(`✅ Trabajador procesado: ${nombre} (${rutLimpio}) - ${cargo}`);

        } catch (error) {
          erroresProcesamiento.push(`Fila ${i + 1}: Error procesando - ${error.message}`);
          console.error(`❌ Error en fila ${i + 1}:`, error);
        }
      }

      console.log(`📊 Resumen procesamiento:`);
      console.log(`  - Trabajadores válidos: ${trabajadoresProcesados.length}`);
      console.log(`  - Errores encontrados: ${erroresProcesamiento.length}`);

      // Validar que se procesaron trabajadores
      if (trabajadoresProcesados.length === 0) {
        let mensajeError = 'No se encontraron trabajadores válidos en el archivo.\n\n';
        
        if (erroresProcesamiento.length > 0) {
          mensajeError += 'Errores encontrados:\n' + erroresProcesamiento.join('\n');
        }
        
        mensajeError += '\n\nVerifica que:\n';
        mensajeError += '• Las columnas tengan los nombres correctos\n';
        mensajeError += '• Los campos Nombre y RUT no estén vacíos\n';
        mensajeError += '• El formato del RUT sea válido (ej: 12345678-9)';
        
        throw new Error(mensajeError);
      }

      // Guardar trabajadores procesados
      setTrabajadoresPorCliente(prev => ({
        ...prev,
        [cliente]: trabajadoresProcesados
      }));

      // Mensaje de éxito mejorado
      let mensajeExito = `✅ ¡Nómina procesada exitosamente!\n\n`;
      mensajeExito += `📊 Resumen:\n`;
      mensajeExito += `• Trabajadores cargados: ${trabajadoresProcesados.length}\n`;
      mensajeExito += `• Cliente: ${cliente}\n`;
      
      if (erroresProcesamiento.length > 0) {
        mensajeExito += `• Filas con errores: ${erroresProcesamiento.length}\n`;
      }

      mensajeExito += `\n👥 Primeros trabajadores cargados:\n`;
      mensajeExito += trabajadoresProcesados.slice(0, 5).map(t => 
        `• ${t.nombre} (${t.rut}) - ${t.cargo}`
      ).join('\n');

      if (trabajadoresProcesados.length > 5) {
        mensajeExito += `\n... y ${trabajadoresProcesados.length - 5} más`;
      }

      if (erroresProcesamiento.length > 0 && erroresProcesamiento.length <= 10) {
        mensajeExito += `\n\n⚠️ Errores menores encontrados:\n`;
        mensajeExito += erroresProcesamiento.slice(0, 5).join('\n');
        if (erroresProcesamiento.length > 5) {
          mensajeExito += `\n... y ${erroresProcesamiento.length - 5} errores más`;
        }
      }

      alert(mensajeExito);
      console.log('🎉 Procesamiento completado exitosamente');

    } catch (error) {
      console.error('❌ Error procesando Excel:', error);
      
      let mensajeError = `❌ Error procesando el archivo Excel:\n\n${error.message}`;
      
      if (error.message.includes('XLSX')) {
        mensajeError += `\n\n🔧 Posibles soluciones:\n`;
        mensajeError += `• Verifica tu conexión a internet\n`;
        mensajeError += `• Recarga la página e intenta nuevamente\n`;
        mensajeError += `• Prueba con un navegador diferente`;
      } else if (!error.message.includes('columnas')) {
        mensajeError += `\n\n💡 Formato requerido:\n`;
        mensajeError += `• Columna "Nombre": Nombre completo del trabajador\n`;
        mensajeError += `• Columna "RUT": RUT con formato chileno\n`;
        mensajeError += `• Columna "Cargo": Función del trabajador (opcional)\n\n`;
        mensajeError += `📋 Nombres aceptados para columnas:\n`;
        mensajeError += `• NOMBRE: nombre, name, trabajador, empleado\n`;
        mensajeError += `• RUT: rut, id, identificacion, cedula, dni`;
      }
      
      alert(mensajeError);
    } finally {
      setSubiendoNomina(prev => ({ ...prev, [cliente]: false }));
    }
  };

  // Cargar datos del localStorage preservando datos existentes
  useEffect(() => {
    const datosGuardados = JSON.parse(localStorage.getItem('pgr_cumplimiento_contratos_v4') || '{}');
    
    if (Object.keys(datosGuardados).length > 0 && datosGuardados.estadoDocumentosPorMes) {
      const estadoExistente = datosGuardados.estadoDocumentosPorMes;
      const estadoCompleto = inicializarEstadoDocumentos();
      
      // Mezclar datos existentes con estructura completa
      Object.keys(estadoCompleto).forEach(mes => {
        if (estadoExistente[mes]) {
          Object.keys(estadoCompleto[mes]).forEach(cliente => {
            if (estadoExistente[mes][cliente]) {
              estadoCompleto[mes][cliente] = {
                ...estadoCompleto[mes][cliente],
                ...estadoExistente[mes][cliente]
              };
            }
          });
        }
      });
      
      setEstadoDocumentosPorMes(estadoCompleto);
      
      // Cargar trabajadores si existen
      if (datosGuardados.trabajadoresPorCliente) {
        setTrabajadoresPorCliente(datosGuardados.trabajadoresPorCliente);
      }
    } else {
      // Primera vez, inicializar estructura completa
      setEstadoDocumentosPorMes(inicializarEstadoDocumentos());
    }
  }, []);

  // Guardar automáticamente con throttling
  useEffect(() => {
    if (Object.keys(estadoDocumentosPorMes).length === 0) return;

    const timer = setTimeout(() => {
      setGuardandoAutomatico(true);
      const datosParaGuardar = {
        estadoDocumentosPorMes,
        trabajadoresPorCliente,
        ultimaActualizacion: new Date().toISOString()
      };
      
      localStorage.setItem('pgr_cumplimiento_contratos_v4', JSON.stringify(datosParaGuardar));
      setUltimoGuardado(new Date());
      
      setTimeout(() => setGuardandoAutomatico(false), 1000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [estadoDocumentosPorMes, trabajadoresPorCliente]);

  // Estadísticas calculadas
  const estadisticas = calcularEstadisticas();

  // Clientes filtrados
  const clientesFiltrados = obtenerClientesActivosEnMes(mesSeleccionado).filter(([nombre, data]) => {
    // Filtrar por cliente
    if (clienteFiltro && nombre !== clienteFiltro) return false;
    
    // Filtrar por búsqueda
    if (busqueda && !nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          
          {/* Header con colores originales restaurados */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <FileCheck size={32} />
                <div>
                  <h1 className="text-2xl font-bold">Dashboard de Cumplimiento de Contratos 2025</h1>
                  <p className="text-blue-100">Control integral con estados por documento • Relleno mensual • PGR Seguridad</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${guardandoAutomatico ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                    <span className="text-xs text-blue-200">
                      {guardandoAutomatico ? 'Guardando...' : `${estadisticas.total} clientes activos • Auto-guardado activo`}
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
                  {(estadisticas.criticos + estadisticas.rechazados) > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                      {estadisticas.criticos + estadisticas.rechazados}
                    </span>
                  )}
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

          {/* Estadísticas generales con colores mejorados */}
          <div className="p-6 border-b border-gray-200">
            
            {/* Banner de período actual */}
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={24} className="text-blue-600" />
                  <div>
                    <h3 className="font-bold text-blue-900">
                      📅 {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta} • Relleno Mensual
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Estados independientes por mes: Pendiente → Cargado → En Revisión → Aceptado/Rechazado
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    Sistema PGR
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjetas de estadísticas con mejor contraste */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">{estadisticas.total}</p>
                <p className="text-xs text-blue-600">Activos</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={20} className="text-red-600" />
                  <span className="text-sm font-medium text-red-900">Críticos</span>
                </div>
                <p className="text-2xl font-bold text-red-800">{estadisticas.criticos}</p>
                <p className="text-xs text-red-600">&lt; 50%</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={20} className="text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Proceso</span>
                </div>
                <p className="text-2xl font-bold text-yellow-800">{estadisticas.proceso}</p>
                <p className="text-xs text-yellow-600">50-89%</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-green-900">Completos</span>
                </div>
                <p className="text-2xl font-bold text-green-800">{estadisticas.completos}</p>
                <p className="text-xs text-green-600">≥ 90%</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={20} className="text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Promedio</span>
                </div>
                <p className="text-2xl font-bold text-purple-800">{estadisticas.promedio}%</p>
                <p className="text-xs text-purple-600">General</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={20} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Alertas</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{estadisticas.criticos + estadisticas.rechazados}</p>
                <p className="text-xs text-gray-600">Pendientes</p>
              </div>
            </div>

            {/* Selector de período y filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              
              {/* Selector de mes */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Período</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select 
                    value={mesSeleccionado}
                    onChange={(e) => setMesSeleccionado(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {periodos.map(periodo => (
                      <option key={periodo.valor} value={periodo.valor}>
                        {periodo.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtro por cliente */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Cliente</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select 
                    value={clienteFiltro}
                    onChange={(e) => setClienteFiltro(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos los clientes</option>
                    {obtenerClientesActivosEnMes(mesSeleccionado).map(([nombre]) => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtro por estado */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select 
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="todos">Todos</option>
                    <option value="criticos">Críticos (&lt;50%)</option>
                    <option value="proceso">En Proceso (50-89%)</option>
                    <option value="completos">Completos (≥90%)</option>
                  </select>
                </div>
              </div>

              {/* Búsqueda */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Controles de vista */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setMostrarDetalles(!mostrarDetalles)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mostrarDetalles 
                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <Eye size={16} className="inline mr-2" />
                {mostrarDetalles ? 'Ocultar Detalles' : 'Mostrar Detalles'}
              </button>

              <button
                onClick={() => setMostrarTablaCriticos(!mostrarTablaCriticos)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mostrarTablaCriticos 
                    ? 'bg-red-100 text-red-800 border border-red-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <AlertTriangle size={16} className="inline mr-2" />
                {mostrarTablaCriticos ? 'Ocultar Críticos' : 'Mostrar Críticos'}
              </button>

              <button
                onClick={() => setMostrarMatrizWalmart(!mostrarMatrizWalmart)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  mostrarMatrizWalmart 
                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <FileSpreadsheet size={16} className="inline mr-2" />
                Ver Matriz Walmart
              </button>
            </div>
          </div>

          {/* Tabla de clientes críticos */}
          {mostrarTablaCriticos && estadisticas.criticos > 0 && (
            <div className="p-6 border-b border-gray-200 bg-red-50">
              <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} />
                Clientes Críticos ({estadisticas.criticos})
              </h3>
              <div className="grid gap-3">
                {clientesFiltrados
                  .filter(([nombre]) => calcularPorcentaje(nombre) < 50)
                  .map(([nombre, data]) => {
                    const porcentaje = calcularPorcentaje(nombre);
                    return (
                      <div key={nombre} className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{data.icono}</span>
                            <div>
                              <h4 className="font-bold text-gray-900">{nombre}</h4>
                              <p className="text-sm text-gray-600">{data.categoria} • {data.modalidad}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-600">{porcentaje}%</div>
                              <div className="text-xs text-gray-500">Cumplimiento</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.ACEPTADO)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                ✓ Todos
                              </button>
                              <button
                                onClick={() => setClientesExpandidos(prev => ({ ...prev, [nombre]: !prev[nombre] }))}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Ver Detalles
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Matriz especial de Walmart */}
          {mostrarMatrizWalmart && (
            <div className="p-6 border-b border-gray-200 bg-purple-50">
              <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                <FileSpreadsheet size={20} />
                Matriz Especial Walmart - Criterios de Validación
              </h3>
              
              <div className="bg-white rounded-lg p-6 border border-purple-200">
                <div className="grid md:grid-cols-2 gap-6">
                  
                  {/* Documentos Corporativos */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-2">📋 Documentos Corporativos</h4>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800">1. Programa de Trabajo Preventivo (SGSST)</h5>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>✓ Debe estar firmado y con fecha actualizada</div>
                          <div>✓ Incluir matriz de riesgos específica</div>
                          <div>✓ Plan de emergencias definido</div>
                          <div>✓ Procedimientos de trabajo seguro</div>
                          <div>✓ Programa de capacitación</div>
                          <div>✓ Sistema de reporte de incidentes</div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800">2. Registro Difusión Trabajador</h5>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>✓ Firma de todos los trabajadores</div>
                          <div>✓ Fecha de capacitación</div>
                          <div>✓ Contenido del reglamento</div>
                          <div>✓ Evaluación de comprensión</div>
                          <div>✓ Registro fotográfico</div>
                          <div>✓ Certificado de participación</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documentos Laborales */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-2">👥 Documentos Laborales</h4>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800">3. Toma de Conocimiento - Información de Riesgos</h5>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>✓ Identificación específica por puesto</div>
                          <div>✓ Medidas preventivas claras</div>
                          <div>✓ Uso obligatorio de EPP</div>
                          <div>✓ Procedimientos de emergencia</div>
                          <div>✓ Contactos de emergencia</div>
                          <div>✓ Firma y fecha del trabajador</div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800">4. Toma de Conocimiento - Matriz IPER</h5>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>✓ Matriz actualizada 2025</div>
                          <div>✓ Evaluación por actividad</div>
                          <div>✓ Nivel de riesgo claramente definido</div>
                          <div>✓ Controles establecidos</div>
                          <div>✓ Responsabilidades asignadas</div>
                          <div>✓ Revisión y actualización periódica</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documentos Previsionales */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-2">💼 Documentos Previsionales</h4>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800">5. Capacitación Uso y Mantención EPP</h5>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>✓ Lista de EPP por puesto de trabajo</div>
                          <div>✓ Instrucciones de uso correcto</div>
                          <div>✓ Mantenimiento y limpieza</div>
                          <div>✓ Criterios de reemplazo</div>
                          <div>✓ Registro de entrega personalizada</div>
                          <div>✓ Evaluación práctica</div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800">6. Capacitación Prevención de Riesgos</h5>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>✓ Contenido específico por área</div>
                          <div>✓ Duración mínima cumplida</div>
                          <div>✓ Evaluación teórica y práctica</div>
                          <div>✓ Certificado de aprobación</div>
                          <div>✓ Seguimiento posterior</div>
                          <div>✓ Renovación programada</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seguros y Mutualidades */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 border-b pb-2">🛡️ Seguros y Mutualidades</h4>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <h5 className="font-medium text-gray-800">7. Información de Riesgos Laborales</h5>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div>✓ Evaluación específica Walmart</div>
                          <div>✓ Riesgos identificados por zona</div>
                          <div>✓ Medidas de control implementadas</div>
                          <div>✓ Monitoreo y seguimiento</div>
                          <div>✓ Reporte de incidentes</div>
                          <div>✓ Plan de mejora continua</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <strong>Nota:</strong> Todos los documentos deben estar actualizados para 2025 y firmados por responsables autorizados.
                    </div>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                      <Download size={16} />
                      Exportar Matriz
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista principal de clientes */}
          <div className="p-6">
            
            {/* Información de filtros activos */}
            {(filtroEstado !== 'todos' || busqueda || clienteFiltro) && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-800">
                    <strong>Filtros activos:</strong>
                    {filtroEstado !== 'todos' && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Estado: {filtroEstado}</span>}
                    {busqueda && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Búsqueda: "{busqueda}"</span>}
                    {clienteFiltro && <span className="ml-2 px-2 py-1 bg-blue-100 rounded">Cliente: {clienteFiltro}</span>}
                  </div>
                  <button
                    onClick={() => {
                      setFiltroEstado('todos');
                      setBusqueda('');
                      setClienteFiltro('');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {clientesFiltrados
                .filter(([nombre]) => {
                  if (filtroEstado === 'todos') return true;
                  
                  const porcentaje = calcularPorcentaje(nombre);
                  switch (filtroEstado) {
                    case 'criticos': return porcentaje < 50;
                    case 'proceso': return porcentaje >= 50 && porcentaje < 90;
                    case 'completos': return porcentaje >= 90;
                    default: return true;
                  }
                })
                .map(([nombre, data]) => {
                  const porcentaje = calcularPorcentaje(nombre);
                  const isExpanded = clientesExpandidos[nombre];
                  const totalDocumentos = data.documentos.mensuales.length + data.documentos.unicos.length;

                  return (
                    <div key={nombre} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      
                      {/* Header del cliente */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setClientesExpandidos(prev => ({ ...prev, [nombre]: !prev[nombre] }))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            
                            {/* Icono y expansión */}
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              <span className="text-3xl">{data.icono}</span>
                            </div>
                            
                            {/* Información del cliente */}
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{nombre}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Building size={14} />
                                  {data.categoria}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Globe size={14} />
                                  {data.modalidad}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  Desde {new Date(data.fechaInicio + '-01').toLocaleDateString('es-CL', { 
                                    month: 'short', 
                                    year: 'numeric' 
                                  })}
                                </span>
                                {data.observaciones && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                    {data.observaciones}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Estadísticas y acciones */}
                          <div className="flex items-center gap-4">
                            
                            {/* Barra de progreso */}
                            <div className="text-right min-w-[120px]">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-lg font-bold ${
                                  porcentaje >= 90 ? 'text-green-600' :
                                  porcentaje >= 50 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {porcentaje}%
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({totalDocumentos} docs)
                                </span>
                              </div>
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    porcentaje >= 90 ? 'bg-green-500' :
                                    porcentaje >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${porcentaje}%` }}
                                />
                              </div>
                            </div>

                            {/* Botones de acción rápida */}
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.ACEPTADO);
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                title="Marcar todos como aceptados"
                              >
                                ✓ Todos
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.PENDIENTE);
                                }}
                                className="px-3 py-1 bg-gray-400 text-white text-sm rounded hover:bg-gray-500 transition-colors"
                                title="Limpiar estados"
                              >
                                ✗ Limpiar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contenido expandido */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50">
                          
                          {/* Información adicional del cliente */}
                          <div className="p-4 border-b border-gray-200 bg-white">
                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail size={16} className="text-gray-400" />
                                <span className="text-gray-600">Contacto:</span>
                                <span className="font-medium">{data.contacto}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" />
                                <span className="text-gray-600">Frecuencia:</span>
                                <span className="font-medium">{data.frecuencia}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CalendarClock size={16} className="text-gray-400" />
                                <span className="text-gray-600">Estado:</span>
                                <span className={`font-medium px-2 py-1 rounded text-xs ${
                                  data.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {data.estado}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Gestión de trabajadores */}
                          <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Users size={18} />
                                Gestión de Trabajadores
                                {trabajadoresPorCliente[nombre] && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    {trabajadoresPorCliente[nombre].length} cargados
                                  </span>
                                )}
                              </h4>
                              <button
                                onClick={() => setMostrarGestionTrabajadores(prev => ({ 
                                  ...prev, 
                                  [nombre]: !prev[nombre] 
                                }))}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                {mostrarGestionTrabajadores[nombre] ? 'Ocultar' : 'Gestionar'}
                              </button>
                            </div>

                            {mostrarGestionTrabajadores[nombre] && (
                              <div className="space-y-4">
                                
                                {/* Subir nómina */}
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                  <h5 className="font-medium text-blue-900 mb-2">Subir Nómina Excel</h5>
                                  <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        subirNominaExcel(nombre, file);
                                      }
                                    }}
                                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                  />
                                  {subiendoNomina[nombre] && (
                                    <p className="text-sm text-blue-600 mt-1">Procesando archivo...</p>
                                  )}
                                  
                                  <div className="bg-gray-50 p-3 rounded-lg mt-3">
                                    <h5 className="font-medium text-gray-800 mb-2">Formato requerido:</h5>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                      <li>• Columna "Nombre": Nombre completo</li>
                                      <li>• Columna "RUT": RUT con formato</li>
                                      <li>• Columna "Cargo": Función del trabajador</li>
                                    </ul>
                                  </div>
                                </div>

                                {/* Lista de trabajadores */}
                                {trabajadoresPorCliente[nombre]?.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-3">
                                      Trabajadores Cargados ({trabajadoresPorCliente[nombre].length})
                                    </h4>
                                    
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                      {trabajadoresPorCliente[nombre].map((trabajador) => (
                                        <div key={trabajador.rut} className="border border-gray-200 rounded-lg p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <div>
                                              <h5 className="font-medium text-gray-900">{trabajador.nombre}</h5>
                                              <p className="text-sm text-gray-600">RUT: {trabajador.rut} • {trabajador.cargo}</p>
                                            </div>
                                            <button
                                              onClick={() => setSubmenuActivo(prev => ({
                                                ...prev,
                                                [`${nombre}-${trabajador.rut}`]: !prev[`${nombre}-${trabajador.rut}`]
                                              }))}
                                              className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                            >
                                              {submenuActivo[`${nombre}-${trabajador.rut}`] ? 'Ocultar' : 'Ver Docs'}
                                            </button>
                                          </div>

                                          {submenuActivo[`${nombre}-${trabajador.rut}`] && (
                                            <div className="bg-gray-50 p-2 rounded mt-2">
                                              <h6 className="text-xs font-medium text-gray-700 mb-2">Documentos por trabajador:</h6>
                                              <div className="space-y-1">
                                                {Object.entries(trabajador.documentos).map(([doc, info]) => {
                                                  const estadoDisplay = getEstadoDisplay(info.estado);
                                                  return (
                                                    <div key={doc} className="flex items-center justify-between">
                                                      <span className="text-xs text-gray-600">{doc}</span>
                                                      <button
                                                        onClick={() => {
                                                          const nuevosEstados = [
                                                            ESTADOS_DOCUMENTO.PENDIENTE,
                                                            ESTADOS_DOCUMENTO.CARGADO,
                                                            ESTADOS_DOCUMENTO.ACEPTADO
                                                          ];
                                                          const indiceActual = nuevosEstados.indexOf(info.estado);
                                                          const siguienteIndice = (indiceActual + 1) % nuevosEstados.length;
                                                          cambiarEstadoDocumentoTrabajador(nombre, trabajador.rut, doc, nuevosEstados[siguienteIndice]);
                                                        }}
                                                        className={`px-2 py-1 text-xs rounded ${estadoDisplay.bg} ${estadoDisplay.color}`}
                                                      >
                                                        {estadoDisplay.text}
                                                      </button>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Documentos mensuales */}
                          {data.documentos.mensuales.length > 0 && (
                            <div className="p-4 border-b border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <FileCheck size={18} className="text-green-600" />
                                  Documentos Mensuales ({data.documentos.mensuales.length})
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.ACEPTADO)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    ✓ Todos
                                  </button>
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.PENDIENTE)}
                                    className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                                  >
                                    ✗ Limpiar
                                  </button>
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.documentos.mensuales.map((documento) => {
                                  const info = obtenerInfoDocumento(nombre, documento, 'mensuales');
                                  const estadoDisplay = getEstadoDisplay(info.estado);
                                  const IconoEstado = estadoDisplay.icon;
                                  
                                  return (
                                    <div key={documento} className={`p-3 rounded-lg border ${estadoDisplay.bg}`}>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-gray-900 text-sm mb-1 truncate" title={documento}>
                                            {documento}
                                          </h5>
                                          <div className="flex items-center gap-2">
                                            <IconoEstado size={14} className={estadoDisplay.color} />
                                            <span className={`text-xs font-medium ${estadoDisplay.color}`}>
                                              {estadoDisplay.text}
                                            </span>
                                          </div>
                                          {info.fechaActualizacion && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              {new Date(info.fechaActualizacion).toLocaleDateString('es-CL')}
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => toggleDocumento(nombre, documento, 'mensuales')}
                                          className="ml-2 p-1 hover:bg-white/50 rounded transition-colors"
                                          title="Cambiar estado"
                                        >
                                          <Edit3 size={14} className="text-gray-400" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Documentos únicos */}
                          {data.documentos.unicos.length > 0 && (
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <Archive size={18} className="text-purple-600" />
                                  Documentos Únicos ({data.documentos.unicos.length})
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'unicos', ESTADOS_DOCUMENTO.ACEPTADO)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    ✓ Todos
                                  </button>
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'unicos', ESTADOS_DOCUMENTO.PENDIENTE)}
                                    className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                                  >
                                    ✗ Limpiar
                                  </button>
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.documentos.unicos.map((documento) => {
                                  const info = obtenerInfoDocumento(nombre, documento, 'unicos');
                                  const estadoDisplay = getEstadoDisplay(info.estado);
                                  const IconoEstado = estadoDisplay.icon;
                                  
                                  return (
                                    <div key={documento} className={`p-3 rounded-lg border ${estadoDisplay.bg}`}>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-medium text-gray-900 text-sm mb-1 truncate" title={documento}>
                                            {documento}
                                          </h5>
                                          <div className="flex items-center gap-2">
                                            <IconoEstado size={14} className={estadoDisplay.color} />
                                            <span className={`text-xs font-medium ${estadoDisplay.color}`}>
                                              {estadoDisplay.text}
                                            </span>
                                          </div>
                                          {info.fechaActualizacion && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              {new Date(info.fechaActualizacion).toLocaleDateString('es-CL')}
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => toggleDocumento(nombre, documento, 'unicos')}
                                          className="ml-2 p-1 hover:bg-white/50 rounded transition-colors"
                                          title="Cambiar estado"
                                        >
                                          <Edit3 size={14} className="text-gray-400" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Mensaje para clientes sin documentos */}
                          {data.documentos.mensuales.length === 0 && data.documentos.unicos.length === 0 && (
                            <div className="p-4">
                              <div className="text-center py-8 text-gray-500">
                                <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                                <h4 className="font-medium text-gray-700 mb-1">Sin Requerimientos de Documentación</h4>
                                <p className="text-sm">Este cliente no requiere documentación específica</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Mensaje cuando no hay clientes que mostrar */}
            {clientesFiltrados.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
                <p className="text-gray-500 mb-4">
                  {busqueda || clienteFiltro || filtroEstado !== 'todos' 
                    ? 'Prueba ajustando los filtros de búsqueda'
                    : 'No hay clientes disponibles para el período seleccionado'
                  }
                </p>
                {(busqueda || clienteFiltro || filtroEstado !== 'todos') && (
                  <button
                    onClick={() => {
                      setBusqueda('');
                      setClienteFiltro('');
                      setFiltroEstado('todos');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel de notificaciones */}
          {mostrarNotificaciones && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-96 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Bell size={20} />
                      Notificaciones del Sistema
                    </h3>
                    <button
                      onClick={() => setMostrarNotificaciones(false)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                  
                  {/* Notificaciones de clientes críticos */}
                  {estadisticas.criticos > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900">Clientes Críticos</h4>
                          <p className="text-sm text-red-700">
                            {estadisticas.criticos} cliente(s) con menos del 50% de documentación completada
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notificaciones de documentos rechazados */}
                  {estadisticas.rechazados > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle size={16} className="text-orange-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-orange-900">Documentos Rechazados</h4>
                          <p className="text-sm text-orange-700">
                            {estadisticas.rechazados} documento(s) requieren corrección
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notificaciones de documentos en revisión */}
                  {estadisticas.enRevision > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Clock size={16} className="text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900">En Revisión</h4>
                          <p className="text-sm text-yellow-700">
                            {estadisticas.enRevision} documento(s) están siendo revisados
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mensaje cuando todo está bien */}
                  {estadisticas.criticos === 0 && estadisticas.rechazados === 0 && estadisticas.enRevision === 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-900">¡Todo en orden!</h4>
                          <p className="text-sm text-green-700">
                            No hay alertas pendientes en el sistema
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer con información del sistema */}
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Shield size={14} />
                  PGR Seguridad Chile
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Sistema 2025
                </span>
                {ultimoGuardado && (
                  <span className="flex items-center gap-1">
                    <Save size={14} />
                    Guardado: {ultimoGuardado.toLocaleTimeString('es-CL')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>Versión 4.0</span>
                <div className={`w-2 h-2 rounded-full ${
                  estadisticas.promedio >= 90 ? 'bg-green-500' :
                  estadisticas.promedio >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                }`} title={`Promedio sistema: ${estadisticas.promedio}%`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCumplimiento;
