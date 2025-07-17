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
  Bookmark,
  Trash2,
  Edit3,
  Save,
  XCircle,
  AlertCircle,
  Hourglass
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
  const [estadoDocumentosPorMes, setEstadoDocumentosPorMes] = useState({});
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [guardandoAutomatico, setGuardandoAutomatico] = useState(false);

  // Estados posibles para cada documento
  const ESTADOS_DOCUMENTO = {
    PENDIENTE: 'pendiente',
    CARGADO: 'cargado',
    EN_REVISION: 'en_revision',
    RECHAZADO: 'rechazado',
    ACEPTADO: 'aceptado'
  };

  // Períodos disponibles - solo 2025
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

  // Base de datos completa de clientes PGR Seguridad
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
      contacto: 'operaciones@fulllogistic.cl',
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
      fechaInicio: '2023-11',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Detalle de Pago de Cotizaciones Previsionales',
          'Certificado F30 y F30-1'
        ],
        unicos: [
          'Certificado de Adhesión a Seguro de Accidentes',
          'Reglamento interno de la empresa',
          'Escritura de la empresa y modificaciones',
          'Pago del IVA',
          'Balance',
          'Estado de resultado',
          'Contrato de Trabajo vigente y anexos',
          'Nómina de trabajadores',
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
      fechaInicio: '2025-04',
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
          'Certificado cotizaciones ACHS'
        ],
        unicos: [
          'Certificado Afiliación Mutualidad'
        ]
      }
    },
    'CBB - INACAL': {
      modalidad: 'Plataforma Prevsis',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'seguridad@cbb.cl',
      plataforma: 'https://prevsis.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-04',
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
          'Difusión procedimiento trabajo seguro',
          'Anexo de traslado mandante',
          'Plan de Seguridad y Salud Ocupacional',
          'Procedimiento de trabajo seguro',
          'Recepción Reglamento especial empresas contratistas'
        ]
      }
    },
    'CBB - READY MIX PARGUA': {
      modalidad: 'Plataforma Prevsis',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'seguridad@cbb.cl',
      plataforma: 'https://prevsis.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2022-01',
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
          'Difusión procedimiento trabajo seguro',
          'Anexo de traslado mandante',
          'Plan de Seguridad y Salud Ocupacional',
          'Procedimiento de trabajo seguro',
          'Recepción Reglamento especial empresas contratistas'
        ]
      }
    },
    'TODO MELON + INM SAN PATRICIO': {
      modalidad: 'Prevsis + InfoControl',
      icono: '🍈',
      categoria: 'Agrícola',
      contacto: 'documentos@todomelon.cl',
      plataforma: 'Prevsis + InfoControl',
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
      modalidad: 'Seyse',
      icono: '🔧',
      categoria: 'Tecnología',
      contacto: 'documentos@novasource.cl',
      plataforma: 'Seyse',
      frecuencia: 'Mensual',
      fechaInicio: '2023-10',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado de Antecedentes Laborales y Previsionales (F-30)',
          'Certificado de Cumplimiento de las Obligaciones Laborales y Previsionales (F30-1)',
          'Certificado de Pago de Cotizaciones Previsionales (PREVIRED)',
          'Certificado de Siniestralidad y Listado de Accidentados',
          'Comprobante de Pago de Remuneraciones',
          'Nómina de Reporte Mensual de la Empresa'
        ],
        unicos: []
      }
    },
    'WALMART': {
      modalidad: 'SubcontrataLey',
      icono: '🛒',
      categoria: 'Retail',
      contacto: 'proveedores@walmart.cl',
      plataforma: 'SubcontrataLey',
      frecuencia: 'Variable',
      fechaInicio: '2024-12',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Criterios de revisión de la matriz documental'
        ],
        unicos: []
      },
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
      modalidad: 'Plataforma KSEC',
      icono: '🐷',
      categoria: 'Agrícola',
      contacto: 'contratistas@agrosuper.cl',
      plataforma: 'https://ksec.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2017-05',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado F30',
          'Certificado F30-1',
          'Finiquitos'
        ],
        unicos: [
          'Contrato de trabajo',
          'Anexos'
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
          'Control de Asistencia'
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
      documentos: {
        mensuales: [
          'Nómina de trabajadores',
          'Liquidaciones de Sueldo',
          'Certificado Cumplimientos Laborales F30-1',
          'Planilla Cotizaciones Previsionales',
          'Certificado Antecedentes laborales',
          'Finiquito',
          'Certificado Siniestralidad 2025',
          'Planilla Cotizaciones Mutualidad 2025',
          'Certificado aclaración no aplica comité paritario',
          'Certificado cotizaciones ACHS',
          'Libro de Remuneraciones'
        ],
        unicos: [
          'Certificado Afiliación Mutualidad'
        ]
      }
    },
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
      icono: '🏢',
      categoria: 'Servicios',
      contacto: 'N/A',
      frecuencia: 'N/A',
      fechaInicio: '2024-02',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    },
    'ENERGYA': {
      modalidad: 'Sin requerimientos',
      icono: '⚡',
      categoria: 'Energía',
      contacto: 'N/A',
      frecuencia: 'N/A',
      fechaInicio: '2024-05',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    }
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

  // Cargar datos del localStorage preservando datos existentes
  useEffect(() => {
    const datosGuardados = JSON.parse(localStorage.getItem('pgr_cumplimiento_contratos_v4') || '{}');
    
    if (Object.keys(datosGuardados).length > 0 && datosGuardados.estadoDocumentosPorMes) {
      // Cargar datos existentes
      const estadoExistente = datosGuardados.estadoDocumentosPorMes;
      const estadoCompleto = inicializarEstadoDocumentos();
      
      // Mezclar datos existentes con estructura completa
      Object.keys(estadoCompleto).forEach(mes => {
        if (estadoExistente[mes]) {
          Object.keys(estadoCompleto[mes]).forEach(cliente => {
            if (estadoExistente[mes][cliente]) {
              // Preservar datos existentes
              estadoCompleto[mes][cliente] = {
                ...estadoCompleto[mes][cliente],
                ...estadoExistente[mes][cliente]
              };
            }
          });
        }
      });
      
      setEstadoDocumentosPorMes(estadoCompleto);
      setUltimoGuardado(datosGuardados.ultimoGuardado || null);
    } else {
      // Inicializar con estructura completa
      const estadoInicial = inicializarEstadoDocumentos();
      setEstadoDocumentosPorMes(estadoInicial);
    }
  }, []);

  // Auto-guardado mejorado con cada cambio
  useEffect(() => {
    if (Object.keys(estadoDocumentosPorMes).length > 0) {
      setGuardandoAutomatico(true);
      
      const datosParaGuardar = {
        estadoDocumentosPorMes,
        ultimoGuardado: new Date().toISOString(),
        version: '4.0'
      };
      
      // Guardar inmediatamente
      localStorage.setItem('pgr_cumplimiento_contratos_v4', JSON.stringify(datosParaGuardar));
      setUltimoGuardado(new Date().toISOString());
      
      // Simular tiempo de guardado
      setTimeout(() => {
        setGuardandoAutomatico(false);
      }, 500);
    }
  }, [estadoDocumentosPorMes]);

  // Función para obtener estado de documentos del mes actual
  const obtenerEstadoDocumentos = (mes = mesSeleccionado) => {
    return estadoDocumentosPorMes[mes] || {};
  };

  // Función para obtener información de un documento específico
  const obtenerInfoDocumento = (cliente, documento, tipo, mes = mesSeleccionado) => {
    const estadoMes = obtenerEstadoDocumentos(mes);
    return estadoMes[cliente]?.[tipo]?.[documento] || {
      estado: ESTADOS_DOCUMENTO.PENDIENTE,
      fechaActualizacion: null,
      observaciones: ''
    };
  };

  // Función para cambiar estado de un documento
  const cambiarEstadoDocumento = (cliente, documento, tipo, nuevoEstado, observaciones = '') => {
    setEstadoDocumentosPorMes(prev => ({
      ...prev,
      [mesSeleccionado]: {
        ...prev[mesSeleccionado],
        [cliente]: {
          ...prev[mesSeleccionado][cliente],
          [tipo]: {
            ...prev[mesSeleccionado][cliente][tipo],
            [documento]: {
              estado: nuevoEstado,
              fechaActualizacion: new Date().toISOString(),
              observaciones: observaciones
            }
          }
        }
      }
    }));
  };

  // Función para alternar estado de documento (para clicks simples)
  const toggleDocumento = (cliente, documento, tipo) => {
    const infoDoc = obtenerInfoDocumento(cliente, documento, tipo);
    
    let nuevoEstado;
    switch (infoDoc.estado) {
      case ESTADOS_DOCUMENTO.PENDIENTE:
        nuevoEstado = ESTADOS_DOCUMENTO.CARGADO;
        break;
      case ESTADOS_DOCUMENTO.CARGADO:
        nuevoEstado = ESTADOS_DOCUMENTO.EN_REVISION;
        break;
      case ESTADOS_DOCUMENTO.EN_REVISION:
        nuevoEstado = ESTADOS_DOCUMENTO.ACEPTADO;
        break;
      case ESTADOS_DOCUMENTO.RECHAZADO:
        nuevoEstado = ESTADOS_DOCUMENTO.EN_REVISION;
        break;
      case ESTADOS_DOCUMENTO.ACEPTADO:
        nuevoEstado = ESTADOS_DOCUMENTO.PENDIENTE;
        break;
      default:
        nuevoEstado = ESTADOS_DOCUMENTO.CARGADO;
    }
    
    cambiarEstadoDocumento(cliente, documento, tipo, nuevoEstado);
  };

  // Función para rechazar documento
  const rechazarDocumento = (cliente, documento, tipo, observaciones = '') => {
    cambiarEstadoDocumento(cliente, documento, tipo, ESTADOS_DOCUMENTO.RECHAZADO, observaciones);
  };

  // Función para calcular porcentaje considerando estados
  const calcularPorcentaje = (cliente, tipoFiltro = null) => {
    const data = clientes[cliente];
    if (!data) return 0;
    
    const filtroActual = tipoFiltro || filtroTipoDocumento;
    let documentosRelevantes = [];
    let aceptados = 0;
    
    const estadoMes = obtenerEstadoDocumentos();
    
    if (filtroActual === 'todos') {
      documentosRelevantes = [...data.documentos.mensuales, ...data.documentos.unicos];
      aceptados = [
        ...data.documentos.mensuales.filter(doc => 
          estadoMes[cliente]?.mensuales?.[doc]?.estado === ESTADOS_DOCUMENTO.ACEPTADO
        ),
        ...data.documentos.unicos.filter(doc => 
          estadoMes[cliente]?.unicos?.[doc]?.estado === ESTADOS_DOCUMENTO.ACEPTADO
        )
      ].length;
    } else if (filtroActual === 'mensuales') {
      documentosRelevantes = data.documentos.mensuales;
      aceptados = data.documentos.mensuales.filter(doc => 
        estadoMes[cliente]?.mensuales?.[doc]?.estado === ESTADOS_DOCUMENTO.ACEPTADO
      ).length;
    } else if (filtroActual === 'unicos') {
      documentosRelevantes = data.documentos.unicos;
      aceptados = data.documentos.unicos.filter(doc => 
        estadoMes[cliente]?.unicos?.[doc]?.estado === ESTADOS_DOCUMENTO.ACEPTADO
      ).length;
    }
    
    if (documentosRelevantes.length === 0) return 100;
    return Math.round((aceptados / documentosRelevantes.length) * 100);
  };

  // Obtener estadísticas mejoradas
  const obtenerEstadisticas = () => {
    const clientesList = Object.keys(clientes).filter(cliente => {
      const data = clientes[cliente];
      if (cliente === 'INCOPORT') return false;
      return data.estado === 'Activo';
    });
    
    const total = clientesList.length;
    const criticos = clientesList.filter(cliente => calcularPorcentaje(cliente) < 50).length;
    const proceso = clientesList.filter(cliente => {
      const p = calcularPorcentaje(cliente);
      return p >= 50 && p < 90;
    }).length;
    const completos = clientesList.filter(cliente => calcularPorcentaje(cliente) >= 90).length;
    const promedio = total > 0 ? Math.round(
      clientesList.reduce((sum, cliente) => sum + calcularPorcentaje(cliente), 0) / total
    ) : 0;
    
    // Contar documentos por estado
    const estadoMes = obtenerEstadoDocumentos();
    let enRevision = 0;
    let rechazados = 0;
    
    clientesList.forEach(cliente => {
      const data = clientes[cliente];
      [...data.documentos.mensuales, ...data.documentos.unicos].forEach(doc => {
        const tipo = data.documentos.mensuales.includes(doc) ? 'mensuales' : 'unicos';
        const estado = estadoMes[cliente]?.[tipo]?.[doc]?.estado;
        if (estado === ESTADOS_DOCUMENTO.EN_REVISION) enRevision++;
        if (estado === ESTADOS_DOCUMENTO.RECHAZADO) rechazados++;
      });
    });
    
    return { total, criticos, proceso, completos, promedio, enRevision, rechazados };
  };

  const estadisticas = obtenerEstadisticas();

  // Función para obtener color e ícono según estado
  const getEstadoDisplay = (estado) => {
    switch (estado) {
      case ESTADOS_DOCUMENTO.PENDIENTE:
        return { 
          color: 'text-gray-400', 
          bg: 'bg-gray-50 border-gray-200', 
          icon: Circle, 
          text: 'Pendiente' 
        };
      case ESTADOS_DOCUMENTO.CARGADO:
        return { 
          color: 'text-blue-600', 
          bg: 'bg-blue-50 border-blue-200', 
          icon: Upload, 
          text: 'Cargado' 
        };
      case ESTADOS_DOCUMENTO.EN_REVISION:
        return { 
          color: 'text-yellow-600', 
          bg: 'bg-yellow-50 border-yellow-200', 
          icon: Hourglass, 
          text: 'En Revisión' 
        };
      case ESTADOS_DOCUMENTO.RECHAZADO:
        return { 
          color: 'text-red-600', 
          bg: 'bg-red-50 border-red-200', 
          icon: XCircle, 
          text: 'Rechazado' 
        };
      case ESTADOS_DOCUMENTO.ACEPTADO:
        return { 
          color: 'text-green-600', 
          bg: 'bg-green-50 border-green-200', 
          icon: CheckCircle, 
          text: 'Aceptado' 
        };
      default:
        return { 
          color: 'text-gray-400', 
          bg: 'bg-gray-50 border-gray-200', 
          icon: Circle, 
          text: 'Pendiente' 
        };
    }
  };

  // Función para obtener color según porcentaje
  const getColorPorcentaje = (porcentaje) => {
    if (porcentaje >= 90) return 'text-green-700 bg-green-100 border-green-300';
    if (porcentaje >= 70) return 'text-blue-700 bg-blue-100 border-blue-300';
    if (porcentaje >= 50) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    return 'text-red-700 bg-red-100 border-red-300';
  };

  // Función para obtener ícono de modalidad
  const getIconoModalidad = (modalidad) => {
    if (modalidad.includes('Plataforma') || modalidad.includes('Prevsis') || modalidad.includes('Seyse') || modalidad.includes('SubcontrataLey') || modalidad.includes('KSEC') || modalidad.includes('Ebco')) {
      return <Globe size={16} className="text-blue-600" />;
    }
    if (modalidad === 'Envío directo') return <Mail size={16} className="text-green-600" />;
    return <CheckCircle size={16} className="text-gray-600" />;
  };

  const toggleCliente = (cliente) => {
    setClientesExpandidos(prev => ({
      ...prev,
      [cliente]: !prev[cliente]
    }));
  };

  // Función para cambiar estado masivo
  const cambiarEstadoMasivo = (cliente, tipo, nuevoEstado) => {
    const data = clientes[cliente];
    const documentos = data.documentos[tipo];
    
    documentos.forEach(doc => {
      cambiarEstadoDocumento(cliente, doc, tipo, nuevoEstado);
    });
  };

  // Filtrado de clientes
  const clientesFiltrados = Object.entries(clientes).filter(([nombre, data]) => {
    if (nombre === 'INCOPORT') return false;
    
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

  // Matriz Walmart
  const matrizWalmart = [
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
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  {estadisticas.criticos + estadisticas.rechazados}
                </span>
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
                    📅 {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta} • Relleno Mensual
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Estados independientes por mes: Pendiente → Cargado → En Revisión → Aceptado/Rechazado
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Save size={16} />
                  <span>Guardado continuo</span>
                </div>
                {ultimoGuardado && (
                  <p className="text-xs text-blue-500">
                    {new Date(ultimoGuardado).toLocaleString('es-CL')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Building size={20} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{estadisticas.total}</p>
              <p className="text-xs text-blue-600">Clientes activos</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-red-600" />
                <span className="text-sm font-medium text-red-900">Críticos</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{estadisticas.criticos}</p>
              <p className="text-xs text-red-600">&lt; 50%</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={20} className="text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Proceso</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{estadisticas.proceso}</p>
              <p className="text-xs text-yellow-600">50-89%</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-sm font-medium text-green-900">Completos</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{estadisticas.completos}</p>
              <p className="text-xs text-green-600">≥ 90%</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Promedio</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{estadisticas.promedio}%</p>
              <p className="text-xs text-purple-600">Aceptados</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Hourglass size={20} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Revisión</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{estadisticas.enRevision}</p>
              <p className="text-xs text-orange-600">Documentos</p>
            </div>

            <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={20} className="text-rose-600" />
                <span className="text-sm font-medium text-rose-900">Rechazados</span>
              </div>
              <p className="text-2xl font-bold text-rose-700">{estadisticas.rechazados}</p>
              <p className="text-xs text-rose-600">Documentos</p>
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
                <Filter size={20} className="text-gray-500" />
                <select
                  value={filtroTipoDocumento}
                  onChange={(e) => setFiltroTipoDocumento(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="todos">📋 Todos los documentos</option>
                  <option value="mensuales">🗓️ Solo Mensuales</option>
                  <option value="unicos">📄 Solo Únicos</option>
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
                  placeholder="Buscar cliente..."
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
                Críticos
              </button>
              
              <button
                onClick={() => setMostrarDetalles(!mostrarDetalles)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Eye size={16} />
                Detalles
              </button>
              
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                <Download size={16} />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de clientes críticos */}
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
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Pendientes</th>
                    <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Object.entries(clientes)
                    .filter(([nombre]) => nombre !== 'INCOPORT' && calcularPorcentaje(nombre) < 50)
                    .slice(0, 10)
                    .map(([nombre, data], index) => {
                      const porcentaje = calcularPorcentaje(nombre);
                      const totalDocs = data.documentos.mensuales.length + data.documentos.unicos.length;
                      const estadoMes = obtenerEstadoDocumentos();
                      
                      // Contar documentos por estado
                      const estadosCount = { pendientes: 0, rechazados: 0, revision: 0 };
                      [...data.documentos.mensuales, ...data.documentos.unicos].forEach(doc => {
                        const tipo = data.documentos.mensuales.includes(doc) ? 'mensuales' : 'unicos';
                        const estado = estadoMes[nombre]?.[tipo]?.[doc]?.estado;
                        if (estado === ESTADOS_DOCUMENTO.PENDIENTE) estadosCount.pendientes++;
                        if (estado === ESTADOS_DOCUMENTO.RECHAZADO) estadosCount.rechazados++;
                        if (estado === ESTADOS_DOCUMENTO.EN_REVISION) estadosCount.revision++;
                      });
                      
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
                              <span className="font-medium">{Math.round((porcentaje * totalDocs) / 100)}/{totalDocs}</span>
                              <div className="text-xs text-gray-500">aceptados</div>
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
                            <div className="flex gap-1">
                              {estadosCount.pendientes > 0 && (
                                <span className="text-xs bg-gray-100 text-gray-700 px-1 rounded">
                                  {estadosCount.pendientes}P
                                </span>
                              )}
                              {estadosCount.rechazados > 0 && (
                                <span className="text-xs bg-red-100 text-red-700 px-1 rounded">
                                  {estadosCount.rechazados}R
                                </span>
                              )}
                              {estadosCount.revision > 0 && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">
                                  {estadosCount.revision}Rev
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <button 
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded text-xs"
                              onClick={() => {
                                setClienteFiltro(nombre);
                                toggleCliente(nombre);
                              }}
                            >
                              <Eye size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
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
                  📋 INCOPORT <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">TERMINADO MAYO 2025</span>
                </h3>
                <p className="text-gray-600 text-sm">
                  Cliente finalizado • Documentación archivada • Datos preservados en el sistema
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                100% Final
              </div>
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
                Utilice el filtro de cliente para ver documentos con estados detallados por mes.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <Circle size={16} className="text-gray-400" />
                  <div>
                    <div className="font-semibold text-gray-700">Pendientes</div>
                    <div className="text-gray-600">No iniciados</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <Upload size={16} className="text-blue-500" />
                  <div>
                    <div className="font-semibold text-blue-700">Cargados</div>
                    <div className="text-blue-600">Subidos</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <Hourglass size={16} className="text-yellow-500" />
                  <div>
                    <div className="font-semibold text-yellow-700">En Revisión</div>
                    <div className="text-yellow-600">Evaluando</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <XCircle size={16} className="text-red-500" />
                  <div>
                    <div className="font-semibold text-red-700">Rechazados</div>
                    <div className="text-red-600">A corregir</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                  <CheckCircle size={16} className="text-green-500" />
                  <div>
                    <div className="font-semibold text-green-700">Aceptados</div>
                    <div className="text-green-600">Aprobados</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {clientesFiltrados.map(([nombre, data]) => {
              const porcentaje = calcularPorcentaje(nombre);
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
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              ACTIVO
                            </span>
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
                            <span>
                              {totalDocumentos > 0 ? `${totalDocumentos} docs (${totalMensuales}M + ${totalUnicos}U)` : 'Sin requerimientos'}
                            </span>
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
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <strong>Contacto:</strong> 
                              {data.contacto !== 'N/A' ? (
                                <a href={`mailto:${data.contacto}`} className="text-blue-600 hover:underline ml-1">
                                  {data.contacto}
                                </a>
                              ) : (
                                <span className="text-gray-500 ml-1">N/A</span>
                              )}
                            </div>
                            {data.plataforma && (
                              <div>
                                <strong>Plataforma:</strong> 
                                <span className="text-blue-600 ml-1">{data.plataforma}</span>
                              </div>
                            )}
                            <div>
                              <strong>Desde:</strong> {data.fechaInicio}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Lista de documentos con estados */}
                      {totalDocumentos > 0 ? (
                        <div className="p-4">
                          {/* Documentos mensuales */}
                          {data.documentos.mensuales.length > 0 && (
                            <div className="mb-6">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                  <Calendar size={16} className="text-green-600" />
                                  Documentos Mensuales ({data.documentos.mensuales.length})
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.ACEPTADO)}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                                  >
                                    Aceptar Todos
                                  </button>
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.PENDIENTE)}
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                                  >
                                    Resetear
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.documentos.mensuales.map((documento, index) => {
                                  const infoDoc = obtenerInfoDocumento(nombre, documento, 'mensuales');
                                  const estadoDisplay = getEstadoDisplay(infoDoc.estado);
                                  const IconoEstado = estadoDisplay.icon;
                                  
                                  return (
                                    <div
                                      key={index}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm ${estadoDisplay.bg}`}
                                      onClick={() => toggleDocumento(nombre, documento, 'mensuales')}
                                    >
                                      <div className="flex items-start gap-3">
                                        <IconoEstado size={18} className={`${estadoDisplay.color} flex-shrink-0 mt-0.5`} />
                                        <div className="flex-1">
                                          <span className="text-sm font-medium text-gray-900">
                                            {documento}
                                          </span>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-1 rounded-full ${estadoDisplay.bg.replace('bg-', 'text-').replace('-50', '-700')}`}>
                                              {estadoDisplay.text}
                                            </span>
                                            {infoDoc.estado === ESTADOS_DOCUMENTO.RECHAZADO && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  rechazarDocumento(nombre, documento, 'mensuales', 'Corrección requerida');
                                                }}
                                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                title="Rechazar documento"
                                              >
                                                <XCircle size={12} />
                                              </button>
                                            )}
                                          </div>
                                          {infoDoc.fechaActualizacion && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              {new Date(infoDoc.fechaActualizacion).toLocaleDateString('es-CL')}
                                            </div>
                                          )}
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
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'unicos', ESTADOS_DOCUMENTO.ACEPTADO)}
                                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                                  >
                                    Aceptar Todos
                                  </button>
                                  <button
                                    onClick={() => cambiarEstadoMasivo(nombre, 'unicos', ESTADOS_DOCUMENTO.PENDIENTE)}
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                                  >
                                    Resetear
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.documentos.unicos.map((documento, index) => {
                                  const infoDoc = obtenerInfoDocumento(nombre, documento, 'unicos');
                                  const estadoDisplay = getEstadoDisplay(infoDoc.estado);
                                  const IconoEstado = estadoDisplay.icon;
                                  
                                  return (
                                    <div
                                      key={index}
                                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm ${estadoDisplay.bg}`}
                                      onClick={() => toggleDocumento(nombre, documento, 'unicos')}
                                    >
                                      <div className="flex items-start gap-3">
                                        <IconoEstado size={18} className={`${estadoDisplay.color} flex-shrink-0 mt-0.5`} />
                                        <div className="flex-1">
                                          <span className="text-sm font-medium text-gray-900">
                                            {documento}
                                          </span>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-1 rounded-full ${estadoDisplay.bg.replace('bg-', 'text-').replace('-50', '-700')}`}>
                                              {estadoDisplay.text}
                                            </span>
                                            {infoDoc.estado === ESTADOS_DOCUMENTO.RECHAZADO && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  rechazarDocumento(nombre, documento, 'unicos', 'Corrección requerida');
                                                }}
                                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                title="Rechazar documento"
                                              >
                                                <XCircle size={12} />
                                              </button>
                                            )}
                                          </div>
                                          {infoDoc.fechaActualizacion && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              {new Date(infoDoc.fechaActualizacion).toLocaleDateString('es-CL')}
                                            </div>
                                          )}
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
                                  <h4 className="font-semibold text-blue-900">Matriz de Documentos</h4>
                                  <p className="text-blue-700 text-sm">4 categorías con criterios específicos</p>
                                </div>
                                <button
                                  onClick={() => setMostrarMatrizWalmart(true)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <FileText size={16} />
                                  Ver Matriz
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <CheckCircle size={24} className="mx-auto mb-2 text-green-600" />
                          <p className="font-medium">Cliente sin requerimientos</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6">
          <div className="text-center text-xs text-gray-500">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Save size={16} className="text-green-500" />
              <span className="font-medium">
                {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta.toUpperCase()} • PERSISTENCIA COMPLETA
              </span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span>Relleno mensual independiente</span>
              <span>•</span>
              <span>Estados: Pendiente → Cargado → Revisión → Aceptado/Rechazado</span>
              <span>•</span>
              <span>Guardado automático con cada cambio</span>
            </div>
          </div>
        </div>

        {/* Modal Matriz Walmart */}
        {mostrarMatrizWalmart && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={32} />
                    <div>
                      <h2 className="text-2xl font-bold">Matriz Walmart</h2>
                      <p className="text-blue-100">Criterios de validación</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMostrarMatrizWalmart(false)}
                    className="p-2 hover:bg-white/20 rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4">
                  {matrizWalmart.map((categoria, catIndex) => (
                    <div key={catIndex} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3">
                        <h3 className="font-bold text-gray-900">{categoria.categoria}</h3>
                      </div>
                      <div className="p-4">
                        {categoria.documentos.map((documento, docIndex) => (
                          <div key={docIndex} className="mb-4">
                            <h4 className="font-semibold text-gray-800 mb-2">{documento.nombre}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {documento.criterios.map((criterio, critIndex) => (
                                <div key={critIndex} className="flex items-start gap-2 text-sm">
                                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700">{criterio}</span>
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
          </div>
        )}

        {/* Panel de notificaciones */}
        {mostrarNotificaciones && (
          <div className="fixed top-20 right-6 w-80 bg-white rounded-xl shadow-2xl border z-40">
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
            <div className="p-4 space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      {estadisticas.criticos} clientes críticos
                    </p>
                    <p className="text-xs text-red-700">
                      Menos del 50% de documentos aceptados
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <XCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-900">
                      {estadisticas.rechazados} documentos rechazados
                    </p>
                    <p className="text-xs text-rose-700">
                      Requieren corrección y reenvío
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Hourglass size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      {estadisticas.enRevision} en revisión
                    </p>
                    <p className="text-xs text-yellow-700">
                      Documentos pendientes de aprobación
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Save size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Sistema actualizado
                    </p>
                    <p className="text-xs text-green-700">
                      Datos guardados automáticamente
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
