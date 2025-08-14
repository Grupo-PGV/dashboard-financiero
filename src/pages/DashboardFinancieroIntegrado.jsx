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
 * VERSIÓN 15 CORREGIDA - MEJORAS APLICADAS:
 * ✅ Detección precisa de bancos (BCI vs Banco Chile) 
 * ✅ Procesamiento robusto de movimientos
 * ✅ Cálculo correcto de saldos
 * ✅ Manejo de errores mejorado
 * ✅ Logs detallados para debugging
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

  // ===== ESTADOS PARA CARTOLAS BANCARIAS =====
  const [cartolasCargadas, setCartolasCargadas] = useState([]);
  const [movimientosBancarios, setMovimientosBancarios] = useState([]);
  const [saldosTotalesCartolas, setSaldosTotalesCartolas] = useState({});
  const [isLoadingCartola, setIsLoadingCartola] = useState(false);
  const [errorCartola, setErrorCartola] = useState(null);
  
  // Estados de análisis integrado
  const [kpisConsolidados, setKpisConsolidados] = useState({});
  const [alertasFinancieras, setAlertasFinancieras] = useState([]);
  const [pestanaActiva, setPestanaActiva] = useState('dashboard');

  // ===== CONFIGURACIÓN MEJORADA DE PROCESADORES POR BANCO =====
  const PROCESADORES_BANCO = {
    'banco_chile': {
      nombre: 'Banco de Chile',
      identificadores: {
        archivo: ['emitida', 'banco_chile'],
        contenido: ['pgr seguridad spa', 'banco de chile', 'cheque o cargo', 'deposito o abono'],
        requiere: ['pgr seguridad spa'] // DEBE contener este texto específico
      },
      estructura: {
        tipoHeader: 'fijo',
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
      identificadores: {
        archivo: ['historica', 'cartola'],
        contenido: ['cartola historica', 'cuenta corriente', 'estado de cuenta'],
        excluir: ['pgr seguridad spa', 'banco de chile'] // NO debe contener estos términos
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
    'generic': {
      nombre: 'Formato Genérico',
      identificadores: {
        archivo: [],
        contenido: [],
        requiere: []
      },
      estructura: {
        tipoHeader: 'dinamico',
        buscarDesde: 3,
        buscarHasta: 30,
        columnas: {
          fecha: 0,
          descripcion: 1,
          cargo: 2,
          abono: 3,
          saldo: 4
        }
      }
    }
  };

  // ===== FUNCIONES CHIPAX EXISTENTES (mantener exactas) =====
  
  const cargarSaldosBancarios = async () => {
    try {
      console.log('🏦 Cargando saldos bancarios...');
      setLoading(true);
      const response = await chipaxService.getSaldosBancarios();
      setSaldosBancarios(response || []);
      console.log(`✅ Saldos bancarios cargados: ${(response || []).length}`);
    } catch (error) {
      console.error('❌ Error cargando saldos bancarios:', error);
      setErrors(prev => [...prev, `Error saldos bancarios: ${error.message}`]);
    }
  };

  const cargarSoloCuentasPorCobrar = async () => {
    try {
      console.log('💰 Cargando cuentas por cobrar...');
      setLoading(true);
      const response = await chipaxService.getCuentasPorCobrar();
      const adaptadas = adaptarCuentasPorCobrar(response || []);
      setCuentasPorCobrar(adaptadas);
      console.log(`✅ Cuentas por cobrar cargadas: ${adaptadas.length}`);
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      setErrors(prev => [...prev, `Error cuentas por cobrar: ${error.message}`]);
    }
  };

  const cargarSolo2025 = async () => {
    try {
      console.log('📋 Cargando cuentas por pagar 2025...');
      setLoading(true);
      const response = await chipaxService.getCuentasPorPagar();
      const adaptadas = adaptarCuentasPorPagar(response || []);
      setCuentasPorPagar(adaptadas);
      console.log(`✅ Cuentas por pagar cargadas: ${adaptadas.length}`);
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setErrors(prev => [...prev, `Error cuentas por pagar: ${error.message}`]);
    }
  };

  const cargarSoloSaldos = cargarSaldosBancarios;

  const cargarTodosDatos = async () => {
    try {
      console.log('🚀 Cargando todos los datos...');
      setErrors([]);
      await Promise.all([
        cargarSaldosBancarios(),
        cargarSoloCuentasPorCobrar(),
        cargarSolo2025()
      ]);
      console.log('✅ Todos los datos cargados exitosamente');
    } catch (error) {
      console.error('❌ Error cargando todos los datos:', error);
      setErrors(prev => [...prev, `Error general: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const verificarConectividad = async () => {
    console.log('🔗 Verificando conectividad Chipax...');
    try {
      setLoading(true);
      await chipaxService.getSaldosBancarios();
      setErrors([]);
      console.log('✅ Conectividad verificada');
    } catch (error) {
      console.error('❌ Error de conectividad:', error);
      setErrors([`Error de conectividad: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // ===== FUNCIONES MEJORADAS PARA PROCESAMIENTO DE CARTOLAS =====

  /**
   * FUNCIÓN MEJORADA: Detectar banco con lógica más precisa
   */
  const detectarBanco = (nombreArchivo, data) => {
    console.log('🔍 DETECCIÓN MEJORADA DE BANCO');
    console.log('='.repeat(50));
    
    const archivo = nombreArchivo.toLowerCase();
    const contenido = data.slice(0, 20)
      .map(row => (row || []).join(' ').toLowerCase())
      .join(' ');
    
    console.log(`📄 Archivo: "${archivo}"`);
    console.log(`📄 Contenido muestra: "${contenido.substring(0, 300)}"`);
    
    // ORDEN DE PRIORIDAD (más específico primero)
    const bancosPorPrioridad = ['banco_chile', 'bci', 'santander'];
    
    for (const bancoCodigo of bancosPorPrioridad) {
      const procesador = PROCESADORES_BANCO[bancoCodigo];
      const identificadores = procesador.identificadores;
      
      console.log(`\n🔍 Evaluando: ${procesador.nombre}`);
      
      // 1. VERIFICAR REQUERIMIENTOS OBLIGATORIOS
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
      
      // 2. VERIFICAR EXCLUSIONES (no debe contener)
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
      
      // 3. VERIFICAR COINCIDENCIAS EN ARCHIVO Y CONTENIDO
      const coincidenciasArchivo = identificadores.archivo.filter(id => 
        archivo.includes(id)
      );
      
      const coincidenciasContenido = identificadores.contenido.filter(id => 
        contenido.includes(id)
      );
      
      console.log(`   📁 Coincidencias archivo: ${coincidenciasArchivo.length} (${coincidenciasArchivo.join(', ')})`);
      console.log(`   📄 Coincidencias contenido: ${coincidenciasContenido.length} (${coincidenciasContenido.join(', ')})`);
      
      // 4. DECISIÓN FINAL (al menos 1 coincidencia)
      if (coincidenciasArchivo.length > 0 || coincidenciasContenido.length > 0) {
        console.log(`   🎯 ¡BANCO DETECTADO! → ${procesador.nombre}`);
        console.log('='.repeat(50));
        return procesador;
      }
    }
    
    console.log(`\n🏦 Usando formato genérico por defecto`);
    console.log('='.repeat(50));
    return PROCESADORES_BANCO.generic;
  };

  /**
   * FUNCIÓN MEJORADA: Procesar movimientos con detección dinámica
   */
  const procesarMovimientos = (rawData, procesador, nombreArchivo) => {
    console.log('🔄 PROCESAMIENTO MEJORADO DE MOVIMIENTOS');
    console.log(`🏦 Banco: ${procesador.nombre}`);
    console.log(`📊 Total filas: ${rawData.length}`);
    
    const movimientos = [];
    let dataStartRow = 0;
    
    if (procesador.estructura.tipoHeader === 'fijo') {
      // ESTRUCTURA FIJA (Banco de Chile)
      dataStartRow = procesador.estructura.dataStartRow;
      console.log(`📍 Estructura fija - Datos desde fila: ${dataStartRow + 1}`);
      
    } else {
      // ESTRUCTURA DINÁMICA (BCI, Santander, etc.)
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
        
        // Verificar si tiene fecha en primera columna
        const tieneFecha = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(primeraColumna) ||
                          (typeof row[0] === 'number' && row[0] > 40000); // Excel date number
        
        // Verificar si tiene descripción válida en segunda columna
        const tieneDescripcion = segundaColumna.length > 2 && 
                                !segundaColumna.toLowerCase().includes('fecha') &&
                                !segundaColumna.toLowerCase().includes('descripcion') &&
                                !segundaColumna.toLowerCase().includes('periodo');
        
        // Verificar si tiene montos en columnas siguientes
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
    
    // PROCESAR TODOS LOS MOVIMIENTOS
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
          
          // Log progreso cada 10 movimientos
          if (movimientosValidos % 10 === 0) {
            console.log(`   📊 Procesados ${movimientosValidos} movimientos...`);
          }
        }
      } catch (error) {
        erroresProcesamiento++;
        if (erroresProcesamiento <= 5) { // Solo mostrar primeros 5 errores
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
    
    // Ordenar por fecha y retornar
    const movimientosOrdenados = movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    console.log(`🎯 Movimientos ordenados por fecha: ${movimientosOrdenados.length}`);
    
    return movimientosOrdenados;
  };

  /**
   * FUNCIÓN MEJORADA: Parsear movimiento individual
   */
  const parseMovimiento = (row, procesador, rowIndex, archivo) => {
    let fecha, descripcion, cargo = 0, abono = 0, saldo = 0, documento = '';
    
    try {
      const columnas = procesador.estructura.columnas;
      
      // OBTENER FECHA
      fecha = parseDate(row[columnas.fecha]);
      if (!fecha) {
        throw new Error(`Fecha inválida en columna ${columnas.fecha}: "${row[columnas.fecha]}"`);
      }
      
      // OBTENER DESCRIPCIÓN
      descripcion = (row[columnas.descripcion] || '').toString().trim();
      if (!descripcion || descripcion.length < 2) {
        throw new Error(`Descripción inválida en columna ${columnas.descripcion}: "${descripcion}"`);
      }
      
      // OBTENER MONTOS SEGÚN TIPO DE BANCO
      if (procesador.nombre === 'BCI') {
        // LÓGICA ESPECIAL PARA BCI (formato puede variar)
        const valores = row.slice(2).map(cell => parseMonto(cell));
        
        if (valores.length >= 3) {
          // Formato típico BCI: [Cargo, Abono, Saldo]
          cargo = valores[0] || 0;
          abono = valores[1] || 0;
          saldo = valores[2] || 0;
          
          // Si cargo y abono están en una sola columna, detectar por signo
          if (cargo !== 0 && abono === 0) {
            if (cargo < 0) {
              abono = Math.abs(cargo);
              cargo = 0;
            }
          }
        } else if (valores.length >= 2) {
          // Formato simplificado: [Monto, Saldo]
          const monto = valores[0];
          saldo = valores[1];
          
          if (monto > 0) {
            abono = monto;
          } else {
            cargo = Math.abs(monto);
          }
        }
        
      } else {
        // LÓGICA ESTÁNDAR PARA OTROS BANCOS
        cargo = parseMonto(row[columnas.cargo]);
        abono = parseMonto(row[columnas.abono]);
        saldo = parseMonto(row[columnas.saldo]);
        
        // Documento (si existe la columna)
        if (columnas.documento !== undefined) {
          documento = (row[columnas.documento] || '').toString().trim();
        }
      }
      
      // VALIDACIONES FINALES
      if (cargo === 0 && abono === 0) {
        throw new Error('No se encontraron montos válidos (cargo o abono)');
      }
      
      // CREAR OBJETO MOVIMIENTO
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

  /**
   * FUNCIÓN AUXILIAR: Parsear fechas
   */
  const parseDate = (valor) => {
    if (!valor) return null;
    
    // Si es número de Excel, convertir
    if (typeof valor === 'number' && valor > 40000) {
      const fecha = new Date((valor - 25569) * 86400 * 1000);
      return fecha.toISOString().split('T')[0];
    }
    
    // Si es string, intentar parsear
    const fechaStr = valor.toString().trim();
    
    // Patrones de fecha comunes
    const patronesFecha = [
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,     // dd/mm/yyyy
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,      // dd/mm/yy
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/       // yyyy/mm/dd
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

  /**
   * FUNCIÓN AUXILIAR: Parsear montos
   */
  const parseMonto = (valor) => {
    if (!valor) return 0;
    
    const valorStr = valor.toString().trim();
    if (!valorStr) return 0;
    
    // Limpiar formato chileno
    const valorLimpio = valorStr
      .replace(/[^\d,\-\.]/g, '')
      .replace(/(\d)\.(\d{3})/g, '$1$2')
      .replace(',', '.');
    
    const numero = parseFloat(valorLimpio);
    return isNaN(numero) ? 0 : numero;
  };

  /**
   * FUNCIÓN AUXILIAR: Leer archivo como ArrayBuffer
   */
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(new Error('Error leyendo el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * FUNCIÓN PRINCIPAL: Procesar cartola bancaria (VERSIÓN CORREGIDA)
   */
  const procesarCartolaBAncaria = async (file) => {
    setIsLoadingCartola(true);
    setErrorCartola(null);

    try {
      console.log(`📁 Procesando cartola: ${file.name}`);
      
      // Importar librería XLSX con manejo de errores mejorado
      let XLSX;
      try {
        XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      } catch (xlsxError) {
        console.error('❌ Error importando XLSX:', xlsxError);
        throw new Error(`No se pudo cargar la librería XLSX. 
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
      
      // Detectar banco y procesador CON LÓGICA MEJORADA
      const procesador = detectarBanco(file.name, rawData);
      console.log(`🏦 Banco detectado: ${procesador.nombre}`);
      
      // Procesar movimientos CON NUEVA LÓGICA
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
      
      // Actualizar saldos totales CON LÓGICA MEJORADA
      actualizarSaldosTotales(nuevosMovimientos);
      
      // Recalcular KPIs integrados
      calcularKPIsIntegrados();
      
      // Guardar en localStorage
      localStorage.setItem('pgr_movimientos_bancarios', JSON.stringify(nuevosMovimientos));
      localStorage.setItem('pgr_cartolas_cargadas', JSON.stringify([...cartolasCargadas, nuevaCartola]));
      
      console.log(`🎉 Cartola ${file.name} procesada exitosamente`);
      
    } catch (error) {
      console.error('❌ Error procesando cartola:', error);
      
      // Mensaje de error más descriptivo
      let mensajeError = `❌ Error procesando el archivo ${file.name}:\n\n${error.message}`;
      
      if (error.message.includes('XLSX')) {
        mensajeError += `\n\n🔧 Posibles soluciones:\n`;
        mensajeError += `• Verifica tu conexión a internet\n`;
        mensajeError += `• Recarga la página e intenta nuevamente\n`;
        mensajeError += `• Asegúrate de que el archivo sea un Excel válido (.xlsx)`;
      } else if (error.message.includes('No se encontraron movimientos')) {
        mensajeError += `\n\n🔧 Posibles causas:\n`;
        mensajeError += `• El archivo podría tener un formato diferente al esperado\n`;
        mensajeError += `• Los datos podrían estar en una hoja diferente\n`;
        mensajeError += `• El banco podría requerir configuración adicional\n`;
        mensajeError += `• Revisa los logs de la consola para más detalles`;
      } else if (error.message.includes('detectar el inicio')) {
        mensajeError += `\n\n🔧 Problema de formato:\n`;
        mensajeError += `• La estructura del archivo no coincide con los formatos conocidos\n`;
        mensajeError += `• Verifica que el archivo tenga headers y datos válidos\n`;
        mensajeError += `• Contacta al administrador si el problema persiste`;
      }
      
      setErrorCartola(mensajeError);
    } finally {
      setIsLoadingCartola(false);
    }
  };

  // ===== FUNCIONES DE CÁLCULO DE ESTADÍSTICAS Y SALDOS (MEJORADAS) =====

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

    // Obtener último saldo conocido
    const movimientosOrdenados = movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const saldoFinal = movimientosOrdenados.length > 0 ? 
      movimientosOrdenados[movimientosOrdenados.length - 1].saldo : 0;

    return {
      totalIngresos,
      totalEgresos,
      flujoNeto: totalIngresos - totalEgresos,
      saldoFinal,
      promedioIngreso: ingresos.length > 0 ? totalIngresos / ingresos.length : 0,
      promedioEgreso: egresos.length > 0 ? totalEgresos / egresos.length : 0
    };
  };

  /**
   * FUNCIÓN MEJORADA: Actualizar saldos totales
   */
  const actualizarSaldosTotales = (todosMovimientos) => {
    console.log('💰 ACTUALIZANDO SALDOS TOTALES (VERSIÓN MEJORADA)');
    console.log(`📊 Procesando ${todosMovimientos.length} movimientos`);
    
    if (!todosMovimientos || todosMovimientos.length === 0) {
      console.log('⚠️ No hay movimientos para procesar');
      setSaldosTotalesCartolas({});
      return;
    }
    
    const saldosPorBanco = {};
    
    // Agrupar movimientos por banco
    todosMovimientos.forEach(movimiento => {
      const banco = normalizarBanco(movimiento.banco || 'generico');
      
      if (!saldosPorBanco[banco]) {
        saldosPorBanco[banco] = {
          banco: banco,
          movimientos: [],
          ultimoSaldo: 0,
          ultimaActualizacion: movimiento.fecha
        };
      }
      
      saldosPorBanco[banco].movimientos.push(movimiento);
    });
    
    // Calcular saldo final para cada banco
    Object.keys(saldosPorBanco).forEach(banco => {
      const data = saldosPorBanco[banco];
      const movimientosBanco = data.movimientos.sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );
      
      console.log(`🏦 Calculando ${banco}: ${movimientosBanco.length} movimientos`);
      
      // Encontrar el último movimiento con saldo válido
      const ultimoMovConSaldo = movimientosBanco
        .slice()
        .reverse()
        .find(mov => mov.saldo && !isNaN(mov.saldo) && mov.saldo !== 0);
      
      if (ultimoMovConSaldo) {
        saldosPorBanco[banco].ultimoSaldo = ultimoMovConSaldo.saldo;
        saldosPorBanco[banco].ultimaActualizacion = ultimoMovConSaldo.fecha;
        console.log(`   💰 ${banco}: $${ultimoMovConSaldo.saldo.toLocaleString('es-CL')} (${ultimoMovConSaldo.fecha})`);
      } else {
        console.log(`   ⚠️ ${banco}: No se encontró saldo válido`);
      }
    });
    
    setSaldosTotalesCartolas(saldosPorBanco);
    
    // Guardar en localStorage
    localStorage.setItem('pgr_saldos_cartolas', JSON.stringify(saldosPorBanco));
    
    console.log('✅ Saldos totales actualizados correctamente');
  };

  /**
   * FUNCIÓN AUXILIAR: Normalizar nombre del banco
   */
  const normalizarBanco = (banco) => {
    const bancoStr = banco.toString().toLowerCase().trim();
    
    const mapeoNombres = {
      'banco de chile': 'banco_chile',
      'banco chile': 'banco_chile',
      'bci': 'bci',
      'banco de credito': 'bci',
      'banco de credito e inversiones': 'bci',
      'santander': 'santander',
      'banco santander': 'santander',
      'santander chile': 'santander',
      'formato generico': 'generico',
      'generico': 'generico'
    };
    
    return mapeoNombres[bancoStr] || bancoStr.replace(/\s+/g, '_');
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
      ratioCobranzaPago: totalPorCobrar > 0 && totalPorPagar > 0 ? 
        (totalPorCobrar / totalPorPagar) : 0,
      
      // Gestión de efectivo
      efectivoOperacional: saldoBancarioCartolas + totalPorCobrar - totalPorPagar,
      
      // Últimas actualizaciones
      ultimaActualizacionChipax: new Date().toISOString(),
      ultimaActualizacionCartolas: Object.values(saldosTotalesCartolas)
        .map(banco => banco.ultimaActualizacion)
        .sort()
        .pop() || null
    };
    
    setKpisConsolidados(kpis);
    
    // Generar alertas si es necesario
    const alertas = [];
    if (kpis.liquidezTotal < 0) {
      alertas.push({
        tipo: 'error',
        mensaje: 'Liquidez total negativa',
        valor: kpis.liquidezTotal
      });
    }
    
    setAlertasFinancieras(alertas);
  };

  // ===== FUNCIONES DE FILTRADO Y PAGINACIÓN (mantener existentes) =====
  
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

  const getTotalPaginasCompras = () => {
    return Math.ceil(obtenerComprasFiltradas().length / paginacionCompras.itemsPorPagina);
  };

  const getTotalPaginasCobrar = () => {
    return Math.ceil(cuentasPorCobrar.length / paginacionCobrar.itemsPorPagina);
  };

  // ===== FUNCIONES AUXILIARES (mantener existentes) =====
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // ===== EFECTOS =====
  
  useEffect(() => {
    verificarConectividad();
    
    // Cargar datos guardados de cartolas
    const movimientosGuardados = localStorage.getItem('pgr_movimientos_bancarios');
    const cartolasGuardadas = localStorage.getItem('pgr_cartolas_cargadas');
    const saldosGuardados = localStorage.getItem('pgr_saldos_cartolas');
    
    if (movimientosGuardados) {
      const movimientos = JSON.parse(movimientosGuardados);
      setMovimientosBancarios(movimientos);
      actualizarSaldosTotales(movimientos);
      console.log(`📂 Cargados ${movimientos.length} movimientos desde localStorage`);
    }
    
    if (cartolasGuardadas) {
      const cartolas = JSON.parse(cartolasGuardadas);
      setCartolasCargadas(cartolas);
      console.log(`📂 Cargadas ${cartolas.length} cartolas desde localStorage`);
    }
    
    if (saldosGuardados) {
      const saldos = JSON.parse(saldosGuardados);
      setSaldosTotalesCartolas(saldos);
      console.log(`📂 Cargados saldos desde localStorage`);
    }
  }, []);

  useEffect(() => {
    calcularKPIsIntegrados();
  }, [saldosBancarios, cuentasPorCobrar, cuentasPorPagar, saldosTotalesCartolas]);

  // ===== COMPONENTES DE INTERFAZ (mantener tu UI existente) =====

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
              <button onClick={onLogout} className="text-gray-600 hover:text-gray-900">
                Cerrar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Navegación por pestañas */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: BarChart3 },
            { id: 'cartolas', label: '🏦 Cartolas', icon: Upload },
            { id: 'saldos', label: '💰 Saldos', icon: Wallet },
            { id: 'debugger', label: '🔧 Debugger', icon: Bug }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPestanaActiva(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                pestanaActiva === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon size={16} />
                {tab.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // KPIs consolidados
  const KPIsConsolidados = () => (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Liquidez Total */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Liquidez Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(kpisConsolidados.liquidezTotal || 0)}
              </p>
              <p className="text-blue-100 text-xs">
                Chipax + Cartolas
              </p>
            </div>
            <Wallet className="text-blue-200" size={24} />
          </div>
        </div>

        {/* Cobertura de Cuentas */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Cobertura Deudas</p>
              <p className="text-2xl font-bold">
                {((kpisConsolidados.coberturaCuentas || 0) * 100).toFixed(1)}%
              </p>
              <p className="text-green-100 text-xs">
                Capacidad de pago
              </p>
            </div>
            <Target className="text-green-200" size={24} />
          </div>
        </div>

        {/* Saldos Chipax */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Saldos Chipax</p>
              <p className="text-2xl font-bold">
                {formatCurrency(saldosBancarios.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || 0), 0))}
              </p>
              <p className="text-purple-100 text-xs">
                API contable
              </p>
            </div>
            <Database className="text-purple-200" size={24} />
          </div>
        </div>

        {/* Saldos Cartolas */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Saldos Cartolas</p>
              <p className="text-2xl font-bold">
                {formatCurrency(Object.values(saldosTotalesCartolas).reduce((sum, banco) => sum + banco.ultimoSaldo, 0))}
              </p>
              <p className="text-orange-100 text-xs">
                {cartolasCargadas.length} cartolas
              </p>
            </div>
            <FileText className="text-orange-200" size={24} />
          </div>
        </div>

        {/* Eficiencia Operacional */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm">Ratio Cobrar/Pagar</p>
              <p className="text-2xl font-bold">
                {(kpisConsolidados.ratioCobranzaPago || 0).toFixed(2)}
              </p>
              <p className="text-teal-100 text-xs">
                Eficiencia operacional
              </p>
            </div>
            <Activity className="text-teal-200" size={24} />
          </div>
        </div>
      </div>
    </div>
  );

  // Controles principales
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
    <div className="space-y-6">
      {/* Zona de carga */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">📁 Cargar Cartola Bancaria</h3>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                procesarCartolaBAncaria(file);
              }
            }}
            className="hidden"
            id="cartola-upload"
            disabled={isLoadingCartola}
          />
          <label 
            htmlFor="cartola-upload" 
            className={`cursor-pointer ${isLoadingCartola ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              Seleccionar archivo Excel (.xlsx)
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Bancos soportados: BCI, Banco de Chile, Santander
            </p>
          </label>
        </div>
        
        {isLoadingCartola && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="animate-spin text-blue-500" size={20} />
              <div>
                <p className="font-medium text-blue-800">Procesando cartola...</p>
                <p className="text-sm text-blue-600">
                  Detectando banco, analizando estructura y procesando movimientos
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
                  className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Cerrar error
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de cartolas cargadas */}
      {cartolasCargadas.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold mb-4">📋 Cartolas Cargadas ({cartolasCargadas.length})</h4>
          <div className="space-y-3">
            {cartolasCargadas.map((cartola) => (
              <div key={cartola.id} className="p-4 bg-gray-50 rounded-lg border flex items-center justify-between">
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

  // Estados generales
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

  // Tabla de compras (simplificada)
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
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Cuentas por Pagar ({cuentasPorPagar.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Folio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comprasPaginadas.map((compra, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {compra.proveedor || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {compra.numero || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(compra.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {compra.fecha || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Tabla de cuentas por cobrar (simplificada)
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
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Cuentas por Cobrar ({cuentasPorCobrar.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cobrarPaginadas.map((cuenta, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cuenta.cliente || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cuenta.documento || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(cuenta.saldo || cuenta.monto)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cuenta.fecha || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ===== RENDERIZADO PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderDashboard />
      
      <div className="p-6">
        {/* Mostrar errores si existen */}
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
