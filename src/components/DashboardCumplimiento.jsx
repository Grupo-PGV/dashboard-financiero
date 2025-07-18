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

  // Función para obtener el display del estado
  const getEstadoDisplay = (estado) => {
    switch (estado) {
      case ESTADOS_DOCUMENTO.PENDIENTE:
        return { icon: Circle, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', text: 'Pendiente' };
      case ESTADOS_DOCUMENTO.CARGADO:
        return { icon: Upload, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', text: 'Cargado' };
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
    const clientesActivos = Object.keys(clientes);
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
      if (info.estado === ESTADOS_DOCUMENTO.ACEPTADO) {
        aceptados++;
      }
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
      const nuevoEstado = { ...prev };
      
      documentos.forEach(documento => {
        if (!nuevoEstado[mesSeleccionado]) nuevoEstado[mesSeleccionado] = {};
        if (!nuevoEstado[mesSeleccionado][cliente]) nuevoEstado[mesSeleccionado][cliente] = {};
        if (!nuevoEstado[mesSeleccionado][cliente][tipo]) nuevoEstado[mesSeleccionado][cliente][tipo] = {};
        
        nuevoEstado[mesSeleccionado][cliente][tipo][documento] = {
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString(),
          observaciones: ''
        };
      });
      
      return nuevoEstado;
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

  // Función para subir nómina en Excel
  const subirNominaExcel = async (cliente, file) => {
    setSubiendoNomina(prev => ({ ...prev, [cliente]: true }));
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // PROCESAMIENTO REAL DEL EXCEL CON SheetJS
          const data = new Uint8Array(e.target.result);
          
          // Importar SheetJS dinámicamente
          const XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
          
          // Leer el archivo Excel
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            throw new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos');
          }
          
          // Identificar columnas (buscar variaciones de nombres)
          const headers = jsonData[0].map(h => h?.toString().toLowerCase().trim());
          const nombreCol = headers.findIndex(h => 
            h.includes('nombre') || h.includes('name') || h.includes('trabajador')
          );
          const rutCol = headers.findIndex(h => 
            h.includes('rut') || h.includes('id') || h.includes('identificacion')
          );
          const cargoCol = headers.findIndex(h => 
            h.includes('cargo') || h.includes('puesto') || h.includes('position') || h.includes('función')
          );
          
          if (nombreCol === -1 || rutCol === -1) {
            throw new Error('El archivo debe contener columnas "Nombre" y "RUT". Columnas encontradas: ' + headers.join(', '));
          }
          
          // Procesar trabajadores
          const trabajadoresProcesados = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const nombre = row[nombreCol]?.toString().trim();
            const rut = row[rutCol]?.toString().trim();
            const cargo = cargoCol !== -1 ? row[cargoCol]?.toString().trim() : 'No especificado';
            
            if (nombre && rut) {
              // Validar formato RUT básico
              const rutLimpio = rut.replace(/[^\dkK\-\.]/g, '');
              
              const trabajador = {
                nombre,
                rut: rutLimpio,
                cargo,
                documentos: {}
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
            }
          }
          
          if (trabajadoresProcesados.length === 0) {
            throw new Error('No se encontraron trabajadores válidos en el archivo');
          }
          
          // Guardar trabajadores procesados
          setTrabajadoresPorCliente(prev => ({
            ...prev,
            [cliente]: trabajadoresProcesados
          }));
          
          alert(`✅ Nómina procesada exitosamente:\n${trabajadoresProcesados.length} trabajadores cargados\n\nPrimeros 3 trabajadores:\n${trabajadoresProcesados.slice(0, 3).map(t => `• ${t.nombre} (${t.rut})`).join('\n')}`);
          
        } catch (error) {
          console.error('Error procesando Excel:', error);
          alert(`❌ Error procesando el archivo Excel:\n${error.message}\n\nAsegúrate de que el archivo contenga las columnas:\n• Nombre\n• RUT\n• Cargo (opcional)`);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      alert('❌ Error subiendo el archivo. Asegúrate de que sea un archivo Excel válido (.xlsx o .xls)');
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

  // Función para togglear submenu de cliente
  const toggleSubmenuCliente = (cliente) => {
    setSubmenuActivo(prev => ({
      ...prev,
      [cliente]: !prev[cliente]
    }));
  };

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

  // Función para obtener estado de documentos
  const obtenerEstadoDocumentos = () => {
    return estadoDocumentosPorMes[mesSeleccionado] || {};
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
    } else {
      setEstadoDocumentosPorMes(inicializarEstadoDocumentos());
    }

    const trabajadoresGuardados = JSON.parse(localStorage.getItem('pgr_trabajadores_v1') || '{}');
    setTrabajadoresPorCliente(trabajadoresGuardados);
  }, []);

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

  // Auto-guardado
  useEffect(() => {
    const timer = setTimeout(() => {
      setGuardandoAutomatico(true);
      localStorage.setItem('pgr_cumplimiento_contratos_v4', JSON.stringify({
        estadoDocumentosPorMes,
        ultimoGuardado: new Date().toISOString()
      }));
      localStorage.setItem('pgr_trabajadores_v1', JSON.stringify(trabajadoresPorCliente));
      setUltimoGuardado(new Date());
      setTimeout(() => setGuardandoAutomatico(false), 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, [estadoDocumentosPorMes, trabajadoresPorCliente]);

  const estadisticas = calcularEstadisticas();

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

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Selector de mes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {periodos.map(periodo => (
                    <option key={periodo.valor} value={periodo.valor}>
                      {periodo.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="criticos">Críticos (&lt; 50%)</option>
                  <option value="proceso">En proceso (50-89%)</option>
                  <option value="completos">Completos (≥ 90%)</option>
                </select>
              </div>

              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cliente, categoría..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filtro por cliente específico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={clienteFiltro}
                  onChange={(e) => setClienteFiltro(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los clientes</option>
                  {Object.keys(clientes).map(cliente => (
                    <option key={cliente} value={cliente}>{cliente}</option>
                  ))}
                </select>
              </div>

              {/* Botón de reset */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setBusqueda('');
                    setClienteFiltro('');
                    setFiltroEstado('todos');
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(clientes).map(([nombre, data]) => {
                const porcentaje = calcularPorcentaje(nombre);
                const isExpanded = clientesExpandidos[nombre];
                
                return (
                  <div key={nombre} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header del cliente */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{data.icono}</span>
                          <div>
                            <h3 className="font-bold text-gray-900">{nombre}</h3>
                            <p className="text-sm text-gray-600">{data.categoria} • {data.modalidad}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Barra de progreso */}
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  porcentaje < 50 ? 'bg-red-500' :
                                  porcentaje < 90 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${porcentaje}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                              {porcentaje}%
                            </span>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleSubmenuCliente(nombre)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <FileSpreadsheet size={14} />
                              {submenuActivo[nombre] ? 'Ocultar' : 'Gestionar'} Nómina
                            </button>
                            
                            <button
                              onClick={() => setClientesExpandidos(prev => ({
                                ...prev,
                                [nombre]: !prev[nombre]
                              }))}
                              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submenu de nómina y gestión de trabajadores */}
                    {submenuActivo[nombre] && (
                      <div className="p-4 bg-blue-50 border-b border-blue-200">
                        <div className="space-y-4">
                          {/* Sección de carga de nómina */}
                          <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                              <FileSpreadsheet size={18} />
                              Gestión de Nómina Excel
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Upload de nómina */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Subir archivo Excel con nómina
                                </label>
                                <input
                                  type="file"
                                  accept=".xlsx,.xls"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      subirNominaExcel(nombre, file);
                                    }
                                  }}
                                  disabled={subiendoNomina[nombre]}
                                  className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100
                                    disabled:opacity-50"
                                />
                                {subiendoNomina[nombre] && (
                                  <p className="text-sm text-blue-600 mt-1">Procesando archivo...</p>
                                )}
                              </div>

                              {/* Instrucciones */}
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h5 className="font-medium text-gray-800 mb-2">Formato requerido:</h5>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  <li>• Columna "Nombre": Nombre completo del trabajador</li>
                                  <li>• Columna "RUT": RUT con formato XX.XXX.XXX-X</li>
                                  <li>• Columna "Cargo": Cargo o función del trabajador</li>
                                </ul>
                              </div>
                            </div>

                            {/* Información sobre documentos por trabajador */}
                            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
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

                            {/* Botón para mostrar/ocultar trabajadores */}
                            {trabajadoresPorCliente[nombre]?.length > 0 && (
                              <div className="mt-4">
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
                                  onClick={() => toggleGestionTrabajadores(nombre)}
                                  className={`px-4 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                                    mostrarGestionTrabajadores[nombre]
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  <UserCheck size={16} />
                                  {mostrarGestionTrabajadores[nombre] ? 'Ocultar' : 'Mostrar'} Trabajadores ({trabajadoresPorCliente[nombre].length})
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Lista de trabajadores */}
                          {mostrarGestionTrabajadores[nombre] && trabajadoresPorCliente[nombre]?.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                <Users size={18} />
                                Trabajadores Cargados ({trabajadoresPorCliente[nombre].length})
                              </h4>
                              
                              <div className="space-y-3 max-h-96 overflow-y-auto">
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
                                          return `${porcentaje}% completo`;
                                        })()}
                                      </div>
                                    </div>

                                    {/* Documentos del trabajador */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {Object.entries(trabajador.documentos || {}).map(([documento, info]) => {
                                        const display = getEstadoDisplay(info.estado);
                                        const IconoEstado = display.icon;
                                        
                                        return (
                                          <div key={documento} className={`flex items-center justify-between p-2 rounded border ${display.bg}`}>
                                            <div className="flex items-center gap-2 flex-1">
                                              <button
                                                onClick={() => {
                                                  // Ciclar entre estados
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
                                                <IconoEstado size={12} className={display.color} />
                                              </button>
                                              <div className="font-medium text-gray-700 leading-tight text-xs">
                                                {documento}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Estado sin nómina */}
                          {!trabajadoresPorCliente[nombre]?.length && (
                            <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
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
                      </div>
                    )}

                    {/* Contenido expandido del cliente (documentos generales) */}
                    {isExpanded && (
                      <div className="p-4">
                        {/* Documentos mensuales */}
                        {data.documentos.mensuales.length > 0 && (
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Calendar size={16} className="text-blue-600" />
                                Documentos Mensuales ({data.documentos.mensuales.length})
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.ACEPTADO)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
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
                                          <CheckSquare size={12} />
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
                                          <CheckSquare size={12} />
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
