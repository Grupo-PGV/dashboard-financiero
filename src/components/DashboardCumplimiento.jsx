// DashboardCumplimiento.jsx - Código Completo Corregido
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

  // Constantes de estados de documentos
  const ESTADOS_DOCUMENTO = {
    PENDIENTE: 'pendiente',
    CARGADO: 'cargado',
    EN_REVISION: 'en_revision',
    ACEPTADO: 'aceptado',
    RECHAZADO: 'rechazado'
  };

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
    'Listado de trabajadores'
  ];

  // Datos de clientes (simulados)
  const clientes = {
    'Walmart': {
      fechaInicio: '2024-01',
      fechaTermino: null,
      documentos: {
        mensuales: ['Liquidaciones de Sueldo', 'Nómina de Personal', 'Planilla Cotizaciones Previsionales'],
        unicos: ['Contrato de trabajo', 'Cédula de Identidad']
      }
    },
    'Tottus': {
      fechaInicio: '2024-03',
      fechaTermino: null,
      documentos: {
        mensuales: ['Liquidaciones de Sueldo mensual', 'Listado de trabajadores'],
        unicos: ['Contrato y Anexos de Trabajo empleado', 'Fotocopia de cédula de Identidad vigente']
      }
    }
  };

  // 🔧 FUNCIÓN MEJORADA PARA SUBIR NÓMINA EN EXCEL
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
          
          // PROCESAMIENTO MEJORADO DEL EXCEL CON SheetJS
          const data = new Uint8Array(e.target.result);
          
          // Importar SheetJS dinámicamente
          console.log('📦 Cargando librería XLSX...');
          const XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
          
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
          
          if (!error.message.includes('columnas')) {
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

  // Función auxiliar para obtener información de estado de documento
  const obtenerInfoDocumento = (cliente, documento, tipo) => {
    const estadoDoc = estadoDocumentosPorMes[mesSeleccionado]?.[cliente]?.[tipo]?.[documento];
    return estadoDoc || { estado: ESTADOS_DOCUMENTO.PENDIENTE, fechaActualizacion: null, observaciones: '' };
  };

  // Función auxiliar para obtener display de estado
  const getEstadoDisplay = (estado) => {
    const displays = {
      [ESTADOS_DOCUMENTO.PENDIENTE]: { 
        icon: Circle, 
        color: 'text-gray-400', 
        bg: 'bg-gray-50 border-gray-200',
        label: 'Pendiente' 
      },
      [ESTADOS_DOCUMENTO.CARGADO]: { 
        icon: FileText, 
        color: 'text-blue-500', 
        bg: 'bg-blue-50 border-blue-200',
        label: 'Cargado' 
      },
      [ESTADOS_DOCUMENTO.EN_REVISION]: { 
        icon: Clock, 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-50 border-yellow-200',
        label: 'En Revisión' 
      },
      [ESTADOS_DOCUMENTO.ACEPTADO]: { 
        icon: CheckCircle, 
        color: 'text-green-500', 
        bg: 'bg-green-50 border-green-200',
        label: 'Aceptado' 
      },
      [ESTADOS_DOCUMENTO.RECHAZADO]: { 
        icon: XCircle, 
        color: 'text-red-500', 
        bg: 'bg-red-50 border-red-200',
        label: 'Rechazado' 
      }
    };
    return displays[estado] || displays[ESTADOS_DOCUMENTO.PENDIENTE];
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

  // Función para exportar nómina procesada
  const exportarNomina = (cliente) => {
    const trabajadores = trabajadoresPorCliente[cliente];
    if (!trabajadores || trabajadores.length === 0) {
      alert('No hay trabajadores cargados para exportar');
      return;
    }

    // Crear CSV
    const headers = ['Nombre', 'RUT', 'Cargo', 'Estado General'];
    const rows = trabajadores.map(trabajador => {
      const totalDocs = Object.keys(trabajador.documentos).length;
      const docsAceptados = Object.values(trabajador.documentos).filter(doc => 
        doc.estado === ESTADOS_DOCUMENTO.ACEPTADO
      ).length;
      
      const estadoGeneral = totalDocs === 0 ? 'Sin documentos' : 
                           docsAceptados === totalDocs ? 'Completo' :
                           docsAceptados > 0 ? `${docsAceptados}/${totalDocs} documentos` : 'Pendiente';

      return [trabajador.nombre, trabajador.rut, trabajador.cargo, estadoGeneral];
    });

    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `nomina_${cliente}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Renderizado del componente principal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="text-blue-600" />
              Dashboard de Cumplimiento
            </h1>
            <p className="text-gray-600">Control y seguimiento de documentación por cliente</p>
          </div>
          {onCerrarSesion && (
            <button
              onClick={onCerrarSesion}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-6">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes de seguimiento
              </label>
              <input
                type="month"
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="cargado">Cargado</option>
                <option value="en_revision">En Revisión</option>
                <option value="aceptado">Aceptado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={clienteFiltro}
                onChange={(e) => setClienteFiltro(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos los clientes</option>
                {Object.keys(clientes).map(cliente => (
                  <option key={cliente} value={cliente}>{cliente}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Búsqueda
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="space-y-4">
          {Object.entries(clientes)
            .filter(([nombre]) => !clienteFiltro || nombre === clienteFiltro)
            .filter(([nombre]) => !busqueda || nombre.toLowerCase().includes(busqueda.toLowerCase()))
            .map(([nombre, data]) => {
              const isExpanded = clientesExpandidos[nombre];
              
              return (
                <div key={nombre} className="bg-white rounded-lg shadow-sm border">
                  {/* Header del cliente */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Building className="text-blue-600" size={24} />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{nombre}</h3>
                          <p className="text-sm text-gray-600">
                            Activo desde {data.fechaInicio}
                            {data.fechaTermino && ` hasta ${data.fechaTermino}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleSubmenuCliente(nombre)}
                          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            submenuActivo[nombre] 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <FileSpreadsheet size={16} />
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

                  {/* Submenu de nómina */}
                  {submenuActivo[nombre] && (
                    <div className="p-4 bg-blue-50 border-b border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <FileSpreadsheet size={18} />
                        Gestión de Nómina Excel
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-800 mb-2">
                            Subir archivo Excel
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
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                          />
                          {subiendoNomina[nombre] && (
                            <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                              <Clock size={14} className="animate-spin" />
                              Procesando archivo...
                            </p>
                          )}
                        </div>
                        
                        {trabajadoresPorCliente[nombre]?.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-blue-800 mb-2">
                              Acciones
                            </label>
                            <button
                              onClick={() => exportarNomina(nombre)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                              <Download size={16} />
                              Exportar Nómina
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-medium text-gray-800 mb-2">Formato requerido:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Columna "Nombre": Nombre completo del trabajador</li>
                          <li>• Columna "RUT": RUT con formato chileno</li>
                          <li>• Columna "Cargo": Función del trabajador (opcional)</li>
                        </ul>
                      </div>

                      {/* Lista de trabajadores cargados */}
                      {trabajadoresPorCliente[nombre]?.length > 0 && (
                        <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
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
                        <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300 mt-4">
                          <FileSpreadsheet size={48} className="mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin nómina cargada</h3>
                          <p className="text-gray-600">
                            Sube un archivo Excel con la nómina de trabajadores para comenzar
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contenido expandido - documentos regulares */}
                  {isExpanded && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Documentos mensuales */}
                        {data.documentos.mensuales.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-3">Documentos Mensuales</h4>
                            <div className="space-y-2">
                              {data.documentos.mensuales.map(doc => {
                                const info = obtenerInfoDocumento(nombre, doc, 'mensuales');
                                const display = getEstadoDisplay(info.estado);
                                const IconoEstado = display.icon;
                                
                                return (
                                  <div key={doc} className={`p-3 rounded-lg border ${display.bg} flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                      <IconoEstado size={16} className={display.color} />
                                      <span className="text-sm font-medium text-gray-700">{doc}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${display.color} bg-white`}>
                                      {display.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Documentos únicos */}
                        {data.documentos.unicos.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-800 mb-3">Documentos Únicos</h4>
                            <div className="space-y-2">
                              {data.documentos.unicos.map(doc => {
                                const info = obtenerInfoDocumento(nombre, doc, 'unicos');
                                const display = getEstadoDisplay(info.estado);
                                const IconoEstado = display.icon;
                                
                                return (
                                  <div key={doc} className={`p-3 rounded-lg border ${display.bg} flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                      <IconoEstado size={16} className={display.color} />
                                      <span className="text-sm font-medium text-gray-700">{doc}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${display.color} bg-white`}>
                                      {display.label}
                                    </span>
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
  );
};

export default DashboardCumplimiento;
