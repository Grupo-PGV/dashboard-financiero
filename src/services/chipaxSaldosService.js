// chipaxSaldosService.js
// NUEVO SERVICIO PARA MANEJAR SALDOS CON SALDOS INICIALES 2025

/**
 * Servicio especializado para calcular saldos bancarios correctos
 * Combina saldos iniciales de 2025 con movimientos del flujo de caja
 */

import { fetchAllPaginatedData } from './chipaxService';

/**
 * PASO 1: Parser de saldos iniciales desde el archivo TXT
 * Convierte el contenido del TXT en un objeto estructurado
 */
export const parsearSaldosIniciales = (contenidoTXT) => {
  console.log('📝 Parseando saldos iniciales desde TXT...');
  
  const saldosIniciales = {};
  
  // El formato del TXT es:
  // BCI
  // cte cte:89107021
  // $178.098
  
  const lineas = contenidoTXT.split('\n').filter(linea => linea.trim());
  
  let cuentaActual = null;
  
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    
    // Si es nombre de banco (líneas que no empiezan con 'cte' ni '$')
    if (!linea.startsWith('cte') && !linea.startsWith('$') && !linea.startsWith('Saldo')) {
      cuentaActual = {
        nombreBanco: linea,
        numeroCuenta: null,
        saldoInicial: 0
      };
    }
    // Si es número de cuenta (empieza con 'cte cte:')
    else if (linea.startsWith('cte cte:')) {
      if (cuentaActual) {
        cuentaActual.numeroCuenta = linea.replace('cte cte:', '').trim();
      }
    }
    // Si es saldo (empieza con '$')
    else if (linea.startsWith('$')) {
      if (cuentaActual && cuentaActual.numeroCuenta) {
        // Convertir $178.098 a número
        const saldoStr = linea.replace('$', '').replace(/\./g, '').replace(/,/g, '');
        cuentaActual.saldoInicial = parseInt(saldoStr) || 0;
        
        // Guardar en el objeto usando el número de cuenta como clave
        saldosIniciales[cuentaActual.numeroCuenta] = cuentaActual;
        
        console.log(`✅ Saldo inicial parseado: ${cuentaActual.nombreBanco} (${cuentaActual.numeroCuenta}): $${cuentaActual.saldoInicial.toLocaleString('es-CL')}`);
      }
    }
  }
  
  console.log(`📊 Total saldos iniciales parseados: ${Object.keys(saldosIniciales).length}`);
  return saldosIniciales;
};

/**
 * PASO 2: Obtener movimientos de 2025 desde flujo de caja
 * Filtra y procesa solo los movimientos del año 2025
 */
export const obtenerMovimientos2025 = async () => {
  console.log('📊 Obteniendo movimientos de 2025...');
  
  try {
    // Obtener todos los movimientos del flujo de caja
    const flujoResponse = await fetchAllPaginatedData('/flujo-caja/cartolas');
    const todosLosMovimientos = flujoResponse.items;
    
    console.log(`📋 Total movimientos obtenidos: ${todosLosMovimientos.length}`);
    
    // Filtrar solo movimientos de 2025
    const movimientos2025 = todosLosMovimientos.filter(movimiento => {
      const fecha = new Date(movimiento.fecha);
      return fecha.getFullYear() === 2025;
    });
    
    console.log(`📅 Movimientos de 2025: ${movimientos2025.length}`);
    
    // Agrupar por cuenta corriente y calcular totales
    const movimientosPorCuenta = {};
    
    movimientos2025.forEach(mov => {
      const cuentaId = mov.cuenta_corriente_id;
      
      if (cuentaId) {
        if (!movimientosPorCuenta[cuentaId]) {
          movimientosPorCuenta[cuentaId] = {
            cuentaId,
            totalIngresos: 0,
            totalEgresos: 0,
            movimientos: []
          };
        }
        
        // Procesar saldos del movimiento
        if (mov.Saldos && Array.isArray(mov.Saldos)) {
          mov.Saldos.forEach(saldo => {
            if (saldo.last_record === 1) { // Solo el último registro
              movimientosPorCuenta[cuentaId].totalIngresos += saldo.saldo_acreedor || 0;
              movimientosPorCuenta[cuentaId].totalEgresos += saldo.saldo_deudor || 0;
            }
          });
        }
        
        movimientosPorCuenta[cuentaId].movimientos.push(mov);
      }
    });
    
    console.log(`🏦 Cuentas con movimientos en 2025: ${Object.keys(movimientosPorCuenta).length}`);
    
    return movimientosPorCuenta;
    
  } catch (error) {
    console.error('❌ Error obteniendo movimientos 2025:', error);
    throw error;
  }
};

/**
 * PASO 3: Obtener información de cuentas corrientes desde Chipax
 * Para mapear IDs con números de cuenta
 */
export const obtenerMapaCuentasCorrientes = async () => {
  console.log('🗺️ Obteniendo mapa de cuentas corrientes...');
  
  try {
    const response = await fetchAllPaginatedData('/cuentas-corrientes');
    const cuentas = response.items;
    
    // Crear mapa: ID -> información de cuenta
    const mapaCuentas = {};
    
    cuentas.forEach(cuenta => {
      mapaCuentas[cuenta.id] = {
        id: cuenta.id,
        numeroCuenta: cuenta.numeroCuenta,
        banco: cuenta.banco || cuenta.Banco?.nombre || 'Sin especificar',
        tipo: cuenta.TipoCuentaCorriente?.nombreCorto || 'Cuenta Corriente',
        moneda: cuenta.Moneda?.moneda || 'CLP'
      };
      
      console.log(`📋 Cuenta mapeada: ID ${cuenta.id} -> ${cuenta.numeroCuenta} (${mapaCuentas[cuenta.id].banco})`);
    });
    
    console.log(`✅ Total cuentas mapeadas: ${Object.keys(mapaCuentas).length}`);
    return mapaCuentas;
    
  } catch (error) {
    console.error('❌ Error obteniendo mapa de cuentas:', error);
    throw error;
  }
};

/**
 * PASO 4: Función principal - Calcular saldos actuales correctos
 * Combina saldos iniciales + movimientos 2025
 */
export const calcularSaldosActualesCorrectos = async (contenidoTXTSaldosIniciales) => {
  console.log('\n🎯 INICIANDO CÁLCULO DE SALDOS ACTUALES CORRECTOS');
  console.log('=====================================');
  
  try {
    // PASO 1: Parsear saldos iniciales
    const saldosIniciales = parsearSaldosIniciales(contenidoTXTSaldosIniciales);
    
    // PASO 2: Obtener movimientos de 2025
    const movimientos2025 = await obtenerMovimientos2025();
    
    // PASO 3: Obtener mapa de cuentas
    const mapaCuentas = await obtenerMapaCuentasCorrientes();
    
    // PASO 4: Combinar todo
    const saldosFinales = [];
    
    // Procesar cada cuenta del mapa
    Object.values(mapaCuentas).forEach(cuentaInfo => {
      const { id, numeroCuenta, banco, tipo, moneda } = cuentaInfo;
      
      // Buscar saldo inicial por número de cuenta
      const saldoInicialInfo = Object.values(saldosIniciales).find(si => 
        si.numeroCuenta === numeroCuenta || 
        si.numeroCuenta.includes(numeroCuenta) ||
        numeroCuenta.includes(si.numeroCuenta)
      );
      
      const saldoInicial = saldoInicialInfo ? saldoInicialInfo.saldoInicial : 0;
      
      // Buscar movimientos de 2025 por ID
      const movimientosCuenta = movimientos2025[id];
      const ingresos2025 = movimientosCuenta ? movimientosCuenta.totalIngresos : 0;
      const egresos2025 = movimientosCuenta ? movimientosCuenta.totalEgresos : 0;
      const netMovimientos2025 = ingresos2025 - egresos2025;
      
      // CÁLCULO FINAL: Saldo inicial + movimientos netos de 2025
      const saldoFinal = saldoInicial + netMovimientos2025;
      
      // Crear objeto de saldo final
      const saldoFinalInfo = {
        id,
        nombre: numeroCuenta,
        banco,
        tipo,
        moneda,
        saldo: saldoFinal,
        detalleCalculo: {
          saldoInicial,
          ingresos2025,
          egresos2025,
          netMovimientos2025,
          saldoFinal
        },
        ultimaActualizacion: new Date().toISOString(),
        origenSaldo: 'saldo_inicial_mas_movimientos_2025'
      };
      
      saldosFinales.push(saldoFinalInfo);
      
      // Log detallado para cada cuenta
      console.log(`\n🏦 ${banco} - ${numeroCuenta}:`);
      console.log(`   💰 Saldo inicial: $${saldoInicial.toLocaleString('es-CL')}`);
      console.log(`   📈 Ingresos 2025: $${ingresos2025.toLocaleString('es-CL')}`);
      console.log(`   📉 Egresos 2025: $${egresos2025.toLocaleString('es-CL')}`);
      console.log(`   ⚡ Movimiento neto: $${netMovimientos2025.toLocaleString('es-CL')}`);
      console.log(`   🎯 SALDO FINAL: $${saldoFinal.toLocaleString('es-CL')}`);
    });
    
    // Calcular total
    const totalSaldos = saldosFinales.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    console.log('\n📊 RESUMEN FINAL:');
    console.log('=================');
    console.log(`💰 Total saldos bancarios: $${totalSaldos.toLocaleString('es-CL')}`);
    console.log(`🏦 Cuentas procesadas: ${saldosFinales.length}`);
    console.log(`📅 Fecha cálculo: ${new Date().toLocaleString('es-CL')}`);
    
    return {
      saldosBancarios: saldosFinales,
      totalSaldos,
      detalleCalculo: {
        cuentasProcesadas: saldosFinales.length,
        saldosInicialesEncontrados: Object.keys(saldosIniciales).length,
        cuentasConMovimientos2025: Object.keys(movimientos2025).length,
        fechaCalculo: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('❌ Error en cálculo de saldos actuales:', error);
    throw error;
  }
};

/**
 * FUNCIÓN DE UTILIDAD: Verificar si el total coincide con Chipax
 */
export const verificarTotalConChipax = (totalCalculado, totalEsperadoChipax = 186648977) => {
  const diferencia = Math.abs(totalCalculado - totalEsperadoChipax);
  const porcentajeError = (diferencia / totalEsperadoChipax) * 100;
  const esCorrectoTotal = porcentajeError < 1; // Tolerancia del 1%
  
  console.log('\n🎯 VERIFICACIÓN CON CHIPAX:');
  console.log('===========================');
  console.log(`Esperado (Chipax): $${totalEsperadoChipax.toLocaleString('es-CL')}`);
  console.log(`Calculado: $${totalCalculado.toLocaleString('es-CL')}`);
  console.log(`Diferencia: $${diferencia.toLocaleString('es-CL')}`);
  console.log(`Error %: ${porcentajeError.toFixed(2)}%`);
  console.log(`Estado: ${esCorrectoTotal ? '✅ CORRECTO' : '❌ REVISAR'}`);
  
  return {
    esCorrectoTotal,
    diferencia,
    porcentajeError,
    status: esCorrectoTotal ? 'correcto' : 'revisar'
  };
};
