// src/components/DashboardCumplimiento.jsx
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
          'Liquidaciones de Sueldo',
          'Nómina de Personal',
          'Certificado F30',
          'Planilla Cotizaciones Previsionales'
        ],
        unicos: []
      }
    },
    'WALMART': {
      modalidad: 'Portal corporativo',
      icono: '🛒',
      categoria: 'Retail',
      contacto: 'portal.walmart.com',
      frecuencia: 'Mensual',
      fechaInicio: '2020-01',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Liquidaciones de Sueldo',
          'Nómina de Personal',
          'Planilla Cotizaciones Previsionales',
          'Finiquitos',
          'Cédula de Identidad',
          'Contrato y Anexos de Trabajo empleado'
        ],
        unicos: [
          'Contrato de Trabajo vigente y anexos',
          'Fotocopia de cédula de Identidad vigente'
        ]
      }
    },
    'TOTTUS': {
      modalidad: 'Portal corporativo',
      icono: '🏪',
      categoria: 'Retail',
      contacto: 'portal.tottus.com',
      frecuencia: 'Mensual',
      fechaInicio: '2020-06',
      estado: 'Activo',
      documentos: {
        mensuales: [
          'Liquidaciones de Sueldo mensual',
          'Listado de trabajadores'
        ],
        unicos: [
          'Contrato de trabajo',
          'Anexos',
          'Liquidaciones'
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
      fechaInicio: '2021-05',
      estado: 'Activo',
      documentos: {
        mensuales: [],
        unicos: []
      }
    }
  };

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

// REEMPLAZA SOLO LA FUNCIÓN subirNominaExcel en tu DashboardCumplimiento.jsx

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
      throw new Error('El archivo debe ser un Excel válido (.xlsx o .xls)');
    }

    console.log(`📄 Archivo válido: ${file.name} (${file.size} bytes)`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        console.log('🔄 Procesando contenido del archivo...');
        
        // PROCESAMIENTO CORREGIDO DEL EXCEL CON SheetJS
        const data = new Uint8Array(e.target.result);
        
        // IMPORTACIÓN CORREGIDA DE XLSX
        console.log('📦 Cargando librería XLSX...');
        let XLSX;
        
        try {
          // Método 1: Importar desde CDN con manejo correcto
          const xlsxModule = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
          
          // El objeto XLSX puede estar en diferentes lugares dependiendo del módulo
          XLSX = xlsxModule.default || xlsxModule.XLSX || xlsxModule;
          
          // Verificar que tenemos el objeto correcto
          if (!XLSX || typeof XLSX.read !== 'function') {
            throw new Error('XLSX no cargado correctamente desde CDN');
          }
          
          console.log('✅ XLSX cargado desde CDN');
          
        } catch (cdnError) {
          console.warn('⚠️ Error cargando XLSX desde CDN:', cdnError);
          
          // Método 2: Verificar si XLSX está disponible globalmente
          if (typeof window !== 'undefined' && window.XLSX) {
            XLSX = window.XLSX;
            console.log('✅ Usando XLSX global');
          } else {
            // Método 3: Crear script tag dinámico como fallback
            console.log('🔄 Cargando XLSX via script tag...');
            
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
              script.onload = () => {
                if (window.XLSX) {
                  XLSX = window.XLSX;
                  console.log('✅ XLSX cargado via script tag');
                  resolve();
                } else {
                  reject(new Error('XLSX no disponible después de cargar script'));
                }
              };
              script.onerror = () => reject(new Error('Error cargando script XLSX'));
              document.head.appendChild(script);
            });
          }
        }

        // Verificación final
        if (!XLSX || typeof XLSX.read !== 'function') {
          throw new Error('No se pudo cargar la librería XLSX. Verifica tu conexión a internet.');
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

        // Mostrar primeras filas para debugging
        console.log('🔍 Primeras 3 filas del Excel:');
        jsonData.slice(0, 3).forEach((row, i) => {
          console.log(`  Fila ${i}:`, row);
        });

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
      }
    };

    reader.onerror = (error) => {
      console.error('❌ Error leyendo archivo:', error);
      alert('❌ Error leyendo el archivo. Asegúrate de que no esté corrupto.');
    };
    
    reader.readAsArrayBuffer(file);

  } catch (error) {
    console.error('❌ Error general subiendo archivo:', error);
    alert(`❌ Error subiendo el archivo:\n${error.message}`);
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
      {/* Header con gradiente y sistema de estado */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Shield size={28} className="text-blue-200" />
                <div>
                  <h1 className="text-xl font-bold">Dashboard de Cumplimiento • PGR Seguridad</h1>
                  <p className="text-blue-200 text-sm">Control documental y seguimiento contractual</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${guardandoAutomatico ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                <span className="text-xs text-blue-200">
                  {guardandoAutomatico ? 'Guardando...' : `${estadisticas.total} clientes activos • Auto-guardado activo`}
                </span>
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
                <Eye size={20} className="text-purple-600" />
                <span className="text-sm font-medium text-purple-900">En Rev.</span>
              </div>
              <p className="text-2xl font-bold text-purple-700">{estadisticas.enRevision}</p>
              <p className="text-xs text-purple-600">Documentos</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Rechazados</span>
              </div>
              <p className="text-2xl font-bold text-gray-700">{estadisticas.rechazados}</p>
              <p className="text-xs text-gray-600">Documentos</p>
            </div>
          </div>

          {/* Controles y filtros */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Selector de mes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {periodos.map(periodo => (
                    <option key={periodo.valor} value={periodo.valor}>
                      {periodo.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select
                  value={clienteFiltro}
                  onChange={(e) => setClienteFiltro(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los clientes</option>
                  {clientesFiltrados.map(([nombre]) => (
                    <option key={nombre} value={nombre}>{nombre}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="cargado">Cargado</option>
                  <option value="en_revision">En Revisión</option>
                  <option value="aceptado">Aceptado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>

              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Búsqueda</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
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
              {clientesFiltrados.map(([nombre, data]) => {
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
                              ></div>
                            </div>
                            <span className={`font-bold ${
                              porcentaje < 50 ? 'text-red-600' :
                              porcentaje < 90 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {porcentaje}%
                            </span>
                          </div>

                          {/* Botones de acción */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleSubmenuCliente(nombre)}
                              className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                                submenuActivo[nombre] 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
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

                    {/* Submenu de nómina */}
                    {submenuActivo[nombre] && (
                      <div className="p-4 bg-blue-50 border-b border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <FileSpreadsheet size={18} />
                          Gestión de Nómina Excel
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
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
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                            />
                            {subiendoNomina[nombre] && (
                              <p className="text-sm text-blue-600 mt-1">Procesando archivo...</p>
                            )}
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded-lg">
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
                                <div key={trabajador.rut} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <h5 className="font-medium text-gray-900">{trabajador.nombre}</h5>
                                      <p className="text-sm text-gray-600">RUT: {trabajador.rut} • {trabajador.cargo}</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {Object.entries(trabajador.documentos || {}).map(([documento, info]) => {
                                      const display = getEstadoDisplay(info.estado);
                                      const IconoEstado = display.icon;
                                      
                                      return (
                                        <div key={documento} className={`flex items-center justify-between p-2 rounded border ${display.bg}`}>
                                          <div className="flex items-center gap-2 flex-1">
                                            <button
                                              onClick={() => {
                                                const nuevoEstado = info.estado === ESTADOS_DOCUMENTO.PENDIENTE 
                                                  ? ESTADOS_DOCUMENTO.ACEPTADO 
                                                  : ESTADOS_DOCUMENTO.PENDIENTE;
                                                cambiarEstadoDocumentoTrabajador(nombre, trabajador.rut, documento, nuevoEstado);
                                              }}
                                              className="p-1 rounded hover:bg-gray-200 transition-colors"
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

                        {!trabajadoresPorCliente[nombre]?.length && (
                          <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                            <FileSpreadsheet size={48} className="mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Sin nómina cargada</h3>
                            <p className="text-gray-600">
                              Sube un archivo Excel con la nómina de trabajadores
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contenido expandido */}
                    {isExpanded && (
                      <div className="p-4">
                        {/* Documentos mensuales */}
                        {data.documentos.mensuales.length > 0 && (
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-800">📋 Documentos Mensuales ({data.documentos.mensuales.length})</h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.ACEPTADO)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                                >
                                  ✓ Aceptar todos
                                </button>
                                <button
                                  onClick={() => cambiarEstadoMasivo(nombre, 'mensuales', ESTADOS_DOCUMENTO.PENDIENTE)}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
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
                                      <button
                                        onClick={() => toggleDocumento(nombre, documento, 'mensuales')}
                                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                                      >
                                        <CheckSquare size={12} />
                                      </button>
                                    </div>
                                    <div className="font-medium text-sm mb-1">{documento}</div>
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
                              <h4 className="font-semibold text-gray-800">📄 Documentos Únicos ({data.documentos.unicos.length})</h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => cambiarEstadoMasivo(nombre, 'unicos', ESTADOS_DOCUMENTO.ACEPTADO)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                                >
                                  ✓ Aceptar todos
                                </button>
                                <button
                                  onClick={() => cambiarEstadoMasivo(nombre, 'unicos', ESTADOS_DOCUMENTO.PENDIENTE)}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
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
                                      <button
                                        onClick={() => toggleDocumento(nombre, documento, 'unicos')}
                                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                                      >
                                        <CheckSquare size={12} />
                                      </button>
                                    </div>
                                    <div className="font-medium text-sm mb-1">{documento}</div>
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
