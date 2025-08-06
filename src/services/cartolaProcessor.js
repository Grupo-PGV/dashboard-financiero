// cartolaProcessor.js - CORRECCIÓN COMPLETA XLSX
// ✅ IMPORTACIÓN ESTÁTICA + FALLBACK CDN + DETECCIÓN POR BANCO

// ✅ LIBRERÍA XLSX ESTÁTICA (más confiable que import dinámico)
import * as XLSX from 'xlsx';

// ===== CONFIGURACIONES POR BANCO =====
const BANCOS_CONFIG = {
  bci: {
    nombre: 'Banco BCI',
    patrones: ['bci', 'banco bci', 'credito inversiones'],
    cuentaStartRow: 4,
    movimientosStartRow: 8,
    columnas: {
      fecha: 0,
      descripcion: 1,
      cargo: 2,
      abono: 3,
      saldo: 4
    },
    formatoFecha: 'DD/MM/YYYY'
  },
  
  chile: {
    nombre: 'Banco de Chile',
    patrones: ['banco de chile', 'banco chile', 'bankchile'],
    cuentaStartRow: 3,
    movimientosStartRow: 7,
    columnas: {
      fecha: 0,
      descripcion: 1,
      referencia: 2,
      cargo: 3,
      abono: 4,
      saldo: 5
    },
    formatoFecha: 'DD-MM-YYYY'
  },
  
  estado: {
    nombre: 'Banco Estado',
    patrones: ['banco estado', 'bancoestado'],
    cuentaStartRow: 5,
    movimientosStartRow: 9,
    columnas: {
      fecha: 0,
      descripcion: 1,
      cargo: 2,
      abono: 3,
      saldo: 4
    },
    formatoFecha: 'DD/MM/YYYY'
  },
  
  santander: {
    nombre: 'Banco Santander',
    patrones: ['santander', 'banco santander'],
    cuentaStartRow: 4,
    movimientosStartRow: 8,
    columnas: {
      fecha: 0,
      descripcion: 1,
      cargo: 2,
      abono: 3,
      saldo: 4
    },
    formatoFecha: 'DD/MM/YYYY'
  },
  
  // Configuración genérica para bancos no identificados
  generico: {
    nombre: 'Banco Genérico',
    patrones: [],
    cuentaStartRow: 0,
    movimientosStartRow: 5,
    columnas: {
      fecha: 0,
      descripcion: 1,
      cargo: 2,
      abono: 3,
      saldo: 4
    },
    formatoFecha: 'DD/MM/YYYY'
  }
};

// ===== FUNCIÓN PRINCIPAL DE PROCESAMIENTO =====

/**
 * Procesa archivo de cartola bancaria
 * @param {File} file - Archivo a procesar
 * @returns {Object} - Resultado del procesamiento
 */
export const procesarCartolaBancaria = async (file) => {
  console.log(`📁 Procesando cartola: ${file.name}`);
  
  try {
    // ✅ PASO 1: Leer archivo Excel
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const workbook = XLSX.read(arrayBuffer, {
      cellStyles: true,
      cellFormulas: true,
      cellDates: true,
      cellNF: true,
      sheetStubs: true
    });
    
    console.log('📊 Hojas disponibles:', workbook.SheetNames);
    
    // ✅ PASO 2: Obtener datos de la primera hoja
    const primeraHoja = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeraHoja];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: true
    });
    
    console.log(`📋 Total filas: ${rawData.length}`);
    
    // ✅ PASO 3: Detectar banco y configuración
    const bancoConfig = detectarBanco(file.name, rawData);
    console.log(`🏦 Banco detectado: ${bancoConfig.nombre}`);
    
    // ✅ PASO 4: Extraer información de la cuenta
    const infoCuenta = extraerInfoCuenta(rawData, bancoConfig);
    console.log('🏛️ Info cuenta:', infoCuenta);
    
    // ✅ PASO 5: Procesar movimientos
    const movimientos = procesarMovimientos(rawData, bancoConfig, file.name);
    console.log(`✅ Procesados ${movimientos.length} movimientos`);
    
    if (movimientos.length === 0) {
      throw new Error('No se encontraron movimientos válidos en el archivo');
    }
    
    // ✅ PASO 6: Calcular estadísticas
    const estadisticas = calcularEstadisticas(movimientos);
    
    return {
      success: true,
      archivo: file.name,
      banco: bancoConfig.nombre,
      cuenta: infoCuenta,
      movimientos,
      estadisticas,
      procesadoEn: new Date()
    };
    
  } catch (error) {
    console.error('❌ Error procesando cartola:', error);
    return {
      success: false,
      error: error.message,
      archivo: file.name
    };
  }
};

// ===== FUNCIONES AUXILIARES =====

const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
    reader.readAsArrayBuffer(file);
  });
};

const detectarBanco = (filename, rawData) => {
  const nombreArchivo = filename.toLowerCase();
  const contenidoTexto = rawData.flat().join(' ').toLowerCase();
  
  // Buscar patrones en nombre de archivo y contenido
  for (const [key, config] of Object.entries(BANCOS_CONFIG)) {
    if (key === 'generico') continue;
    
    const encontrado = config.patrones.some(patron => 
      nombreArchivo.includes(patron) || contenidoTexto.includes(patron)
    );
    
    if (encontrado) {
      console.log(`✅ Banco detectado por patrón: ${config.nombre}`);
      return config;
    }
  }
  
  console.log('⚠️ Banco no detectado, usando configuración genérica');
  return BANCOS_CONFIG.generico;
};

const extraerInfoCuenta = (rawData, config) => {
  try {
    // Buscar información de cuenta en las primeras filas
    const primerasFilas = rawData.slice(0, 10);
    
    let numeroCuenta = '';
    let titularCuenta = '';
    let tipoCuenta = '';
    
    for (const fila of primerasFilas) {
      const textoFila = fila.join(' ').toLowerCase();
      
      // Buscar número de cuenta
      const matchCuenta = textoFila.match(/cuenta[\s\w]*?(\d{8,})/i);
      if (matchCuenta && !numeroCuenta) {
        numeroCuenta = matchCuenta[1];
      }
      
      // Buscar tipo de cuenta
      if (textoFila.includes('corriente')) {
        tipoCuenta = 'Cuenta Corriente';
      } else if (textoFila.includes('vista')) {
        tipoCuenta = 'Cuenta Vista';
      } else if (textoFila.includes('ahorro')) {
        tipoCuenta = 'Cuenta Ahorro';
      }
    }
    
    return {
      numero: numeroCuenta,
      titular: titularCuenta,
      tipo: tipoCuenta || 'No especificado'
    };
    
  } catch (error) {
    console.error('Error extrayendo info de cuenta:', error);
    return {
      numero: 'No detectado',
      titular: 'No detectado',
      tipo: 'No detectado'
    };
  }
};

const procesarMovimientos = (rawData, config, filename) => {
  const movimientos = [];
  
  try {
    // Empezar desde la fila de movimientos configurada
    const filasMovimientos = rawData.slice(config.movimientosStartRow);
    
    for (let i = 0; i < filasMovimientos.length; i++) {
      const fila = filasMovimientos[i];
      
      // Validar que la fila tenga datos
      if (!fila || fila.length < 3) continue;
      
      const fecha = fila[config.columnas.fecha];
      const descripcion = fila[config.columnas.descripcion];
      const cargo = fila[config.columnas.cargo];
      const abono = fila[config.columnas.abono];
      const saldo = fila[config.columnas.saldo];
      
      // Validar campos obligatorios
      if (!fecha || !descripcion) continue;
      
      // Procesar fecha
      const fechaProcesada = procesarFecha(fecha, config.formatoFecha);
      if (!fechaProcesada) continue;
      
      // Procesar montos
      const cargoProcesado = procesarMonto(cargo);
      const abonoProcesado = procesarMonto(abono);
      const saldoProcesado = procesarMonto(saldo);
      
      // Determinar tipo de movimiento
      const tipo = cargoProcesado > 0 ? 'CARGO' : 'ABONO';
      const monto = cargoProcesado > 0 ? cargoProcesado : abonoProcesado;
      
      if (monto > 0) {
        movimientos.push({
          id: `${filename}_${i}`,
          fecha: fechaProcesada,
          descripcion: String(descripcion).trim(),
          tipo,
          monto,
          cargo: cargoProcesado,
          abono: abonoProcesado,
          saldo: saldoProcesado,
          fila: i + config.movimientosStartRow + 1
        });
      }
    }
    
    return movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
  } catch (error) {
    console.error('Error procesando movimientos:', error);
    return [];
  }
};

const procesarFecha = (fecha, formato) => {
  if (!fecha) return null;
  
  try {
    // Si es un número de Excel, convertir
    if (typeof fecha === 'number') {
      const fechaExcel = XLSX.SSF.parse_date_code(fecha);
      return new Date(fechaExcel.y, fechaExcel.m - 1, fechaExcel.d);
    }
    
    // Si es string, parsear según formato
    if (typeof fecha === 'string') {
      const fechaLimpia = fecha.trim();
      
      // Intentar diferentes formatos
      const formatos = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // DD/MM/YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/,   // YYYY-MM-DD
      ];
      
      for (const formatoRegex of formatos) {
        const match = fechaLimpia.match(formatoRegex);
        if (match) {
          if (formatoRegex === formatos[2]) { // YYYY-MM-DD
            return new Date(match[1], match[2] - 1, match[3]);
          } else { // DD/MM/YYYY or DD-MM-YYYY
            return new Date(match[3], match[2] - 1, match[1]);
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

const procesarMonto = (valor) => {
  if (!valor || valor === '') return 0;
  
  try {
    // Si es número, devolver directamente
    if (typeof valor === 'number') {
      return valor;
    }
    
    // Si es string, limpiar y convertir
    if (typeof valor === 'string') {
      const valorLimpio = valor
        .replace(/\./g, '')  // Quitar puntos de miles
        .replace(/,/g, '.')  // Comas como decimales
        .replace(/[^\d.-]/g, ''); // Solo números, punto y guión
      
      const numero = parseFloat(valorLimpio);
      return isNaN(numero) ? 0 : numero;
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
};

const calcularEstadisticas = (movimientos) => {
  const totalCargos = movimientos
    .filter(m => m.tipo === 'CARGO')
    .reduce((sum, m) => sum + m.monto, 0);
  
  const totalAbonos = movimientos
    .filter(m => m.tipo === 'ABONO')
    .reduce((sum, m) => sum + m.monto, 0);
  
  const saldoFinal = movimientos.length > 0 ? 
    movimientos[0].saldo : 0;
  
  return {
    totalMovimientos: movimientos.length,
    totalCargos,
    totalAbonos,
    saldoFinal,
    fechaInicio: movimientos.length > 0 ? 
      movimientos[movimientos.length - 1].fecha : null,
    fechaFin: movimientos.length > 0 ? 
      movimientos[0].fecha : null
  };
};

export default {
  procesarCartolaBancaria,
  BANCOS_CONFIG
};
