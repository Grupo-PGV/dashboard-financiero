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
      
      if (Array.isArray(compras) && compras.length > 0) {
        console.log(`📋 Procesando ${compras.length} facturas encontradas...`);
        const cuentasAdaptadas = adaptarCuentasPorPagar(compras);
        setCuentasPorPagar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} cuentas por pagar cargadas`);
      } else {
        console.warn('⚠️ No se encontraron facturas');
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
      console.log('🚀 Cargando facturas 2025...');
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      if (Array.isArray(compras)) {
        // Filtrar por año 2025
        const compras2025 = compras.filter(compra => {
          const fecha = compra.fechaEmision || compra.fecha_emision || compra.fecha || '';
          return fecha.includes('2025');
        });
        
        if (compras2025.length > 0) {
          const cuentasAdaptadas = adaptarCuentasPorPagar(compras2025);
          setCuentasPorPagar(cuentasAdaptadas);
          console.log(`✅ ${cuentasAdaptadas.length} facturas 2025 cargadas`);
        } else {
          console.log('⚠️ No se encontraron facturas 2025, usando todas las facturas');
          const cuentasAdaptadas = adaptarCuentasPorPagar(compras);
          setCuentasPorPagar(cuentasAdaptadas);
        }
      }
    } catch (error) {
      console.error('❌ Error cargando facturas 2025:', error);
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

  // ===== NUEVAS FUNCIONES PARA CARTOLAS BANCARIAS =====
  
  const procesarCartolaBAncaria = async (file) => {
    setIsLoadingCartola(true);
    setErrorCartola(null);

    try {
      console.log(`📁 Procesando cartola: ${file.name}`);
      
      // Importar librería Excel dinámicamente
      const XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      
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
          } else if (abono === 0 && valor > 0 && cargo > 0) {
            abono = valor;
          }
        }
      }
      
    } else {
      // Formato genérico
      fecha = parseDate(row[0]);
      descripcion = (row[1] || '').toString().trim();
      
      // Intentar detectar valores en orden: cargo, abono, saldo
      const numeros = [];
      for (let i = 2; i < row.length; i++) {
        const valor = parseFloat(row[i]);
        if (!isNaN(valor)) {
          numeros.push(valor);
        }
      }
      
      if (numeros.length >= 1) saldo = numeros[numeros.length - 1];
      if (numeros.length >= 2) abono = numeros[numeros.length - 2];
      if (numeros.length >= 3) cargo = numeros[numeros.length - 3];
    }
    
    // Validar datos mínimos
    if (!fecha) {
      console.warn(`⚠️ Fecha inválida en fila ${rowIndex + 1}:`, row[0]);
      return null;
    }
    
    if (!descripcion) {
      console.warn(`⚠️ Descripción vacía en fila ${rowIndex + 1}`);
      return null;
    }
    
    // Calcular monto neto
    let monto = 0;
    let tipo = 'neutral';
    
    if (abono > 0) {
      monto = abono;
      tipo = 'ingreso';
    } else if (cargo > 0) {
      monto = -cargo;
      tipo = 'egreso';
    }
    
    return {
      id: `${archivo}_${rowIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      fecha: fecha,
      descripcion: descripcion,
      monto: monto,
      tipo: tipo,
      saldo: saldo,
      cargo: cargo,
      abono: abono,
      categoria: categorizarMovimiento(descripcion),
      banco: procesador.nombre,
      archivo: archivo,
      fila: rowIndex + 1
    };
  };

  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Si es un número de Excel (serial date)
    if (typeof dateValue === 'number' && dateValue > 40000 && dateValue < 50000) {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
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
                  <span className="text-sm text-green-600">✅ API Chipax conectada</span>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-500" size={16} />
                  <span className="text-sm text-red-600">⚠️ Verificar conectividad</span>
                </>
              )}
            </div>
            
            {onLogout && (
              <button onClick={onLogout} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Navegación de pestañas */}
        <div className="flex space-x-1">
          {[
            { id: 'dashboard', label: '📊 Dashboard Chipax', icon: BarChart3 },
            { id: 'cartolas', label: '🏦 Cartolas Bancarias', icon: Upload },
            { id: 'saldos', label: '💰 Explorador Saldos', icon: Wallet },
            { id: 'debugger', label: '🔧 Debugger', icon: Bug }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPestanaActiva(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pestanaActiva === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Alertas financieras
  const AlertasFinancieras = () => (
    alertasFinancieras.length > 0 && (
      <div className="mb-6 space-y-3">
        {alertasFinancieras.map((alerta, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border flex items-center ${
              alerta.tipo === 'danger' 
                ? 'bg-red-50 border-red-200 text-red-800'
                : alerta.tipo === 'warning'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            {alerta.mensaje}
          </div>
        ))}
      </div>
    )
  );

  // KPIs consolidados
  const KPIsConsolidados = () => {
    const saldoBancarioChipax = saldosBancarios.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || 0), 0);
    const saldoBancarioCartolas = Object.values(saldosTotalesCartolas)
      .reduce((sum, banco) => sum + banco.ultimoSaldo, 0);
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + (cuenta.monto || 0), 0);
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + (cuenta.saldo || cuenta.monto || 0), 0);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Liquidez Total */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Liquidez Total</h3>
            <Wallet className="h-8 w-8 text-blue-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(saldoBancarioChipax + saldoBancarioCartolas)}
          </p>
          <div className="text-blue-100 text-sm">
            <div>Chipax: {formatCurrency(saldoBancarioChipax)}</div>
            <div>Cartolas: {formatCurrency(saldoBancarioCartolas)}</div>
          </div>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Por Cobrar</h3>
            <TrendingUp className="h-8 w-8 text-green-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(totalPorCobrar)}
          </p>
          <p className="text-green-100 text-sm">
            {cuentasPorCobrar.length} facturas pendientes
          </p>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Por Pagar</h3>
            <TrendingDown className="h-8 w-8 text-red-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(totalPorPagar)}
          </p>
          <p className="text-red-100 text-sm">
            {cuentasPorPagar.length} facturas pendientes
          </p>
        </div>

        {/* Cobertura */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Cobertura</h3>
            <Target className="h-8 w-8 text-purple-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {totalPorPagar > 0 ? ((saldoBancarioCartolas / totalPorPagar) * 100).toFixed(1) : '0'}%
          </p>
          <p className="text-purple-100 text-sm">
            de deudas cubiertas
          </p>
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
              procesarCartolaBAncaria(e.target.files[0]);
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
          <p className="text-gray-500">No hay datos cargados. Haz clic en "Cuentas por Pagar" para cargar.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Cuentas por Pagar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comprasPaginadas.slice(0, 10).map((compra, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {compra.folio}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {compra.proveedor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(compra.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {compra.fecha}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      compra.estado === 'Pagado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {compra.estado || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {comprasPaginadas.length > 10 && (
          <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500">
            Mostrando 10 de {comprasPaginadas.length} facturas
          </div>
        )}
      </div>
    );
  };

  const TablaCobrar = () => {
    const cobrarPaginadas = obtenerCobrarPaginadas();
    
    if (cobrarPaginadas.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">Cuentas por Cobrar</h3>
          <p className="text-gray-500">No hay datos cargados. Haz clic en "Cuentas por Cobrar" para cargar.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Cuentas por Cobrar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cobrarPaginadas.slice(0, 10).map((cuenta, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cuenta.folio || cuenta.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cuenta.cliente || cuenta.razonSocial}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(cuenta.saldo || cuenta.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cuenta.fecha || cuenta.fechaEmision}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {cuenta.estado || 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cobrarPaginadas.length > 10 && (
          <div className="px-6 py-4 bg-gray-50 text-sm text-gray-500">
            Mostrando 10 de {cobrarPaginadas.length} facturas
          </div>
        )}
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
