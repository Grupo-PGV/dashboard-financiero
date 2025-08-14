import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, TrendingDown,
  RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Database, Search, Bug, Upload, FileText, DollarSign, 
  BarChart3, Target, Activity, Zap, Download, Trash2, Eye
} from 'lucide-react';

// Importaciones existentes de tu sistema Chipax
import chipaxService from '../services/chipaxService';
import ChipaxComprasDebugger from '../components/ChipaxComprasDebugger';
import ChipaxSaldosExplorer from '../components/ChipaxSaldosExplorer';
import SaldosCuentasCorrientes from '../components/SaldosCuentasCorrientes';
import { 
  adaptarCuentasPorCobrar, 
  adaptarCuentasPorPagar,
  filtrarComprasPendientes,
  filtrarComprasPorFecha 
} from '../services/chipaxAdapter';

/**
 * Dashboard Financiero Integrado - PGR Seguridad
 * 
 * CARACTERÍSTICAS:
 * ✅ Integración completa con API Chipax (tu sistema existente)
 * ✅ Procesamiento inteligente de cartolas bancarias por banco
 * ✅ KPIs consolidados (Chipax + Cartolas)
 * ✅ Flujo de caja y proyecciones
 * ✅ Alertas financieras automáticas
 */
const DashboardFinancieroIntegrado = ({ onBack, onLogout }) => {
  // ===== ESTADOS CHIPAX EXISTENTES (mantener todos) =====
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  // Estados de filtrado existentes
  const [filtroCompras, setFiltroCompras] = useState({
    soloNoPagadas: false,
    fechaInicio: '',
    fechaFin: '',
    folioFiltro: ''
  });

  // Estados de paginación existentes
  const [paginacionCompras, setPaginacionCompras] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  const [paginacionCobrar, setPaginacionCobrar] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  // ===== NUEVOS ESTADOS PARA CARTOLAS BANCARIAS =====
  const [cartolasCargadas, setCartolasCargadas] = useState([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState([]);
  const [saldosTotalesCartolas, setSaldosTotalesCartolas] = useState({});
  const [isLoadingCartola, setIsLoadingCartola] = useState(false);
  const [errorCartola, setErrorCartola] = useState(null);
  
  // Estados de análisis integrado
  const [kpisConsolidados, setKpisConsolidados] = useState({});
  const [alertasFinancieras, setAlertasFinancieras] = useState([]);
  const [pestanaActiva, setPestanaActiva] = useState('dashboard');

  // ===== CONFIGURACIÓN DE PROCESADORES POR BANCO =====
  const PROCESADORES_BANCO = {
    'banco_chile': {
      nombre: 'Banco de Chile',
      identificadores: ['cartola', 'emitida', 'pgr seguridad spa'],
      estructura: {
        headerRow: 2,
        dataStartRow: 3,
        columnas: {
          fecha: 0,
          descripcion: 1, 
          cargo: 2,
          abono: 3,
          saldo: 4,
          documento: 5
        }
      }
    },
    'bci': {
      nombre: 'BCI',
      identificadores: ['bci', 'cuenta corriente', 'cartola historica'],
      estructura: {
        headerRow: 'auto',
        dataStartRow: 'auto',
        columnas: {
          fecha: 0,
          descripcion: 1,
          cargo: 2,
          abono: 3,
          saldo: 4
        }
      }
    },
    'santander': {
      nombre: 'Santander',
      identificadores: ['santander', 'santander chile'],
      estructura: {
        headerRow: 'auto',
        dataStartRow: 'auto',
        columnas: {
          fecha: 0,
          descripcion: 1,
          monto: 2,
          saldo: 3
        }
      }
    },
    'generic': {
      nombre: 'Formato Genérico',
      identificadores: [],
      estructura: {
        headerRow: 'auto',
        dataStartRow: 'auto',
        columnas: 'auto'
      }
    }
  };

  // ===== FUNCIONES CHIPAX EXISTENTES (mantener exactas) =====
  
  const cargarSaldosBancarios = async () => {
    try {
      console.log('🏦 Cargando saldos bancarios...');
      const datos = await chipaxService.obtenerSaldosBancarios();
      
      if (Array.isArray(datos)) {
        setSaldosBancarios(datos);
        console.log(`✅ ${datos.length} saldos cargados`);
      } else {
        console.warn('⚠️ Saldos no es array, usando array vacío');
        setSaldosBancarios([]);
      }
    } catch (error) {
      console.error('❌ Error cargando saldos:', error);
      setSaldosBancarios([]);
      setErrors(prev => [...prev, `Saldos: ${error.message}`]);
    }
  };

  const cargarCuentasPorCobrar = async () => {
    try {
      console.log('📋 Cargando cuentas por cobrar...');
      const dtes = await chipaxService.obtenerCuentasPorCobrar();
      
      if (Array.isArray(dtes)) {
        const cuentasAdaptadas = adaptarCuentasPorCobrar(dtes);
        setCuentasPorCobrar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} cuentas por cobrar cargadas`);
      } else {
        console.warn('⚠️ DTEs no es array');
        setCuentasPorCobrar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      setCuentasPorCobrar([]);
      setErrors(prev => [...prev, `Cuentas por cobrar: ${error.message}`]);
    }
  };

  const cargarCuentasPorPagar = async () => {
    try {
      console.log('💸 Cargando cuentas por pagar...');
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      if (Array.isArray(compras)) {
        const cuentasAdaptadas = adaptarCuentasPorPagar(compras);
        setCuentasPorPagar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} cuentas por pagar cargadas`);
      } else {
        console.warn('⚠️ Compras no es array');
        setCuentasPorPagar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setCuentasPorPagar([]);
      setErrors(prev => [...prev, `Cuentas por pagar: ${error.message}`]);
    }
  };

  const cargarSolo2025 = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando solo facturas 2025...');
      await cargarCuentasPorPagar();
    } catch (error) {
      console.error('❌ Error cargando 2025:', error);
      setErrors(prev => [...prev, `Facturas 2025: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const cargarSoloSaldos = async () => {
    try {
      setLoading(true);
      console.log('🏦 Cargando solo saldos bancarios...');
      await cargarSaldosBancarios();
    } catch (error) {
      console.error('❌ Error cargando saldos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarSoloCuentasPorCobrar = async () => {
    try {
      setLoading(true);
      console.log('📋 Cargando solo cuentas por cobrar...');
      await cargarCuentasPorCobrar();
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarTodosDatos = async () => {
    setLoading(true);
    setErrors([]);
    
    try {
      console.log('🔄 Iniciando carga completa...');
      
      await Promise.all([
        cargarSaldosBancarios(),
        cargarCuentasPorCobrar(),
        cargarCuentasPorPagar()
      ]);
      
      console.log('✅ Carga completa finalizada');
    } catch (error) {
      console.error('❌ Error en carga completa:', error);
      setErrors(prev => [...prev, `Carga general: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const verificarConectividad = async () => {
    try {
      setLoading(true);
      setErrors([]);
      console.log('🔍 Verificando conectividad con Chipax...');
      
      await chipaxService.getChipaxToken();
      
      console.log('✅ Conectividad con Chipax verificada');
      setErrors([]);
    } catch (error) {
      console.error('❌ Error de conectividad:', error);
      
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        setErrors(['⚠️ Error de CORS detectado. La API funciona pero requiere configuración especial desde navegador.']);
      } else {
        setErrors([`❌ Error de conectividad: ${error.message}`]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNCIÓN CORREGIDA PARA CARTOLAS BANCARIAS =====
  
  const procesarCartolaBancaria = async (file) => {  // ✅ CORRECCIÓN 1: Sin typo
    setIsLoadingCartola(true);
    setErrorCartola(null);

    try {
      console.log(`📁 Procesando cartola: ${file.name}`);
      
      // ✅ CORRECCIÓN 2: Sistema robusto de importación XLSX
      let XLSX;
      try {
        console.log('📚 Cargando XLSX desde CDN...');
        
        // Método 1: Importación dinámica con múltiples fallbacks
        let xlsxModule;
        try {
          xlsxModule = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        } catch (importError) {
          console.log('🔄 Fallback: Intentando URL alternativa...');
          xlsxModule = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.full.min.js');
        }
        
        // Extraer XLSX del módulo con múltiples estrategias
        if (xlsxModule && typeof xlsxModule.read === 'function') {
          // Caso 1: Funciones directamente en el módulo
          XLSX = xlsxModule;
          console.log('✅ XLSX encontrado directamente en módulo');
        } else if (xlsxModule.default && typeof xlsxModule.default.read === 'function') {
          // Caso 2: Funciones en .default
          XLSX = xlsxModule.default;
          console.log('✅ XLSX encontrado en .default');
        } else if (xlsxModule.XLSX && typeof xlsxModule.XLSX.read === 'function') {
          // Caso 3: Funciones en .XLSX
          XLSX = xlsxModule.XLSX;
          console.log('✅ XLSX encontrado en .XLSX');
        } else if (typeof window !== 'undefined' && window.XLSX && typeof window.XLSX.read === 'function') {
          // Caso 4: XLSX disponible globalmente
          XLSX = window.XLSX;
          console.log('✅ XLSX encontrado en window.XLSX');
        } else {
          // Caso 5: Crear script dinámico como último recurso
          console.log('🔄 Cargando XLSX via script dinámico...');
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = () => {
              if (window.XLSX && typeof window.XLSX.read === 'function') {
                XLSX = window.XLSX;
                console.log('✅ XLSX cargado via script');
                resolve();
              } else {
                reject(new Error('XLSX no disponible después de cargar script'));
              }
            };
            script.onerror = () => reject(new Error('Error cargando script XLSX'));
            document.head.appendChild(script);
          });
        }
        
        // Verificación final
        if (!XLSX || typeof XLSX.read !== 'function') {
          throw new Error('No se pudo cargar XLSX.read después de todos los intentos');
        }
        
        // Verificar también utils (necesario para sheet_to_json)
        if (!XLSX.utils || typeof XLSX.utils.sheet_to_json !== 'function') {
          throw new Error('XLSX.utils.sheet_to_json no está disponible');
        }
        
        console.log('✅ XLSX completamente cargado y verificado');
        console.log('🔍 XLSX funciones disponibles:', Object.keys(XLSX).slice(0, 10));
        
      } catch (xlsxError) {
        console.error('❌ Error crítico cargando XLSX:', xlsxError);
        throw new Error(`No se pudo cargar el procesador de Excel. 
          Verifica tu conexión a internet e intenta nuevamente. 
          Error: ${xlsxError.message}`);
      }
      
      // Leer archivo
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const workbook = XLSX.read(arrayBuffer, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true
      });
      
      console.log('📊 Hojas disponibles:', workbook.SheetNames);
      
      // Analizar primera hoja
      const primeraHoja = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[primeraHoja];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log(`📋 Total filas: ${rawData.length}`);
      
      // Detectar banco y procesador
      const procesador = detectarBanco(file.name, rawData);
      console.log(`🏦 Banco detectado: ${procesador.nombre}`);
      
      // Procesar movimientos
      const movimientos = procesarMovimientos(rawData, procesador, file.name);
      console.log(`✅ Procesados ${movimientos.length} movimientos`);
      
      if (movimientos.length === 0) {
        throw new Error('No se encontraron movimientos válidos en el archivo');
      }
      
      // Calcular estadísticas
      const estadisticas = calcularEstadisticasCartola(movimientos);
      
      // Actualizar estados
      const nuevosMovimientos = [...movimientosBancarios, ...movimientos];
      setMovimientosBancarios(nuevosMovimientos);
      
      // Registrar cartola cargada
      const nuevaCartola = {
        id: Date.now(),
        nombre: file.name,
        banco: procesador.nombre,
        fechaCarga: new Date().toISOString(),
        movimientos: movimientos.length,
        ...estadisticas
      };
      
      setCartolasCargadas(prev => [...prev, nuevaCartola]);
      
      // Actualizar saldos totales
      actualizarSaldosTotales(nuevosMovimientos);
      
      // Recalcular KPIs integrados
      calcularKPIsIntegrados();
      
      // Guardar en localStorage
      localStorage.setItem('pgr_movimientos_bancarios', JSON.stringify(nuevosMovimientos));
      localStorage.setItem('pgr_cartolas_cargadas', JSON.stringify([...cartolasCargadas, nuevaCartola]));
      
      console.log(`🎉 Cartola ${file.name} procesada exitosamente`);
      
    } catch (error) {
      console.error('❌ Error procesando cartola:', error);
      setErrorCartola(`Error procesando ${file.name}: ${error.message}`);
    } finally {
      setIsLoadingCartola(false);
    }
  };

  const detectarBanco = (nombreArchivo, data) => {
    const archivo = nombreArchivo.toLowerCase();
    const contenido = data.slice(0, 10)
      .map(row => (row || []).join(' ').toLowerCase())
      .join(' ');
    
    console.log('🔍 Detectando banco...');
    console.log('📄 Archivo:', archivo);
    console.log('📄 Contenido muestra:', contenido.substring(0, 200));
    
    // Detectar Banco de Chile
    if (archivo.includes('emitida') || 
        contenido.includes('pgr seguridad spa') ||
        contenido.includes('cheque o cargo') ||
        contenido.includes('deposito o abono')) {
      console.log('🏦 Banco detectado: Banco de Chile');
      return PROCESADORES_BANCO.banco_chile;
    }
    
    // Detectar BCI
    if (archivo.includes('historica') || 
        archivo.includes('cartola') ||
        contenido.includes('cartola historica') ||
        contenido.includes('cuenta corriente')) {
      console.log('🏦 Banco detectado: BCI');
      return PROCESADORES_BANCO.bci;
    }
    
    // Detectar Santander
    if (archivo.includes('santander') || 
        contenido.includes('santander')) {
      console.log('🏦 Banco detectado: Santander');
      return PROCESADORES_BANCO.santander;
    }
    
    // Formato genérico
    console.log('🏦 Banco detectado: Formato Genérico');
    return PROCESADORES_BANCO.generic;
  };

  const procesarMovimientos = (rawData, procesador, nombreArchivo) => {
    const movimientos = [];
    
    // Detectar donde empiezan los datos reales
    let dataStartRow = 0;
    
    if (procesador.nombre === 'Banco de Chile') {
      // Buscar la fila con headers específicos de Banco de Chile
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] || [];
        const hasHeaders = row.some(cell => {
          const cellStr = (cell || '').toString().toLowerCase();
          return cellStr.includes('fecha') && (
            cellStr.includes('detalle') || 
            cellStr.includes('movimiento') ||
            row.some(c => (c || '').toString().toLowerCase().includes('cargo'))
          );
        });
        if (hasHeaders) {
          dataStartRow = i + 1;
          break;
        }
      }
      console.log(`🏦 Banco de Chile - Datos empiezan en fila: ${dataStartRow + 1}`);
    } else if (procesador.nombre === 'BCI') {
      // Para BCI, buscar datos después de metadatos
      for (let i = 10; i < Math.min(25, rawData.length); i++) {
        const row = rawData[i] || [];
        if (row.length >= 4) {
          // Verificar si parece una fila de datos (fecha en primera columna)
          const primeraColumna = (row[0] || '').toString();
          if (primeraColumna.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/) || 
              typeof row[0] === 'number' && row[0] > 40000) { // Excel date number
            dataStartRow = i;
            break;
          }
        }
      }
      console.log(`🏦 BCI - Datos empiezan en fila: ${dataStartRow + 1}`);
    } else {
      // Para otros bancos, buscar primera fila con datos numéricos
      for (let i = 5; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i] || [];
        if (row.length >= 4) {
          const tieneNumeros = row.some(cell => typeof cell === 'number' && cell > 0);
          if (tieneNumeros) {
            dataStartRow = i;
            break;
          }
        }
      }
      console.log(`🏦 ${procesador.nombre} - Datos empiezan en fila: ${dataStartRow + 1}`);
    }
    
    // Procesar cada fila de datos
    let movimientosValidos = 0;
    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length < 3) continue;
      
      try {
        const movimiento = parseMovimiento(row, procesador, i, nombreArchivo);
        if (movimiento && movimiento.fecha && movimiento.descripcion) {
          movimientos.push(movimiento);
          movimientosValidos++;
        }
      } catch (error) {
        console.warn(`⚠️ Error en fila ${i + 1}:`, error.message);
      }
    }
    
    console.log(`✅ Procesados ${movimientosValidos} movimientos válidos de ${rawData.length} filas totales`);
    
    // Ordenar por fecha
    return movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  const parseMovimiento = (row, procesador, rowIndex, archivo) => {
    let fecha, descripcion, cargo = 0, abono = 0, saldo = 0;
    
    if (procesador.nombre === 'Banco de Chile') {
      // Formato Banco de Chile: [Fecha, Detalle, Cargo, Abono, Saldo, ...]
      fecha = parseDate(row[0]);
      descripcion = (row[1] || '').toString().trim();
      cargo = parseFloat(row[2]) || 0;
      abono = parseFloat(row[3]) || 0;
      saldo = parseFloat(row[4]) || 0;
      
    } else if (procesador.nombre === 'BCI') {
      // Formato BCI: detectar dinámicamente
      fecha = parseDate(row[0]);
      descripcion = (row[1] || '').toString().trim();
      
      // Buscar valores numéricos en las columnas siguientes
      for (let i = 2; i < row.length; i++) {
        const valor = parseFloat(row[i]);
        if (!isNaN(valor) && valor !== 0) {
          if (i === row.length - 1) {
            saldo = valor; // Última columna suele ser saldo
          } else if (cargo === 0 && valor > 0) {
            cargo = valor;
          } else if (abono === 0 && valor > 0) {
            abono = valor;
          }
        }
      }
      
    } else {
      // Formato genérico
      fecha = parseDate(row[0]);
      descripcion = (row[1] || '').toString().trim();
      cargo = parseFloat(row[2]) || 0;
      abono = parseFloat(row[3]) || 0;
      saldo = parseFloat(row[4]) || 0;
    }
    
    // Determinar tipo de movimiento
    const tipo = cargo > 0 ? 'egreso' : 'ingreso';
    const monto = Math.abs(cargo || abono);
    
    return {
      id: `${archivo}_${rowIndex}`,
      fecha,
      descripcion,
      tipo,
      monto,
      cargo,
      abono,
      saldo,
      banco: procesador.nombre,
      categoria: categorizarMovimiento(descripcion)
    };
  };

  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Si es número de Excel, convertir
    if (typeof dateValue === 'number' && dateValue > 40000) {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Si es texto, intentar parsear
    const dateStr = dateValue.toString().trim();
    
    // Intentar con Date.parse primero
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    
    // Formatos manuales
    const dateFormats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/
    ];
    
    for (const format of dateFormats) {
      const match = dateStr.match(format);
      if (match) {
        if (format.source.startsWith('(\\d{4})')) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else {
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
      }
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const categorizarMovimiento = (descripcion) => {
    const desc = descripcion.toLowerCase();
    
    if (desc.includes('transferencia') || desc.includes('traspaso')) return 'transferencia';
    if (desc.includes('pago') || desc.includes('credito')) return 'pago';
    if (desc.includes('deposito') || desc.includes('ingreso')) return 'deposito';
    if (desc.includes('comision') || desc.includes('mantención') || desc.includes('mantencion')) return 'comision';
    if (desc.includes('giro') || desc.includes('atm')) return 'giro';
    if (desc.includes('cheque')) return 'cheque';
    if (desc.includes('nomina') || desc.includes('sueldo')) return 'nomina';
    if (desc.includes('app-')) return 'app_bancaria';
    
    return 'otros';
  };

  const calcularEstadisticasCartola = (movimientos) => {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso');
    const egresos = movimientos.filter(m => m.tipo === 'egreso');
    
    const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = egresos.reduce((sum, m) => sum + Math.abs(m.monto), 0);
    const saldoFinal = movimientos.length > 0 ? movimientos[movimientos.length - 1].saldo : 0;
    
    return {
      totalIngresos,
      totalEgresos,
      flujoNeto: totalIngresos - totalEgresos,
      saldoFinal,
      promedioIngreso: ingresos.length > 0 ? totalIngresos / ingresos.length : 0,
      promedioEgreso: egresos.length > 0 ? totalEgresos / egresos.length : 0
    };
  };

  const actualizarSaldosTotales = (todosMovimientos) => {
    const saldosPorBanco = {};
    
    // Agrupar por banco y calcular último saldo
    todosMovimientos.forEach(mov => {
      if (!saldosPorBanco[mov.banco]) {
        saldosPorBanco[mov.banco] = {
          banco: mov.banco,
          movimientos: 0,
          ultimoSaldo: 0,
          ultimaActualizacion: mov.fecha
        };
      }
      
      saldosPorBanco[mov.banco].movimientos++;
      if (mov.fecha >= saldosPorBanco[mov.banco].ultimaActualizacion) {
        saldosPorBanco[mov.banco].ultimoSaldo = mov.saldo;
        saldosPorBanco[mov.banco].ultimaActualizacion = mov.fecha;
      }
    });
    
    setSaldosTotalesCartolas(saldosPorBanco);
  };

  const calcularKPIsIntegrados = () => {
    const saldoBancarioChipax = saldosBancarios.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || 0), 0);
    const saldoBancarioCartolas = Object.values(saldosTotalesCartolas)
      .reduce((sum, banco) => sum + banco.ultimoSaldo, 0);
    
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + (cuenta.saldo || cuenta.monto || 0), 0);
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + (cuenta.monto || 0), 0);
    
    const kpis = {
      // Liquidez total combinada
      liquidezTotal: saldoBancarioChipax + saldoBancarioCartolas,
      
      // Cobertura de deudas
      coberturaCuentas: totalPorPagar > 0 ? (saldoBancarioCartolas / totalPorPagar) : 0,
      
      // Eficiencia operacional
      ratioCobranzaPago: totalPorCobrar > 0 && totalPorPagar > 0 ? (totalPorCobrar / totalPorPagar) : 0,
      
      // Alertas
      alertas: []
    };
    
    // Generar alertas automáticas
    if (kpis.liquidezTotal < totalPorPagar * 0.3) {
      kpis.alertas.push({ 
        tipo: 'danger', 
        mensaje: 'Liquidez crítica: Saldos insuficientes para cubrir obligaciones' 
      });
    }
    
    if (kpis.coberturaCuentas < 0.5 && totalPorPagar > 0) {
      kpis.alertas.push({ 
        tipo: 'warning', 
        mensaje: 'Cobertura baja: Saldos bancarios cubren menos del 50% de las deudas' 
      });
    }
    
    if (cartolasCargadas.length === 0 && saldosBancarios.length === 0) {
      kpis.alertas.push({ 
        tipo: 'info', 
        mensaje: 'Sin datos bancarios: Carga cartolas o conecta con Chipax para análisis completo' 
      });
    }
    
    setKpisConsolidados(kpis);
    setAlertasFinancieras(kpis.alertas);
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const limpiarTodasLasCartolas = () => {
    if (window.confirm('¿Estás seguro de eliminar todas las cartolas cargadas? Esta acción no se puede deshacer.')) {
      setCartolasCargadas([]);
      setMovimientosBancarios([]);
      setSaldosTotalesCartolas({});
      localStorage.removeItem('pgr_movimientos_bancarios');
      localStorage.removeItem('pgr_cartolas_cargadas');
      calcularKPIsIntegrados(); // Recalcular KPIs sin cartolas
    }
  };

  // ===== FUNCIONES DE UTILIDAD EXISTENTES =====
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const obtenerComprasFiltradas = () => {
    let comprasFiltradas = [...cuentasPorPagar];

    if (filtroCompras.soloNoPagadas) {
      comprasFiltradas = comprasFiltradas.filter(compra => 
        compra.estado !== 'Pagado' && !compra.estaPagado
      );
    }

    if (filtroCompras.folioFiltro) {
      comprasFiltradas = comprasFiltradas.filter(compra =>
        compra.folio.toString().toLowerCase().includes(filtroCompras.folioFiltro.toLowerCase())
      );
    }

    if (filtroCompras.fechaInicio && filtroCompras.fechaFin) {
      comprasFiltradas = filtrarComprasPorFecha(comprasFiltradas, filtroCompras.fechaInicio, filtroCompras.fechaFin);
    }

    return comprasFiltradas;
  };

  const obtenerComprasPaginadas = () => {
    const filtradas = obtenerComprasFiltradas();
    const inicio = (paginacionCompras.paginaActual - 1) * paginacionCompras.itemsPorPagina;
    const fin = inicio + paginacionCompras.itemsPorPagina;
    return filtradas.slice(inicio, fin);
  };

  const obtenerCobrarPaginadas = () => {
    const inicio = (paginacionCobrar.paginaActual - 1) * paginacionCobrar.itemsPorPagina;
    const fin = inicio + paginacionCobrar.itemsPorPagina;
    return cuentasPorCobrar.slice(inicio, fin);
  };

  const getTotalPaginasCompras = () => {
    return Math.ceil(obtenerComprasFiltradas().length / paginacionCompras.itemsPorPagina);
  };

  const getTotalPaginasCobrar = () => {
    return Math.ceil(cuentasPorCobrar.length / paginacionCobrar.itemsPorPagina);
  };

  // ===== EFECTOS =====
  
  useEffect(() => {
    verificarConectividad();
    
    // Cargar datos guardados de cartolas
    const movimientosGuardados = localStorage.getItem('pgr_movimientos_bancarios');
    const cartolasGuardadas = localStorage.getItem('pgr_cartolas_cargadas');
    
    if (movimientosGuardados) {
      const movimientos = JSON.parse(movimientosGuardados);
      setMovimientosBancarios(movimientos);
      actualizarSaldosTotales(movimientos);
    }
    
    if (cartolasGuardadas) {
      setCartolasCargadas(JSON.parse(cartolasGuardadas));
    }
  }, []);

  useEffect(() => {
    calcularKPIsIntegrados();
  }, [saldosBancarios, cuentasPorCobrar, cuentasPorPagar, saldosTotalesCartolas]);

  // ===== COMPONENTES DE INTERFAZ =====

  // Header del dashboard
  const HeaderDashboard = () => (
    <div className="bg-white shadow-sm border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
                ← Volver
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                💼 Dashboard Financiero Integrado
              </h1>
              <p className="text-gray-600">Chipax + Cartolas Bancarias • PGR Seguridad</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Estado de conectividad */}
            <div className="flex items-center gap-2">
              {loading ? (
                <>
                  <RefreshCw className="animate-spin text-blue-500" size={16} />
                  <span className="text-sm text-blue-600">Cargando...</span>
                </>
              ) : errors.length === 0 ? (
                <>
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-sm text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-500" size={16} />
                  <span className="text-sm text-red-600">Con errores</span>
                </>
              )}
            </div>
            
            {onLogout && (
              <button 
                onClick={onLogout}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Pestañas principales */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: BarChart3 },
            { id: 'cartolas', label: '🏦 Cartolas', icon: FileText },
            { id: 'saldos', label: '💰 Saldos', icon: Wallet },
            { id: 'debugger', label: '🔧 Debug', icon: Bug }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPestanaActiva(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md font-medium text-sm ${
                pestanaActiva === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Alertas financieras
  const AlertasFinancieras = () => {
    if (!alertasFinancieras || alertasFinancieras.length === 0) return null;

    const getAlertColor = (tipo) => {
      switch (tipo) {
        case 'danger': return 'bg-red-50 border-red-200 text-red-800';
        case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
        default: return 'bg-gray-50 border-gray-200 text-gray-800';
      }
    };

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🚨 Alertas Financieras</h3>
        <div className="space-y-3">
          {alertasFinancieras.map((alerta, index) => (
            <div key={index} className={`p-4 rounded-lg border ${getAlertColor(alerta.tipo)}`}>
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-3 mt-0.5" />
                <p className="font-medium">{alerta.mensaje}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // KPIs consolidados
  const KPIsConsolidados = () => {
    const saldoBancarioChipax = saldosBancarios.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || 0), 0);
    const saldoBancarioCartolas = Object.values(saldosTotalesCartolas)
      .reduce((sum, banco) => sum + banco.ultimoSaldo, 0);
    
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + (cuenta.saldo || cuenta.monto || 0), 0);
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + (cuenta.monto || 0), 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Liquidez Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(saldoBancarioChipax + saldoBancarioCartolas)}
              </p>
              <p className="text-blue-100 text-sm">
                Chipax + Cartolas
              </p>
            </div>
            <Wallet className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Por Cobrar</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPorCobrar)}</p>
              <p className="text-green-100 text-sm">
                {cuentasPorCobrar.length} facturas
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Por Pagar</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPorPagar)}</p>
              <p className="text-red-100 text-sm">
                {cuentasPorPagar.length} facturas
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Cobertura</p>
              <p className="text-2xl font-bold">
                {totalPorPagar > 0 ? ((saldoBancarioCartolas / totalPorPagar) * 100).toFixed(1) : '0'}%
              </p>
              <p className="text-purple-100 text-sm">
                de deudas cubiertas
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Controles principales (existentes)
  const ControlesPrincipales = () => (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <button
          onClick={cargarSolo2025}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <AlertCircle size={16} />
          <div className="text-left">
            <div className="text-sm font-medium">Cuentas por Pagar</div>
            <div className="text-xs opacity-90">Facturas 2025</div>
          </div>
        </button>

        <button
          onClick={cargarSoloCuentasPorCobrar}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <TrendingUp size={16} />
          <div className="text-left">
            <div className="text-sm font-medium">Cuentas por Cobrar</div>
            <div className="text-xs opacity-90">Facturas pendientes</div>
          </div>
        </button>

        <button
          onClick={cargarSoloSaldos}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Wallet size={16} />
          <div className="text-left">
            <div className="text-sm font-medium">Saldos Bancarios</div>
            <div className="text-xs opacity-90">Cuentas corrientes</div>
          </div>
        </button>

        <button
          onClick={cargarTodosDatos}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <div className="text-left">
            <div className="text-sm font-medium">Cargar Todo</div>
            <div className="text-xs opacity-90">Todos los módulos</div>
          </div>
        </button>
      </div>
    </div>
  );

  // Zona de carga de cartolas
  const ZonaCargaCartolas = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <Upload className="mr-3 text-blue-600" />
        Cargar Cartola Bancaria
      </h3>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            if (e.target.files[0]) {
              procesarCartolaBancaria(e.target.files[0]);  // ✅ CORRECCIÓN 3: Sin typo
            }
          }}
          className="hidden"
          id="cartola-upload"
          disabled={isLoadingCartola}
        />
        <label htmlFor="cartola-upload" className="cursor-pointer">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            {isLoadingCartola ? 'Procesando cartola...' : 'Seleccionar archivo de cartola'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Detección automática: Banco de Chile, BCI, Santander, otros
          </p>
          <p className="text-xs text-gray-400">
            Formatos: CSV, Excel (.xlsx, .xls)
          </p>
        </label>
      </div>

      {errorCartola && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 inline mr-2" />
          <span className="text-red-700">{errorCartola}</span>
        </div>
      )}

      {cartolasCargadas.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Cartolas Procesadas</h4>
            <button
              onClick={limpiarTodasLasCartolas}
              className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Todo
            </button>
          </div>
          
          <div className="space-y-3">
            {cartolasCargadas.map((cartola, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h5 className="font-medium text-gray-900">{cartola.nombre}</h5>
                  <p className="text-sm text-gray-600">
                    {cartola.banco} • {cartola.movimientos} movimientos • 
                    {new Date(cartola.fechaCarga).toLocaleString('es-CL')}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(cartola.saldoFinal || 0)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(cartola.flujoNeto || 0)} neto
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Estados generales (existente, simplificado)
  const EstadisticasGenerales = () => {
    const totalSaldos = saldosBancarios.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || 0), 0);
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + (cuenta.saldo || cuenta.monto || 0), 0);
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + (cuenta.monto || 0), 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Por Cobrar (Chipax)</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPorCobrar)}</p>
          <p className="text-sm text-green-600">{cuentasPorCobrar.length} facturas</p>
        </div>

        <div className="bg-red-50 rounded-lg p-6 border border-red-200">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Por Pagar (Chipax)</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPorPagar)}</p>
          <p className="text-sm text-red-600">{cuentasPorPagar.length} facturas</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Saldos Chipax</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalSaldos)}</p>
          <p className="text-sm text-blue-600">{saldosBancarios.length} cuentas</p>
        </div>
      </div>
    );
  };

  // Tablas simplificadas (existentes)
  const TablaCompras = () => {
    const comprasPaginadas = obtenerComprasPaginadas();
    
    if (comprasPaginadas.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Cuentas por Pagar</h3>
          <p className="text-gray-500">No hay datos cargados. Usa el botón "Cuentas por Pagar" para cargar.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Cuentas por Pagar</h3>
          <p className="text-sm text-gray-600">{obtenerComprasFiltradas().length} facturas</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comprasPaginadas.map((compra, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {compra.folio}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {compra.proveedor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {compra.fecha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(compra.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      compra.estado === 'Pagado' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {compra.estado || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const TablaCobrar = () => {
    const cobrarPaginadas = obtenerCobrarPaginadas();
    
    if (cobrarPaginadas.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Cuentas por Cobrar</h3>
          <p className="text-gray-500">No hay datos cargados. Usa el botón "Cuentas por Cobrar" para cargar.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Cuentas por Cobrar</h3>
          <p className="text-sm text-gray-600">{cuentasPorCobrar.length} facturas</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cobrarPaginadas.map((cuenta, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cuenta.folio}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cuenta.cliente}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cuenta.fecha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(cuenta.saldo || cuenta.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cuenta.vencimiento || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ===== RENDER PRINCIPAL =====
  
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderDashboard />
      
      <div className="max-w-7xl mx-auto p-6">
        <AlertasFinancieras />
        
        {/* Mostrar errores de Chipax */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-600">
              {errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </div>
        )}
        
        {/* KPIs consolidados */}
        <KPIsConsolidados />
        
        {/* Contenido según pestaña activa */}
        {pestanaActiva === 'dashboard' && (
          <>
            <ControlesPrincipales />
            
            {/* Mensaje de ayuda si no hay datos cargados */}
            {saldosBancarios.length === 0 && cuentasPorCobrar.length === 0 && cuentasPorPagar.length === 0 && !loading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Database className="text-yellow-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      🚀 ¡Bienvenido al Dashboard Financiero!
                    </h3>
                    <p className="text-yellow-700 mb-3">
                      Para comenzar, haz clic en los botones de arriba para cargar los datos que necesites:
                    </p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Cuentas por Pagar:</strong> Facturas de proveedores (2025)</li>
                      <li>• <strong>Cuentas por Cobrar:</strong> Facturas de clientes pendientes</li>
                      <li>• <strong>Saldos Bancarios:</strong> Estado de cuentas corrientes</li>
                      <li>• <strong>Cargar Todo:</strong> Todos los módulos de una vez</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <EstadisticasGenerales />
            
            <div className="space-y-8">
              <TablaCompras />
              <TablaCobrar />
            </div>
          </>
        )}

        {pestanaActiva === 'cartolas' && (
          <div className="space-y-6">
            <ZonaCargaCartolas />
          </div>
        )}

        {pestanaActiva === 'saldos' && (
          <ChipaxSaldosExplorer />
        )}

        {pestanaActiva === 'debugger' && (
          <ChipaxComprasDebugger />
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
