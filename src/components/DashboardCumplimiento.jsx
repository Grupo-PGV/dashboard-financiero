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
  Trash2
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

  // Base de datos completa de clientes PGR Seguridad - ACTUALIZADA SEGÚN RESUMEN
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

  // Inicializar estado de documentos con datos aleatorios realistas
  useEffect(() => {
    const datosGuardados = JSON.parse(localStorage.getItem('pgr_cumplimiento_contratos_v3') || '{}');
    
    if (Object.keys(datosGuardados).length > 0) {
      setEstadoDocumentos(datosGuardados.estadoDocumentos || {});
      setUltimoGuardado(datosGuardados.ultimoGuardado || null);
    } else {
      // Inicializar con datos aleatorios realistas
      const estadoInicial = {};
      Object.entries(clientes).forEach(([cliente, data]) => {
        estadoInicial[cliente] = {
          mensuales: {},
          unicos: {}
        };
        
        // Inicializar documentos mensuales con porcentajes realistas
        data.documentos.mensuales.forEach(doc => {
          estadoInicial[cliente].mensuales[doc] = Math.random() > 0.4; // 60% completado
        });
        
        // Inicializar documentos únicos con porcentajes más altos
        data.documentos.unicos.forEach(doc => {
          estadoInicial[cliente].unicos[doc] = Math.random() > 0.3; // 70% completado
        });
      });
      setEstadoDocumentos(estadoInicial);
    }
  }, []);

  // Auto-guardado cada 30 segundos
  useEffect(() => {
    if (Object.keys(estadoDocumentos).length > 0) {
      const datosParaGuardar = {
        estadoDocumentos,
        ultimoGuardado: new Date().toISOString(),
        version: '3.0'
      };
      
      localStorage.setItem('pgr_cumplimiento_contratos_v3', JSON.stringify(datosParaGuardar));
      setUltimoGuardado(new Date().toISOString());
    }
  }, [estadoDocumentos]);

  // Auto-guardado temporal cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (ultimoGuardado) {
        setUltimoGuardado(new Date().toISOString());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [ultimoGuardado]);

  // Función para calcular porcentaje con filtros
  const calcularPorcentaje = (cliente, tipoFiltro = null) => {
    const data = clientes[cliente];
    if (!data) return 0;
    
    const filtroActual = tipoFiltro || filtroTipoDocumento;
    let documentosRelevantes = [];
    let completados = 0;
    
    if (filtroActual === 'todos') {
      documentosRelevantes = [...data.documentos.mensuales, ...data.documentos.unicos];
      completados = [
        ...data.documentos.mensuales.filter(doc => estadoDocumentos[cliente]?.mensuales?.[doc]),
        ...data.documentos.unicos.filter(doc => estadoDocumentos[cliente]?.unicos?.[doc])
      ].length;
    } else if (filtroActual === 'mensuales') {
      documentosRelevantes = data.documentos.mensuales;
      completados = data.documentos.mensuales.filter(doc => estadoDocumentos[cliente]?.mensuales?.[doc]).length;
    } else if (filtroActual === 'unicos') {
      documentosRelevantes = data.documentos.unicos;
      completados = data.documentos.unicos.filter(doc => estadoDocumentos[cliente]?.unicos?.[doc]).length;
    }
    
    if (documentosRelevantes.length === 0) return 100; // Sin requerimientos = 100%
    return Math.round((completados / documentosRelevantes.length) * 100);
  };

  // Obtener estadísticas dinámicas
  const obtenerEstadisticas = () => {
    const clientesList = Object.keys(clientes).filter(cliente => {
      const data = clientes[cliente];
      // Excluir INCOPORT que terminó en mayo 2025
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
    
    // Calcular próximos vencimientos (simulado)
    const proximos = Math.floor(Math.random() * 15) + 8;
    const vencidos = Math.floor(Math.random() * 5) + 2;
    
    return { total, criticos, proceso, completos, promedio, proximos, vencidos };
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
    if (modalidad.includes('Plataforma') || modalidad.includes('Prevsis') || modalidad.includes('Seyse') || modalidad.includes('SubcontrataLey') || modalidad.includes('KSEC') || modalidad.includes('Ebco')) {
      return <Globe size={16} className="text-blue-600" />;
    }
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

  // Función mejorada para marcar todos los documentos
  const marcarTodosDocumentos = (cliente, tipo, estado = null) => {
    const data = clientes[cliente];
    const documentos = data.documentos[tipo];
    const estadoActual = estadoDocumentos[cliente]?.[tipo] || {};
    
    // Si no se especifica estado, alternar basado en si todos están marcados
    const nuevoEstado = estado !== null ? estado : !documentos.every(doc => estadoActual[doc]);
    
    setEstadoDocumentos(prev => ({
      ...prev,
      [cliente]: {
        ...prev[cliente],
        [tipo]: documentos.reduce((acc, doc) => ({
          ...acc,
          [doc]: nuevoEstado
        }), {})
      }
    }));
  };

  const limpiarTodosDocumentos = (cliente, tipo) => {
    marcarTodosDocumentos(cliente, tipo, false);
  };

  // Filtrado de clientes
  const clientesFiltrados = Object.entries(clientes).filter(([nombre, data]) => {
    // Excluir INCOPORT que terminó en mayo 2025
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

  // Matriz Walmart completa con 4 categorías
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
                <p className="text-blue-100">Control integral de documentación por cliente • Sistema completo PGR Seguridad</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-200">
                    Activos: {estadisticas.total} clientes • Terminados: 1 cliente (INCOPORT - Mayo 2025) • Auto-guardado cada 30s
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
                  {estadisticas.criticos}
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
                    📅 Período Activo: {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta}
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Filtros por tipo de documento mensuales/únicos y seguimiento 2025. Auto-guardado automático cada 30 segundos.
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
              <p className="text-xs text-purple-600">General</p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock size={20} className="text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Próximos</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{estadisticas.proximos}</p>
              <p className="text-xs text-orange-600">Vencimientos</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertOctagon size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Vencidos</span>
              </div>
              <p className="text-2xl font-bold text-gray-700">{estadisticas.vencidos}</p>
              <p className="text-xs text-gray-600">Documentos</p>
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

              {/* Filtro por tipo de documento - MEJORADO */}
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-500" />
                <select
                  value={filtroTipoDocumento}
                  onChange={(e) => setFiltroTipoDocumento(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="todos">📋 Todos los documentos</option>
                  <option value="mensuales">🗓️ Solo Mensuales (Renovación mensual)</option>
                  <option value="unicos">📄 Solo Únicos (Carga inicial)</option>
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
                  <option value="todos">📋 Ver todos los clientes activos</option>
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
                    .filter(([nombre]) => nombre !== 'INCOPORT' && calcularPorcentaje(nombre) < 50)
                    .slice(0, 10)
                    .map(([nombre, data], index) => {
                      const porcentaje = calcularPorcentaje(nombre);
                      const totalDocs = data.documentos.mensuales.length + data.documentos.unicos.length;
                      const docsCompletados = Math.round((porcentaje * totalDocs) / 100);
                      
                      return (
                        <tr key={nombre} className={index % 2 === 0 ? 'bg-white' : 'bg-red-25'}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{data.icono}</span>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{nombre}</div>
                                <div className="text-xs text-gray-500">{data.categoria} • Desde {data.fechaInicio}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm">
                              <span className="font-medium">{docsCompletados}/{totalDocs}</span>
                              <div className="text-xs text-gray-500">
                                {data.documentos.mensuales.length}M + {data.documentos.unicos.length}U
                              </div>
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
                  📋 Mostrando {Math.min(10, estadisticas.criticos)} de {estadisticas.criticos} clientes críticos en {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta}
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
                  📋 INCOPORT <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs">TERMINADO MAYO 2025</span>
                </h3>
                <p className="text-gray-600 text-sm">
                  Cliente finalizado • 4 años de servicio (Enero 2021 - Mayo 2025) • 5 documentos mensuales completados
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium border">
                100% Final
              </div>
              <p className="text-xs text-gray-500 mt-1">Documentación archivada</p>
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
                o seleccione "Ver todos los clientes activos" para mostrar la lista completa.
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
                              Desde {data.fechaInicio}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <strong>Contacto:</strong> 
                              {data.contacto !== 'N/A' ? (
                                <a href={`mailto:${data.contacto}`} className="text-blue-600 hover:underline ml-1">
                                  {data.contacto}
                                </a>
                              ) : (
                                <span className="text-gray-500 ml-1">Sin contacto específico</span>
                              )}
                            </div>
                            {data.plataforma && (
                              <div>
                                <strong>Plataforma:</strong> 
                                <span className="text-blue-600 ml-1">{data.plataforma}</span>
                              </div>
                            )}
                            <div>
                              <strong>Frecuencia:</strong> {data.frecuencia}
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
                                  <Calendar size={16} className="text-green-600" />
                                  Documentos Mensuales ({data.documentos.mensuales.length})
                                  <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                    Renovación cada mes
                                  </span>
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => marcarTodosDocumentos(nombre, 'mensuales', true)}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
                                  >
                                    <CheckSquare size={14} />
                                    ✓ Todos
                                  </button>
                                  <button
                                    onClick={() => limpiarTodosDocumentos(nombre, 'mensuales')}
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex items-center gap-1"
                                  >
                                    <Trash2 size={14} />
                                    ✗ Limpiar
                                  </button>
                                </div>
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
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
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
                                  <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                    Carga inicial una sola vez
                                  </span>
                                </h4>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => marcarTodosDocumentos(nombre, 'unicos', true)}
                                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors flex items-center gap-1"
                                  >
                                    <CheckSquare size={14} />
                                    ✓ Todos
                                  </button>
                                  <button
                                    onClick={() => limpiarTodosDocumentos(nombre, 'unicos')}
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors flex items-center gap-1"
                                  >
                                    <Trash2 size={14} />
                                    ✗ Limpiar
                                  </button>
                                </div>
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
                                  <p className="text-blue-700 text-sm">Ver 4 categorías con criterios específicos de validación</p>
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
                          <p className="font-medium">Cliente sin requerimientos documentales</p>
                          <p className="text-sm mt-1">Este cliente no requiere envío de documentación específica</p>
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
                <li>• Plataformas digitales: {Object.values(clientes).filter(c => c.modalidad.includes('Plataforma') || c.modalidad.includes('Prevsis') || c.modalidad.includes('Seyse') || c.modalidad.includes('SubcontrataLey') || c.modalidad.includes('KSEC') || c.modalidad.includes('Ebco')).filter(c => c.estado === 'Activo').length} clientes</li>
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
                  📤 Enviar recordatorios masivos a críticos
                </button>
                <button className="block w-full text-left px-3 py-2 bg-white rounded border hover:bg-gray-50 transition-colors">
                  📋 Generar reporte mensual de cumplimiento
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
              <span>Dashboard PGR Seguridad 2025 • {estadisticas.total} clientes activos</span>
              <span>•</span>
              <span>Auto-guardado: {ultimoGuardado ? 'Activo cada 30s' : 'Inicializando'}</span>
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
                      <p className="text-blue-100">4 categorías con criterios específicos de validación por documento</p>
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
                  {matrizWalmart.map((categoria, catIndex) => (
                    <div key={catIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <Building size={20} className="text-gray-600" />
                          {categoria.categoria}
                        </h3>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        {categoria.documentos.map((documento, docIndex) => (
                          <div key={docIndex} className="p-4">
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                              <FileText size={18} className="text-blue-600" />
                              {documento.nombre}
                            </h4>
                            
                            <div className="bg-gray-50 rounded-lg p-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Criterios de Validación:</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {documento.criterios.map((criterio, critIndex) => (
                                  <div key={critIndex} className="flex items-start gap-2 text-sm">
                                    <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700">{criterio}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
                        <li>• ... y 4 documentos adicionales</li>
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
                  Matriz basada en criterios oficiales de Walmart Chile S.A. • 4 categorías documentales
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
                      Requieren atención inmediata (&lt;50% documentación)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      {estadisticas.proximos} próximos vencimientos
                    </p>
                    <p className="text-xs text-yellow-700">
                      Documentos por vencer en {periodos.find(p => p.valor === mesSeleccionado)?.etiqueta}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertOctagon size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {estadisticas.vencidos} documentos vencidos
                    </p>
                    <p className="text-xs text-gray-700">
                      Requieren renovación urgente
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
                      Walmart: 8 nuevos documentos en mayo 2025
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Sistema funcionando
                    </p>
                    <p className="text-xs text-green-700">
                      Auto-guardado activo • {estadisticas.total} clientes monitoreados
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
