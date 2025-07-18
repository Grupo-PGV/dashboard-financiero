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
  PersonStanding
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
  const [trabajadoresPorCliente, setTrabajadoresPorCliente] = useState({});
  const [mostrarGestionTrabajadores, setMostrarGestionTrabajadores] = useState({});
  const [subiendoNomina, setSubiendoNomina] = useState({});

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
    'Libro de Remuneraciones',
    'Nómina de trabajadores',
    'Recibo de sueldo o transferencia',
    'Comprobante de Pago de Remuneraciones'
  ];

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
      modalidad: 'Envío directo',
      icono: '🏗',
      categoria: 'Construcción',
      contacto: 'seguridad@cbb.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2023-04',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Certificado Finiquitos',
          'Certificado Antecedentes laborales',
          'Planilla Cotizaciones Previsionales',
          'Liquidaciones de Sueldo'
        ],
        unicos: [
          'Política del Sistema de Gestión Seguridad',
          'Reglamento Interno de Orden',
          'Certificado de adhesión trabajadores',
          'Declaración Jurada DL 2763',
          'Matriz de identificación',
          'Derecho de información a los trabajadores',
          'Registro de entrega información',
          'Anexo de traslado mandante',
          'Nombramiento y constitución Comité Paritario',
          'Certificado de capacitación trabajadores',
          'Derecho información trabajadores',
          'Reglamento especial para empresas contratistas',
          'Check List Elementos de Protección',
          'Registro de entrega de elementos de protección',
          'Programa de capacitación anual',
          'Procedimiento trabajo seguro',
          'Anexo de traslado mandante',
          'Plan de Seguridad y Salud Ocupacional',
          'Procedimiento de trabajo seguro',
          'Recepción Reglamento especial empresas contratistas'
        ]
      }
    },
    'CBB - READY MIX PARGUA': {
      modalidad: 'Envío directo',
      icono: '🚛',
      categoria: 'Construcción',
      contacto: 'documentos@cbb.cl',
      frecuencia: 'Mensual',
      fechaInicio: '2022-01',
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

  // ========================================
  // FUNCIONES MEJORADAS PARA FILTRADO POR MES
  // ========================================

  // Función para determinar si un cliente estaba activo en un mes específico
  const obtenerClientesActivosEnMes = (mesSeleccionado) => {
    const [año, mes] = mesSeleccionado.split('-');
    const fechaSeleccionada = new Date(parseInt(año), parseInt(mes) - 1, 15); // Día 15 del mes seleccionado
    
    return Object.entries(clientes).filter(([nombreCliente, data]) => {
      // Crear fechas de inicio y término
      const fechaInicio = new Date(data.fechaInicio + '-01'); // Primer día del mes de inicio
      
      // Si el cliente tiene fecha de término, crear fecha de fin
      let fechaTermino = null;
      if (data.fechaTermino) {
        const [añoTermino, mesTermino] = data.fechaTermino.split('-');
        fechaTermino = new Date(parseInt(añoTermino), parseInt(mesTermino) - 1, 31); // Último día del mes de término
      }
      
      // Verificar si el cliente estaba activo en la fecha seleccionada
      const estabaActivo = fechaSeleccionada >= fechaInicio && 
                          (!fechaTermino || fechaSeleccionada <= fechaTermino);
      
      return estabaActivo;
    });
  };

  // Resetear filtro de cliente cuando cambie el mes
  useEffect(() => {
    if (clienteFiltro) {
      const clientesActivos = obtenerClientesActivosEnMes(mesSeleccionado);
      const clienteActivoEnMes = clientesActivos.find(([nombre]) => nombre === clienteFiltro);
      if (!clienteActivoEnMes) {
        setClienteFiltro('');
      }
    }
  }, [mesSeleccionado]);

  // Cargar trabajadores del localStorage
  useEffect(() => {
    const trabajadoresGuardados = JSON.parse(localStorage.getItem('pgr_trabajadores_v1') || '{}');
    setTrabajadoresPorCliente(trabajadoresGuardados);
  }, []);

  // Auto-guardado de trabajadores
  useEffect(() => {
    if (Object.keys(trabajadoresPorCliente).length > 0) {
      localStorage.setItem('pgr_trabajadores_v1', JSON.stringify(trabajadoresPorCliente));
    }
  }, [trabajadoresPorCliente]);

  // Función para subir nómina en Excel
  const subirNominaExcel = async (cliente, file) => {
    setSubiendoNomina(prev => ({ ...prev, [cliente]: true }));
    
    try {
      const data = new FormData();
      data.append('file', file);
      
      // Simular procesamiento del Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Aquí iría la lógica para procesar el Excel con SheetJS
          // Por ahora simularemos algunos trabajadores
          const trabajadoresSimulados = [
            { nombre: 'Juan Pérez', rut: '12.345.678-9', cargo: 'Operario' },
            { nombre: 'María González', rut: '98.765.432-1', cargo: 'Supervisora' },
            { nombre: 'Carlos Rodríguez', rut: '11.222.333-4', cargo: 'Técnico' }
          ];
          
          // Inicializar estados de documentos por trabajador
          const trabajadoresConEstados = trabajadoresSimulados.map(trabajador => ({
            ...trabajador,
            documentos: {}
          }));
          
          // Inicializar estados para documentos por trabajador
          const data = clientes[cliente];
          if (data) {
            const docsDelCliente = [...data.documentos.mensuales, ...data.documentos.unicos];
            const docsPorTrabajador = docsDelCliente.filter(doc => 
              documentosPorTrabajador.includes(doc)
            );
            
            trabajadoresConEstados.forEach(trabajador => {
              docsPorTrabajador.forEach(doc => {
                trabajador.documentos[doc] = {
                  estado: ESTADOS_DOCUMENTO.PENDIENTE,
                  fechaActualizacion: null,
                  observaciones: ''
                };
              });
            });
          }
          
          setTrabajadoresPorCliente(prev => ({
            ...prev,
            [cliente]: trabajadoresConEstados
          }));
          
          alert(`Nómina procesada exitosamente: ${trabajadoresSimulados.length} trabajadores agregados`);
        } catch (error) {
          alert('Error procesando el archivo Excel');
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      alert('Error subiendo el archivo');
    } finally {
      setSubiendoNomina(prev => ({ ...prev, [cliente]: false }));
    }
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
                  estado: nuevoEstado,
                  fechaActualizacion: new Date().toISOString(),
                  observaciones: ''
                }
              }
            }
          : trabajador
      ) || []
    }));
  };

  // Función para togglear gestión de trabajadores
  const toggleGestionTrabajadores = (cliente) => {
    setMostrarGestionTrabajadores(prev => ({
      ...prev,
      [cliente]: !prev[cliente]
    }));
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
      setUltimoGuardado(datosGuardados.ultimoGuardado || null);
    } else {
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
      
      localStorage.setItem('pgr_cumplimiento_contratos_v4', JSON.stringify(datosParaGuardar));
      setUltimoGuardado(new Date().toISOString());
      
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

  // Función para alternar estado de documento
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

  // Obtener estadísticas mejoradas basándose en clientes activos del mes
  const obtenerEstadisticas = () => {
    const clientesActivos = obtenerClientesActivosEnMes(mesSeleccionado);
    const total = clientesActivos.length;
    
    const porcentajes = clientesActivos.map(([nombre, data]) => 
      calcularPorcentaje(nombre)
    );
    
    const criticos = porcentajes.filter(p => p < 50).length;
    const proceso = porcentajes.filter(p => p >= 50 && p < 90).length;
    const completos = porcentajes.filter(p => p >= 90).length;
    const promedio = total > 0 ? Math.round(
      porcentajes.reduce((sum, p) => sum + p, 0) / total
    ) : 0;
    
    // Contar documentos por estado
    const estadoMes = obtenerEstadoDocumentos(mesSeleccionado);
    let enRevision = 0;
    let rechazados = 0;
    
    clientesActivos.forEach(([cliente, data]) => {
      [...data.documentos.mensuales, ...data.documentos.unicos].forEach(doc => {
        const tipo = data.documentos.mensuales.includes(doc) ? 'mensuales' : 'unicos';
        const estado = estadoMes[cliente]?.[tipo]?.[doc]?.estado;
        if (estado === ESTADOS_DOCUMENTO.EN_REVISION) enRevision++;
        if (estado === ESTADOS_DOCUMENTO.RECHAZADO) rechazados++;
      });
    });
    
    return {
      total,
      criticos,
      proceso,
      completos,
      promedio,
      enRevision,
      rechazados
    };
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

  // Filtrado de clientes mejorado basándose en clientes activos del mes
  const clientesFiltrados = obtenerClientesActivosEnMes(mesSeleccionado).filter(([nombre, data]) => {
    // Filtro de búsqueda
    const cumpleBusqueda = !busqueda || 
      nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      data.categoria.toLowerCase().includes(busqueda.toLowerCase());
    
    // Filtro de cliente específico
    const cumpleFiltroCliente = !clienteFiltro || clienteFiltro === nombre;
    
    // Calcular porcentaje para filtro de estado
    const porcentaje = calcularPorcentaje(nombre);
    const cumpleFiltroEstado = filtroEstado === 'todos' ||
      (filtroEstado === 'criticos' && porcentaje < 50) ||
      (filtroEstado === 'proceso' && porcentaje >= 50 && porcentaje < 90) ||
      (filtroEstado === 'completos' && porcentaje >= 90);

    return cumpleBusqueda && cumpleFiltroCliente && cumpleFiltroEstado;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
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

          {/* Estadísticas generales */}
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

            {/* Banner informativo del mes */}
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={24} className="text-green-600" />
                  <div>
                    <h3 className="font-bold text-green-900">
                      📊 {(() => {
                        const [año, mes] = mesSeleccionado.split('-');
                        const mesesNombres = [
                          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                        ];
                        const mesNombre = mesesNombres[parseInt(mes) - 1];
                        const clientesActivos = obtenerClientesActivosEnMes(mesSeleccionado);
                        return `${clientesActivos.length} clientes activos en ${mesNombre} ${año}`;
                      })()}
                    </h3>
                    <p className="text-green-700 text-sm">
                      {(() => {
                        const [año, mes] = mesSeleccionado.split('-');
                        const fechaCertificacion = new Date(parseInt(año), parseInt(mes), 15);
                        const mesesNombres = [
                          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                        ];
                        const fechaCertificacionStr = `${fechaCertificacion.getDate()} de ${mesesNombres[fechaCertificacion.getMonth()]} ${fechaCertificacion.getFullYear()}`;
                        return `Certificación programada para el ${fechaCertificacionStr}`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {(() => {
                      const clientesActivos = obtenerClientesActivosEnMes(mesSeleccionado);
                      const clientesConDocumentos = clientesActivos.filter(([nombre, data]) => 
                        data.documentos.mensuales.length > 0 || data.documentos.unicos.length > 0
                      );
                      return `${clientesConDocumentos.length} con documentos`;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={20} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{estadisticas.total}</p>
                <p className="text-xs text-blue-600">Activos</p>
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
            </div>

            {/* Notificaciones desplegables */}
            {mostrarNotificaciones && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                  <Bell size={20} />
                  Notificaciones del Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Controles y filtros */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col gap-4">
              {/* Primera fila - Filtros principales */}
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
                    <option value="">👥 Todos los clientes activos</option>
                    {obtenerClientesActivosEnMes(mesSeleccionado).map(([nombreCliente, data]) => {
                      let etiqueta = `${data.icono} ${nombreCliente}`;
                      if (data.fechaTermino) {
                        const [añoTermino, mesTermino] = data.fechaTermino.split('-');
                        const fechaTermino = new Date(parseInt(añoTermino), parseInt(mesTermino) - 1, 1);
                        const mesNombres = [
                          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                        ];
                        etiqueta += ` (Terminado ${mesNombres[fechaTermino.getMonth()]} ${fechaTermino.getFullYear()})`;
                      }
                      
                      return (
                        <option key={nombreCliente} value={nombreCliente}>
                          {etiqueta}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              {/* Segunda fila - Búsqueda y filtros adicionales */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3">
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
                
                {/* Botones de acción */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setMostrarTablaCriticos(!mostrarTablaCriticos)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      mostrarTablaCriticos 
                        ? 'bg-red-600 text-white' 
                        : 'bg-white text-red-600 border border-red-600'
                    }`}
                  >
                    <AlertTriangle size={16} />
                    Tabla Críticos
                  </button>

                  <button
                    onClick={() => setMostrarDetalles(!mostrarDetalles)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      mostrarDetalles 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-blue-600 border border-blue-600'
                    }`}
                  >
                    <Eye size={16} />
                    Detalles
                  </button>
                </div>
              </div>
            </div>

            {/* Leyenda de estados */}
            {mostrarDetalles && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-3">Leyenda de Estados</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-blue-100">
                    <Circle size={16} className="text-gray-400" />
                    <div>
                      <div className="font-semibold text-gray-700">Pendientes</div>
                      <div className="text-gray-600">No iniciados</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-blue-100">
                    <Upload size={16} className="text-blue-500" />
                    <div>
                      <div className="font-semibold text-blue-700">Cargados</div>
                      <div className="text-blue-600">Subidos</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-blue-100">
                    <Hourglass size={16} className="text-yellow-500" />
                    <div>
                      <div className="font-semibold text-yellow-700">En Revisión</div>
                      <div className="text-yellow-600">Evaluando</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-blue-100">
                    <XCircle size={16} className="text-red-500" />
                    <div>
                      <div className="font-semibold text-red-700">Rechazados</div>
                      <div className="text-red-600">A corregir</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-blue-100">
                    <CheckCircle size={16} className="text-green-500" />
                    <div>
                      <div className="font-semibold text-green-700">Aceptados</div>
                      <div className="text-green-600">Aprobados</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de clientes críticos */}
          {mostrarTablaCriticos && (
            <div className="p-6 border-b border-gray-200 bg-red-50">
              <h3 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} />
                Clientes Críticos (Menos del 50% de documentos aceptados)
              </h3>
              <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Cliente</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Progreso</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Documentos</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Pendientes</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-red-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {obtenerClientesActivosEnMes(mesSeleccionado)
                      .filter(([nombre]) => calcularPorcentaje(nombre) < 50)
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
                          <tr key={nombre} className="hover:bg-red-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{data.icono}</span>
                                <div>
                                  <div className="font-medium text-red-900">{nombre}</div>
                                  <div className="text-xs text-red-700">{data.categoria}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-red-200 rounded-full h-2">
                                  <div 
                                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${porcentaje}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-red-900">{porcentaje}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-sm text-red-900">{totalDocs} total</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1 text-xs">
                                {estadosCount.pendientes > 0 && (
                                  <span className="text-gray-600">{estadosCount.pendientes} pendientes</span>
                                )}
                        </div>

                        {/* Gestión por Trabajadores */}
                        <div className="mt-6 border-t pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                              <PersonStanding size={16} className="text-indigo-600" />
                              Gestión por Trabajadores
                            </h4>
                            <div className="flex gap-2">
                              <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    subirNominaExcel(nombre, file);
                                    e.target.value = ''; // Reset input
                                  }
                                }}
                                className="hidden"
                                id={`excel-${nombre}`}
                              />
                              <label
                                htmlFor={`excel-${nombre}`}
                                className={`px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors cursor-pointer flex items-center gap-1 ${
                                  subiendoNomina[nombre] ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <FileSpreadsheet size={14} />
                                {subiendoNomina[nombre] ? 'Procesando...' : 'Subir Nómina Excel'}
                              </label>
                              <button
                                onClick={() => toggleGestionTrabajadores(nombre)}
                                className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                                  mostrarGestionTrabajadores[nombre]
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                <UserCheck size={14} />
                                {mostrarGestionTrabajadores[nombre] ? 'Ocultar' : 'Mostrar'} Trabajadores
                              </button>
                            </div>
                          </div>

                          {/* Información sobre documentos por trabajador */}
                          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <p className="text-sm text-indigo-800 mb-2">
                              <strong>Documentos gestionados por trabajador:</strong>
                            </p>
                            <div className="text-xs text-indigo-700">
                              {(() => {
                                const docsDelCliente = [...data.documentos.mensuales, ...data.documentos.unicos];
                                const docsPorTrabajador = docsDelCliente.filter(doc => 
                                  documentosPorTrabajador.includes(doc)
                                );
                                return docsPorTrabajador.length > 0 
                                  ? docsPorTrabajador.join(', ')
                                  : 'No hay documentos que requieran gestión individual por trabajador';
                              })()}
                            </div>
                          </div>

                          {/* Lista de trabajadores */}
                          {mostrarGestionTrabajadores[nombre] && (
                            <div>
                              {trabajadoresPorCliente[nombre]?.length > 0 ? (
                                <div className="space-y-3">
                                  {trabajadoresPorCliente[nombre].map((trabajador, index) => (
                                    <div key={trabajador.rut} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <h5 className="font-medium text-gray-900">{trabajador.nombre}</h5>
                                          <p className="text-sm text-gray-600">RUT: {trabajador.rut} • {trabajador.cargo}</p>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {(() => {
                                            const docsDelTrabajador = Object.keys(trabajador.documentos || {});
                                            const docsAceptados = docsDelTrabajador.filter(doc => 
                                              trabajador.documentos[doc]?.estado === ESTADOS_DOCUMENTO.ACEPTADO
                                            ).length;
                                            const porcentaje = docsDelTrabajador.length > 0 
                                              ? Math.round((docsAceptados / docsDelTrabajador.length) * 100)
                                              : 0;
                                            return `${porcentaje}% (${docsAceptados}/${docsDelTrabajador.length})`;
                                          })()}
                                        </div>
                                      </div>
                                      
                                      {/* Documentos del trabajador */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {Object.entries(trabajador.documentos || {}).map(([documento, info]) => {
                                          const display = getEstadoDisplay(info.estado);
                                          const IconoEstado = display.icon;
                                          
                                          return (
                                            <div key={documento} className={`border rounded p-2 ${display.bg} text-xs`}>
                                              <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1">
                                                  <IconoEstado size={12} className={display.color} />
                                                  <span className={`text-xs ${display.color}`}>{display.text}</span>
                                                </div>
                                                <button
                                                  onClick={() => {
                                                    let nuevoEstado;
                                                    switch (info.estado) {
                                                      case ESTADOS_DOCUMENTO.PENDIENTE:
                                                        nuevoEstado = ESTADOS_DOCUMENTO.ACEPTADO;
                                                        break;
                                                      case ESTADOS_DOCUMENTO.ACEPTADO:
                                                        nuevoEstado = ESTADOS_DOCUMENTO.PENDIENTE;
                                                        break;
                                                      default:
                                                        nuevoEstado = ESTADOS_DOCUMENTO.ACEPTADO;
                                                    }
                                                    cambiarEstadoDocumentoTrabajador(nombre, trabajador.rut, documento, nuevoEstado);
                                                  }}
                                                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                                                  title="Cambiar estado"
                                                >
                                                  <CheckSquare size={12} />
                                                </button>
                                              </div>
                                              <div className="font-medium text-gray-700 leading-tight">
                                                {documento}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                                  <FileSpreadsheet size={48} className="mx-auto mb-4 text-gray-400" />
                                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sin nómina cargada</h3>
                                  <p className="text-gray-600 mb-4">
                                    Sube un archivo Excel con la nómina de trabajadores para gestionar documentos individuales
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    El archivo debe contener las columnas: Nombre, RUT, Cargo
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCumplimiento;
                                {estadosCount.rechazados > 0 && (
                                  <span className="text-red-600">{estadosCount.rechazados} rechazados</span>
                                )}
                                {estadosCount.revision > 0 && (
                                  <span className="text-yellow-600">{estadosCount.revision} en revisión</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => {
                                  setClienteFiltro(nombre);
                                  setMostrarTablaCriticos(false);
                                }}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                              >
                                Ver Detalles
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

          {/* Lista de clientes */}
          <div className="p-6">
            {/* Mensaje cuando no hay cliente seleccionado */}
            {!clienteFiltro && (
              <div className="text-center py-12 bg-blue-50 rounded-lg border border-blue-200 mb-6">
                <Building size={48} className="mx-auto mb-4 text-blue-400" />
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Seleccione un Cliente para {(() => {
                    const [año, mes] = mesSeleccionado.split('-');
                    const mesesNombres = [
                      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                    ];
                    const mesNombre = mesesNombres[parseInt(mes) - 1];
                    return `${mesNombre} ${año}`;
                  })()}
                </h3>
                <p className="text-blue-700 text-sm mb-4">
                  {(() => {
                    const clientesActivos = obtenerClientesActivosEnMes(mesSeleccionado);
                    const clientesConDocumentos = clientesActivos.filter(([nombre, data]) => 
                      data.documentos.mensuales.length > 0 || data.documentos.unicos.length > 0
                    );
                    return `${clientesConDocumentos.length} clientes con documentos disponibles para este período`;
                  })()}
                </p>
                <div className="text-center">
                  <span className="text-blue-600 text-sm">
                    {(() => {
                      const [año, mes] = mesSeleccionado.split('-');
                      const fechaCertificacion = new Date(parseInt(año), parseInt(mes), 15);
                      const mesesNombres = [
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ];
                      const fechaCertificacionStr = `${fechaCertificacion.getDate()} de ${mesesNombres[fechaCertificacion.getMonth()]} ${fechaCertificacion.getFullYear()}`;
                      return `Certificación programada para el ${fechaCertificacionStr}`;
                    })()}
                  </span>
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
                    <div className="p-4 cursor-pointer" onClick={() => toggleCliente(nombre)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {expandido ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            <span className="text-2xl">{data.icono}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg">{nombre}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorPorcentaje(porcentaje)}`}>
                                {porcentaje}%
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                {getIconoModalidad(data.modalidad)}
                                <span>{data.modalidad}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText size={14} />
                                <span>{totalDocumentos} documentos</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>{data.frecuencia}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                porcentaje < 50 ? 'bg-red-500' : 
                                porcentaje < 90 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${porcentaje}%` }}
                            ></div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {totalMensuales}M + {totalUnicos}U
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido expandido */}
                    {expandido && (
                      <div className="border-t bg-white p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Información del cliente */}
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3">Información del Cliente</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-gray-500" />
                                <span>{data.contacto}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-500" />
                                <span>Desde {data.fechaInicio}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Award size={14} className="text-gray-500" />
                                <span>{data.categoria}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progreso detallado */}
                          <div>
                            <h4 className="font-semibold text-gray-800 mb-3">Progreso Detallado</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Documentos Mensuales</span>
                                <span className="text-sm font-medium">{totalMensuales}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Documentos Únicos</span>
                                <span className="text-sm font-medium">{totalUnicos}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Progreso Total</span>
                                <span className="text-sm font-medium">{porcentaje}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Documentos */}
                        <div className="mt-6 space-y-6">
                          {/* Documentos mensuales */}
                          {data.documentos.mensuales.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                  <Calendar size={16} className="text-blue-600" />
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
                                  const display = getEstadoDisplay(infoDoc.estado);
                                  const IconoEstado = display.icon;
                                  
                                  return (
                                    <div key={index} className={`border rounded-lg p-3 ${display.bg} transition-all hover:shadow-md`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <IconoEstado size={16} className={display.color} />
                                          <span className="text-sm font-medium">{display.text}</span>
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => toggleDocumento(nombre, documento, 'mensuales')}
                                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                                            title="Cambiar estado"
                                          >
                                            <CheckSquare size={16} />
                                          </button>
                                          <button
                                            onClick={() => rechazarDocumento(nombre, documento, 'mensuales')}
                                            className="p-1 rounded hover:bg-red-100 transition-colors"
                                            title="Rechazar"
                                          >
                                            <X size={12} className="text-red-600" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="font-medium text-sm mb-1">{documento}</div>
                                        <div className="text-xs text-gray-600">
                                          {infoDoc.fechaActualizacion && (
                                            <div>
                                              Actualizado: {new Date(infoDoc.fechaActualizacion).toLocaleDateString('es-CL')}
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
                                  const display = getEstadoDisplay(infoDoc.estado);
                                  const IconoEstado = display.icon;
                                  
                                  return (
                                    <div key={index} className={`border rounded-lg p-3 ${display.bg} transition-all hover:shadow-md`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <IconoEstado size={16} className={display.color} />
                                          <span className="text-sm font-medium">{display.text}</span>
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => toggleDocumento(nombre, documento, 'unicos')}
                                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                                            title="Cambiar estado"
                                          >
                                            <CheckSquare size={16} />
                                          </button>
                                          <button
                                            onClick={() => rechazarDocumento(nombre, documento, 'unicos')}
                                            className="p-1 rounded hover:bg-red-100 transition-colors"
                                            title="Rechazar"
                                          >
                                            <X size={12} className="text-red-600" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="font-medium text-sm mb-1">{documento}</div>
                                        <div className="text-xs text-gray-600">
                                          {infoDoc.fechaActualizacion && (
                                            <div>
                                              Actualizado: {new Date(infoDoc.fechaActualizacion).toLocaleDateString('es-CL')}
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
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCumplimiento;
