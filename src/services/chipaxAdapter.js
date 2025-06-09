// chipaxAdapter.js - VERSIÓN ACTUALIZADA PARA SALDOS INICIALES

/**
 * VERSIÓN MEJORADA: Adapta cuentas corrientes con soporte para saldos iniciales
 * Ahora maneja correctamente los datos del nuevo servicio de saldos
 */
const adaptarCuentasCorrientes = (cuentas) => {
  console.log(`💰 Adaptando ${cuentas.length} cuentas corrientes (versión actualizada)`);
  
  return cuentas.map((cuenta, index) => {
    // Log detallado para la primera cuenta
    if (index === 0) {
      console.log('🔍 Estructura completa de la primera cuenta corriente:');
      console.log(JSON.stringify(cuenta, null, 2));
    }

    // NUEVA LÓGICA: Usar saldo ya calculado por el nuevo servicio
    let saldoFinal = 0;
    let origenSaldo = 'desconocido';
    
    // PRIORIDAD 1: Si el saldo ya viene calculado desde el nuevo servicio
    if (cuenta.saldo !== undefined && cuenta.origenSaldo === 'saldo_inicial_mas_movimientos_2025') {
      saldoFinal = cuenta.saldo;
      origenSaldo = 'saldo_inicial_mas_movimientos_2025';
      console.log(`✅ Cuenta ${cuenta.nombre}: Usando saldo calculado con saldos iniciales: $${saldoFinal.toLocaleString('es-CL')}`);
    }
    // PRIORIDAD 2: Usar saldo calculado desde flujo de caja (método legacy)
    else if (cuenta.saldoCalculado !== undefined) {
      saldoFinal = cuenta.saldoCalculado;
      origenSaldo = 'flujo_caja_calculado';
      console.log(`✅ Cuenta ${cuenta.nombre}: Usando saldo calculado desde flujo de caja: $${saldoFinal.toLocaleString('es-CL')}`);
    } 
    // PRIORIDAD 3: Usar objeto Saldo si está disponible
    else if (cuenta.Saldo) {
      const debe = cuenta.Saldo.debe || 0;
      const haber = cuenta.Saldo.haber || 0;
      const saldoDeudor = cuenta.Saldo.saldo_deudor || 0;
      const saldoAcreedor = cuenta.Saldo.saldo_acreedor || 0;
      
      // Usar la lógica contable estándar: deudor - acreedor
      saldoFinal = saldoDeudor - saldoAcreedor;
      origenSaldo = 'objeto_saldo';
      
      if (index === 0) {
        console.log('💵 Cálculo de saldo desde objeto Saldo:', {
          debe,
          haber,
          saldoDeudor,
          saldoAcreedor,
          saldoFinal,
          logica: 'saldo_deudor - saldo_acreedor'
        });
      }
    }
    // PRIORIDAD 4: Campo saldo directo (menos confiable)
    else if (cuenta.saldo !== undefined) {
      saldoFinal = cuenta.saldo;
      origenSaldo = 'campo_saldo_directo';
      console.log(`⚠️ Cuenta ${cuenta.nombre}: Usando campo saldo directo: $${saldoFinal.toLocaleString('es-CL')}`);
    }
    
    // Log del resultado para cada cuenta
    console.log(`🏦 Cuenta ${cuenta.nombre || cuenta.numeroCuenta || cuenta.id}: $${saldoFinal.toLocaleString('es-CL')} (${cuenta.banco || 'Sin banco'}) [${origenSaldo}]`);
    
    // Crear objeto adaptado mejorado
    const cuentaAdaptada = {
      id: cuenta.id,
      nombre: cuenta.nombre || cuenta.numeroCuenta || 'Cuenta sin número',
      banco: cuenta.banco || 
             cuenta.Banco?.nombre || 
             cuenta.TipoCuentaCorriente?.tipoCuenta || 
             'Banco no especificado',
      saldo: saldoFinal,
      moneda: cuenta.moneda || cuenta.Moneda?.moneda || 'CLP',
      simboloMoneda: cuenta.simboloMoneda || cuenta.Moneda?.simbolo || '$',
      tipo: cuenta.tipo || cuenta.TipoCuentaCorriente?.nombreCorto || 'Cuenta Corriente',
      ultimaActualizacion: cuenta.ultimaActualizacion || 
                          cuenta.ultimoMovimiento || 
                          cuenta.fechaUltimaActualizacion || 
                          cuenta.updated_at || 
                          new Date().toISOString(),
      
      // Campos adicionales para debugging y transparencia
      origenSaldo,
      totalMovimientos: cuenta.totalMovimientos || 0,
      
      // Detalles del cálculo si están disponibles
      detalleCalculo: cuenta.detalleCalculo || null,
      
      // Campos adicionales para compatibilidad
      saldoDeudor: cuenta.Saldo?.saldo_deudor || 0,
      saldoAcreedor: cuenta.Saldo?.saldo_acreedor || 0,
      
      // Metadatos
      metadatos: {
        origenDatos: cuenta.origenSaldo || origenSaldo,
        metodologiaCalculo: origenSaldo === 'saldo_inicial_mas_movimientos_2025' 
          ? 'Saldo inicial 2025 + movimientos del año'
          : origenSaldo === 'flujo_caja_calculado' 
          ? 'Calculado desde movimientos de flujo de caja'
          : 'Método legacy',
        fechaProcesamiento: new Date().toISOString(),
        esConfiable: origenSaldo === 'saldo_inicial_mas_movimientos_2025' || 
                     origenSaldo === 'flujo_caja_calculado'
      }
    };
    
    return cuentaAdaptada;
  });
};

/**
 * NUEVA FUNCIÓN: Verificar y reportar calidad de los saldos adaptados
 */
const verificarCalidadSaldos = (cuentasAdaptadas, totalEsperado = 186648977) => {
  console.log('\n🔍 VERIFICACIÓN DE CALIDAD DE SALDOS:');
  console.log('=====================================');
  
  const saldoTotal = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  
  // Análisis por origen de datos
  const porOrigen = {};
  cuentasAdaptadas.forEach(cuenta => {
    const origen = cuenta.origenSaldo;
    if (!porOrigen[origen]) {
      porOrigen[origen] = { cuentas: 0, total: 0 };
    }
    porOrigen[origen].cuentas++;
    porOrigen[origen].total += cuenta.saldo;
  });
  
  console.log('📊 RESUMEN POR ORIGEN DE DATOS:');
  Object.entries(porOrigen).forEach(([origen, stats]) => {
    console.log(`${origen}: ${stats.cuentas} cuentas, $${stats.total.toLocaleString('es-CL')}`);
  });
  
  console.log('\n📊 RESUMEN TOTAL:');
  console.log(`💰 Total calculado: $${saldoTotal.toLocaleString('es-CL')}`);
  console.log(`🎯 Total esperado: $${totalEsperado.toLocaleString('es-CL')}`);
  
  const diferencia = Math.abs(saldoTotal - totalEsperado);
  const porcentajeError = (diferencia / totalEsperado) * 100;
  const esCorrectoTotal = porcentajeError < 1;
  
  console.log(`📏 Diferencia: $${diferencia.toLocaleString('es-CL')} (${porcentajeError.toFixed(2)}%)`);
  console.log(`✅ Estado: ${esCorrectoTotal ? 'CORRECTO' : 'NECESITA REVISIÓN'}`);
  
  // Contar cuentas confiables
  const cuentasConfiables = cuentasAdaptadas.filter(c => c.metadatos.esConfiable).length;
  console.log(`🔒 Cuentas confiables: ${cuentasConfiables}/${cuentasAdaptadas.length}`);
  
  return { 
    saldoTotal, 
    esCorrectoTotal, 
    diferencia, 
    porcentajeError,
    porOrigen,
    cuentasConfiables,
    calidadGeneral: esCorrectoTotal && cuentasConfiables === cuentasAdaptadas.length ? 'excelente' : 
                    esCorrectoTotal ? 'buena' : 'necesita_mejora'
  };
};

/**
 * FUNCIÓN PRINCIPAL ACTUALIZADA: Adapta datos de Chipax con verificación de calidad
 */
const adaptarDatosChipax = (datos, tipo) => {
  console.log(`🔄 Adaptando datos Chipax de tipo: ${tipo}`);
  
  if (!datos || !Array.isArray(datos)) {
    console.warn(`⚠️ Datos inválidos para tipo ${tipo}:`, datos);
    return [];
  }

  console.log(`🔄 Adaptando ${datos.length} registros de tipo ${tipo}`);

  let resultado = [];

  switch (tipo) {
    case 'saldosBancarios':
      resultado = adaptarCuentasCorrientes(datos);
      
      // Verificar calidad de los saldos adaptados
      const verificacion = verificarCalidadSaldos(resultado);
      
      // Agregar información de verificación al resultado
      resultado.metadatosVerificacion = verificacion;
      
      break;
    
    case 'cuentasPorCobrar':
      resultado = adaptarDTEs(datos);
      break;
    
    case 'cuentasPorPagar':
      resultado = adaptarCompras(datos);
      break;
    
    case 'clientes':
      resultado = adaptarClientes(datos);
      break;
    
    case 'proveedores':
      resultado = adaptarProveedores(datos);
      break;
    
    case 'flujoCaja':
      resultado = adaptarFlujoCaja(datos);
      break;
    
    default:
      console.warn(`⚠️ Tipo de adaptación no reconocido: ${tipo}`);
      resultado = datos;
  }

  console.log(`✅ Adaptación completada para tipo ${tipo}: ${Array.isArray(resultado) ? resultado.length : 'N/A'} elementos`);
  
  return resultado;
};

// ... (mantener todas las demás funciones: adaptarDTEs, adaptarCompras, etc.)

// Exportar todo
const chipaxAdapter = {
  adaptarDatosChipax,
  verificarCalidadSaldos,
  
  // Funciones individuales para compatibilidad
  adaptarCuentasCorrientes,
  adaptarDTEs: (datos) => {
    // Función adaptarDTEs existente
    return datos.map(dte => ({
      id: dte.id,
      folio: dte.folio,
      cliente: dte.razonSocial,
      monto: dte.montoTotal,
      saldo: dte.Saldo?.saldoDeudor || dte.montoTotal,
      fecha: dte.fechaEmision || dte.created_at,
      tipo: dte.tipo === 33 ? 'Factura Electrónica' : `Tipo ${dte.tipo}`,
      estado: dte.Saldo?.saldoDeudor > 0 ? 'Pendiente' : 'Pagado'
    }));
  },
  adaptarCompras: (datos) => {
    // Función adaptarCompras existente - CORREGIDA
    return datos.map(compra => ({
      id: compra.id,
      proveedor: typeof compra.proveedor === 'object' 
        ? compra.proveedor.nombre 
        : compra.proveedor,
      monto: compra.montoTotal,
      saldo: compra.saldo || compra.montoTotal,
      fecha: compra.fechaEmision || compra.created_at,
      tipo: 'Compra',
      estado: 'Pendiente'
    }));
  }
};

export default chipaxAdapter;
