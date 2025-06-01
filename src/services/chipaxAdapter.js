// chipaxAdapter.js - Adaptador completo para datos reales de Chipax
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calcula los días vencidos desde una fecha
 * @param {string} fecha - Fecha en formato ISO
 * @returns {number} Días vencidos (positivo) o por vencer (negativo)
 */
const calcularDiasVencidos = (fecha) => {
  if (!fecha) return 0;
  
  try {
    const fechaVencimiento = parseISO(fecha);
    const hoy = new Date();
    return differenceInDays(hoy, fechaVencimiento);
  } catch (error) {
    console.error('Error calculando días vencidos:', error);
    return 0;
  }
};

/**
 * Formatea una fecha a formato legible
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  
  try {
    return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es });
  } catch (error) {
    return fecha;
  }
};

/**
 * Adapta las cuentas corrientes de Chipax a saldos bancarios
 * @param {object} response - Respuesta de /cuentas_corrientes
 * @returns {array} Saldos bancarios adaptados
 */
export const adaptSaldosBancarios = (response) => {
  console.log('🔄 Adaptando saldos bancarios...');
  
  if (!response || !response.items) {
    console.warn('⚠️ No se encontraron cuentas corrientes');
    return [];
  }

  const cuentasBancarias = response.items.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.nombre || `Cuenta ${cuenta.numero_cuenta || cuenta.id}`,
    banco: cuenta.banco?.nombre || cuenta.nombre_banco || 'Banco no especificado',
    numeroCuenta: cuenta.numero_cuenta || cuenta.numero || '',
    tipo: cuenta.tipo || 'cuenta_corriente',
    moneda: cuenta.moneda || 'CLP',
    saldo: parseFloat(cuenta.saldo || cuenta.saldo_actual || 0),
    disponible: parseFloat(cuenta.saldo_disponible || cuenta.saldo || 0),
    ultimoMovimiento: cuenta.ultimo_movimiento || cuenta.fecha_actualizacion || new Date().toISOString(),
    activa: cuenta.activa !== false,
    // Campos adicionales útiles
    saldoContable: parseFloat(cuenta.saldo_contable || cuenta.saldo || 0),
    lineaCredito: parseFloat(cuenta.linea_credito || 0),
    sobregiro: parseFloat(cuenta.sobregiro || 0)
  }));

  // Calcular totales por moneda
  const totalesPorMoneda = {};
  cuentasBancarias.forEach(cuenta => {
    if (!totalesPorMoneda[cuenta.moneda]) {
      totalesPorMoneda[cuenta.moneda] = {
        moneda: cuenta.moneda,
        saldo: 0,
        disponible: 0,
        cuentas: 0
      };
    }
    totalesPorMoneda[cuenta.moneda].saldo += cuenta.saldo;
    totalesPorMoneda[cuenta.moneda].disponible += cuenta.disponible;
    totalesPorMoneda[cuenta.moneda].cuentas += 1;
  });

  console.log(`✅ ${cuentasBancarias.length} cuentas bancarias adaptadas`);
  console.log('💰 Totales por moneda:', totalesPorMoneda);

  return cuentasBancarias;
};

/**
 * Adapta las facturas de venta a cuentas por cobrar
 * @param {object} response - Respuesta de /ventas o /dtes
 * @returns {array} Cuentas por cobrar adaptadas
 */
export const adaptCuentasPendientes = (response) => {
  console.log('🔄 Adaptando cuentas por cobrar...');
  
  if (!response || !response.items) {
    console.warn('⚠️ No se encontraron facturas de venta');
    return [];
  }

  const cuentasPorCobrar = response.items
    .filter(factura => 
      // Filtrar solo facturas pendientes de cobro
      !factura.pagado || 
      factura.saldo_pendiente > 0 ||
      factura.estado === 'pendiente' ||
      factura.estado_pago === 'pendiente'
    )
    .map(factura => {
      const montoTotal = parseFloat(
        factura.monto_total || 
        factura.total || 
        factura.monto || 
        0
      );
      
      const montoPagado = parseFloat(
        factura.monto_pagado || 
        factura.pagado || 
        0
      );
      
      const saldoPendiente = parseFloat(
        factura.saldo_pendiente || 
        factura.saldo || 
        (montoTotal - montoPagado) ||
        montoTotal
      );
      
      const diasVencidos = calcularDiasVencidos(
        factura.fecha_vencimiento || 
        factura.fecha_pago_estimada ||
        factura.fecha_emision
      );
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || 'Sin folio',
        cliente: {
          id: factura.cliente_id || factura.receptor_id,
          nombre: factura.razon_social_receptor || 
                  factura.nombre_receptor || 
                  factura.cliente?.nombre ||
                  'Cliente no especificado',
          rut: factura.rut_receptor || 
               factura.cliente?.rut ||
               'Sin RUT'
        },
        tipo: factura.tipo_dte || factura.tipo || 'Factura',
        monto: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha,
        fechaVencimiento: factura.fecha_vencimiento || factura.fecha_pago_estimada,
        diasVencidos: diasVencidos,
        estado: diasVencidos > 90 ? 'crítico' :
                diasVencidos > 60 ? 'alto' :
                diasVencidos > 30 ? 'medio' :
                diasVencidos > 0 ? 'bajo' : 'al_dia',
        // Campos adicionales útiles
        observaciones: factura.observaciones || '',
        vendedor: factura.vendedor || '',
        sucursal: factura.sucursal || '',
        ordenCompra: factura.orden_compra || '',
        condicionPago: factura.condicion_pago || '',
        // Información para gestión de cobranza
        ultimoContacto: factura.ultimo_contacto,
        proximoContacto: factura.proximo_contacto,
        gestionCobranza: factura.gestion_cobranza || []
      };
    })
    .sort((a, b) => b.diasVencidos - a.diasVencidos); // Ordenar por días vencidos

  // Calcular estadísticas
  const estadisticas = {
    total: cuentasPorCobrar.length,
    montoTotal: cuentasPorCobrar.reduce((sum, c) => sum + c.saldo, 0),
    porEstado: {
      critico: cuentasPorCobrar.filter(c => c.estado === 'crítico').length,
      alto: cuentasPorCobrar.filter(c => c.estado === 'alto').length,
      medio: cuentasPorCobrar.filter(c => c.estado === 'medio').length,
      bajo: cuentasPorCobrar.filter(c => c.estado === 'bajo').length,
      al_dia: cuentasPorCobrar.filter(c => c.estado === 'al_dia').length
    },
    promediosDiasVencidos: cuentasPorCobrar.length > 0 
      ? cuentasPorCobrar.reduce((sum, c) => sum + c.diasVencidos, 0) / cuentasPorCobrar.length
      : 0
  };

  console.log(`✅ ${cuentasPorCobrar.length} cuentas por cobrar adaptadas`);
  console.log('📊 Estadísticas:', estadisticas);

  return cuentasPorCobrar;
};

/**
 * Adapta las facturas de compra a cuentas por pagar
 * @param {object} response - Respuesta de /compras
 * @returns {array} Cuentas por pagar adaptadas
 */
export const adaptCuentasPorPagar = (response) => {
  console.log('🔄 Adaptando cuentas por pagar...');
  
  if (!response || !response.items) {
    console.warn('⚠️ No se encontraron facturas de compra');
    return [];
  }

  const cuentasPorPagar = response.items
    .filter(factura => 
      // Filtrar solo facturas pendientes de pago
      factura.pagado === false || 
      factura.fecha_pago_interna === null ||
      factura.estado === 'pendiente' ||
      factura.estado_pago === 'pendiente'
    )
    .map(factura => {
      const montoTotal = parseFloat(
        factura.monto_total || 
        factura.total || 
        factura.monto || 
        0
      );
      
      const montoPagado = parseFloat(
        factura.monto_pagado || 
        0
      );
      
      const saldoPendiente = parseFloat(
        factura.saldo_pendiente || 
        factura.saldo || 
        (montoTotal - montoPagado) ||
        montoTotal
      );
      
      const diasParaVencimiento = -calcularDiasVencidos(
        factura.fecha_vencimiento || 
        factura.fecha_pago_programada ||
        addDays(parseISO(factura.fecha_emision || new Date()), 30).toISOString()
      );
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || 'Sin folio',
        proveedor: {
          id: factura.proveedor_id || factura.emisor_id,
          nombre: factura.razon_social || 
                  factura.nombre_emisor || 
                  factura.proveedor?.nombre ||
                  'Proveedor no especificado',
          rut: factura.rut_emisor || 
               factura.proveedor?.rut ||
               'Sin RUT'
        },
        tipo: factura.tipo_dte || factura.tipo || 'Factura',
        monto: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha,
        fechaRecepcion: factura.fecha_recepcion || factura.fecha_emision,
        fechaVencimiento: factura.fecha_vencimiento || factura.fecha_pago_programada,
        fechaPagoProgramada: factura.fecha_pago_interna || factura.fecha_pago_programada,
        diasParaVencimiento: diasParaVencimiento,
        estado: diasParaVencimiento < -30 ? 'vencido' :
                diasParaVencimiento < 0 ? 'por_vencer' :
                diasParaVencimiento < 7 ? 'proximo' : 'normal',
        prioridad: diasParaVencimiento < 0 ? 'alta' :
                   diasParaVencimiento < 7 ? 'media' : 'normal',
        // Campos adicionales
        ordenCompra: factura.orden_compra || '',
        centroCosto: factura.centro_costo || '',
        proyecto: factura.proyecto || '',
        aprobadoPor: factura.aprobado_por || '',
        fechaAprobacion: factura.fecha_aprobacion,
        formaPago: factura.forma_pago || '',
        cuentaContable: factura.cuenta_contable || '',
        // Información para gestión de pagos
        programadoPago: factura.programado_pago || false,
        retencion: parseFloat(factura.retencion || 0),
        descuento: parseFloat(factura.descuento || 0)
      };
    })
    .sort((a, b) => a.diasParaVencimiento - b.diasParaVencimiento); // Ordenar por urgencia

  // Calcular estadísticas
  const estadisticas = {
    total: cuentasPorPagar.length,
    montoTotal: cuentasPorPagar.reduce((sum, c) => sum + c.saldo, 0),
    porEstado: {
      vencido: cuentasPorPagar.filter(c => c.estado === 'vencido').length,
      por_vencer: cuentasPorPagar.filter(c => c.estado === 'por_vencer').length,
      proximo: cuentasPorPagar.filter(c => c.estado === 'proximo').length,
      normal: cuentasPorPagar.filter(c => c.estado === 'normal').length
    },
    proximaSemana: cuentasPorPagar
      .filter(c => c.diasParaVencimiento >= 0 && c.diasParaVencimiento <= 7)
      .reduce((sum, c) => sum + c.saldo, 0),
    vencidas: cuentasPorPagar
      .filter(c => c.diasParaVencimiento < 0)
      .reduce((sum, c) => sum + c.saldo, 0)
  };

  console.log(`✅ ${cuentasPorPagar.length} cuentas por pagar adaptadas`);
  console.log('📊 Estadísticas:', estadisticas);

  return cuentasPorPagar;
};

/**
 * Adapta las facturas pendientes de aprobación
 * @param {array} facturas - Facturas que requieren aprobación
 * @returns {array} Facturas pendientes adaptadas
 */
export const adaptFacturasPendientesAprobacion = (facturas) => {
  console.log('🔄 Adaptando facturas pendientes de aprobación...');
  
  if (!facturas || !Array.isArray(facturas)) {
    console.warn('⚠️ No se encontraron facturas pendientes');
    return [];
  }

  const facturasPendientes = facturas
    .filter(factura => 
      factura.estado === 'pendiente_aprobacion' ||
      factura.requiere_aprobacion === true ||
      (!factura.aprobado_por && factura.monto_total > 100000) // Ejemplo: facturas grandes sin aprobar
    )
    .map(factura => {
      const diasEnEspera = calcularDiasVencidos(factura.fecha_recepcion || factura.fecha_emision);
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero,
        proveedor: {
          nombre: factura.razon_social || factura.proveedor?.nombre || 'Sin nombre',
          rut: factura.rut_emisor || factura.proveedor?.rut || 'Sin RUT'
        },
        monto: parseFloat(factura.monto_total || factura.total || 0),
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision,
        fechaRecepcion: factura.fecha_recepcion || factura.fecha_emision,
        diasEnEspera: Math.max(0, diasEnEspera),
        responsableAprobacion: factura.responsable_aprobacion || 'Sin asignar',
        estado: 'pendiente_aprobacion',
        prioridad: diasEnEspera > 5 ? 'alta' : diasEnEspera > 3 ? 'media' : 'normal',
        observaciones: factura.observaciones || '',
        documentosAdjuntos: factura.documentos_adjuntos || [],
        historialAprobacion: factura.historial_aprobacion || []
      };
    })
    .sort((a, b) => b.diasEnEspera - a.diasEnEspera);

  console.log(`✅ ${facturasPendientes.length} facturas pendientes de aprobación`);

  return facturasPendientes;
};

/**
 * Genera el flujo de caja basado en las transacciones
 * @param {object} data - Datos de compras, ventas y saldos
 * @param {number} saldoInicial - Saldo inicial
 * @returns {object} Flujo de caja adaptado
 */
export const adaptFlujoCaja = (data, saldoInicial = 0) => {
  console.log('🔄 Generando flujo de caja...');
  
  const { compras, ventas, saldosBancarios } = data;
  
  // Calcular saldo inicial real desde las cuentas bancarias
  const saldoActual = saldosBancarios?.reduce((sum, cuenta) => sum + cuenta.saldo, 0) || saldoInicial;
  
  // Crear mapa de transacciones por período (mensual)
  const transaccionesPorMes = new Map();
  
  // Procesar ingresos (ventas)
  if (ventas?.items) {
    ventas.items.forEach(venta => {
      const fecha = parseISO(venta.fecha_emision || venta.fecha);
      const mesKey = format(fecha, 'yyyy-MM');
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, {
          fecha: mesKey,
          ingresos: 0,
          egresos: 0,
          cantidad_ingresos: 0,
          cantidad_egresos: 0
        });
      }
      
      const periodo = transaccionesPorMes.get(mesKey);
      periodo.ingresos += parseFloat(venta.monto_total || venta.total || 0);
      periodo.cantidad_ingresos += 1;
    });
  }
  
  // Procesar egresos (compras)
  if (compras?.items) {
    compras.items.forEach(compra => {
      const fecha = parseISO(compra.fecha_emision || compra.fecha);
      const mesKey = format(fecha, 'yyyy-MM');
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, {
          fecha: mesKey,
          ingresos: 0,
          egresos: 0,
          cantidad_ingresos: 0,
          cantidad_egresos: 0
        });
      }
      
      const periodo = transaccionesPorMes.get(mesKey);
      periodo.egresos += parseFloat(compra.monto_total || compra.total || 0);
      periodo.cantidad_egresos += 1;
    });
  }
  
  // Convertir a array y ordenar por fecha
  const periodos = Array.from(transaccionesPorMes.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((periodo, index, array) => {
      // Calcular flujo neto
      periodo.flujoNeto = periodo.ingresos - periodo.egresos;
      
      // Calcular saldo acumulado
      if (index === 0) {
        periodo.saldoAcumulado = saldoActual + periodo.flujoNeto;
      } else {
        periodo.saldoAcumulado = array[index - 1].saldoAcumulado + periodo.flujoNeto;
      }
      
      // Formatear fecha para visualización
      const [year, month] = periodo.fecha.split('-');
      periodo.mes = format(new Date(year, month - 1), 'MMMM', { locale: es });
      periodo.anio = year;
      periodo.etiqueta = `${periodo.mes} ${year}`;
      
      return periodo;
    });
  
  // Calcular estadísticas generales
  const totalIngresos = periodos.reduce((sum, p) => sum + p.ingresos, 0);
  const totalEgresos = periodos.reduce((sum, p) => sum + p.egresos, 0);
  const flujoNetoTotal = totalIngresos - totalEgresos;
  const saldoFinal = saldoActual + flujoNetoTotal;
  
  // Proyección simple para los próximos 3 meses
  const proyecciones = [];
  if (periodos.length >= 3) {
    const ultimosTresMeses = periodos.slice(-3);
    const promedioIngresos = ultimosTresMeses.reduce((sum, p) => sum + p.ingresos, 0) / 3;
    const promedioEgresos = ultimosTresMeses.reduce((sum, p) => sum + p.egresos, 0) / 3;
    
    let saldoProyectado = periodos[periodos.length - 1].saldoAcumulado;
    
    for (let i = 1; i <= 3; i++) {
      const fechaProyeccion = addDays(new Date(), i * 30);
      const flujoProyectado = promedioIngresos - promedioEgresos;
      saldoProyectado += flujoProyectado;
      
      proyecciones.push({
        fecha: format(fechaProyeccion, 'yyyy-MM'),
        mes: format(fechaProyeccion, 'MMMM', { locale: es }),
        anio: format(fechaProyeccion, 'yyyy'),
        etiqueta: format(fechaProyeccion, 'MMMM yyyy', { locale: es }),
        ingresos: promedioIngresos,
        egresos: promedioEgresos,
        flujoNeto: flujoProyectado,
        saldoAcumulado: saldoProyectado,
        esProyeccion: true
      });
    }
  }
  
  const resultado = {
    saldoInicial: saldoActual,
    saldoFinal,
    totalIngresos,
    totalEgresos,
    flujoNetoTotal,
    periodos: [...periodos, ...proyecciones],
    estadisticas: {
      promedioMensualIngresos: periodos.length > 0 ? totalIngresos / periodos.length : 0,
      promedioMensualEgresos: periodos.length > 0 ? totalEgresos / periodos.length : 0,
      mesesConFlujoPositivo: periodos.filter(p => p.flujoNeto > 0).length,
      mesesConFlujoNegativo: periodos.filter(p => p.flujoNeto < 0).length,
      mejorMes: periodos.reduce((best, p) => p.flujoNeto > best.flujoNeto ? p : best, periodos[0] || {}),
      peorMes: periodos.reduce((worst, p) => p.flujoNeto < worst.flujoNeto ? p : worst, periodos[0] || {})
    }
  };
  
  console.log(`✅ Flujo de caja generado con ${periodos.length} períodos`);
  console.log('💰 Resumen:', {
    saldoInicial: saldoActual,
    saldoFinal,
    flujoNeto: flujoNetoTotal
  });
  
  return resultado;
};

/**
 * Adapta los egresos programados
 * @param {array} pagos - Pagos programados
 * @returns {array} Egresos programados adaptados
 */
export const adaptEgresosProgramados = (pagos) => {
  console.log('🔄 Adaptando egresos programados...');
  
  if (!pagos || !Array.isArray(pagos)) {
    console.warn('⚠️ No se encontraron pagos programados');
    return [];
  }

  const egresosProgramados = pagos
    .filter(pago => 
      pago.estado === 'programado' ||
      pago.estado === 'pendiente' ||
      (pago.fecha_programada && new Date(pago.fecha_programada) > new Date())
    )
    .map(pago => {
      const diasParaPago = -calcularDiasVencidos(pago.fecha_programada || pago.fecha_pago);
      
      return {
        id: pago.id,
        concepto: pago.concepto || pago.descripcion || `Pago a ${pago.beneficiario?.nombre || 'Sin especificar'}`,
        beneficiario: {
          id: pago.beneficiario_id,
          nombre: pago.beneficiario?.nombre || pago.proveedor?.nombre || 'Sin especificar',
          rut: pago.beneficiario?.rut || pago.proveedor?.rut || ''
        },
        monto: parseFloat(pago.monto || pago.total || 0),
        moneda: pago.moneda || 'CLP',
        fechaPago: pago.fecha_programada || pago.fecha_pago,
        diasParaPago: Math.max(0, diasParaPago),
        categoria: pago.categoria || pago.tipo || 'Otros',
        estado: pago.estado || 'programado',
        prioridad: diasParaPago < 3 ? 'alta' : diasParaPago < 7 ? 'media' : 'normal',
        recurrente: pago.es_recurrente || false,
        frecuencia: pago.frecuencia || null,
        metodoPago: pago.metodo_pago || pago.forma_pago || '',
        cuentaOrigen: pago.cuenta_origen || null,
        referencia: pago.referencia || pago.numero_factura || '',
        aprobadoPor: pago.aprobado_por || null,
        observaciones: pago.observaciones || ''
      };
    })
    .sort((a, b) => a.diasParaPago - b.diasParaPago);

  // Agrupar por categoría
  const porCategoria = egresosProgramados.reduce((acc, egreso) => {
    if (!acc[egreso.categoria]) {
      acc[egreso.categoria] = {
        categoria: egreso.categoria,
        cantidad: 0,
        monto: 0
      };
    }
    acc[egreso.categoria].cantidad += 1;
    acc[egreso.categoria].monto += egreso.monto;
    return acc;
  }, {});

  console.log(`✅ ${egresosProgramados.length} egresos programados adaptados`);
  console.log('📊 Por categoría:', Object.values(porCategoria));

  return egresosProgramados;
};

/**
 * Adapta la lista de bancos disponibles
 * @param {array} cuentasCorrientes - Lista de cuentas corrientes
 * @returns {array} Bancos únicos
 */
export const adaptBancos = (cuentasCorrientes) => {
  console.log('🔄 Extrayendo bancos únicos...');
  
  if (!cuentasCorrientes || !Array.isArray(cuentasCorrientes)) {
    return [];
  }

  const bancosMap = new Map();
  
  cuentasCorrientes.forEach(cuenta => {
    const bancoId = cuenta.banco?.id || cuenta.banco_id || `banco_${cuenta.banco?.nombre}`;
    const bancoNombre = cuenta.banco?.nombre || cuenta.nombre_banco || 'Banco no especificado';
    
    if (!bancosMap.has(bancoId)) {
      bancosMap.set(bancoId, {
        id: bancoId,
        nombre: bancoNombre,
        codigo: cuenta.banco?.codigo || '',
        tipo: cuenta.banco?.tipo || 'banco',
        activo: cuenta.banco?.activo !== false,
        cuentas: []
      });
    }
    
    // Agregar cuenta al banco
    bancosMap.get(bancoId).cuentas.push({
      id: cuenta.id,
      numero: cuenta.numero_cuenta,
      tipo: cuenta.tipo,
      moneda: cuenta.moneda,
      saldo: cuenta.saldo
    });
  });

  const bancos = Array.from(bancosMap.values());
  
  console.log(`✅ ${bancos.length} bancos únicos encontrados`);
  
  return bancos;
};

/**
 * Función helper para validar y limpiar montos
 * @param {any} valor - Valor a limpiar
 * @returns {number} Monto limpio
 */
const limpiarMonto = (valor) => {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    // Remover símbolos de moneda y espacios
    const limpio = valor.replace(/[$.,\s]/g, '').replace(',', '.');
    return parseFloat(limpio) || 0;
  }
  return 0;
};

/**
 * Genera métricas de completitud de datos
 * @param {object} datos - Todos los datos cargados
 * @returns {object} Métricas de completitud
 */
export const calcularCompletitudDatos = (datos) => {
  const metricas = {
    timestamp: new Date(),
    modulos: {}
  };
  
  // Analizar cada módulo
  Object.entries(datos).forEach(([modulo, data]) => {
    if (data && typeof data === 'object') {
      const items = data.items || [];
      const paginationStats = data.paginationStats;
      
      metricas.modulos[modulo] = {
        totalItems: items.length,
        completitud: 100, // Por defecto asumimos 100%
        detalles: {}
      };
      
      // Si hay estadísticas de paginación, calcular completitud real
      if (paginationStats) {
        const completitud = paginationStats.totalItems > 0
          ? (paginationStats.loadedItems / paginationStats.totalItems) * 100
          : 100;
          
        metricas.modulos[modulo].completitud = completitud;
        metricas.modulos[modulo].detalles = {
          itemsCargados: paginationStats.loadedItems,
          itemsTotal: paginationStats.totalItems,
          paginasCargadas: paginationStats.loadedPages,
          paginasTotal: paginationStats.totalPages,
          paginasFallidas: paginationStats.failedPages
        };
      }
      
      // Análisis adicional por módulo
      if (modulo === 'compras' && items.length > 0) {
        metricas.modulos[modulo].detalles.sinProveedor = items.filter(i => !i.proveedor?.nombre).length;
        metricas.modulos[modulo].detalles.sinFechaVencimiento = items.filter(i => !i.fecha_vencimiento).length;
      }
      
      if (modulo === 'ventas' && items.length > 0) {
        metricas.modulos[modulo].detalles.sinCliente = items.filter(i => !i.cliente?.nombre).length;
        metricas.modulos[modulo].detalles.sinFechaVencimiento = items.filter(i => !i.fecha_vencimiento).length;
      }
    }
  });
  
  // Calcular completitud general
  const completitudes = Object.values(metricas.modulos).map(m => m.completitud);
  metricas.completitudGeneral = completitudes.length > 0
    ? completitudes.reduce((sum, c) => sum + c, 0) / completitudes.length
    : 0;
  
  return metricas;
};

// Exportar todas las funciones
export default {
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  adaptBancos,
  calcularCompletitudDatos,
  // Funciones helper exportadas
  calcularDiasVencidos,
  formatearFecha,
  limpiarMonto
};
