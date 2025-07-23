import React, { useState, useEffect } from 'react';
import { Upload, FileText, TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, CheckCircle, Download } from 'lucide-react';

const ModuloSaldosBancarios = () => {
  // ===== ESTADOS PRINCIPALES =====
  const [cartolasData, setCartolasData] = useState([]); // Datos de todas las cartolas cargadas
  const [saldoActual, setSaldoActual] = useState(0); // Saldo calculado actual
  const [movimientos, setMovimientos] = useState([]); // Lista de todos los movimientos
  const [isLoading, setIsLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Manejo de errores
  const [filtroFecha, setFiltroFecha] = useState('todos'); // Filtro por período
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('todas'); // Filtro por cuenta

  // ===== CONFIGURACIÓN DE FORMATOS DE CARTOLAS CHILENAS =====
  const formatosCartola = {
    // Formato estándar de bancos chilenos
    bancochile: {
      columnas: ['fecha', 'descripcion', 'numero_documento', 'cargo', 'abono', 'saldo'],
      separador: ';',
      formatoFecha: 'DD/MM/YYYY'
    },
    bci: {
      columnas: ['fecha', 'oficina', 'descripcion', 'numero', 'debito', 'credito', 'saldo'],
      separador: ',',
      formatoFecha: 'DD-MM-YYYY'
    },
    santander: {
      columnas: ['fecha', 'descripcion', 'referencia', 'cargo', 'abono', 'saldo_contable'],
      separador: ';',
      formatoFecha: 'DD/MM/YYYY'
    }
  };

  // ===== FUNCIÓN PARA PROCESAR ARCHIVO SUBIDO =====
  const procesarArchivoCartola = async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const fileContent = await leerArchivo(file);
      let movimientosProcesados = [];

      if (file.name.endsWith('.csv')) {
        movimientosProcesados = procesarCSV(fileContent);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        movimientosProcesados = await procesarExcel(file);
      } else {
        throw new Error('Formato de archivo no soportado. Use CSV o Excel.');
      }

      // Agregar los nuevos movimientos
      const nuevosMovimientos = [...movimientos, ...movimientosProcesados];
      setMovimientos(nuevosMovimientos);

      // Calcular nuevo saldo
      const nuevoSaldo = calcularSaldoTotal(nuevosMovimientos);
      setSaldoActual(nuevoSaldo);

      // Guardar en localStorage para persistencia
      localStorage.setItem('pgr_movimientos_bancarios', JSON.stringify(nuevosMovimientos));
      localStorage.setItem('pgr_saldo_actual', nuevoSaldo.toString());

      setCartolasData(prev => [...prev, {
        id: Date.now(),
        nombre: file.name,
        fechaCarga: new Date().toISOString(),
        movimientos: movimientosProcesados.length,
        tipo: detectarTipoCartola(file.name)
      }]);

    } catch (err) {
      setError(`Error al procesar archivo: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== FUNCIÓN PARA LEER ARCHIVO =====
  const leerArchivo = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // ===== PROCESAMIENTO DE CSV =====
  const procesarCSV = (contenido) => {
    const lineas = contenido.split('\n').filter(linea => linea.trim());
    const movimientos = [];

    // Detectar formato automáticamente basado en separadores y estructura
    const primeraLinea = lineas[0];
    const separador = detectarSeparador(primeraLinea);
    
    // Procesar cada línea (saltando encabezados si existen)
    const inicioData = detectarInicioData(lineas);
    
    for (let i = inicioData; i < lineas.length; i++) {
      const columnas = lineas[i].split(separador);
      
      if (columnas.length >= 5) { // Mínimo: fecha, descripción, cargo, abono, saldo
        const movimiento = procesarLineaMovimiento(columnas);
        if (movimiento) {
          movimientos.push(movimiento);
        }
      }
    }

    return movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  // ===== PROCESAMIENTO DE EXCEL =====
  const procesarExcel = async (file) => {
    // Para esta implementación, convertiremos Excel a CSV internamente
    // En producción, usarías una librería como xlsx o exceljs
    const movimientos = [];
    
    // Simulación del procesamiento Excel - en tu implementación real
    // usarías window.fs.readFile con XLSX.read como en el ejemplo anterior
    console.log('Procesando archivo Excel:', file.name);
    
    return movimientos;
  };

  // ===== FUNCIONES AUXILIARES =====
  const detectarSeparador = (linea) => {
    const separadores = [';', ',', '\t', '|'];
    let mejorSeparador = ';';
    let maxColumnas = 0;

    separadores.forEach(sep => {
      const columnas = linea.split(sep).length;
      if (columnas > maxColumnas) {
        maxColumnas = columnas;
        mejorSeparador = sep;
      }
    });

    return mejorSeparador;
  };

  const detectarInicioData = (lineas) => {
    // Buscar la primera línea que parezca contener datos (no encabezados)
    for (let i = 0; i < Math.min(10, lineas.length); i++) {
      const linea = lineas[i].toLowerCase();
      if (linea.includes('fecha') && linea.includes('saldo')) {
        return i + 1; // La siguiente línea después del encabezado
      }
    }
    return 0; // Si no encuentra encabezado, empezar desde el inicio
  };

  const procesarLineaMovimiento = (columnas) => {
    try {
      // Mapeo flexible de columnas según formato detectado
      const fecha = parsearFecha(columnas[0]);
      const descripcion = columnas[1] || '';
      const cargo = parseFloat(columnas[3]?.replace(/[^\d.-]/g, '') || 0);
      const abono = parseFloat(columnas[4]?.replace(/[^\d.-]/g, '') || 0);
      const saldo = parseFloat(columnas[5]?.replace(/[^\d.-]/g, '') || 0);

      return {
        id: `mov_${Date.now()}_${Math.random()}`,
        fecha: fecha,
        descripcion: descripcion.trim(),
        monto: abono > 0 ? abono : -cargo, // Positivo para ingresos, negativo para egresos
        tipo: abono > 0 ? 'ingreso' : 'egreso',
        saldo: saldo,
        categoria: categorizarMovimiento(descripcion)
      };
    } catch (error) {
      console.warn('Error procesando línea:', columnas, error);
      return null;
    }
  };

  const parsearFecha = (fechaStr) => {
    // Intentar varios formatos de fecha chilenos
    const formatos = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    ];

    for (const formato of formatos) {
      const match = fechaStr.match(formato);
      if (match) {
        if (formato.source.startsWith('(\\d{4})')) {
          // Formato YYYY-MM-DD
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          // Formatos DD/MM/YYYY o DD-MM-YYYY
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
      }
    }

    // Si no coincide con ningún formato, devolver fecha actual
    return new Date().toISOString().split('T')[0];
  };

  const categorizarMovimiento = (descripcion) => {
    const desc = descripcion.toLowerCase();
    
    if (desc.includes('transferencia') || desc.includes('transf')) return 'transferencia';
    if (desc.includes('pago') || desc.includes('pag ')) return 'pago';
    if (desc.includes('deposito') || desc.includes('dep ')) return 'deposito';
    if (desc.includes('comision') || desc.includes('com ')) return 'comision';
    if (desc.includes('interes') || desc.includes('int ')) return 'interes';
    if (desc.includes('cargo') || desc.includes('carg ')) return 'cargo';
    if (desc.includes('abono') || desc.includes('abon ')) return 'abono';
    
    return 'otro';
  };

  const detectarTipoCartola = (nombreArchivo) => {
    const nombre = nombreArchivo.toLowerCase();
    if (nombre.includes('historica')) return 'historica';
    if (nombre.includes('provisoria') || nombre.includes('provisional')) return 'provisoria';
    if (nombre.includes('emitida')) return 'emitida';
    return 'standard';
  };

  const calcularSaldoTotal = (movimientos) => {
    return movimientos.reduce((saldo, mov) => saldo + mov.monto, 0);
  };

  // ===== FUNCIÓN PARA CARGAR DATOS GUARDADOS =====
  useEffect(() => {
    const movimientosGuardados = localStorage.getItem('pgr_movimientos_bancarios');
    const saldoGuardado = localStorage.getItem('pgr_saldo_actual');

    if (movimientosGuardados) {
      const movs = JSON.parse(movimientosGuardados);
      setMovimientos(movs);
      setSaldoActual(parseFloat(saldoGuardado) || calcularSaldoTotal(movs));
    }
  }, []);

  // ===== FUNCIONES DE FILTRADO =====
  const movimientosFiltrados = movimientos.filter(mov => {
    const fechaMov = new Date(mov.fecha);
    const hoy = new Date();
    
    let cumpleFiltroFecha = true;
    switch (filtroFecha) {
      case 'semana':
        const semanaAtras = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        cumpleFiltroFecha = fechaMov >= semanaAtras;
        break;
      case 'mes':
        const mesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
        cumpleFiltroFecha = fechaMov >= mesAtras;
        break;
      case 'trimestre':
        const trimestreAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate());
        cumpleFiltroFecha = fechaMov >= trimestreAtras;
        break;
    }

    return cumpleFiltroFecha;
  });

  // ===== CÁLCULOS ESTADÍSTICOS =====
  const ingresosTotales = movimientosFiltrados
    .filter(mov => mov.tipo === 'ingreso')
    .reduce((sum, mov) => sum + mov.monto, 0);

  const egresosTotales = movimientosFiltrados
    .filter(mov => mov.tipo === 'egreso')
    .reduce((sum, mov) => sum + Math.abs(mov.monto), 0);

  const promedioMovimientos = movimientosFiltrados.length > 0 
    ? movimientosFiltrados.reduce((sum, mov) => sum + Math.abs(mov.monto), 0) / movimientosFiltrados.length
    : 0;

  // ===== RENDER PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💰 Módulo de Saldos Bancarios
          </h1>
          <p className="text-gray-600">
            Gestión y análisis de cartolas bancarias • PGR Seguridad
          </p>
        </div>

        {/* Zona de Carga de Archivos */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2 text-blue-600" />
            Cargar Cartola Bancaria
          </h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                if (e.target.files[0]) {
                  procesarArchivoCartola(e.target.files[0]);
                }
              }}
              className="hidden"
              id="cartola-upload"
              disabled={isLoading}
            />
            <label
              htmlFor="cartola-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isLoading ? 'Procesando archivo...' : 'Seleccionar cartola bancaria'}
              </p>
              <p className="text-sm text-gray-500">
                Formatos soportados: CSV, Excel (.xlsx, .xls)
              </p>
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Dashboard de Saldos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Saldo Actual */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saldo Actual</p>
                <p className={`text-2xl font-bold ${saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${saldoActual.toLocaleString('es-CL')}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${saldoActual >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>

          {/* Ingresos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  ${ingresosTotales.toLocaleString('es-CL')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>

          {/* Egresos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Egresos</p>
                <p className="text-2xl font-bold text-red-600">
                  ${egresosTotales.toLocaleString('es-CL')}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>

          {/* Movimientos */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Movimientos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {movimientosFiltrados.length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Controles de Filtrado */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Filtros de Análisis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período de Análisis
              </label>
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los movimientos</option>
                <option value="semana">Última semana</option>
                <option value="mes">Último mes</option>
                <option value="trimestre">Último trimestre</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuenta Bancaria
              </label>
              <select
                value={cuentaSeleccionada}
                onChange={(e) => setCuentaSeleccionada(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas las cuentas</option>
                <option value="corriente">Cuenta Corriente</option>
                <option value="vista">Cuenta Vista</option>
                <option value="ahorro">Cuenta de Ahorro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Movimientos */}
        {movimientosFiltrados.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Movimientos Bancarios</h3>
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movimientosFiltrados.slice(0, 50).map((movimiento, index) => (
                    <tr key={movimiento.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(movimiento.fecha).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {movimiento.descripcion}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          movimiento.categoria === 'transferencia' ? 'bg-blue-100 text-blue-800' :
                          movimiento.categoria === 'pago' ? 'bg-red-100 text-red-800' :
                          movimiento.categoria === 'deposito' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {movimiento.categoria}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        movimiento.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movimiento.tipo === 'ingreso' ? '+' : '-'}
                        ${Math.abs(movimiento.monto).toLocaleString('es-CL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${movimiento.saldo.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {movimientosFiltrados.length > 50 && (
              <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500 text-center">
                Mostrando los primeros 50 movimientos de {movimientosFiltrados.length} total
              </div>
            )}
          </div>
        )}

        {/* Estado Vacío */}
        {movimientos.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No hay cartolas cargadas
            </h3>
            <p className="text-gray-600 mb-6">
              Sube tu primera cartola bancaria para comenzar a analizar tus movimientos financieros
            </p>
            <label
              htmlFor="cartola-upload"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              <Upload className="h-5 w-5 mr-2" />
              Subir Cartola
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuloSaldosBancarios;
