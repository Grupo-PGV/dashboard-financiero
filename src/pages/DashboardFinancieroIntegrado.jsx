import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, TrendingUp, TrendingDown, Wallet, RefreshCw, Database, 
  Upload, FileText, DollarSign, Calendar, BarChart3, PieChart,
  ArrowUp, ArrowDown, Activity, Target, Zap, Eye, Download
} from 'lucide-react';

/**
 * Dashboard Financiero Integrado - PGR Seguridad
 * 
 * Combina datos de API Chipax + procesamiento inteligente de cartolas bancarias
 * para generar KPIs, flujos de caja y proyecciones financieras consolidadas
 */
const DashboardFinancieroIntegrado = ({ onBack, onLogout }) => {
  // ===== ESTADOS PRINCIPALES =====
  
  // Estados de Chipax (existentes)
  const [datosChipax, setDatosChipax] = useState(null);
  const [isLoadingChipax, setIsLoadingChipax] = useState(false);
  const [errorChipax, setErrorChipax] = useState(null);
  
  // Estados de Cartolas Bancarias
  const [cartolasCargadas, setCartolasCargadas] = useState([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState([]);
  const [saldosTotales, setSaldosTotales] = useState({});
  const [isLoadingCartola, setIsLoadingCartola] = useState(false);
  const [errorCartola, setErrorCartola] = useState(null);
  
  // Estados de análisis integrado
  const [kpisConsolidados, setKpisConsolidados] = useState({});
  const [proyeccionFlujo, setProyeccionFlujo] = useState([]);
  const [alertasFinancieras, setAlertasFinancieras] = useState([]);
  
  // Estados de interfaz
  const [vistaActiva, setVistaActiva] = useState('resumen'); // resumen, flujo, proyecciones, cartolas
  const [periodoAnalisis, setPeriodoAnalisis] = useState('mes'); // semana, mes, trimestre

  // ===== CONFIGURACIÓN DE PROCESADORES POR BANCO =====
  const PROCESADORES_BANCO = {
    'banco_chile': {
      nombre: 'Banco de Chile',
      identificadores: ['cartola', 'emitida', 'pgt seguridad spa'],
      estructura: {
        headerRow: 2, // Fila donde están los headers
        dataStartRow: 3, // Fila donde empiezan los datos
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
        headerRow: 'auto', // Detectar automáticamente
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

  // ===== FUNCIÓN PRINCIPAL: CARGAR DATOS DE CHIPAX =====
  const cargarDatosChipax = async () => {
    setIsLoadingChipax(true);
    setErrorChipax(null);
    
    try {
      console.log('🔄 Cargando datos de Chipax...');
      
      // PERSONALIZAR: Aquí va tu llamada real a la API de Chipax
      const API_URL = process.env.REACT_APP_CHIPAX_API_URL;
      const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
      const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

      if (!API_URL || !APP_ID || !SECRET_KEY) {
        console.warn('⚠️ Variables de entorno de Chipax no configuradas, usando datos demo');
        // Simular datos de Chipax para demo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const datosDemo = {
          cuentasPorCobrar: 15750000,
          cuentasPorPagar: 8920000,
          flujoEfectivo: 4250000,
          ingresosMensuales: 12800000,
          gastosMensuales: 9650000,
          utilidadNeta: 3150000,
          presupuestoAnual: 45000000,
          ventasMes: 11200000,
          gastosOperacionales: 7850000,
          kpis: {
            liquidez: 1.8,
            rentabilidad: 24.6,
            endeudamiento: 36.2,
            rotacionCuentas: 45,
            margenNeto: 24.8
          },
          ultimaActualizacion: new Date().toISOString()
        };
        
        setDatosChipax(datosDemo);
        return;
      }

      // Llamada real a Chipax
      const response = await fetch(`${API_URL}/financial-summary`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SECRET_KEY}`,
          'X-App-ID': APP_ID,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error API Chipax: ${response.status}`);
      }

      const data = await response.json();
      setDatosChipax(data);
      
    } catch (error) {
      console.error('❌ Error cargando Chipax:', error);
      setErrorChipax(error.message);
    } finally {
      setIsLoadingChipax(false);
    }
  };

  // ===== FUNCIÓN: PROCESAR ARCHIVO DE CARTOLA =====
  const procesarCartolaBAncaria = async (file) => {
    setIsLoadingCartola(true);
    setErrorCartola(null);

    try {
      console.log(`📁 Procesando cartola: ${file.name}`);
      
      // Importar librería Excel
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
      
    } catch (error) {
      console.error('❌ Error procesando cartola:', error);
      setErrorCartola(`Error: ${error.message}`);
    } finally {
      setIsLoadingCartola(false);
    }
  };

  // ===== FUNCIÓN: DETECTAR BANCO POR ARCHIVO =====
  const detectarBanco = (nombreArchivo, data) => {
    const archivo = nombreArchivo.toLowerCase();
    const contenido = data.slice(0, 10)
      .map(row => (row || []).join(' ').toLowerCase())
      .join(' ');
    
    // Detectar Banco de Chile
    if (archivo.includes('emitida') || 
        contenido.includes('pgt seguridad spa') ||
        contenido.includes('cheque o cargo')) {
      return PROCESADORES_BANCO.banco_chile;
    }
    
    // Detectar BCI
    if (archivo.includes('historica') || 
        archivo.includes('cartola') ||
        contenido.includes('cartola historica')) {
      return PROCESADORES_BANCO.bci;
    }
    
    // Detectar Santander
    if (archivo.includes('santander') || 
        contenido.includes('santander')) {
      return PROCESADORES_BANCO.santander;
    }
    
    // Formato genérico
    return PROCESADORES_BANCO.generic;
  };

  // ===== FUNCIÓN: PROCESAR MOVIMIENTOS =====
  const procesarMovimientos = (rawData, procesador, nombreArchivo) => {
    const movimientos = [];
    
    // Detectar donde empiezan los datos reales
    let dataStartRow = 0;
    
    if (procesador.nombre === 'Banco de Chile') {
      // Para Banco de Chile, buscar la fila con headers "Fecha", "Detalle Movimiento", etc.
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] || [];
        const hasHeaders = row.some(cell => 
          (cell || '').toString().toLowerCase().includes('fecha') ||
          (cell || '').toString().toLowerCase().includes('detalle movimiento')
        );
        if (hasHeaders) {
          dataStartRow = i + 1;
          break;
        }
      }
    } else {
      // Para otros bancos, buscar primera fila con datos numéricos
      for (let i = 5; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i] || [];
        if (row.length >= 4 && typeof row[row.length - 1] === 'number') {
          dataStartRow = i;
          break;
        }
      }
    }
    
    console.log(`🔍 Datos empiezan en fila: ${dataStartRow + 1}`);
    
    // Procesar cada fila de datos
    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length < 4) continue;
      
      try {
        const movimiento = parseMovimiento(row, procesador, i, nombreArchivo);
        if (movimiento) {
          movimientos.push(movimiento);
        }
      } catch (error) {
        console.warn(`⚠️ Error en fila ${i + 1}:`, error.message);
      }
    }
    
    // Ordenar por fecha
    return movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  };

  // ===== FUNCIÓN: PARSEAR MOVIMIENTO INDIVIDUAL =====
  const parseMovimiento = (row, procesador, rowIndex, archivo) => {
    let fecha, descripcion, cargo = 0, abono = 0, saldo = 0;
    
    if (procesador.nombre === 'Banco de Chile') {
      // Formato: [Fecha, Detalle, Cargo, Abono, Saldo, Doc, Trn, Caja, Sucursal]
      fecha = parseDate(row[0]);
      descripcion = (row[1] || '').toString().trim();
      cargo = parseFloat(row[2]) || 0;
      abono = parseFloat(row[3]) || 0;
      saldo = parseFloat(row[4]) || 0;
      
    } else {
      // Formato genérico: intentar detectar columnas
      fecha = parseDate(row[0]);
      descripcion = (row[1] || '').toString().trim();
      
      // Buscar cargo/abono en las siguientes columnas
      for (let i = 2; i < row.length; i++) {
        const valor = parseFloat(row[i]);
        if (!isNaN(valor)) {
          if (i === row.length - 1) {
            saldo = valor; // Última columna suele ser saldo
          } else if (valor > 0) {
            if (cargo === 0) cargo = valor;
            else if (abono === 0) abono = valor;
          }
        }
      }
    }
    
    // Validar datos mínimos
    if (!fecha || !descripcion) return null;
    
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
      id: `${archivo}_${rowIndex}_${Date.now()}`,
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

  // ===== FUNCIÓN: PARSEAR FECHA =====
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Si es un número de Excel (serial date)
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Si es texto, intentar parsear
    const dateStr = dateValue.toString();
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

  // ===== FUNCIÓN: CATEGORIZAR MOVIMIENTO =====
  const categorizarMovimiento = (descripcion) => {
    const desc = descripcion.toLowerCase();
    
    if (desc.includes('transferencia') || desc.includes('traspaso')) return 'transferencia';
    if (desc.includes('pago') || desc.includes('credito')) return 'pago';
    if (desc.includes('deposito') || desc.includes('ingreso')) return 'deposito';
    if (desc.includes('comision') || desc.includes('mantención')) return 'comision';
    if (desc.includes('giro') || desc.includes('atm')) return 'giro';
    if (desc.includes('cheque')) return 'cheque';
    if (desc.includes('nomina') || desc.includes('sueldo')) return 'nomina';
    
    return 'otros';
  };

  // ===== FUNCIÓN: CALCULAR ESTADÍSTICAS DE CARTOLA =====
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

  // ===== FUNCIÓN: ACTUALIZAR SALDOS TOTALES =====
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
    
    setSaldosTotales(saldosPorBanco);
  };

  // ===== FUNCIÓN: CALCULAR KPIs INTEGRADOS =====
  const calcularKPIsIntegrados = () => {
    if (!datosChipax) return;
    
    const saldoBancarioTotal = Object.values(saldosTotales)
      .reduce((sum, banco) => sum + banco.ultimoSaldo, 0);
    
    const ingresosTotales = datosChipax.ingresosMensuales + 
      movimientosBancarios
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + m.monto, 0);
    
    const kpis = {
      // KPIs básicos
      liquidezTotal: (saldoBancarioTotal + datosChipax.flujoEfectivo) / datosChipax.cuentasPorPagar,
      coberturaCuentas: saldoBancarioTotal / datosChipax.cuentasPorPagar,
      eficienciaOperacional: datosChipax.utilidadNeta / datosChipax.ingresosMensuales,
      
      // KPIs avanzados
      rotacionEfectivo: ingresosTotales / saldoBancarioTotal,
      indiceLiquidez: saldoBancarioTotal / datosChipax.gastosMensuales,
      margenContribucion: (ingresosTotales - datosChipax.gastosMensuales) / ingresosTotales,
      
      // Alertas
      alertas: []
    };
    
    // Generar alertas
    if (kpis.liquidezTotal < 1.5) {
      kpis.alertas.push({ tipo: 'warning', mensaje: 'Liquidez por debajo del mínimo recomendado' });
    }
    if (kpis.coberturaCuentas < 0.8) {
      kpis.alertas.push({ tipo: 'danger', mensaje: 'Saldo bancario insuficiente para cubrir deudas' });
    }
    
    setKpisConsolidados(kpis);
    setAlertasFinancieras(kpis.alertas);
  };

  // ===== FUNCIÓN: GENERAR PROYECCIONES =====
  const generarProyeccionFlujo = () => {
    if (!datosChipax) return;
    
    const proyeccion = [];
    const fechaBase = new Date();
    
    for (let i = 1; i <= 12; i++) {
      const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + i, 1);
      
      // Proyección simple basada en tendencias actuales
      const ingresoProyectado = datosChipax.ingresosMensuales * (1 + (Math.random() * 0.1 - 0.05));
      const gastoProyectado = datosChipax.gastosMensuales * (1 + (Math.random() * 0.08 - 0.04));
      const flujoNeto = ingresoProyectado - gastoProyectado;
      
      proyeccion.push({
        mes: fecha.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }),
        ingresos: ingresoProyectado,
        gastos: gastoProyectado,
        flujoNeto: flujoNeto,
        acumulado: i === 1 ? flujoNeto : proyeccion[i-2].acumulado + flujoNeto
      });
    }
    
    setProyeccionFlujo(proyeccion);
  };

  // ===== FUNCIÓN AUXILIAR: LEER ARCHIVO =====
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  // ===== FUNCIÓN: FORMATEAR MONEDA =====
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // ===== EFECTOS =====
  useEffect(() => {
    cargarDatosChipax();
    
    // Cargar datos guardados
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
    if (datosChipax) {
      calcularKPIsIntegrados();
      generarProyeccionFlujo();
    }
  }, [datosChipax, saldosTotales]);

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
            <button
              onClick={cargarDatosChipax}
              disabled={isLoadingChipax}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingChipax ? 'animate-spin' : ''}`} />
              Actualizar Chipax
            </button>
            
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
            { id: 'resumen', label: '📊 Resumen Ejecutivo', icon: BarChart3 },
            { id: 'flujo', label: '💰 Flujo de Caja', icon: TrendingUp },
            { id: 'proyecciones', label: '🎯 Proyecciones', icon: Target },
            { id: 'cartolas', label: '🏦 Gestión Cartolas', icon: Upload }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setVistaActiva(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                vistaActiva === tab.id
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
      <div className="mb-6">
        {alertasFinancieras.map((alerta, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border flex items-center ${
              alerta.tipo === 'danger' 
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}
          >
            <AlertCircle className="h-5 w-5 mr-3" />
            {alerta.mensaje}
          </div>
        ))}
      </div>
    )
  );

  // KPIs principales consolidados
  const KPIsConsolidados = () => {
    const saldoBancarioTotal = Object.values(saldosTotales)
      .reduce((sum, banco) => sum + banco.ultimoSaldo, 0);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Liquidez Total */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Liquidez Total</h3>
            <Wallet className="h-8 w-8 text-blue-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency(saldoBancarioTotal + (datosChipax?.flujoEfectivo || 0))}
          </p>
          <div className="flex items-center text-blue-100">
            <span className="text-sm">
              Cartolas: {formatCurrency(saldoBancarioTotal)} + 
              Chipax: {formatCurrency(datosChipax?.flujoEfectivo || 0)}
            </span>
          </div>
        </div>

        {/* Ratio de Cobertura */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Cobertura</h3>
            <Target className="h-8 w-8 text-green-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {((saldoBancarioTotal / (datosChipax?.cuentasPorPagar || 1)) * 100).toFixed(1)}%
          </p>
          <p className="text-green-100 text-sm">
            de cuentas por pagar cubiertas
          </p>
        </div>

        {/* Flujo Mensual */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Flujo Mensual</h3>
            <Activity className="h-8 w-8 text-purple-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {formatCurrency((datosChipax?.ingresosMensuales || 0) - (datosChipax?.gastosMensuales || 0))}
          </p>
          <div className="flex items-center text-purple-100">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="text-sm">Neto mensual</span>
          </div>
        </div>

        {/* Eficiencia */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Eficiencia</h3>
            <Zap className="h-8 w-8 text-orange-100" />
          </div>
          <p className="text-3xl font-bold mb-1">
            {(((datosChipax?.utilidadNeta || 0) / (datosChipax?.ingresosMensuales || 1)) * 100).toFixed(1)}%
          </p>
          <p className="text-orange-100 text-sm">
            Margen neto operacional
          </p>
        </div>
      </div>
    );
  };

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
    </div>
  );

  // ===== RENDER PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderDashboard />
      
      <div className="max-w-7xl mx-auto p-6">
        <AlertasFinancieras />
        
        {/* Contenido según vista activa */}
        {vistaActiva === 'resumen' && (
          <>
            <KPIsConsolidados />
            
            {/* Resumen de fuentes de datos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Datos de Chipax */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">📈 Datos de Chipax</h3>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    isLoadingChipax ? 'bg-yellow-100 text-yellow-800' : 
                    errorChipax ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isLoadingChipax ? 'Cargando...' : errorChipax ? 'Error' : 'Conectado'}
                  </div>
                </div>
                
                {datosChipax ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cuentas por Cobrar:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(datosChipax.cuentasPorCobrar)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cuentas por Pagar:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(datosChipax.cuentasPorPagar)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Utilidad Neta:</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(datosChipax.utilidadNeta)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {isLoadingChipax ? 'Cargando datos...' : 'No hay datos disponibles'}
                  </div>
                )}
              </div>

              {/* Datos de Cartolas */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">🏦 Saldos Bancarios</h3>
                
                {Object.keys(saldosTotales).length > 0 ? (
                  <div className="space-y-4">
                    {Object.values(saldosTotales).map((banco, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{banco.banco}</p>
                          <p className="text-sm text-gray-600">{banco.movimientos} movimientos</p>
                        </div>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(banco.ultimoSaldo)}
                        </span>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between font-semibold">
                        <span>Total Saldos:</span>
                        <span className="text-green-600">
                          {formatCurrency(
                            Object.values(saldosTotales).reduce((sum, b) => sum + b.ultimoSaldo, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No hay cartolas cargadas</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Sube una cartola para ver los saldos
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {vistaActiva === 'cartolas' && (
          <>
            <ZonaCargaCartolas />
            
            {/* Lista de cartolas cargadas */}
            {cartolasCargadas.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold">📋 Cartolas Procesadas</h3>
                </div>
                
                <div className="divide-y">
                  {cartolasCargadas.map((cartola, index) => (
                    <div key={index} className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{cartola.nombre}</h4>
                          <p className="text-sm text-gray-600">{cartola.banco} • {cartola.movimientos} movimientos</p>
                          <p className="text-xs text-gray-500">
                            Cargado: {new Date(cartola.fechaCarga).toLocaleString('es-CL')}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-lg font-semibold text-blue-600">
                            {formatCurrency(cartola.saldoFinal || 0)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(cartola.flujoNeto || 0)} neto
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Otras vistas (flujo, proyecciones) se pueden implementar aquí */}
        {vistaActiva === 'flujo' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">💰 Análisis de Flujo de Caja</h3>
            <p className="text-gray-600">Gráficos y análisis detallado de flujo de caja combinando Chipax + cartolas</p>
            {/* Implementar gráficos aquí */}
          </div>
        )}

        {vistaActiva === 'proyecciones' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4">🎯 Proyecciones Financieras</h3>
            <p className="text-gray-600">Proyecciones basadas en datos históricos y tendencias actuales</p>
            {/* Implementar proyecciones aquí */}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
