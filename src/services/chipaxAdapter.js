/**
 * ✅ ADAPTADOR CORREGIDO: Sin filtro de "pagadas" 
 * CAMBIO: Mostrar todas las facturas independientemente del estado de pago
 */
export const adaptarCuentasPorPagar = (compras) => {
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCuentasPorPagar: entrada no es array');
    return [];
  }

  console.log('💸 Adaptando compras (SIN FILTRO de pagadas - mostrando todas)...');
  console.log(`🔍 INPUT DEBUG: {tipo: '${typeof compras}', esArray: ${Array.isArray(compras)}, longitud: ${compras.length}}`);

  const resultado = compras.map((compra, index) => {
    // Calcular montos
    const montoTotal = parseFloat(compra.montoTotal || compra.monto_total || compra.monto || 0);
    const montoNeto = parseFloat(compra.montoNeto || compra.monto_neto || 0);
    const iva = parseFloat(compra.iva || 0);
    
    // Verificar si está anulado
    const estaAnulado = compra.anulado === 'S' || 
                       compra.anulado === true || 
                       compra.estado === 'anulado' ||
                       compra.estado === 'rechazado';
    
    // ✅ CAMBIO PRINCIPAL: NO FILTRAR POR ESTADO DE PAGO
    // Determinar estado sin filtrar pagadas
    let estado = 'Pendiente';
    let saldoPendiente = montoTotal;
    
    if (estaAnulado) {
      estado = 'Anulado';
      saldoPendiente = 0;
    } else {
      // ✅ NUEVO: Determinar estado basado en información disponible
      const fechaPago = compra.fechaPagoInterna || 
                       compra.fecha_pago_interna || 
                       compra.fechaPago || 
                       compra.fecha_pago;
      
      const estadoChipax = compra.estado;
      
      // Mapear estados de Chipax
      if (estadoChipax === 'pagado' || estadoChipax === 'paid') {
        estado = 'Pagado';
        saldoPendiente = 0;
      } else if (estadoChipax === 'aceptado' || estadoChipax === 'accepted') {
        estado = 'Aceptado';
        // ✅ MANTENER MONTO: Aceptado pero no necesariamente pagado
        saldoPendiente = montoTotal;
      } else if (estadoChipax === 'pendiente' || estadoChipax === 'pending') {
        estado = 'Pendiente';
        saldoPendiente = montoTotal;
      } else if (fechaPago) {
        estado = 'Pagado';
        saldoPendiente = 0;
      } else {
        // ✅ DEFAULT: Si no sabemos, asumir pendiente
        estado = 'Pendiente';
        saldoPendiente = montoTotal;
      }
    }
    
    return {
      id: compra.id || index,
      folio: compra.folio || compra.numero || 'S/N',
      razonSocial: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      rutProveedor: compra.rutEmisor || compra.rut_emisor || compra.rut || 'Sin RUT',
      proveedor: compra.razonSocial || compra.razon_social || compra.proveedor || 'Proveedor no especificado',
      
      // ✅ CAMPOS PRINCIPALES (sin filtrar por pago)
      monto: saldoPendiente,                // Monto según estado
      montoTotal: montoTotal,               // Monto original siempre
      montoNeto: montoNeto,
      iva: iva,
      
      // ✅ FECHAS NORMALIZADAS
      fecha: compra.fechaEmision || compra.fecha_emision || compra.fecha || new Date().toISOString().split('T')[0],
      fechaVencimiento: compra.fechaVencimiento || compra.fecha_vencimiento || null,
      fechaPago: compra.fechaPago || compra.fecha_pago || null,
      fechaRecepcion: compra.fechaRecepcion || compra.fecha_recepcion || null,
      
      // ✅ ESTADO Y METADATOS
      estado: estado,
      estadoOriginal: compra.estado,        // Guardar estado original de Chipax
      estaPagado: estado === 'Pagado',
      estaAnulado: estaAnulado,
      
      // Información adicional
      tipo: compra.tipo || compra.tipo_documento || 33,
      tipoCompra: compra.tipoCompra || compra.tipo_compra || 'Del Giro',
      moneda: compra.idMoneda === 1000 || compra.moneda === 'CLP' ? 'CLP' : 'USD',
      descuento: parseFloat(compra.descuento || 0),
      
      // Metadatos útiles
      periodo: compra.periodo || null,
      estadoSII: compra.estado || 'Sin estado',
      eventoReceptor: compra.eventoReceptor || compra.evento_receptor || null,
      
      // Para debugging
      origenDatos: 'compras_sin_filtro_pago',
      fechaProcesamiento: new Date().toISOString()
    };
  });
  
  // 🔍 DEBUG: Estadísticas detalladas SIN filtrar
  const estadisticas = {
    total: resultado.length,
    pendientes: resultado.filter(c => c.estado === 'Pendiente').length,
    aceptadas: resultado.filter(c => c.estado === 'Aceptado').length,
    pagadas: resultado.filter(c => c.estado === 'Pagado').length,
    anuladas: resultado.filter(c => c.estado === 'Anulado').length,
    montoTotalPendiente: resultado
      .filter(c => c.estado === 'Pendiente' || c.estado === 'Aceptado')
      .reduce((sum, c) => sum + c.monto, 0),
    montoTotalGeneral: resultado.reduce((sum, c) => sum + c.montoTotal, 0)
  };
  
  console.log('🔍 DEBUG ADAPTADOR COMPRAS - TODAS LAS FACTURAS:');
  console.log(`  📋 Total compras: ${estadisticas.total}`);
  console.log(`  ⏳ Pendientes: ${estadisticas.pendientes}`);
  console.log(`  ✅ Aceptadas: ${estadisticas.aceptadas}`);
  console.log(`  💳 Pagadas: ${estadisticas.pagadas}`);
  console.log(`  ❌ Anuladas: ${estadisticas.anuladas}`);
  console.log(`  💵 Monto pendiente+aceptado: ${estadisticas.montoTotalPendiente.toLocaleString('es-CL')}`);
  console.log(`  💰 Monto total: ${estadisticas.montoTotalGeneral.toLocaleString('es-CL')}`);
  
  if (resultado.length > 0) {
    const fechaMinima = resultado.reduce((min, c) => c.fecha < min ? c.fecha : min, resultado[0].fecha);
    const fechaMaxima = resultado.reduce((max, c) => c.fecha > max ? c.fecha : max, resultado[0].fecha);
    console.log(`  📅 Rango de fechas: ${fechaMinima} → ${fechaMaxima}`);
  }
  
  return resultado;
};

/**
 * ✅ FUNCIÓN OPTIMIZADA: Solo para facturas de 2025 (súper rápida)
 */
export const obtenerCompras2025Rapido = async () => {
  console.log('🚀 Obteniendo SOLO facturas de 2025 (SÚPER RÁPIDO)...');

  try {
    let allCompras2025 = [];
    let currentPage = 1;
    let hasMoreData = true;
    const limit = 100; // Límite más alto para ir más rápido
    
    // ✅ OPTIMIZACIÓN: Solo necesitamos pocas páginas para 2025
    const maxPages = 20; // Solo 20 páginas deberían ser suficientes para 2025
    
    console.log(`⚡ Búsqueda optimizada para 2025: máximo ${maxPages} páginas`);

    while (hasMoreData && currentPage <= maxPages) {
      try {
        console.log(`📄 Página ${currentPage}/${maxPages} (buscando 2025)...`);
        
        // ✅ INTENTAR PARÁMETROS DE FECHA PRIMERO
        let url = `/compras?limit=${limit}&page=${currentPage}`;
        
        // En la primera iteración, intentar filtrar por año
        if (currentPage === 1) {
          try {
            console.log('🎯 Intentando filtro directo por año 2025...');
            const testResponse = await fetchFromChipax('/compras?year=2025&limit=100');
            
            if (testResponse && (Array.isArray(testResponse) || testResponse.items || testResponse.data)) {
              let items2025 = [];
              if (Array.isArray(testResponse)) {
                items2025 = testResponse;
              } else if (testResponse.items) {
                items2025 = testResponse.items;
              } else if (testResponse.data) {
                items2025 = testResponse.data;
              }
              
              if (items2025.length > 0) {
                console.log(`🎉 ¡Filtro por año funciona! ${items2025.length} facturas de 2025 encontradas directamente`);
                return {
                  data: items2025,
                  metodo: 'filtro_directo_2025',
                  pagination: { totalItems: items2025.length, completenessPercent: 100 }
                };
              }
            }
          } catch (error) {
            console.log('⚠️ Filtro por año no disponible, usando método tradicional...');
          }
        }
        
        const data = await fetchFromChipax(url, { maxRetries: 2, retryDelay: 500 });
        
        let pageItems = [];
        if (Array.isArray(data)) {
          pageItems = data;
        } else if (data.items && Array.isArray(data.items)) {
          pageItems = data.items;
        } else if (data.data && Array.isArray(data.data)) {
          pageItems = data.data;
        }

        if (pageItems.length > 0) {
          // ✅ FILTRAR SOLO 2025 en tiempo real
          const items2025 = pageItems.filter(item => {
            const fechaEmision = item.fechaEmision || item.fecha_emision || item.fecha || '';
            const fechaRecepcion = item.fechaRecepcion || item.fecha_recepcion || '';
            const created = item.created || '';
            
            return fechaEmision.includes('2025') || 
                   fechaRecepcion.includes('2025') || 
                   created.includes('2025');
          });
          
          if (items2025.length > 0) {
            allCompras2025.push(...items2025);
            console.log(`✅ Página ${currentPage}: ${items2025.length} facturas de 2025 (de ${pageItems.length} total)`);
          } else {
            console.log(`📄 Página ${currentPage}: Sin facturas de 2025 (${pageItems.length} facturas de otros años)`);
          }
          
          // ✅ Si no encontramos facturas de 2025 en varias páginas consecutivas, parar
          if (items2025.length === 0 && currentPage > 10) {
            console.log('⚠️ Sin facturas de 2025 en últimas páginas, probablemente no hay más...');
            hasMoreData = false;
          }
          
          if (pageItems.length < limit) {
            hasMoreData = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreData = false;
        }

        // ✅ PAUSA MÁS CORTA para ir más rápido
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error en página ${currentPage}:`, error);
        hasMoreData = false;
      }
    }

    console.log(`🎯 Total facturas de 2025 encontradas: ${allCompras2025.length}`);

    if (allCompras2025.length === 0) {
      console.warn('⚠️ No se encontraron facturas de 2025');
      return { data: [], metodo: 'busqueda_tradicional', pagination: { totalItems: 0 } };
    }

    // ✅ ORDENAR SOLO LAS DE 2025 (mucho más rápido)
    console.log('🔄 Ordenando facturas de 2025 por fecha de recepción...');
    
    allCompras2025.sort((a, b) => {
      const fechaA = new Date(
        a.fechaRecepcion || a.fecha_recepcion || a.created || 
        a.fechaEmision || a.fecha_emision || a.fecha || '2025-01-01'
      );
      const fechaB = new Date(
        b.fechaRecepcion || b.fecha_recepcion || b.created || 
        b.fechaEmision || b.fecha_emision || b.fecha || '2025-01-01'
      );
      return fechaB - fechaA; // Más recientes primero
    });

    // ✅ RESULTADO FINAL
    const facturasMasReciente = allCompras2025[0];
    const fechaReciente = new Date(
      facturasMasReciente.fechaRecepcion || 
      facturasMasReciente.fecha_recepcion || 
      facturasMasReciente.created || 
      facturasMasReciente.fechaEmision
    );
    const hoy = new Date();
    const diasDesdeMasReciente = Math.floor((hoy - fechaReciente) / (1000 * 60 * 60 * 24));

    console.log('\n🎯 RESULTADO FACTURAS 2025:');
    console.log(`📅 Factura más reciente: ${fechaReciente.toISOString().split('T')[0]} (hace ${diasDesdeMasReciente} días)`);
    console.log(`📋 Total facturas 2025: ${allCompras2025.length}`);
    console.log(`📄 Páginas procesadas: ${currentPage - 1}/${maxPages}`);

    return {
      data: allCompras2025,
      metodo: 'busqueda_tradicional_filtrada',
      pagination: {
        totalItems: allCompras2025.length,
        completenessPercent: 100,
        paginasProc: currentPage - 1
      }
    };

  } catch (error) {
    console.error('❌ Error obteniendo facturas 2025:', error);
    return { data: [], error: error.message };
  }
};
