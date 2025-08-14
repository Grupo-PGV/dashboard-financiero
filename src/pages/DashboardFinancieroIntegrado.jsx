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
 * VERSIÓN CORREGIDA - PROBLEMAS SOLUCIONADOS:
 * ✅ Detección de bancos por número de cuenta específico
 * ✅ Procesamiento robusto del Banco de Chile con detección dinámica
 * ✅ Funcionalidad para eliminar cartolas cargadas
 * ✅ Cálculo correcto de saldos integrados
 * ✅ Manejo de errores mejorado
 */
const DashboardFinancieroIntegrado = ({ onBack, onLogout }) => {
  // ===== ESTADOS (mantener todos igual) =====
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  const [filtroCompras, setFiltroCompras] = useState({
    soloNoPagadas: false,
    fechaInicio: '',
    fechaFin: '',
    folioFiltro: ''
  });

  const [paginacionCompras, setPaginacionCompras] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  const [paginacionCobrar, setPaginacionCobrar] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  const [cartolasCargadas, setCartolasCargadas] = useState([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState([]);
  const [saldosTotalesCartolas, setSaldosTotalesCartolas] = useState({});
  const [isLoadingCartola, setIsLoadingCartola] = useState(false);
  const [errorCartola, setErrorCartola] = useState(null);
  
  const [kpisConsolidados, setKpisConsolidados] = useState({});
  const [alertasFinancieras, setAlertasFinancieras] = useState([]);
  const [pestanaActiva, setPestanaActiva] = useState('dashboard');

  // ===== CONFIGURACIÓN DE PROCESADORES MEJORADA =====
  const PROCESADORES_BANCO = {
    'banco_chile': {
      nombre: 'Banco de Chile',
      identificadores: {
        // ✅ NUEVO: Detectar por número de cuenta específico
        numerosCuenta: ['00-800-10734-09', '008001073409'],
        // Mantener identificadores existentes como fallback
        archivo: ['emitida', 'banco_chile'],
        contenido: ['pgr seguridad spa', 'banco de chile', 'cheque o cargo', 'deposito o abono'],
        requiere: ['pgr seguridad spa']
      },
      estructura: {
        // ✅ CORREGIDO: Cambiar a detección dinámica para mayor robustez
        tipoHeader: 'dinamico_robusto',
        headerRow: 2,
        dataStartRow: 3,
        buscarDesde: 3,      // Comenzar búsqueda desde fila 4
        buscarHasta: 15,     // Buscar hasta fila 15
        columnasMinimas: 4,  // Mínimo 4 columnas requeridas
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
      identificadores: {
        // ✅ NUEVO: Detectar por número de cuenta específico
        numerosCuenta: ['89107021'],
        archivo: ['historica', 'cartola'],
        contenido: ['cartola historica', 'cuenta corriente', 'estado de cuenta'],
        excluir: ['pgr seguridad spa', 'banco de chile']
      },
      estructura: {
        tipoHeader: 'dinamico',
        buscarDesde: 8,
        buscarHasta: 25,
        columnasMinimas: 4,
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
      identificadores: {
        // ✅ NUEVO: Detectar por número de cuenta específico
        numerosCuenta: ['70666618'],
        archivo: ['santander'],
        contenido: ['santander chile', 'banco santander'],
        requiere: ['santander']
      },
      estructura: {
        tipoHeader: 'dinamico',
        buscarDesde: 5,
        buscarHasta: 20,
        columnas: {
          fecha: 0,
          descripcion: 1,
          monto: 2,
          saldo: 3
        }
      }
    },
    'internacional': {
      nombre: 'Banco Internacional',
      identificadores: {
        // ✅ NUEVO: Detectar por número de cuenta específico
        numerosCuenta: ['9117726'],
        archivo: ['internacional'],
        contenido: ['banco internacional'],
        requiere: []
      },
      estructura: {
        tipoHeader: 'dinamico',
        buscarDesde: 3,
        buscarHasta: 20,
        columnasMinimas: 4,
        columnas: {
          fecha: 0,
          descripcion: 1,
          cargo: 2,
          abono: 3,
          saldo: 4
        }
      }
    },
    'generic': {
      nombre: 'Formato Genérico',
      identificadores: {
        numerosCuenta: [],
        archivo: [],
        contenido: [],
        requiere: []
      },
      estructura: {
        tipoHeader: 'dinamico',
        buscarDesde: 3,
        buscarHasta: 20,
        columnasMinimas: 3,
        columnas: {
          fecha: 0,
          descripcion: 1,
          monto: 2,
          saldo: 3
        }
      }
    }
  };

  // ===== FUNCIÓN MEJORADA: DETECTAR BANCO POR NÚMERO DE CUENTA =====
  const detectarBanco = (nombreArchivo, data) => {
    const archivo = nombreArchivo.toLowerCase();
    const contenido = data.slice(0, 20)
      .map(row => (row || []).join(' ').toLowerCase())
      .join(' ');
    
    console.log(`📄 Archivo: "${archivo}"`);
    console.log(`📄 Contenido muestra: "${contenido.substring(0, 300)}"`);
    
    // ✅ NUEVO: PASO 1 - Detectar por número de cuenta (método más preciso)
    console.log('\n🔍 FASE 1: Detección por número de cuenta');
    
    for (const [bancoCodigo, procesador] of Object.entries(PROCESADORES_BANCO)) {
      if (!procesador.identificadores.numerosCuenta || procesador.identificadores.numerosCuenta.length === 0) {
        continue;
      }
      
      for (const numeroCuenta of procesador.identificadores.numerosCuenta) {
        // Buscar número de cuenta en el contenido (con y sin guiones)
        const numeroLimpio = numeroCuenta.replace(/[-\s]/g, '');
        const numeroConGuiones = numeroCuenta;
        
        if (contenido.includes(numeroLimpio) || contenido.includes(numeroConGuiones)) {
          console.log(`   🎯 ¡BANCO DETECTADO POR NÚMERO DE CUENTA!`);
          console.log(`   🏦 Banco: ${procesador.nombre}`);
          console.log(`   💳 Número de cuenta encontrado: ${numeroCuenta}`);
          console.log('='.repeat(50));
          return procesador;
        }
      }
    }
    
    // ✅ PASO 2 - Detección por contenido (método existente como fallback)
    console.log('\n🔍 FASE 2: Detección por contenido (fallback)');
    
    const bancosPorPrioridad = ['banco_chile', 'bci', 'santander', 'internacional'];
    
    for (const bancoCodigo of bancosPorPrioridad) {
      const procesador = PROCESADORES_BANCO[bancoCodigo];
      const identificadores = procesador.identificadores;
      
      console.log(`\n🔍 Evaluando: ${procesador.nombre}`);
      
      if (identificadores.requiere && identificadores.requiere.length > 0) {
        const tieneRequeridos = identificadores.requiere.every(requerido => 
          contenido.includes(requerido)
        );
        
        if (!tieneRequeridos) {
          console.log(`   ❌ No cumple requerimientos: ${identificadores.requiere.join(', ')}`);
          continue;
        }
        console.log(`   ✅ Cumple requerimientos: ${identificadores.requiere.join(', ')}`);
      }
      
      if (identificadores.excluir && identificadores.excluir.length > 0) {
        const tieneExcluidos = identificadores.excluir.some(excluido => 
          contenido.includes(excluido)
        );
        
        if (tieneExcluidos) {
          console.log(`   ❌ Contiene términos excluidos: ${identificadores.excluir.join(', ')}`);
          continue;
        }
        console.log(`   ✅ No contiene términos excluidos`);
      }
      
      const coincidenciasArchivo = identificadores.archivo.filter(id => 
        archivo.includes(id)
      );
      
      const coincidenciasContenido = identificadores.contenido.filter(id => 
        contenido.includes(id)
      );
      
      console.log(`   📁 Coincidencias archivo: ${coincidenciasArchivo.length} (${coincidenciasArchivo.join(', ')})`);
      console.log(`   📄 Coincidencias contenido: ${coincidenciasContenido.length} (${coincidenciasContenido.join(', ')})`);
      
      if (coincidenciasArchivo.length > 0 || coincidenciasContenido.length > 0) {
        console.log(`   🎯 ¡BANCO DETECTADO POR CONTENIDO!`);
        console.log(`   🏦 Banco: ${procesador.nombre}`);
        console.log('='.repeat(50));
        return procesador;
      }
    }
    
    console.log(`\n🏦 Usando formato genérico por defecto`);
    console.log('='.repeat(50));
    return PROCESADORES_BANCO.generic;
  };

  // ===== FUNCIÓN MEJORADA: PROCESAMIENTO ROBUSTO DE MOVIMIENTOS =====
  const procesarMovimientos = (rawData, procesador, nombreArchivo) => {
    console.log('🔄 PROCESAMIENTO MEJORADO DE MOVIMIENTOS');
    console.log(`🏦 Banco: ${procesador.nombre}`);
    console.log(`📊 Total filas: ${rawData.length}`);
    
    const movimientos = [];
    let dataStartRow = 0;
    
    // ✅ NUEVO: Procesamiento específico para Banco de Chile con detección robusta
    if (procesador.estructura.tipoHeader === 'dinamico_robusto') {
      console.log('🔍 Detección robusta para Banco de Chile...');
      
      const buscarDesde = procesador.estructura.buscarDesde || 3;
      const buscarHasta = Math.min(procesador.estructura.buscarHasta || 15, rawData.length);
      
      console.log(`   🔍 Rango de búsqueda: filas ${buscarDesde + 1} - ${buscarHasta}`);
      
      // Buscar patrón específico del Banco de Chile
      for (let i = buscarDesde; i < buscarHasta; i++) {
        const row = rawData[i];
        if (!row || row.length < 4) continue;
        
        const primeraColumna = (row[0] || '').toString().trim();
        const segundaColumna = (row[1] || '').toString().trim();
        
        // Patrones específicos para Banco de Chile
        const tieneFecha = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(primeraColumna) ||
                          (typeof row[0] === 'number' && row[0] > 40000);
        
        const tieneDescripcionValida = segundaColumna.length > 3 && 
                                      !segundaColumna.toLowerCase().includes('fecha') &&
                                      !segundaColumna.toLowerCase().includes('descripcion') &&
                                      !segundaColumna.toLowerCase().includes('periodo') &&
                                      !segundaColumna.toLowerCase().includes('cuenta') &&
                                      !segundaColumna.toLowerCase().includes('oficina') &&
                                      !segundaColumna.toLowerCase().includes('resumen');
        
        const tieneMontos = row.slice(2, 5).some(cell => {
          const numero = parseFloat(String(cell).replace(/[.$,]/g, ''));
          return !isNaN(numero) && numero !== 0;
        });
        
        console.log(`   📋 Fila ${i + 1}: Fecha=${tieneFecha}, Desc="${segundaColumna}" (${tieneDescripcionValida}), Montos=${tieneMontos}`);
        
        if (tieneFecha && tieneDescripcionValida && tieneMontos) {
          dataStartRow = i;
          console.log(`   ✅ Primera fila de datos encontrada en: ${dataStartRow + 1}`);
          break;
        }
      }
      
      if (dataStartRow === 0) {
        console.log('   ❌ No se encontró inicio de datos válido');
        throw new Error(`No se pudo detectar el inicio de datos para ${procesador.nombre}. Verifique el formato del archivo.`);
      }
    }
    // Procesamiento para otros bancos (mantener lógica existente)
    else if (procesador.estructura.tipoHeader === 'fijo') {
      dataStartRow = procesador.estructura.dataStartRow;
      console.log(`📍 Estructura fija - Datos desde fila: ${dataStartRow + 1}`);
    } else {
      console.log('🔍 Buscando inicio de datos dinámicamente...');
      
      const buscarDesde = procesador.estructura.buscarDesde || 5;
      const buscarHasta = Math.min(procesador.estructura.buscarHasta || 25, rawData.length);
      
      console.log(`   🔍 Rango de búsqueda: filas ${buscarDesde + 1} - ${buscarHasta}`);
      
      for (let i = buscarDesde; i < buscarHasta; i++) {
        const row = rawData[i];
        if (!row || row.length < (procesador.estructura.columnasMinimas || 3)) {
          continue;
        }
        
        const primeraColumna = (row[0] || '').toString().trim();
        const segundaColumna = (row[1] || '').toString().trim();
        
        const tieneFecha = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(primeraColumna) ||
                          (typeof row[0] === 'number' && row[0] > 40000);
        
        const tieneDescripcion = segundaColumna.length > 2 && 
                                !segundaColumna.toLowerCase().includes('fecha') &&
                                !segundaColumna.toLowerCase().includes('descripcion') &&
                                !segundaColumna.toLowerCase().includes('periodo');
        
        const tieneMontos = row.slice(2).some(cell => {
          const numero = parseFloat(String(cell).replace(/[.$,]/g, ''));
          return !isNaN(numero) && numero !== 0;
        });
        
        console.log(`   📋 Fila ${i + 1}: Fecha=${tieneFecha}, Desc=${tieneDescripcion}, Montos=${tieneMontos}`);
        
        if (tieneFecha && tieneDescripcion && tieneMontos) {
          dataStartRow = i;
          console.log(`   ✅ Primera fila de datos encontrada en: ${dataStartRow + 1}`);
          break;
        }
      }
      
      if (dataStartRow === 0) {
        console.log('   ❌ No se encontró inicio de datos válido');
        throw new Error(`No se pudo detectar el inicio de datos para ${procesador.nombre}`);
      }
    }
    
    console.log('💰 Procesando movimientos...');
    let movimientosValidos = 0;
    let erroresProcesamiento = 0;
    
    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length < 3) continue;
      
      try {
        const movimiento = parseMovimiento(row, procesador, i, nombreArchivo);
        if (movimiento && movimiento.fecha && movimiento.descripcion) {
          movimientos.push(movimiento);
          movimientosValidos++;
          
          if (movimientosValidos % 10 === 0) {
            console.log(`   📊 Procesados ${movimientosValidos} movimientos...`);
          }
        }
      } catch (error) {
        erroresProcesamiento++;
        if (erroresProcesamiento <= 5) {
          console.warn(`   ⚠️ Error en fila ${i + 1}: ${error.message}`);
        }
      }
    }
    
    console.log(`✅ PROCESAMIENTO COMPLETADO:`);
    console.log(`   💚 Movimientos válidos: ${movimientosValidos}`);
    console.log(`   ⚠️ Errores de procesamiento: ${erroresProcesamiento}`);
    console.log(`   📊 Total filas analizadas: ${rawData.length - dataStartRow}`);
    
    if (movimientosValidos === 0) {
      throw new Error(`No se encontraron movimientos válidos en ${nombreArchivo}. Verifique el formato del archivo.`);
    }
    
    const movimientosOrdenados = movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    console.log(`🎯 Movimientos ordenados por fecha: ${movimientosOrdenados.length}`);
    
    return movimientosOrdenados;
  };

  // ===== FUNCIÓN NUEVA: ELIMINAR CARTOLA =====
  const eliminarCartola = (cartolaId) => {
    console.log(`🗑️ Eliminando cartola ID: ${cartolaId}`);
    
    // Encontrar la cartola a eliminar
    const cartolaAEliminar = cartolasCargadas.find(c => c.id === cartolaId);
    if (!cartolaAEliminar) {
      console.error(`❌ Cartola con ID ${cartolaId} no encontrada`);
      return;
    }
    
    // Confirmar eliminación
    const confirmar = window.confirm(
      `¿Está seguro de eliminar la cartola "${cartolaAEliminar.nombre}"?\n\n` +
      `Banco: ${cartolaAEliminar.banco}\n` +
      `Movimientos: ${cartolaAEliminar.movimientos}\n` +
      `Fecha de carga: ${new Date(cartolaAEliminar.fechaCarga).toLocaleDateString()}\n\n` +
      `Esta acción no se puede deshacer.`
    );
    
    if (!confirmar) return;
    
    try {
      // Filtrar movimientos bancarios (eliminar movimientos de esta cartola)
      const movimientosFiltrados = movimientosBancarios.filter(mov => 
        mov.archivo !== cartolaAEliminar.nombre
      );
      
      // Filtrar cartolas cargadas
      const cartolasFiltradas = cartolasCargadas.filter(c => c.id !== cartolaId);
      
      // Actualizar estados
      setMovimientosBancarios(movimientosFiltrados);
      setCartolasCargadas(cartolasFiltradas);
      
      // Recalcular saldos totales
      actualizarSaldosTotales(movimientosFiltrados);
      calcularKPIsIntegrados();
      
      // Actualizar localStorage
      localStorage.setItem('pgr_movimientos_bancarios', JSON.stringify(movimientosFiltrados));
      localStorage.setItem('pgr_cartolas_cargadas', JSON.stringify(cartolasFiltradas));
      
      console.log(`✅ Cartola "${cartolaAEliminar.nombre}" eliminada exitosamente`);
      console.log(`📊 Movimientos restantes: ${movimientosFiltrados.length}`);
      console.log(`📁 Cartolas restantes: ${cartolasFiltradas.length}`);
      
    } catch (error) {
      console.error('❌ Error eliminando cartola:', error);
      alert(`Error eliminando cartola: ${error.message}`);
    }
  };

  // ===== FUNCIÓN MEJORADA: ACTUALIZAR SALDOS TOTALES =====
  const actualizarSaldosTotales = (movimientos) => {
    console.log('📊 Actualizando saldos totales con movimientos de cartolas...');
    
    const saldosPorBanco = {};
    
    // Agrupar movimientos por banco
    movimientos.forEach(mov => {
      const banco = mov.banco || 'Desconocido';
      
      if (!saldosPorBanco[banco]) {
        saldosPorBanco[banco] = {
          movimientos: [],
          totalIngresos: 0,
          totalEgresos: 0,
          ultimoSaldo: 0,
          ultimaActualizacion: null
        };
      }
      
      saldosPorBanco[banco].movimientos.push(mov);
      saldosPorBanco[banco].totalIngresos += (mov.abono || 0);
      saldosPorBanco[banco].totalEgresos += (mov.cargo || 0);
      
      // Actualizar última actualización
      const fechaMovimiento = new Date(mov.fecha);
      if (!saldosPorBanco[banco].ultimaActualizacion || 
          fechaMovimiento > new Date(saldosPorBanco[banco].ultimaActualizacion)) {
        saldosPorBanco[banco].ultimaActualizacion = mov.fecha;
      }
    });
    
    // ✅ CORREGIDO: Calcular saldo final correctamente
    Object.keys(saldosPorBanco).forEach(banco => {
      const data = saldosPorBanco[banco];
      
      // Ordenar movimientos por fecha
      const movimientosOrdenados = data.movimientos.sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );
      
      // Calcular saldo acumulativo
      let saldoAcumulado = 0;
      movimientosOrdenados.forEach(mov => {
        saldoAcumulado += (mov.abono || 0) - (mov.cargo || 0);
        
        // Si el movimiento tiene saldo explícito, usarlo como referencia
        if (mov.saldo !== undefined && mov.saldo !== null && mov.saldo !== 0) {
          saldoAcumulado = mov.saldo;
        }
      });
      
      data.ultimoSaldo = saldoAcumulado;
      data.flujoNeto = data.totalIngresos - data.totalEgresos;
      
      console.log(`🏦 ${banco}:`);
      console.log(`   💚 Ingresos: ${data.totalIngresos.toLocaleString('es-CL')}`);
      console.log(`   💸 Egresos: ${data.totalEgresos.toLocaleString('es-CL')}`);
      console.log(`   💰 Saldo final: ${data.ultimoSaldo.toLocaleString('es-CL')}`);
      console.log(`   📅 Última actualización: ${data.ultimaActualizacion}`);
    });
    
    setSaldosTotalesCartolas(saldosPorBanco);
    console.log('✅ Saldos totales actualizados');
  };

  // ===== FUNCIÓN MEJORADA: CALCULAR KPIS INTEGRADOS =====
  const calcularKPIsIntegrados = () => {
    console.log('📊 Calculando KPIs integrados...');
    
    // Saldos de Chipax
    const saldoBancarioChipax = saldosBancarios.reduce((sum, cuenta) => 
      sum + (cuenta.saldoCalculado || 0), 0);
    
    // ✅ CORREGIDO: Saldos de cartolas actualizados
    const saldoBancarioCartolas = Object.values(saldosTotalesCartolas)
      .reduce((sum, banco) => sum + banco.ultimoSaldo, 0);
    
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => 
      sum + (cuenta.saldo || cuenta.monto || 0), 0);
    
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => 
      sum + (cuenta.monto || 0), 0);
    
    const kpis = {
      liquidezTotal: saldoBancarioChipax + saldoBancarioCartolas,
      saldoChipax: saldoBancarioChipax,
      saldoCartolas: saldoBancarioCartolas, // ✅ NUEVO: Separar saldos para debugging
      coberturaCuentas: totalPorPagar > 0 ? (saldoBancarioCartolas / totalPorPagar) : 0,
      ratioCobranzaPago: totalPorCobrar > 0 && totalPorPagar > 0 ? 
        (totalPorCobrar / totalPorPagar) : 0,
      efectivoOperacional: saldoBancarioCartolas + totalPorCobrar - totalPorPagar,
      ultimaActualizacionChipax: new Date().toISOString(),
      ultimaActualizacionCartolas: Object.values(saldosTotalesCartolas)
        .map(banco => banco.ultimaActualizacion)
        .sort()
        .pop() || null
    };
    
    setKpisConsolidados(kpis);
    
    // Generar alertas
    const alertas = [];
    if (kpis.liquidezTotal < 0) {
      alertas.push({
        tipo: 'error',
        mensaje: 'Liquidez total negativa',
        valor: kpis.liquidezTotal
      });
    }
    
    if (kpis.saldoCartolas === 0 && cartolasCargadas.length > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: 'Cartolas cargadas pero saldo calculado es cero',
        valor: cartolasCargadas.length
      });
    }
    
    setAlertasFinancieras(alertas);
    
    console.log('✅ KPIs integrados calculados:');
    console.log(`   💰 Liquidez total: ${kpis.liquidezTotal.toLocaleString('es-CL')}`);
    console.log(`   🏦 Saldo Chipax: ${kpis.saldoChipax.toLocaleString('es-CL')}`);
    console.log(`   📄 Saldo Cartolas: ${kpis.saldoCartolas.toLocaleString('es-CL')}`);
  };

  // ===== MANTENER TODAS LAS FUNCIONES EXISTENTES IGUAL =====
  
  // Funciones auxiliares existentes (mantener exactamente igual)
  const cargarXLSX = async () => {
    try {
      const XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      return XLSX;
    } catch (error) {
      throw new Error('Error cargando XLSX desde CDN');
    }
  };

  const parseMonto = (valor) => {
    if (!valor) return 0;
    
    const valorStr = valor.toString().trim();
    if (!valorStr) return 0;
    
    const valorLimpio = valorStr
      .replace(/[^\d,\-\.]/g, '')
      .replace(/(\d)\.(\d{3})/g, '$1$2')
      .replace(',', '.');
    
    const numero = parseFloat(valorLimpio);
    return isNaN(numero) ? 0 : numero;
  };

  const parseDate = (valor) => {
    if (!valor) return null;
    
    if (typeof valor === 'number' && valor > 40000) {
      const fecha = new Date((valor - 25569) * 86400 * 1000);
      return fecha.toISOString().split('T')[0];
    }
    
    const fechaStr = valor.toString().trim();
    const patronesFecha = [
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
    ];
    
    for (const patron of patronesFecha) {
      const match = fechaStr.match(patron);
      if (match) {
        let dia, mes, año;
        
        if (match[3].length === 4) {
          dia = parseInt(match[1]);
          mes = parseInt(match[2]);
          año = parseInt(match[3]);
        } else if (match[1].length === 4) {
          año = parseInt(match[1]);
          mes = parseInt(match[2]);
          dia = parseInt(match[3]);
        } else {
          dia = parseInt(match[1]);
          mes = parseInt(match[2]);
          año = parseInt(match[3]) + 2000;
        }
        
        if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 && año >= 2000) {
          const fecha = new Date(año, mes - 1, dia);
          return fecha.toISOString().split('T')[0];
        }
      }
    }
    
    return null;
  };

  const parseMovimiento = (row, procesador, rowIndex, archivo) => {
    let fecha, descripcion, cargo = 0, abono = 0, saldo = 0, documento = '';
    
    try {
      const columnas = procesador.estructura.columnas;
      
      fecha = parseDate(row[columnas.fecha]);
      if (!fecha) {
        throw new Error(`Fecha inválida en columna ${columnas.fecha}: "${row[columnas.fecha]}"`);
      }
      
      descripcion = (row[columnas.descripcion] || '').toString().trim();
      if (!descripcion || descripcion.length < 2) {
        throw new Error(`Descripción inválida en columna ${columnas.descripcion}: "${descripcion}"`);
      }
      
      if (procesador.nombre === 'BCI') {
        const valores = row.slice(2).map(cell => parseMonto(cell));
        
        if (valores.length >= 3) {
          cargo = valores[0] || 0;
          abono = valores[1] || 0;
          saldo = valores[2] || 0;
          
          if (cargo !== 0 && abono === 0) {
            if (cargo < 0) {
              abono = Math.abs(cargo);
              cargo = 0;
            }
          }
        } else if (valores.length >= 2) {
          const monto = valores[0];
          saldo = valores[1];
          
          if (monto > 0) {
            abono = monto;
          } else {
            cargo = Math.abs(monto);
          }
        }
      } else {
        cargo = parseMonto(row[columnas.cargo]);
        abono = parseMonto(row[columnas.abono]);
        saldo = parseMonto(row[columnas.saldo]);
        
        if (columnas.documento !== undefined) {
          documento = (row[columnas.documento] || '').toString().trim();
        }
      }
      
      if (cargo === 0 && abono === 0) {
        throw new Error('No se encontraron montos válidos (cargo o abono)');
      }
      
      return {
        fecha: fecha,
        descripcion: descripcion,
        cargo: cargo,
        abono: abono,
        saldo: saldo,
        documento: documento,
        banco: procesador.nombre,
        archivo: archivo,
        fila: rowIndex + 1,
        id: `${archivo}_${rowIndex}_${Date.now()}`
      };
      
    } catch (error) {
      throw new Error(`Fila ${rowIndex + 1}: ${error.message}`);
    }
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(new Error('Error leyendo el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  // ===== FUNCIÓN PRINCIPAL: PROCESAR CARTOLA MEJORADA =====
  const procesarCartolaBAncaria = async (file) => {
    setIsLoadingCartola(true);
    setErrorCartola(null);

    try {
      console.log(`🔍 Procesando cartola: ${file.name}`);
      
      console.log('📦 Cargando librería XLSX...');
      let XLSX;
      
      try {
        XLSX = await cargarXLSX();
        console.log('✅ XLSX cargado exitosamente');
        
        if (!XLSX || typeof XLSX.read !== 'function') {
          throw new Error('XLSX.read no está disponible');
        }
        
      } catch (xlsxError) {
        console.error('❌ Error cargando XLSX:', xlsxError);
        throw new Error(`No se pudo cargar la librería XLSX.
        
🔧 Posibles soluciones:
• Verifica tu conexión a internet
• Recarga la página completamente (Ctrl+F5)
• Intenta en unos minutos
• Si el problema persiste, contacta al administrador

Error técnico: ${xlsxError.message}`);
      }
      
      console.log('📄 Leyendo archivo Excel...');
      const arrayBuffer = await readFileAsArrayBuffer(file);
      
      console.log('🔧 Procesando workbook...');
      const workbook = XLSX.read(arrayBuffer, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true
      });
      
      console.log('📊 Hojas disponibles:', workbook.SheetNames);
      
      const primeraHoja = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[primeraHoja];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log(`📋 Total filas: ${rawData.length}`);
      
      if (rawData.length === 0) {
        throw new Error('El archivo Excel está vacío o no contiene datos válidos');
      }
      
      const procesador = detectarBanco(file.name, rawData);
      console.log(`🏦 Banco detectado: ${procesador.nombre}`);
      
      const movimientos = procesarMovimientos(rawData, procesador, file.name);
      console.log(`✅ Procesados ${movimientos.length} movimientos`);
      
      if (movimientos.length === 0) {
        throw new Error('No se encontraron movimientos válidos en el archivo');
      }
      
      const estadisticas = calcularEstadisticasCartola(movimientos);
      
      const nuevosMovimientos = [...movimientosBancarios, ...movimientos];
      setMovimientosBancarios(nuevosMovimientos);
      
      const nuevaCartola = {
        id: Date.now(),
        nombre: file.name,
        banco: procesador.nombre,
        fechaCarga: new Date().toISOString(),
        movimientos: movimientos.length,
        ...estadisticas
      };
      
      setCartolasCargadas(prev => [...prev, nuevaCartola]);
      
      actualizarSaldosTotales(nuevosMovimientos);
      calcularKPIsIntegrados();
      
      localStorage.setItem('pgr_movimientos_bancarios', JSON.stringify(nuevosMovimientos));
      localStorage.setItem('pgr_cartolas_cargadas', JSON.stringify([...cartolasCargadas, nuevaCartola]));
      
      console.log(`🎉 Cartola ${file.name} procesada exitosamente`);
      
    } catch (error) {
      console.error('❌ Error procesando cartola:', error);
      
      let mensajeError = `❌ Error procesando el archivo ${file.name}:\n\n${error.message}`;
      
      if (error.message.includes('XLSX')) {
        mensajeError += `\n\n💡 Este error está relacionado con la carga de la librería Excel.`;
      } else if (error.message.includes('No se encontraron movimientos')) {
        mensajeError += `\n\n🔧 Posibles causas:\n`;
        mensajeError += `• El formato del archivo no coincide con los bancos soportados\n`;
        mensajeError += `• Los datos podrían estar en una hoja diferente\n`;
        mensajeError += `• Revisa los logs de la consola para más detalles (F12)`;
      } else if (error.message.includes('detectar el inicio')) {
        mensajeError += `\n\n🔧 Problema de formato:\n`;
        mensajeError += `• La estructura del archivo no es reconocida\n`;
        mensajeError += `• Verifica que sea una cartola bancaria válida`;
      }
      
      setErrorCartola(mensajeError);
    } finally {
      setIsLoadingCartola(false);
    }
  };

  // ===== RESTO DE FUNCIONES (mantener exactamente igual) =====

  const calcularEstadisticasCartola = (movimientos) => {
    if (!movimientos || movimientos.length === 0) {
      return {
        totalIngresos: 0,
        totalEgresos: 0,
        flujoNeto: 0,
        saldoFinal: 0,
        promedioIngreso: 0,
        promedioEgreso: 0
      };
    }

    const ingresos = movimientos.filter(mov => (mov.abono || 0) > 0);
    const egresos = movimientos.filter(mov => (mov.cargo || 0) > 0);

    const totalIngresos = ingresos.reduce((sum, mov) => sum + (mov.abono || 0), 0);
    const totalEgresos = egresos.reduce((sum, mov) => sum + (mov.cargo || 0), 0);

    const movimientosOrdenados = movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const saldoFinal = movimientosOrdenados.length > 0 ?
      movimientosOrdenados[movimientosOrdenados.length - 1].saldo || 0 : 0;

    return {
      totalIngresos,
      totalEgresos,
      flujoNeto: totalIngresos - totalEgresos,
      saldoFinal,
      promedioIngreso: ingresos.length > 0 ? totalIngresos / ingresos.length : 0,
      promedioEgreso: egresos.length > 0 ? totalEgresos / egresos.length : 0
    };
  };

  // TODAS LAS FUNCIONES DE FILTRADO Y PAGINACIÓN (mantener exactas)
  const obtenerComprasFiltradas = () => {
    let comprasFiltradas = cuentasPorPagar;

    if (filtroCompras.soloNoPagadas) {
      comprasFiltradas = filtrarComprasPendientes(comprasFiltradas);
    }

    if (filtroCompras.fechaInicio && filtroCompras.fechaFin) {
      comprasFiltradas = filtrarComprasPorFecha(comprasFiltradas, filtroCompras.fechaInicio, filtroCompras.fechaFin);
    }

    if (filtroCompras.folioFiltro) {
      comprasFiltradas = comprasFiltradas.filter(compra =>
        (compra.numero || '').toString().toLowerCase().includes(filtroCompras.folioFiltro.toLowerCase()) ||
        (compra.proveedor || '').toLowerCase().includes(filtroCompras.folioFiltro.toLowerCase())
      );
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

  const totalPaginasCompras = Math.ceil(obtenerComprasFiltradas().length / paginacionCompras.itemsPorPagina);
  const totalPaginasCobrar = Math.ceil(cuentasPorCobrar.length / paginacionCobrar.itemsPorPagina);

  const formatearMoneda = (monto) => {
    if (typeof monto !== 'number') return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  };

  const normalizarNombreBanco = (bancoStr) => {
    if (!bancoStr) return 'generico';
    
    const mapeoNombres = {
      'banco de chile': 'banco_chile',
      'banco chile': 'banco_chile',
      'bci': 'bci',
      'banco de credito': 'bci',
      'banco de credito e inversiones': 'bci',
      'santander': 'santander',
      'banco santander': 'santander',
      'santander chile': 'santander',
      'banco internacional': 'internacional',
      'internacional': 'internacional',
      'formato generico': 'generico',
      'generico': 'generico'
    };
    
    return mapeoNombres[bancoStr] || bancoStr.replace(/\s+/g, '_');
  };

  // ===== EFECTOS (mantener exactos) =====
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (saldosBancarios.length > 0 || Object.keys(saldosTotalesCartolas).length > 0) {
      calcularKPIsIntegrados();
    }
  }, [saldosBancarios, saldosTotalesCartolas, cuentasPorCobrar, cuentasPorPagar]);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      // Cargar datos de Chipax
      const [saldosResp, cobrarResp, pagarResp] = await Promise.all([
        chipaxService.obtenerSaldosBancarios(),
        chipaxService.obtenerCuentasPorCobrar(),
        chipaxService.obtenerCuentasPorPagar()
      ]);

      setSaldosBancarios(saldosResp.items || []);
      setCuentasPorCobrar(adaptarCuentasPorCobrar(cobrarResp.items || []));
      setCuentasPorPagar(adaptarCuentasPorPagar(pagarResp.items || []));

      // Cargar datos persistidos de cartolas
      const movimientosGuardados = JSON.parse(localStorage.getItem('pgr_movimientos_bancarios') || '[]');
      const cartolasGuardadas = JSON.parse(localStorage.getItem('pgr_cartolas_cargadas') || '[]');

      if (movimientosGuardados.length > 0) {
        setMovimientosBancarios(movimientosGuardados);
        actualizarSaldosTotales(movimientosGuardados);
      }

      if (cartolasGuardadas.length > 0) {
        setCartolasCargadas(cartolasGuardadas);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
      setErrors([`Error cargando datos: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDERIZADO PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">💼 Dashboard Financiero Integrado</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                ✅ Detección mejorada por número de cuenta
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Pestañas de navegación */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6">
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: BarChart3 },
            { id: 'cartolas', label: '📄 Cartolas Bancarias', icon: Upload },
            { id: 'saldos', label: '💰 Saldos Detallados', icon: Wallet },
            { id: 'compras', label: '🛒 Compras', icon: FileText },
            { id: 'debug', label: '🔧 Debug', icon: Bug }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPestanaActiva(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
                pestanaActiva === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de las pestañas */}
        {pestanaActiva === 'cartolas' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Upload className="text-blue-500" />
                📄 Gestión de Cartolas Bancarias
              </h2>
              
              {/* Área de carga de archivos */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) procesarCartolaBAncaria(file);
                  }}
                  className="hidden"
                  id="cartola-upload"
                  disabled={isLoadingCartola}
                />
                <label
                  htmlFor="cartola-upload"
                  className={`cursor-pointer block text-center ${
                    isLoadingCartola ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Seleccionar archivo Excel
                      </p>
                      <p className="text-sm text-gray-500">
                        Formatos soportados: .xlsx, .xls
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        ✅ Detección mejorada: Banco de Chile, BCI, Santander, Internacional
                      </p>
                    </div>
                  </div>
                </label>
              </div>
              
              {isLoadingCartola && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="animate-spin text-blue-500" size={20} />
                    <div>
                      <p className="font-medium text-blue-800">Procesando cartola...</p>
                      <p className="text-sm text-blue-600">
                        Cargando XLSX → Detectando banco → Procesando movimientos
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {errorCartola && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-800 mb-2">Error procesando cartola</h4>
                      <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono bg-red-100 p-3 rounded">
                        {errorCartola}
                      </pre>
                      <button
                        onClick={() => setErrorCartola(null)}
                        className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de cartolas cargadas */}
              {cartolasCargadas.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="text-green-500" />
                    Cartolas Cargadas ({cartolasCargadas.length})
                  </h3>
                  <div className="space-y-3">
                    {cartolasCargadas.map((cartola) => (
                      <div key={cartola.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{cartola.nombre}</h4>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {cartola.banco}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Movimientos:</span> {cartola.movimientos}
                            </div>
                            <div>
                              <span className="font-medium">Ingresos:</span> {formatearMoneda(cartola.totalIngresos)}
                            </div>
                            <div>
                              <span className="font-medium">Egresos:</span> {formatearMoneda(cartola.totalEgresos)}
                            </div>
                            <div>
                              <span className="font-medium">Saldo Final:</span> {formatearMoneda(cartola.saldoFinal)}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Cargado: {new Date(cartola.fechaCarga).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => eliminarCartola(cartola.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar cartola"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen de saldos por banco */}
              {Object.keys(saldosTotalesCartolas).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="text-purple-500" />
                    💰 Saldos por Banco
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(saldosTotalesCartolas).map(([banco, data]) => (
                      <div key={banco} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          🏦 {banco}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Saldo Final:</span>
                            <span className={`font-semibold ${data.ultimoSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatearMoneda(data.ultimoSaldo)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Ingresos:</span>
                            <span className="text-green-600">{formatearMoneda(data.totalIngresos)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Egresos:</span>
                            <span className="text-red-600">{formatearMoneda(data.totalEgresos)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Movimientos:</span>
                            <span className="text-blue-600">{data.movimientos?.length || 0}</span>
                          </div>
                          {data.ultimaActualizacion && (
                            <div className="text-xs text-gray-500 mt-2">
                              Última actualización: {new Date(data.ultimaActualizacion).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aquí van las otras pestañas existentes (dashboard, saldos, compras, debug) - mantener exactamente igual */}
        {pestanaActiva === 'dashboard' && (
          <div className="space-y-6">
            {/* KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">💰 Liquidez Total</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatearMoneda(kpisConsolidados.liquidezTotal || 0)}
                    </p>
                    <div className="text-xs text-gray-500 mt-1">
                      Chipax: {formatearMoneda(kpisConsolidados.saldoChipax || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cartolas: {formatearMoneda(kpisConsolidados.saldoCartolas || 0)}
                    </div>
                  </div>
                  <Wallet className="h-12 w-12 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">📊 Cobertura Cuentas</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {((kpisConsolidados.coberturaCuentas || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <PieChart className="h-12 w-12 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">🎯 Ratio Cobranza/Pago</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(kpisConsolidados.ratioCobranzaPago || 0).toFixed(2)}
                    </p>
                  </div>
                  <Target className="h-12 w-12 text-purple-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">⚡ Efectivo Operacional</p>
                    <p className={`text-2xl font-bold ${(kpisConsolidados.efectivoOperacional || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatearMoneda(kpisConsolidados.efectivoOperacional || 0)}
                    </p>
                  </div>
                  <Activity className="h-12 w-12 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Alertas financieras */}
            {alertasFinancieras.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="text-yellow-500" />
                  🚨 Alertas Financieras
                </h3>
                <div className="space-y-3">
                  {alertasFinancieras.map((alerta, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      alerta.tipo === 'error' ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'
                    }`}>
                      <p className={`font-medium ${
                        alerta.tipo === 'error' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {alerta.mensaje}
                      </p>
                      {alerta.valor !== undefined && (
                        <p className={`text-sm mt-1 ${
                          alerta.tipo === 'error' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          Valor: {typeof alerta.valor === 'number' ? formatearMoneda(alerta.valor) : alerta.valor}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resto de pestañas - mantener código existente exacto */}
        {/* ... aquí van todas las otras pestañas sin cambios ... */}

      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
