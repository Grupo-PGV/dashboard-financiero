// chipaxSaldosInvestigator.js - Servicio especializado para encontrar saldos reales

import { getChipaxToken } from './chipaxService';

const CHIPAX_API_URL = 'https://api.chipax.com/v2';

/**
 * Investigador avanzado de saldos bancarios
 * Prueba múltiples estrategias para encontrar los saldos reales
 */
export class ChipaxSaldosInvestigator {
  
  /**
   * Estrategia 1: Obtener saldos desde cartolas (método más confiable)
   */
  static async obtenerSaldosDesdeCartolas() {
    console.log('🔍 Estrategia 1: Analizando cartolas para obtener saldos...');
    
    try {
      const token = await getChipaxToken();
      const response = await fetch(`${CHIPAX_API_URL}/cartolas`, {
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error en cartolas: ${response.status}`);
      }

      const cartolas = await response.json();
      console.log(`📊 ${cartolas.length} cartolas encontradas`);

      // Agrupar por cuenta corriente y obtener el saldo más reciente
      const saldosPorCuenta = {};
      
      cartolas.forEach(cartola => {
        const cuentaId = cartola.cuentaCorriente;
        const fecha = new Date(cartola.fecha);
        
        if (!saldosPorCuenta[cuentaId] || 
            new Date(saldosPorCuenta[cuentaId].fecha) < fecha) {
          saldosPorCuenta[cuentaId] = {
            cuentaId,
            banco: cartola.banco || 'Sin especificar',
            numeroCuenta: cartola.numeroCuenta || cartola.numero,
            saldo: cartola.saldo || 0,
            fecha: cartola.fecha,
            origen: 'cartola_mas_reciente'
          };
        }
      });

      const saldosEncontrados = Object.values(saldosPorCuenta);
      console.log(`✅ ${saldosEncontrados.length} saldos únicos extraídos de cartolas`);
      
      return saldosEncontrados;

    } catch (error) {
      console.error('❌ Error en estrategia cartolas:', error);
      return null;
    }
  }

  /**
   * Estrategia 2: Calcular saldos desde movimientos bancarios
   */
  static async calcularSaldosDesdeMovimientos() {
    console.log('🔍 Estrategia 2: Calculando saldos desde movimientos...');
    
    try {
      const token = await getChipaxToken();
      
      // Obtener cuentas corrientes
      const cuentasResponse = await fetch(`${CHIPAX_API_URL}/cuentas-corrientes`, {
        headers: {
          'Authorization': `JWT ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!cuentasResponse.ok) {
        throw new Error(`Error obteniendo cuentas: ${cuentasResponse.status}`);
      }

      const cuentas = await cuentasResponse.json();
      console.log(`📋 ${cuentas.length} cuentas corrientes encontradas`);

      // Para cada cuenta, calcular saldo desde movimientos
      const saldosCalculados = [];

      for (const cuenta of cuentas) {
        try {
          // Obtener movimientos de esta cuenta
          const movimientosResponse = await fetch(
            `${CHIPAX_API_URL}/flujo-caja?cuentaCorriente=${cuenta.id}`, {
            headers: {
              'Authorization': `JWT ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (movimientosResponse.ok) {
            const movimientos = await movimientosResponse.json();
            
            // Calcular saldo sumando ingresos y restando egresos
            let saldoCalculado = 0;
            movimientos.forEach(mov => {
              if (mov.tipo === 'ingreso') {
                saldoCalculado += mov.monto || 0;
              } else if (mov.tipo === 'egreso') {
                saldoCalculado -= mov.monto || 0;
              }
            });

            saldosCalculados.push({
              cuentaId: cuenta.id,
              numeroCuenta: cuenta.numero || cuenta.numeroCuenta,
              banco: cuenta.banco || 'Sin especificar',
              saldo: saldoCalculado,
              movimientosProcesados: movimientos.length,
              origen: 'calculado_desde_movimientos'
            });

            console.log(`💰 Cuenta ${cuenta.numero}: $${saldoCalculado.toLocaleString()}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error procesando cuenta ${cuenta.id}:`, error.message);
        }
      }

      return saldosCalculados;

    } catch (error) {
      console.error('❌ Error en estrategia movimientos:', error);
      return null;
    }
  }

  /**
   * Estrategia 3: Buscar endpoints alternativos de saldos
   */
  static async buscarEndpointsAlternativos() {
    console.log('🔍 Estrategia 3: Buscando endpoints alternativos...');
    
    const endpointsAlternativos = [
      '/saldos',
      '/balances',
      '/cuentas-corrientes/saldos',
      '/bancos/saldos',
      '/tesoreria/saldos',
      '/finanzas/saldos',
      '/dashboard/saldos',
      '/empresa/saldos',
      '/resumen-financiero'
    ];

    const token = await getChipaxToken();
    const resultados = [];

    for (const endpoint of endpointsAlternativos) {
      try {
        const response = await fetch(`${CHIPAX_API_URL}${endpoint}`, {
          headers: {
            'Authorization': `JWT ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          resultados.push({
            endpoint,
            status: response.status,
            tieneContenido: Array.isArray(data) ? data.length > 0 : !!data,
            muestra: Array.isArray(data) ? data[0] : data,
            tipo: typeof data
          });

          console.log(`✅ ${endpoint}: ${response.status} - Contenido encontrado`);
        } else {
          console.log(`❌ ${endpoint}: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: Error - ${error.message}`);
      }

      // Pausa entre requests para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return resultados;
  }

  /**
   * Método principal: Ejecuta todas las estrategias y devuelve la mejor
   */
  static async investigarSaldosCompleto() {
    console.log('🚀 INICIANDO INVESTIGACIÓN COMPLETA DE SALDOS');
    
    const resultados = {
      cartolas: null,
      movimientos: null,
      endpointsAlternativos: null,
      mejorOpcion: null,
      resumen: null
    };

    // Ejecutar todas las estrategias
    resultados.cartolas = await this.obtenerSaldosDesdeCartolas();
    resultados.movimientos = await this.calcularSaldosDesdeMovimientos();
    resultados.endpointsAlternativos = await this.buscarEndpointsAlternativos();

    // Determinar la mejor opción
    if (resultados.cartolas && resultados.cartolas.length > 0) {
      resultados.mejorOpcion = 'cartolas';
      console.log('🎯 Mejor opción: Saldos desde cartolas');
    } else if (resultados.movimientos && resultados.movimientos.length > 0) {
      resultados.mejorOpcion = 'movimientos';
      console.log('🎯 Mejor opción: Saldos calculados desde movimientos');
    } else {
      resultados.mejorOpcion = 'ninguna';
      console.log('⚠️ No se encontraron saldos confiables');
    }

    // Generar resumen
    resultados.resumen = {
      saldosCartolas: resultados.cartolas?.length || 0,
      saldosMovimientos: resultados.movimientos?.length || 0,
      endpointsEncontrados: resultados.endpointsAlternativos?.filter(e => e.tieneContenido).length || 0,
      recomendacion: resultados.mejorOpcion
    };

    console.log('📊 Resumen de investigación:', resultados.resumen);
    return resultados;
  }

  /**
   * Obtiene los saldos usando la mejor estrategia disponible
   */
  static async obtenerSaldosOptimizados() {
    const investigacion = await this.investigarSaldosCompleto();
    
    switch (investigacion.mejorOpcion) {
      case 'cartolas':
        return investigacion.cartolas;
      case 'movimientos':
        return investigacion.movimientos;
      default:
        console.warn('⚠️ No hay saldos disponibles, retornando array vacío');
        return [];
    }
  }
}

export default ChipaxSaldosInvestigator;
