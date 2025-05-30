// chipaxAdapter.js - Versión corregida con validaciones robustas

// =====================================================
// FUNCIONES DE UTILIDAD Y VALIDACIÓN
// =====================================================

const logAdapter = (functionName, input, output) => {
  console.log(`🔄 ${functionName} - Input:`, typeof input, Array.isArray(input) ? `Array(${input.length})` : 'Object');
  console.log(`✅ ${functionName} - Output:`, Array.isArray(output) ? `Array(${output.length})` : typeof output);
};

const validateInput = (data, expectedType, functionName) => {
  if (!data) {
    console.warn(`⚠️ ${functionName}: Datos de entrada son null o undefined`);
    return false;
  }
  
  if (expectedType === 'array' && !Array.isArray(data)) {
    console.warn(`⚠️ ${functionName}: Se esperaba array pero se recibió ${typeof data}`);
    return false;
  }
  
  if (expectedType === 'object' && typeof data !== 'object') {
    console.warn(`⚠️ ${functionName}: Se esperaba objeto pero se recibió ${typeof data}`);
    return false;
  }
  
  return true;
};

const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeString = (value, defaultValue = '') => {
  if (value === null || value === undefined) return defaultValue;
  return String(value);
};

// =====================================================
// FUNCIONES DE ADAPTACIÓN
// =====================================================

const adaptSaldosBancarios = (response) => {
  console.log('🔄 adaptSaldosBancarios - Iniciando adaptación');
  
  if (!validateInput(response, 'object', 'adaptSaldosBancarios')) {
    return [];
  }

  const cuentasBancarias = [];
  
  try {
    // Verificar diferentes estructuras posibles
    const flujoCajaData = response.arrFlujoCaja || response.flujoCaja || response.cuentasCorrientes || [];
    
    if (!Array.isArray(flujoCajaData)) {
      console.warn('⚠️ No se encontró array de flujo de caja válido');
      return [];
    }

    flujoCajaData.forEach((flujo, index) => {
      try {
        if (flujo && flujo.idCuentaCorriente) {
          cuentasBancarias.push({
            id: flujo.idCuentaCorriente || `cuenta_${index}`,
            nombre: safeString(flujo.nombreCuenta || flujo.nombre, `Cuenta ${flujo.idCuentaCorriente || index}`),
            banco: safeString(flujo.nombreBanco || flujo.banco, 'Banco no especificado'),
            numeroCuenta: safeString(flujo.numeroCuenta || flujo.idCuentaCorriente, ''),
            tipo: safeString(flujo.tipo, 'cuenta_corriente'),
            moneda: safeString(flujo.moneda, 'CLP'),
            saldo: safeParseFloat(flujo.saldoPeriodo || flujo.saldo || flujo.saldoActual),
            disponible: safeParseFloat(flujo.saldoDisponible || flujo.saldoPeriodo || flujo.saldo),
            ultimoMovimiento: flujo.fechaUltimoMovimiento || flujo.ultimaActualizacion || new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn(`⚠️ Error procesando cuenta bancaria ${index}:`, err);
      }
    });

    logAdapter('adaptSaldosBancarios', response, cuentasBancarias);
    return cuentasBancarias;
    
  } catch (error) {
    console.error('❌ Error en adaptSaldosBancarios:', error);
    return [];
  }
};

const adaptCuentasPendientes = (facturas) => {
  console.log('🔄 adaptCuentasPendientes - Iniciando adaptación');
  
  if (!validateInput(facturas, 'object', 'adaptCuentasPendientes')) {
    return [];
  }

  try {
    // Manejar diferentes estructuras de datos
    const items = facturas.items || facturas.data || (Array.isArray(facturas) ? facturas : []);
    
    if (!Array.isArray(items)) {
      console.warn('⚠️ No se encontraron items válidos en facturas');
      return [];
    }

    const cuentasAdaptadas = items.map((factura, index) => {
      try {
        // Calcular saldo pendiente de manera segura
        const montoTotal = safeParseFloat(factura.montoTotal || factura.total || factura.monto);
        const montoPagado = safeParseFloat(factura.montoPagado || factura.pagado || factura.abonos);
        const saldoPendiente = Math.max(0, montoTotal - montoPagado);
        
        // Obtener información del cliente de manera flexible
        const nombreCliente = factura.razonSocial || 
                             factura.cliente?.nombre || 
                             factura.cliente ||
                             factura.nombreCliente ||
                             'Cliente sin nombre';
        
        const rutCliente = factura.rutReceptor || 
                          factura.cliente?.rut || 
                          factura.rut || 
                          factura.rutCliente ||
                          'Sin RUT';

        return {
          id: factura.id || factura._id || `factura_${index}`,
          folio: safeString(factura.folio || factura.numero || factura.numeroFactura),
          cliente: {
            nombre: safeString(nombreCliente),
            rut: safeString(rutCliente)
          },
          monto: montoTotal,
          saldo: saldoPendiente,
          moneda: safeString(factura.moneda || factura.currency, 'CLP'),
          fechaEmision: factura.fechaEmision || factura.fecha || factura.created_at || new Date().toISOString(),
          fechaVencimiento: factura.fechaVencimiento || factura.dueDate || factura.fecha_vencimiento,
          estado: safeString(factura.estado || factura.status, 'pendiente'),
          diasVencidos: calcularDiasVencidos(factura.fechaVencimiento || factura.dueDate)
        };
      } catch (err) {
        console.warn(`⚠️ Error procesando factura ${index}:`, err);
        return null;
      }
    }).filter(cuenta => cuenta !== null && cuenta.saldo > 0);

    logAdapter('adaptCuentasPendientes', facturas, cuentasAdaptadas);
    return cuentasAdaptadas;
    
  } catch (error) {
    console.error('❌ Error en adaptCuentasPendientes:', error);
    return [];
  }
};

const adaptCuentasPorPagar = (facturas) => {
  console.log('🔄 adaptCuentasPorPagar - Iniciando adaptación');
  
  if (!validateInput(facturas, 'object', 'adaptCuentasPorPagar')) {
    return [];
  }

  try {
    // Manejar diferentes estructuras de entrada
    const items = Array.isArray(facturas) ? facturas : 
                 (facturas.items || facturas.data || []);
    
    if (!Array.isArray(items)) {
      console.warn('⚠️ No se encontraron items válidos en facturas por pagar');
      return [];
    }

    const facturasAdaptadas = items.map((factura, index) => {
      try {
        // Calcular montos de manera flexible y segura
        const montoTotal = safeParseFloat(
          factura.total || 
          factura.monto_total || 
          factura.montoTotal || 
          factura.monto || 
          factura.totalFacturado
        );
        
        const saldoPendiente = safeParseFloat(
          factura.saldo || 
          factura.monto_por_pagar || 
          factura.montoPorPagar ||
          factura.saldoPendiente ||
          montoTotal // Si no hay campo de saldo, usar el total
        );
        
        // Obtener información del proveedor de manera flexible
        const nombreProveedor = factura.proveedor?.nombre || 
                               factura.proveedor || 
                               factura.nombre_proveedor || 
                               factura.nombreProveedor ||
                               factura.razonSocial ||
                               'Proveedor no especificado';
                               
        const rutProveedor = factura.proveedor?.rut || 
                            factura.rut_proveedor || 
                            factura.rutProveedor ||
                            factura.proveedor_rut ||
                            factura.rutEmisor ||
                            'Sin RUT';

        return {
          id: factura.id || factura._id || `factura_pagar_${index}`,
          folio: safeString(factura.folio || factura.numero || factura.numeroFactura),
          proveedor: {
            nombre: safeString(nombreProveedor),
            rut: safeString(rutProveedor)
          },
          monto: montoTotal,
          saldo: saldoPendiente,
          moneda: safeString(factura.moneda || factura.currency, 'CLP'),
          fechaEmision: factura.fecha_emision || factura.fechaEmision || factura.fecha || factura.created_at || new Date().toISOString(),
          fechaVencimiento: factura.fecha_vencimiento || factura.fechaVencimiento || factura.due_date,
          fechaPago: factura.fechaPagoInterna || factura.fecha_pago,
          diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.fechaVencimiento || factura.due_date),
          estado: safeString(factura.estado || factura.status, 'Pendiente'),
          estadoPago: safeString(factura.estado_pago || factura.estadoPago, 'Pendiente'),
          observaciones: safeString(factura.observaciones || factura.notas)
        };
      } catch (err) {
        console.warn(`⚠️ Error procesando factura por pagar ${index}:`, err);
        return null;
      }
    }).filter(factura => factura !== null);

    logAdapter('adaptCuentasPorPagar', facturas, facturasAdaptadas);
    
    // Mostrar resumen financiero
    const totalPorPagar = facturasAdaptadas.reduce((sum, f) => sum + f.saldo, 0);
    console.log(`💰 Total por pagar: ${totalPorPagar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
    
    return facturasAdaptadas;
    
  } catch (error) {
    console.error('❌ Error en adaptCuentasPorPagar:', error);
    return [];
  }
};

const adaptFacturasPendientesAprobacion = (facturas) => {
  console.log('🔄 adaptFacturasPendientesAprobacion - Iniciando adaptación');
  
  if (!Array.isArray(facturas)) {
    console.warn('⚠️ No se recibieron facturas pendientes válidas');
    return [];
  }

  try {
    const facturasAdaptadas = facturas.map((factura, index) => {
      try {
        return {
          id: factura.id || `factura_pendiente_${index}`,
          folio: safeString(factura.folio || factura.numero),
          proveedor: {
            nombre: safeString(factura.razonSocial || factura.proveedor || factura.nombreProveedor),
            rut: safeString(factura.rutProveedor || factura.rut)
          },
          monto: safeParseFloat(factura.montoTotal || factura.monto || factura.total),
          moneda: safeString(factura.moneda, 'CLP'),
          fechaEmision: factura.fechaEmision || factura.fecha || new Date().toISOString(),
          fechaRecepcion: factura.fechaRecepcion || factura.fechaIngreso || new Date().toISOString(),
          diasEnEspera: calcularDiasEspera(factura.fechaRecepcion || factura.fechaIngreso),
          estado: safeString(factura.estado, 'pendiente_aprobacion'),
          responsableAprobacion: safeString(factura.responsable || factura.aprobador, 'No asignado')
        };
      } catch (err) {
        console.warn(`⚠️ Error procesando factura pendiente ${index}:`, err);
        return null;
      }
    }).filter(factura => factura !== null);

    logAdapter('adaptFacturasPendientesAprobacion', facturas, facturasAdaptadas);
    return facturasAdaptadas;
    
  } catch (error) {
    console.error('❌ Error en adaptFacturasPendientesAprobacion:', error);
    return [];
  }
};

const adaptFlujoCaja = (response, saldoInicial = 0) => {
  console.log('🔄 adaptFlujoCaja - Iniciando adaptación');
  
  if (!validateInput(response, 'object', 'adaptFlujoCaja')) {
    return {
      saldoInicial: saldoInicial,
      saldoFinal: saldoInicial,
      periodos: []
    };
  }

  try {
    const flujoCajaArray = response.arrFlujoCaja || response.flujoCaja || response.periodos || [];
    
    if (!Array.isArray(flujoCajaArray)) {
      console.warn('⚠️ No se encontró array de flujo de caja válido');
      return {
        saldoInicial: saldoInicial,
        saldoFinal: saldoInicial,
        periodos: []
      };
    }

    let saldoAcumulado = saldoInicial;
    const periodosAdaptados = [];

    flujoCajaArray.forEach((flujo, index) => {
      try {
        const ingresos = safeParseFloat(flujo.ingresos || flujo.entradas || flujo.ingreso);
        const egresos = safeParseFloat(flujo.egresos || flujo.salidas || flujo.egreso);
        const flujoNeto = ingresos - egresos;
        
        saldoAcumulado += flujoNeto;

        periodosAdaptados.push({
          fecha: flujo.fecha || flujo.periodo || new Date().toISOString(),
          mes: flujo.mes,
          anio: flujo.anio || flujo.año,
          ingresos: ingresos,
          egresos: egresos,
          flujoNeto: flujoNeto,
          saldoAcumulado: saldoAcumulado,
          descripcion: safeString(flujo.descripcion || flujo.concepto)
        });
      } catch (err) {
        console.warn(`⚠️ Error procesando periodo de flujo ${index}:`, err);
      }
    });

    const resultado = {
      saldoInicial: saldoInicial,
      saldoFinal: saldoAcumulado,
      periodos: periodosAdaptados
    };

    logAdapter('adaptFlujoCaja', response, resultado);
    return resultado;
    
  } catch (error) {
    console.error('❌ Error en adaptFlujoCaja:', error);
    return {
      saldoInicial: saldoInicial,
      saldoFinal: saldoInicial,
      periodos: []
    };
  }
};

const adaptEgresosProgramados = (pagos) => {
  console.log('🔄 adaptEgresosProgramados - Iniciando adaptación');
  
  if (!Array.isArray(pagos)) {
    console.warn('⚠️ No se recibieron pagos programados válidos');
    return [];
  }

  try {
    const egresosAdaptados = pagos.map((pago, index) => {
      try {
        return {
          id: pago.id || `pago_${index}`,
          concepto: safeString(pago.concepto || pago.descripcion, 'Pago programado'),
          beneficiario: {
            nombre: safeString(pago.razonSocial || pago.proveedor || pago.beneficiario),
            rut: safeString(pago.rut || pago.rutBeneficiario)
          },
          monto: safeParseFloat(pago.monto || pago.importe),
          moneda: safeString(pago.moneda, 'CLP'),
          fechaPago: pago.fechaProgramada || pago.fecha || pago.fechaPago,
          diasParaPago: calcularDiasParaPago(pago.fechaProgramada || pago.fecha),
          categoria: safeString(pago.categoria || pago.tipo, 'Pago general'),
          estado: safeString(pago.estado, 'programado')
        };
      } catch (err) {
        console.warn(`⚠️ Error procesando pago programado ${index}:`, err);
        return null;
      }
    }).filter(pago => pago !== null);

    logAdapter('adaptEgresosProgramados', pagos, egresosAdaptados);
    return egresosAdaptados;
    
  } catch (error) {
    console.error('❌ Error en adaptEgresosProgramados:', error);
    return [];
  }
};

const adaptBancos = (response) => {
  console.log('🔄 adaptBancos - Iniciando adaptación');
  
  if (!validateInput(response, 'object', 'adaptBancos')) {
    return [];
  }

  try {
    const flujoCajaData = response.arrFlujoCaja || response.flujoCaja || response.cuentasCorrientes || [];
    
    if (!Array.isArray(flujoCajaData)) {
      return [];
    }

    const bancosUnicos = {};
    
    flujoCajaData.forEach((flujo, index) => {
      try {
        if (flujo && flujo.idCuentaCorriente) {
          const bancoId = flujo.idBanco || flujo.idCuentaCorriente;
          const nombreBanco = flujo.nombreBanco || flujo.nombreCuenta || `Banco ${bancoId}`;
          
          if (!bancosUnicos[bancoId]) {
            bancosUnicos[bancoId] = {
              id: bancoId,
              nombre: safeString(nombreBanco),
              tipo: safeString(flujo.tipoCuenta || flujo.tipo, 'cuenta_corriente'),
              codigo: safeString(flujo.codigoBanco || flujo.codigo)
            };
          }
        }
      } catch (err) {
        console.warn(`⚠️ Error procesando banco ${index}:`, err);
      }
    });

    const bancos = Object.values(bancosUnicos);
    logAdapter('adaptBancos', response, bancos);
    return bancos;
    
  } catch (error) {
    console.error('❌ Error en adaptBancos:', error);
    return [];
  }
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  try {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    
    // Limpiar horas para comparar solo fechas
    hoy.setHours(0, 0, 0, 0);
    vencimiento.setHours(0, 0, 0, 0);
    
    const diferencia = hoy.getTime() - vencimiento.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.warn('⚠️ Error calculando días vencidos:', error);
    return 0;
  }
};

const calcularDiasEspera = (fechaRecepcion) => {
  if (!fechaRecepcion) return 0;
  
  try {
    const hoy = new Date();
    const recepcion = new Date(fechaRecepcion);
    
    hoy.setHours(0, 0, 0, 0);
    recepcion.setHours(0, 0, 0, 0);
    
    const diferencia = hoy.getTime() - recepcion.getTime();
    return Math.max(0, Math.floor(diferencia / (1000 * 60 * 60 * 24)));
  } catch (error) {
    console.warn('⚠️ Error calculando días de espera:', error);
    return 0;
  }
};

const calcularDiasParaPago = (fechaPago) => {
  if (!fechaPago) return null;
  
  try {
    const hoy = new Date();
    const pago = new Date(fechaPago);
    
    hoy.setHours(0, 0, 0, 0);
    pago.setHours(0, 0, 0, 0);
    
    const diferencia = pago.getTime() - hoy.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.warn('⚠️ Error calculando días para pago:', error);
    return null;
  }
};

// =====================================================
// EXPORTACIÓN
// =====================================================

export default {
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  adaptBancos
};
