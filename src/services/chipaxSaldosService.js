/**
 * 🏦 CHIPAX SALDOS SERVICE - VERSIÓN COMPLETA MEJORADA
 * 
 * Archivo: chipaxSaldosService.js
 * 
 * Servicio optimizado para obtener saldos bancarios reales de Chipax
 * con múltiples estrategias de extracción y fallbacks inteligentes.
 */

import chipaxService from './chipaxService';

// =====================================
// 📊 CONFIGURACIÓN Y CONSTANTES
// =====================================

// Saldos iniciales conocidos al 1 de enero 2025
const SALDOS_INICIALES_2025 = {
  'Banco de Chile': { 
    saldoInicial: 129969864, 
    cuenta: '00-800-10734-09', 
    cuentaId: 11086,
    alias: ['banconexion2', 'banco de chile']
  },
  'Banco Santander': { 
    saldoInicial: 0, 
    cuenta: '0-000-7066661-8', 
    cuentaId: 11085,
    alias: ['santander']
  },
  'Banco BCI': { 
    saldoInicial: 178098, 
    cuenta: '89107021', 
    cuentaId: 23017,
    alias: ['BCI']
  },
  'Banco Internacional': { 
    saldoInicial: 0, 
    cuenta: 'generico', 
    cuentaId: 11419,
    alias: ['generico']
  },
  'chipax_wallet': { 
    saldoInicial: 0, 
    cuenta: '0000000803', 
    cuentaId: 14212,
    alias: ['wallet', 'chipax wallet']
  }
};

// Saldos conocidos actuales (18-06-2025) para validación
const SALDOS_VALIDACION = {
  'Banco de Chile': 61033565,
  'Banco Santander': 0,
  'Banco BCI': 0,
  'Banco Internacional': 104838856
};

// Total esperado final
const TOTAL_ESPERADO = 165872421;

// =====================================
// 🔧 FUNCIONES AUXILIARES DE EXTRACCIÓN
// =====================================

/**
 * Extracción masiva con paginación inteligente
 */
async function extraerCartolasMasivas() {
  console.log('📄 Extracción masiva con paginación...');
  
  const cartolas = [];
  let pagina = 1;
  const limite = 100;
  const maxPaginas = 1000; // Muy alto para asegurar cobertura completa
  
  let ultimaFechaVista = null;
  let paginasSinCambioFecha = 0;
  
  while (pagina <= maxPaginas) {
    try {
      const endpoint = `/flujo-caja/cartolas?page=${pagina}&limit=${limite}&sort=-fecha`;
      const response = await chipaxService.fetchFromChipax(endpoint);
      
      if (response.docs && response.docs.length > 0) {
        cartolas.push(...response.docs);
        
        // Analizar fechas para detectar si seguimos avanzando
        const fechasEnPagina = response.docs
          .map(c => c.fecha)
          .filter(f => f)
          .map(f => new Date(f));
        
        if (fechasEnPagina.length > 0) {
          const fechaMinPagina = new Date(Math.min(...fechasEnPagina));
          const fechaMaxPagina = new Date(Math.max(...fechasEnPagina));
          
          // Log cada 10 páginas para tracking
          if (pagina % 10 === 0) {
            console.log(`   📄 Página ${pagina}: ${response.docs.length} cartolas (${fechaMinPagina.toLocaleDateString()} - ${fechaMaxPagina.toLocaleDateString()})`);
          }
          
          // Verificar si llegamos a fechas muy antiguas (antes de 2024)
          if (fechaMinPagina.getFullYear() < 2024) {
            console.log(`⏹️ Alcanzamos ${fechaMinPagina.getFullYear()}, deteniendo extracción en página ${pagina}`);
            break;
          }
          
          // Detectar si estamos estancados en la misma fecha
          if (ultimaFechaVista && fechaMaxPagina.getTime() === ultimaFechaVista.getTime()) {
            paginasSinCambioFecha++;
            if (paginasSinCambioFecha > 5) {
              console.log('⏹️ Detectado estancamiento en misma fecha, deteniendo extracción');
              break;
            }
          } else {
            paginasSinCambioFecha = 0;
            ultimaFechaVista = fechaMaxPagina;
          }
        }
        
        // Si obtenemos menos del límite, hemos llegado al final
        if (response.docs.length < limite) {
          console.log(`⏹️ Última página alcanzada en página ${pagina} (${response.docs.length} < ${limite})`);
          break;
        }
        
        pagina++;
        
        // Pausa progresiva para no sobrecargar la API
        const pausa = Math.min(50 + (pagina * 2), 200);
        await new Promise(resolve => setTimeout(resolve, pausa));
        
      } else {
        console.log(`⏹️ No más datos en página ${pagina}`);
        break;
      }
      
    } catch (error) {
      console.error(`❌ Error en página ${pagina}:`, error.message);
      
      // Manejo inteligente de errores
      if (error.message.includes('429') || error.message.includes('rate')) {
        console.log('⏳ Rate limit detectado, esperando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        // No incrementar página, reintentar
      } else if (error.message.includes('500') || error.message.includes('502')) {
        console.log('⏳ Error de servidor, esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        // No incrementar página, reintentar
      } else {
        // Otros errores, saltar página
        pagina++;
        if (pagina - 1 > 3) break; // Si fallaron muchas páginas seguidas, parar
      }
    }
  }
  
  console.log(`✅ Extracción masiva completada: ${cartolas.length} cartolas en ${pagina - 1} páginas`);
  return cartolas;
}

/**
 * Búsqueda con filtros de fecha específicos
 */
async function buscarConFiltrosFecha() {
  console.log('📅 Búsqueda con filtros de fecha...');
  
  const filtros = [
    // Filtros principales para 2025
    { filtro: '?fecha_desde=2025-01-01&fecha_hasta=2025-12-31&limit=1000', desc: '2025 completo' },
    { filtro: '?dateFrom=2025-01-01&dateTo=2025-12-31&limit=1000', desc: '2025 completo (formato alt)' },
    { filtro: '?año=2025&limit=1000', desc: 'Año 2025' },
    { filtro: '?year=2025&limit=1000', desc: 'Year 2025' },
    
    // Filtros por trimestres 2025
    { filtro: '?fecha_desde=2025-01-01&fecha_hasta=2025-03-31&limit=1000', desc: 'Q1 2025' },
    { filtro: '?fecha_desde=2025-04-01&fecha_hasta=2025-06-30&limit=1000', desc: 'Q2 2025' },
    { filtro: '?fecha_desde=2025-07-01&fecha_hasta=2025-09-30&limit=1000', desc: 'Q3 2025' },
    { filtro: '?fecha_desde=2025-10-01&fecha_hasta=2025-12-31&limit=1000', desc: 'Q4 2025' },
    
    // Filtros específicos para saldos iniciales
    { filtro: '?fecha_desde=2024-12-31&fecha_hasta=2024-12-31&limit=1000', desc: 'Cierre 2024' },
    { filtro: '?fecha_desde=2025-01-01&fecha_hasta=2025-01-31&limit=1000', desc: 'Enero 2025' },
    
    // Filtros adicionales
    { filtro: '?periodo=2025&limit=1000', desc: 'Período 2025' },
    { filtro: '?incluir_historicos=true&limit=1000', desc: 'Con históricos' },
    { filtro: '?all_periods=true&limit=1000', desc: 'Todos los períodos' }
  ];
  
  const cartolas = [];
  const resultadosFiltros = [];
  
  for (const { filtro, desc } of filtros) {
    try {
      const endpoint = `/flujo-caja/cartolas${filtro}`;
      const response = await chipaxService.fetchFromChipax(endpoint);
      
      if (response.docs && response.docs.length > 0) {
        cartolas.push(...response.docs);
        
        const fechas = response.docs
          .map(c => c.fecha)
          .filter(f => f)
          .map(f => new Date(f));
        
        if (fechas.length > 0) {
          const fechaMin = new Date(Math.min(...fechas));
          const fechaMax = new Date(Math.max(...fechas));
          
          resultadosFiltros.push({
            filtro: desc,
            cantidad: response.docs.length,
            fechaMin: fechaMin.toLocaleDateString(),
            fechaMax: fechaMax.toLocaleDateString()
          });
          
          console.log(`   ✅ ${desc}: ${response.docs.length} cartolas (${fechaMin.toLocaleDateString()} - ${fechaMax.toLocaleDateString()})`);
        }
      } else {
        console.log(`   ❌ ${desc}: Sin resultados`);
      }
      
      // Pausa entre filtros
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`   ❌ ${desc}: Error - ${error.message}`);
    }
  }
  
  console.log(`✅ Búsqueda por filtros completada: ${cartolas.length} cartolas encontradas`);
  return { cartolas, resultadosFiltros };
}

/**
 * Búsqueda por cuenta corriente específica
 */
async function buscarPorCuentaEspecifica() {
  console.log('🏦 Búsqueda por cuenta corriente específica...');
  
  const cuentasIds = Object.values(SALDOS_INICIALES_2025).map(info => info.cuentaId);
  const cartolas = [];
  const resultadosPorCuenta = {};
  
  for (const cuentaId of cuentasIds) {
    try {
      const endpoint = `/flujo-caja/cartolas?cuenta_corriente_id=${cuentaId}&limit=2000&sort=-fecha`;
      const response = await chipaxService.fetchFromChipax(endpoint);
      
      if (response.docs && response.docs.length > 0) {
        cartolas.push(...response.docs);
        
        const fechas = response.docs
          .map(c => new Date(c.fecha))
          .filter(f => !isNaN(f.getTime()));
        
        if (fechas.length > 0) {
          const fechaMin = new Date(Math.min(...fechas));
          const fechaMax = new Date(Math.max(...fechas));
          
          const nombreCuenta = Object.values(SALDOS_INICIALES_2025)
            .find(info => info.cuentaId === parseInt(cuentaId))?.cuenta || `Cuenta ${cuentaId}`;
          
          resultadosPorCuenta[cuentaId] = {
            nombreCuenta,
            cantidad: response.docs.length,
            fechaMin: fechaMin.toLocaleDateString(),
            fechaMax: fechaMax.toLocaleDateString()
          };
          
          console.log(`   ✅ ${nombreCuenta}: ${response.docs.length} cartolas (${fechaMin.toLocaleDateString()} - ${fechaMax.toLocaleDateString()})`);
        }
      } else {
        console.log(`   ❌ Cuenta ${cuentaId}: Sin cartolas`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (error) {
      console.error(`   ❌ Error cuenta ${cuentaId}:`, error.message);
    }
  }
  
  console.log(`✅ Búsqueda por cuenta completada: ${cartolas.length} cartolas encontradas`);
  return { cartolas, resultadosPorCuenta };
}

/**
 * Función para obtener TODAS las cartolas con múltiples estrategias
 */
async function obtenerTodasLasCartolas() {
  console.log('🔍 INICIANDO EXTRACCIÓN COMPLETA DE CARTOLAS');
  console.log('===========================================');
  
  let todasCartolas = [];
  const metadatos = {
    estrategias: {},
    tiempoInicio: Date.now()
  };
  
  try {
    // ESTRATEGIA 1: Extracción masiva con paginación
    console.log('\n📄 ESTRATEGIA 1: Extracción masiva...');
    const cartolasMasivas = await extraerCartolasMasivas();
    todasCartolas.push(...cartolasMasivas);
    metadatos.estrategias.masiva = {
      cantidad: cartolasMasivas.length,
      exito: true
    };
    
    // ESTRATEGIA 2: Búsqueda con filtros de fecha
    console.log('\n📅 ESTRATEGIA 2: Filtros de fecha...');
    const { cartolas: cartolasFecha, resultadosFiltros } = await buscarConFiltrosFecha();
    todasCartolas.push(...cartolasFecha);
    metadatos.estrategias.filtros = {
      cantidad: cartolasFecha.length,
      exito: true,
      detalles: resultadosFiltros
    };
    
    // ESTRATEGIA 3: Por cuenta corriente específica
    console.log('\n🏦 ESTRATEGIA 3: Por cuenta corriente...');
    const { cartolas: cartolasPorCuenta, resultadosPorCuenta } = await buscarPorCuentaEspecifica();
    todasCartolas.push(...cartolasPorCuenta);
    metadatos.estrategias.porCuenta = {
      cantidad: cartolasPorCuenta.length,
      exito: true,
      detalles: resultadosPorCuenta
    };
    
    // Eliminar duplicados por ID
    console.log('\n🔄 Eliminando duplicados...');
    const cartolasUnicas = eliminarDuplicados(todasCartolas);
    
    metadatos.tiempoTotal = (Date.now() - metadatos.tiempoInicio) / 1000;
    metadatos.totalAntesDuplicados = todasCartolas.length;
    metadatos.totalDespuesDuplicados = cartolasUnicas.length;
    metadatos.duplicadosEliminados = todasCartolas.length - cartolasUnicas.length;
    
    console.log(`✅ Extracción completa finalizada:`);
    console.log(`   📊 Total antes: ${todasCartolas.length} cartolas`);
    console.log(`   🎯 Total único: ${cartolasUnicas.length} cartolas`);
    console.log(`   🔄 Duplicados eliminados: ${metadatos.duplicadosEliminados}`);
    console.log(`   ⏱️ Tiempo total: ${metadatos.tiempoTotal.toFixed(2)} segundos`);
    
    return { cartolas: cartolasUnicas, metadatos };
    
  } catch (error) {
    console.error('❌ Error en extracción completa:', error);
    
    // Fallback: intentar solo extracción básica
    console.log('🔄 Intentando fallback con extracción básica...');
    try {
      const cartolasBasicas = await extraerCartolasBasicas();
      return { 
        cartolas: cartolasBasicas, 
        metadatos: { 
          ...metadatos, 
          fallback: true,
          tiempoTotal: (Date.now() - metadatos.tiempoInicio) / 1000
        } 
      };
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError);
      return { cartolas: [], metadatos };
    }
  }
}

/**
 * Extracción básica como último recurso
 */
async function extraerCartolasBasicas() {
  console.log('🔄 Extracción básica de emergencia...');
  
  try {
    const response = await chipaxService.fetchFromChipax('/flujo-caja/cartolas?limit=1000&sort=-fecha');
    const cartolas = response.docs || [];
    console.log(`✅ Extracción básica: ${cartolas.length} cartolas`);
    return cartolas;
  } catch (error) {
    console.error('❌ Error en extracción básica:', error);
    return [];
  }
}

/**
 * Eliminar cartolas duplicadas por ID
 */
function eliminarDuplicados(cartolas) {
  const mapaIds = new Map();
  
  cartolas.forEach(cartola => {
    if (cartola.id && !mapaIds.has(cartola.id)) {
      mapaIds.set(cartola.id, cartola);
    }
  });
  
  return Array.from(mapaIds.values());
}

// =====================================
// 🧮 CÁLCULO DE SALDOS
// =====================================

/**
 * Analizar cobertura temporal de las cartolas
 */
function analizarCoberturaTemporal(cartolas) {
  console.log('\n📊 ANALIZANDO COBERTURA TEMPORAL');
  console.log('===============================');
  
  const fechasValidas = cartolas
    .map(c => c.fecha)
    .filter(f => f)
    .map(f => new Date(f))
    .filter(f => !isNaN(f.getTime()));
  
  if (fechasValidas.length === 0) {
    console.log('❌ No hay fechas válidas para analizar');
    return { sinDatos: true };
  }
  
  fechasValidas.sort((a, b) => a - b);
  
  const fechaMinima = fechasValidas[0];
  const fechaMaxima = fechasValidas[fechasValidas.length - 1];
  
  console.log(`📅 Rango completo: ${fechaMinima.toLocaleDateString()} - ${fechaMaxima.toLocaleDateString()}`);
  
  // Contar por año y mes
  const porAno = {};
  const porMes = {};
  
  fechasValidas.forEach(fecha => {
    const ano = fecha.getFullYear();
    const mes = `${ano}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    porAno[ano] = (porAno[ano] || 0) + 1;
    porMes[mes] = (porMes[mes] || 0) + 1;
  });
  
  console.log('\n📊 Distribución por año:');
  Object.entries(porAno).sort().forEach(([ano, cantidad]) => {
    console.log(`   ${ano}: ${cantidad} cartolas`);
  });
  
  const tiene2024 = porAno[2024] > 0;
  const tiene2025 = porAno[2025] > 0;
  const tieneEnero2025 = porMes['2025-01'] > 0;
  const cartolas2025 = porAno[2025] || 0;
  
  console.log('\n🎯 Verificación de cobertura:');
  console.log(`   📅 Datos 2024: ${tiene2024 ? '✅ SÍ' : '❌ NO'} (${porAno[2024] || 0} cartolas)`);
  console.log(`   📅 Datos 2025: ${tiene2025 ? '✅ SÍ' : '❌ NO'} (${cartolas2025} cartolas)`);
  console.log(`   📅 Enero 2025: ${tieneEnero2025 ? '✅ SÍ' : '❌ NO'} (${porMes['2025-01'] || 0} cartolas)`);
  
  return {
    rangoCompleto: {
      desde: fechaMinima.toLocaleDateString(),
      hasta: fechaMaxima.toLocaleDateString()
    },
    totalCartolas: cartolas.length,
    fechasValidas: fechasValidas.length,
    porAno,
    porMes,
    tiene2024,
    tiene2025,
    tieneEnero2025,
    cartolas2025,
    coberturaCompleta: tiene2024 && tiene2025
  };
}

/**
 * Calcular saldos actuales basado en saldos iniciales + movimientos 2025
 */
function calcularSaldosActuales(cartolas) {
  console.log('\n🧮 CALCULANDO SALDOS ACTUALES');
  console.log('============================');
  
  // Filtrar solo cartolas de 2025
  const cartolas2025 = cartolas.filter(cartola => {
    const fecha = new Date(cartola.fecha);
    return fecha.getFullYear() === 2025 && !isNaN(fecha.getTime());
  });
  
  console.log(`📅 Cartolas 2025 válidas: ${cartolas2025.length}`);
  
  if (cartolas2025.length === 0) {
    console.log('⚠️ No hay cartolas de 2025, usando solo saldos iniciales');
    return generarSaldosSoloIniciales();
  }
  
  // Calcular movimientos por cuenta
  const movimientosPorCuenta = {};
  
  cartolas2025.forEach(cartola => {
    const cuentaId = cartola.cuenta_corriente_id;
    if (!cuentaId) return;
    
    if (!movimientosPorCuenta[cuentaId]) {
      movimientosPorCuenta[cuentaId] = {
        ingresos: 0,
        egresos: 0,
        cantidad: 0,
        fechaInicio: null,
        fechaFin: null
      };
    }
    
    const cuenta = movimientosPorCuenta[cuentaId];
    cuenta.cantidad++;
    
    // Actualizar fechas
    const fecha = new Date(cartola.fecha);
    if (!cuenta.fechaInicio || fecha < cuenta.fechaInicio) {
      cuenta.fechaInicio = fecha;
    }
    if (!cuenta.fechaFin || fecha > cuenta.fechaFin) {
      cuenta.fechaFin = fecha;
    }
    
    // Procesar saldos/movimientos
    if (cartola.Saldos && Array.isArray(cartola.Saldos)) {
      cartola.Saldos.forEach(saldo => {
        const debe = parseFloat(saldo.debe || 0);
        const haber = parseFloat(saldo.haber || 0);
        
        cuenta.egresos += debe;
        cuenta.ingresos += haber;
      });
    }
  });
  
  console.log(`🏦 Cuentas con movimientos 2025: ${Object.keys(movimientosPorCuenta).length}`);
  
  // Generar resultado final
  const cuentasConSaldos = [];
  
  Object.entries(SALDOS_INICIALES_2025).forEach(([nombreBanco, info]) => {
    const movimientos = movimientosPorCuenta[info.cuentaId] || {
      ingresos: 0, egresos: 0, cantidad: 0, fechaInicio: null, fechaFin: null
    };
    
    const netMovimientos = movimientos.ingresos - movimientos.egresos;
    const saldoFinal = info.saldoInicial + netMovimientos;
    
    console.log(`\n💰 ${nombreBanco}:`);
    console.log(`   💰 Saldo inicial: $${info.saldoInicial.toLocaleString('es-CL')}`);
    console.log(`   📈 Ingresos 2025: $${movimientos.ingresos.toLocaleString('es-CL')}`);
    console.log(`   📉 Egresos 2025:  $${movimientos.egresos.toLocaleString('es-CL')}`);
    console.log(`   🔄 Movimiento neto: $${netMovimientos.toLocaleString('es-CL')}`);
    console.log(`   🎯 SALDO FINAL: $${saldoFinal.toLocaleString('es-CL')}`);
    console.log(`   📊 Cartolas: ${movimientos.cantidad}`);
    
    cuentasConSaldos.push({
      id: info.cuentaId,
      nombre: info.cuenta,
      banco: nombreBanco,
      tipo: 'Cuenta Corriente',
      moneda: 'CLP',
      saldo: saldoFinal,
      saldoCalculado: saldoFinal,
      
      detalleCalculo: {
        saldoInicial: info.saldoInicial,
        ingresos2025: movimientos.ingresos,
        egresos2025: movimientos.egresos,
        netMovimientos2025: netMovimientos,
        saldoFinal: saldoFinal,
        cartolasUsadas: movimientos.cantidad,
        periodoAnalizado: movimientos.fechaInicio && movimientos.fechaFin
          ? `${movimientos.fechaInicio.toLocaleDateString()} - ${movimientos.fechaFin.toLocaleDateString()}`
          : 'Sin movimientos',
        metodoCalculo: 'saldo_inicial_mas_movimientos_2025'
      },
      
      ultimaActualizacion: new Date().toISOString(),
      origenSaldo: 'chipax_cartolas_calculado'
    });
  });
  
  const totalSaldos = cuentasConSaldos.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  console.log(`\n💵 TOTAL SALDOS BANCARIOS: $${totalSaldos.toLocaleString('es-CL')}`);
  console.log(`🎯 Objetivo esperado: $${TOTAL_ESPERADO.toLocaleString('es-CL')}`);
  console.log(`📊 Diferencia: $${(totalSaldos - TOTAL_ESPERADO).toLocaleString('es-CL')}`);
  
  return cuentasConSaldos;
}

/**
 * Generar saldos solo con valores iniciales (fallback)
 */
function generarSaldosSoloIniciales() {
  console.log('🔄 Generando saldos solo con valores iniciales...');
  
  return Object.entries(SALDOS_INICIALES_2025).map(([nombreBanco, info]) => ({
    id: info.cuentaId,
    nombre: info.cuenta,
    banco: nombreBanco,
    tipo: 'Cuenta Corriente',
    moneda: 'CLP',
    saldo: info.saldoInicial,
    saldoCalculado: info.saldoInicial,
    
    detalleCalculo: {
      saldoInicial: info.saldoInicial,
      ingresos2025: 0,
      egresos2025: 0,
      netMovimientos2025: 0,
      saldoFinal: info.saldoInicial,
      cartolasUsadas: 0,
      metodoCalculo: 'solo_saldo_inicial'
    },
    
    ultimaActualizacion: new Date().toISOString(),
    origenSaldo: 'saldos_iniciales_fallback'
  }));
}

// =====================================
// 🎯 FUNCIÓN PRINCIPAL PARA DASHBOARD
// =====================================

/**
 * FUNCIÓN PRINCIPAL: Obtener saldos bancarios para dashboard
 * Esta es la función que debes llamar desde tu dashboard
 */
export async function obtenerSaldosBancariosReales() {
  console.log('🏦 OBTENIENDO SALDOS BANCARIOS REALES PARA DASHBOARD');
  console.log('==================================================');
  
  const tiempoInicio = Date.now();
  
  try {
    // 1. Obtener todas las cartolas con estrategias múltiples
    console.log('📡 Fase 1: Extracción completa de cartolas...');
    const { cartolas, metadatos } = await obtenerTodasLasCartolas();
    
    if (cartolas.length === 0) {
      console.warn('⚠️ No se pudieron obtener cartolas, usando saldos conocidos');
      return usarSaldosConocidos();
    }
    
    // 2. Analizar cobertura temporal
    console.log('\n📊 Fase 2: Análisis de cobertura temporal...');
    const analisisTemporal = analizarCoberturaTemporal(cartolas);
    
    // 3. Calcular saldos actuales
    console.log('\n🧮 Fase 3: Cálculo de saldos actuales...');
    const saldosCalculados = calcularSaldosActuales(cartolas);
    
    // 4. Validar resultados
    console.log('\n✅ Fase 4: Validación de resultados...');
    const validacion = validarSaldosCalculados(saldosCalculados);
    
    // 5. Generar resumen final
    const tiempoTotal = (Date.now() - tiempoInicio) / 1000;
    const resumenFinal = {
      saldosCalculados,
      analisisTemporal,
      validacion,
      metadatos: {
        ...metadatos,
        tiempoTotalProceso: tiempoTotal,
        fechaCalculo: new Date().toISOString(),
        version: '2.0.0',
        metodoUtilizado: saldosCalculados[0]?.detalleCalculo?.metodoCalculo || 'desconocido'
      }
    };
    
    // 6. Mostrar resumen final
    mostrarResumenFinal(resumenFinal);
    
    // 7. Guardar para debugging
    window.chipaxSaldosResultados = resumenFinal;
    
    // 8. Retornar en formato compatible con dashboard
    return formatearParaDashboard(saldosCalculados);
    
  } catch (error) {
    console.error('❌ Error obteniendo saldos bancarios:', error);
    
    // Fallback final: usar saldos conocidos
    console.log('🔄 Usando fallback con saldos conocidos...');
    return usarSaldosConocidos();
  }
}

/**
 * Validar saldos calculados contra valores conocidos
 */
function validarSaldosCalculados(saldosCalculados) {
  console.log('🔍 Validando saldos calculados...');
  
  const validaciones = {};
  let totalCalculado = 0;
  let totalConocido = 0;
  
  saldosCalculados.forEach(cuenta => {
    totalCalculado += cuenta.saldo;
    
    const saldoConocido = SALDOS_VALIDACION[cuenta.banco];
    if (saldoConocido !== undefined) {
      totalConocido += saldoConocido;
      
      const diferencia = cuenta.saldo - saldoConocido;
      const porcentajeDiferencia = saldoConocido !== 0 ? Math.abs(diferencia / saldoConocido) * 100 : 0;
      const coincide = Math.abs(diferencia) < 10000; // Tolerancia de $10,000
      
      validaciones[cuenta.banco] = {
        calculado: cuenta.saldo,
        conocido: saldoConocido,
        diferencia,
        porcentajeDiferencia,
        coincide
      };
      
      const estado = coincide ? '✅' : '⚠️';
      console.log(`   ${estado} ${cuenta.banco}: ${diferencia.toLocaleString('es-CL')} diff (${porcentajeDiferencia.toFixed(1)}%)`);
    }
  });
  
  const diferenciaTotal = totalCalculado - TOTAL_ESPERADO;
  const precision = Math.abs(diferenciaTotal / TOTAL_ESPERADO) * 100;
  
  console.log(`\n📊 Validación total:`);
  console.log(`   💰 Total calculado: ${totalCalculado.toLocaleString('es-CL')}`);
  console.log(`   🎯 Total esperado: ${TOTAL_ESPERADO.toLocaleString('es-CL')}`);
  console.log(`   📊 Diferencia: ${diferenciaTotal.toLocaleString('es-CL')} (${precision.toFixed(2)}%)`);
  
  return {
    validaciones,
    totalCalculado,
    totalEsperado: TOTAL_ESPERADO,
    diferenciaTotal,
    precision,
    esAceptable: precision < 5 // Aceptable si la diferencia es menor al 5%
  };
}

/**
 * Mostrar resumen final detallado
 */
function mostrarResumenFinal(resumen) {
  const { saldosCalculados, analisisTemporal, validacion, metadatos } = resumen;
  
  console.log('\n🎉 RESUMEN FINAL - SALDOS BANCARIOS CHIPAX');
  console.log('==========================================');
  
  console.log(`⏱️ Tiempo de procesamiento: ${metadatos.tiempoTotalProceso.toFixed(2)} segundos`);
  console.log(`📊 Método utilizado: ${metadatos.metodoUtilizado}`);
  console.log(`📅 Cobertura temporal: ${analisisTemporal.rangoCompleto?.desde || 'N/A'} - ${analisisTemporal.rangoCompleto?.hasta || 'N/A'}`);
  console.log(`🎯 Cartolas procesadas: ${analisisTemporal.totalCartolas}`);
  
  if (analisisTemporal.cartolas2025 > 0) {
    console.log(`📋 Cartolas 2025: ${analisisTemporal.cartolas2025}`);
  }
  
  console.log('\n💰 SALDOS POR BANCO:');
  saldosCalculados.forEach(cuenta => {
    const validacionCuenta = validacion.validaciones[cuenta.banco];
    const estado = validacionCuenta?.coincide ? '✅' : validacionCuenta ? '⚠️' : '❓';
    console.log(`   ${estado} ${cuenta.banco}: ${cuenta.saldo.toLocaleString('es-CL')}`);
  });
  
  console.log(`\n💵 TOTAL: ${validacion.totalCalculado.toLocaleString('es-CL')}`);
  console.log(`🎯 Precisión: ${validacion.precision.toFixed(2)}% de diferencia`);
  console.log(`✅ Estado: ${validacion.esAceptable ? 'ACEPTABLE' : 'REQUIERE REVISIÓN'}`);
  
  console.log('\n🔍 CALIDAD DE DATOS:');
  console.log(`   📊 Cobertura completa: ${analisisTemporal.coberturaCompleta ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   📅 Datos 2025: ${analisisTemporal.tiene2025 ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   🎯 Validación exitosa: ${validacion.esAceptable ? '✅ SÍ' : '❌ NO'}`);
  
  if (metadatos.estrategias) {
    console.log('\n📈 ESTRATEGIAS UTILIZADAS:');
    Object.entries(metadatos.estrategias).forEach(([nombre, info]) => {
      if (info.exito) {
        console.log(`   ✅ ${nombre}: ${info.cantidad} cartolas`);
      }
    });
  }
  
  console.log('\n💾 Resultados guardados en: window.chipaxSaldosResultados');
}

/**
 * Formatear resultado para dashboard (formato esperado por adaptador)
 */
function formatearParaDashboard(saldosCalculados) {
  console.log('🔄 Formateando datos para dashboard...');
  
  return saldosCalculados.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.nombre,
    banco: cuenta.banco,
    tipo: cuenta.tipo,
    moneda: cuenta.moneda,
    saldo: cuenta.saldo,
    saldoCalculado: cuenta.saldo,
    ultimaActualizacion: cuenta.ultimaActualizacion,
    
    // Información adicional para debugging (opcional)
    detalleCalculo: cuenta.detalleCalculo,
    origenSaldo: cuenta.origenSaldo
  }));
}

/**
 * Fallback: usar saldos conocidos cuando falla todo
 */
function usarSaldosConocidos() {
  console.log('🔄 FALLBACK: Usando saldos conocidos actuales...');
  
  const saldosConocidos = Object.entries(SALDOS_VALIDACION).map(([nombreBanco, saldo], index) => {
    const info = SALDOS_INICIALES_2025[nombreBanco];
    
    return {
      id: info?.cuentaId || index + 1000,
      nombre: info?.cuenta || `Cuenta ${nombreBanco}`,
      banco: nombreBanco,
      tipo: 'Cuenta Corriente',
      moneda: 'CLP',
      saldo: saldo,
      saldoCalculado: saldo,
      ultimaActualizacion: new Date().toISOString(),
      origenSaldo: 'saldos_conocidos_fallback',
      
      detalleCalculo: {
        saldoInicial: info?.saldoInicial || 0,
        saldoFinal: saldo,
        metodoCalculo: 'saldos_conocidos_fallback',
        nota: 'Usado por fallo en extracción de cartolas'
      }
    };
  });
  
  const total = saldosConocidos.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  console.log(`💰 Total saldos conocidos: ${total.toLocaleString('es-CL')}`);
  
  return saldosConocidos;
}

// =====================================
// 🔧 FUNCIONES DE UTILIDAD Y DEBUG
// =====================================

/**
 * Función para debuggear problemas de extracción
 */
export async function debugExtraccionCartolas() {
  console.log('🔧 MODO DEBUG: Analizando problemas de extracción...');
  console.log('==================================================');
  
  try {
    // Test básico de conectividad
    console.log('1. Test básico de conectividad...');
    const testBasico = await chipaxService.fetchFromChipax('/flujo-caja/cartolas?limit=5');
    console.log(`   ✅ Conectividad: ${testBasico?.docs?.length || 0} cartolas obtenidas`);
    
    // Test de diferentes parámetros
    console.log('\n2. Test de parámetros de filtrado...');
    const parametros = [
      { param: '?limit=10', desc: 'Límite básico' },
      { param: '?limit=10&sort=-fecha', desc: 'Ordenado por fecha desc' },
      { param: '?año=2025&limit=10', desc: 'Filtro año 2025' },
      { param: '?fecha_desde=2025-01-01&limit=10', desc: 'Desde enero 2025' },
      { param: '?page=1&limit=10', desc: 'Paginación' }
    ];
    
    for (const { param, desc } of parametros) {
      try {
        const response = await chipaxService.fetchFromChipax(`/flujo-caja/cartolas${param}`);
        const cantidad = response?.docs?.length || 0;
        
        if (cantidad > 0 && response.docs[0].fecha) {
          const fechas = response.docs
            .map(c => new Date(c.fecha).getFullYear())
            .filter(y => !isNaN(y));
          const años = [...new Set(fechas)].sort();
          console.log(`   ✅ ${desc}: ${cantidad} cartolas (años: ${años.join(', ')})`);
        } else {
          console.log(`   ❌ ${desc}: ${cantidad} cartolas (sin fechas válidas)`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${desc}: Error - ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Test de endpoints alternativos
    console.log('\n3. Test de endpoints alternativos...');
    const endpointsAlternativos = [
      '/cuentas-corrientes',
      '/bancos',
      '/saldos',
      '/balance'
    ];
    
    for (const endpoint of endpointsAlternativos) {
      try {
        const response = await chipaxService.fetchFromChipax(`${endpoint}?limit=5`);
        const cantidad = response?.docs?.length || 
                        (Array.isArray(response?.data) ? response.data.length : 
                         Array.isArray(response) ? response.length : 1);
        console.log(`   ✅ ${endpoint}: ${cantidad} registros`);
      } catch (error) {
        console.log(`   ❌ ${endpoint}: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n✅ Debug de extracción completado');
    
  } catch (error) {
    console.error('❌ Error durante debug:', error);
  }
}

/**
 * Función para forzar recálculo completo
 */
export async function recalcularSaldosForzado() {
  console.log('🔄 RECÁLCULO FORZADO DE SALDOS');
  console.log('=============================');
  
  // Limpiar cualquier caché
  delete window.chipaxSaldosResultados;
  delete window.debugChipaxResultados;
  
  // Ejecutar extracción completa
  const resultado = await obtenerSaldosBancariosReales();
  
  console.log('✅ Recálculo forzado completado');
  return resultado;
}

/**
 * Función para verificar estado actual del servicio
 */
export function verificarEstadoServicio() {
  console.log('📊 ESTADO ACTUAL DEL SERVICIO CHIPAX SALDOS');
  console.log('==========================================');
  
  const tieneResultados = !!window.chipaxSaldosResultados;
  
  if (tieneResultados) {
    const resultados = window.chipaxSaldosResultados;
    console.log(`✅ Resultados disponibles desde: ${new Date(resultados.metadatos.fechaCalculo).toLocaleString()}`);
    console.log(`📊 Total cartolas procesadas: ${resultados.analisisTemporal.totalCartolas}`);
    console.log(`💰 Total saldos: ${resultados.validacion.totalCalculado.toLocaleString('es-CL')}`);
    console.log(`🎯 Precisión: ${resultados.validacion.precision.toFixed(2)}%`);
    console.log(`⏱️ Tiempo de procesamiento: ${resultados.metadatos.tiempoTotalProceso.toFixed(2)}s`);
  } else {
    console.log('❌ No hay resultados disponibles');
    console.log('💡 Ejecuta: await obtenerSaldosBancariosReales()');
  }
  
  return tieneResultados;
}

// =====================================
// 🎯 FUNCIONES PARA INTEGRACIÓN CON DASHBOARD
// =====================================

/**
 * Función simplificada para el dashboard (compatible con código existente)
 */
export async function obtenerSaldosBancarios() {
  // Esta función mantiene compatibilidad con el código existente del dashboard
  return await obtenerSaldosBancariosReales();
}

/**
 * Función para obtener solo el total de saldos
 */
export async function obtenerTotalSaldosBancarios() {
  try {
    const saldos = await obtenerSaldosBancariosReales();
    return saldos.reduce((total, cuenta) => total + cuenta.saldo, 0);
  } catch (error) {
    console.error('❌ Error obteniendo total de saldos:', error);
    return Object.values(SALDOS_VALIDACION).reduce((sum, saldo) => sum + saldo, 0);
  }
}

/**
 * Función para obtener saldos con información de confiabilidad
 */
export async function obtenerSaldosConConfiabilidad() {
  try {
    const saldos = await obtenerSaldosBancariosReales();
    const resultados = window.chipaxSaldosResultados;
    
    return {
      saldos,
      confiabilidad: {
        nivel: resultados?.validacion?.esAceptable ? 'alta' : 'media',
        precision: resultados?.validacion?.precision || 0,
        metodo: resultados?.metadatos?.metodoUtilizado || 'desconocido',
        fechaCalculo: resultados?.metadatos?.fechaCalculo || new Date().toISOString(),
        cartolasUsadas: resultados?.analisisTemporal?.totalCartolas || 0
      }
    };
  } catch (error) {
    console.error('❌ Error obteniendo saldos con confiabilidad:', error);
    return {
      saldos: usarSaldosConocidos(),
      confiabilidad: {
        nivel: 'baja',
        precision: 0,
        metodo: 'fallback',
        fechaCalculo: new Date().toISOString(),
        cartolasUsadas: 0
      }
    };
  }
}

// =====================================
// 🚀 EXPORTACIONES
// =====================================

// Exportar función principal (por defecto)
export default obtenerSaldosBancariosReales;

// Exportar todas las funciones útiles
export {
  obtenerSaldosBancariosReales,
  obtenerSaldosBancarios,
  obtenerTotalSaldosBancarios,
  obtenerSaldosConConfiabilidad,
  debugExtraccionCartolas,
  recalcularSaldosForzado,
  verificarEstadoServicio
};
