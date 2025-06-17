// src/services/chipaxService.js
// Servicio completo para integración con API Chipax - Versión Corregida

class ChipaxService {
  constructor() {
    // Configuración de la API
    this.baseURL = process.env.NODE_ENV === 'development' 
      ? '/v2' // Usar proxy en desarrollo
      : 'https://api.chipax.com/v2'; // URL directa en producción
    
    this.appId = process.env.REACT_APP_CHIPAX_APP_ID;
    this.appSecret = process.env.REACT_APP_CHIPAX_APP_SECRET;
    
    // Estado del token
    this.currentToken = null;
    this.tokenExpiry = null;
    this.isRefreshingToken = false;
    this.pendingRequests = [];
    
    console.log('🚀 ChipaxService inicializado');
    console.log('🔧 Base URL:', this.baseURL);
    console.log('🔑 APP_ID configurado:', this.appId ? 'Sí' : 'No');
  }

  // ==========================================
  // GESTIÓN DE TOKENS
  // ==========================================

  /**
   * Obtiene un token de acceso válido
   */
  async getChipaxToken() {
    try {
      // Si tenemos un token válido, lo retornamos
      if (this.currentToken && this.isTokenValid()) {
        console.log('🔑 Usando token existente válido');
        return this.currentToken;
      }

      // Si ya estamos renovando el token, esperamos
      if (this.isRefreshingToken) {
        console.log('⏳ Esperando renovación de token en curso...');
        return new Promise((resolve, reject) => {
          this.pendingRequests.push({ resolve, reject });
        });
      }

      // Obtener nuevo token
      return await this.refreshToken();
    } catch (error) {
      console.error('❌ Error obteniendo token:', error);
      throw error;
    }
  }

  /**
   * Renueva el token de acceso
   */
  async refreshToken() {
    if (this.isRefreshingToken) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push({ resolve, reject });
      });
    }

    this.isRefreshingToken = true;
    console.log('🔐 Obteniendo nuevo token de Chipax...');

    try {
      if (!this.appId || !this.appSecret) {
        throw new Error('APP_ID o APP_SECRET no configurados');
      }

      console.log('🔑 APP_ID:', this.appId.substring(0, 8) + '...');

      const response = await fetch(`${this.baseURL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret,
        }),
      });

      console.log('📡 Respuesta status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en autenticación:', errorText);
        throw new Error(`Error de autenticación: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta exitosa:', data);

      if (!data.access_token) {
        throw new Error('Token no recibido en la respuesta');
      }

      // Guardar token y calcular expiración
      this.currentToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
      
      console.log('✅ Token obtenido exitosamente');
      console.log('⏰ Expira:', this.tokenExpiry.toLocaleString());

      // Resolver requests pendientes
      this.pendingRequests.forEach(({ resolve }) => resolve(this.currentToken));
      this.pendingRequests = [];

      return this.currentToken;
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      
      // Rechazar requests pendientes
      this.pendingRequests.forEach(({ reject }) => reject(error));
      this.pendingRequests = [];
      
      throw error;
    } finally {
      this.isRefreshingToken = false;
    }
  }

  /**
   * Verifica si el token actual es válido
   */
  isTokenValid() {
    if (!this.currentToken || !this.tokenExpiry) {
      return false;
    }
    
    // Consideramos inválido si expira en menos de 5 minutos
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.tokenExpiry > fiveMinutesFromNow;
  }

  /**
   * Invalida el token actual (forzar renovación)
   */
  invalidateToken() {
    console.log('🔄 Invalidando token actual');
    this.currentToken = null;
    this.tokenExpiry = null;
  }

  // ==========================================
  // MÉTODOS DE API GENÉRICOS
  // ==========================================

  /**
   * Realiza una petición autenticada a la API
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      const token = await this.getChipaxToken();
      
      const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const requestOptions = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      console.log('📡 Realizando petición a:', endpoint);
      const response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);

      // Si recibimos 401, el token puede haber expirado
      if (response.status === 401) {
        console.log('🔄 Error 401 detectado');
        console.log('🔄 Invalidando token y reintentando...');
        
        this.invalidateToken();
        
        // Reintentar una vez con nuevo token
        const newToken = await this.getChipaxToken();
        const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
          ...requestOptions,
          headers: {
            ...requestOptions.headers,
            'Authorization': `Bearer ${newToken}`,
          },
        });

        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          console.error('❌ Error después del reintento:', errorText);
          throw new Error(`Error ${retryResponse.status}: ${errorText}`);
        }

        return retryResponse;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en petición:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      return response;
    } catch (error) {
      console.error('❌ Error en petición autenticada:', error);
      throw error;
    }
  }

  /**
   * Carga datos con paginación automática
   */
  async loadPaginatedData(endpoint, options = {}) {
    console.log('📄 Iniciando carga paginada de:', endpoint);
    
    let allData = [];
    let currentPage = 1;
    let hasMorePages = true;
    const maxPages = options.maxPages || 50; // Límite de seguridad

    try {
      while (hasMorePages && currentPage <= maxPages) {
        console.log(`📄 Cargando página ${currentPage}...`);
        
        // Construir URL con parámetros de paginación
        const separator = endpoint.includes('?') ? '&' : '?';
        const paginatedEndpoint = `${endpoint}${separator}page=${currentPage}`;
        
        const response = await this.makeAuthenticatedRequest(paginatedEndpoint);
        const data = await response.json();

        console.log(`✅ Página ${currentPage} cargada:`, {
          items: data.data ? data.data.length : 0,
          totalItems: data.total || 'N/A',
          currentPage: data.current_page || currentPage,
          lastPage: data.last_page || 'N/A'
        });

        // Agregar datos de esta página
        if (data.data && Array.isArray(data.data)) {
          allData.push(...data.data);
        } else if (Array.isArray(data)) {
          // Algunas APIs retornan el array directamente
          allData.push(...data);
          hasMorePages = false; // Si no hay metadata, asumimos que no hay más páginas
        } else {
          console.warn('⚠️ Estructura de datos inesperada:', data);
          break;
        }

        // Verificar si hay más páginas
        if (data.current_page && data.last_page) {
          hasMorePages = data.current_page < data.last_page;
        } else if (data.next_page_url) {
          hasMorePages = !!data.next_page_url;
        } else {
          // Si no hay metadata de paginación, intentar detectar si hay más datos
          hasMorePages = data.data && data.data.length > 0 && data.data.length >= 10;
        }

        currentPage++;
        
        // Pausa breve para no sobrecargar la API
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Carga paginada completada: ${allData.length} items en ${currentPage - 1} páginas`);
      return allData;
    } catch (error) {
      console.error('❌ Error en carga paginada:', error);
      throw error;
    }
  }

  // ==========================================
  // MÓDULOS ESPECÍFICOS DE DATOS
  // ==========================================

  // Módulo de Banco
  Banco = {
    /**
     * Obtiene saldos bancarios
     */
    getSaldosBancarios: async () => {
      try {
        console.log('🏦 Obteniendo saldos bancarios...');
        const response = await this.makeAuthenticatedRequest('/cuentas_bancarias');
        const data = await response.json();
        
        console.log('✅ Saldos bancarios obtenidos:', data.length || 0, 'cuentas');
        return data;
      } catch (error) {
        console.error('❌ Error obteniendo saldos bancarios:', error);
        throw error;
      }
    },

    /**
     * Obtiene movimientos bancarios
     */
    getMovimientosBancarios: async (fechaDesde, fechaHasta, cuentaId = null) => {
      try {
        console.log('💰 Obteniendo movimientos bancarios...');
        
        let endpoint = `/movimientos_bancarios?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
        if (cuentaId) {
          endpoint += `&cuenta_bancaria_id=${cuentaId}`;
        }
        
        const movimientos = await this.loadPaginatedData(endpoint);
        console.log('✅ Movimientos bancarios obtenidos:', movimientos.length);
        return movimientos;
      } catch (error) {
        console.error('❌ Error obteniendo movimientos bancarios:', error);
        throw error;
      }
    }
  };

  // Módulo de Facturación
  Facturacion = {
    /**
     * Obtiene cuentas por cobrar (DTEs pendientes de cobro)
     */
    getCuentasPorCobrar: async () => {
      try {
        console.log('💸 Obteniendo cuentas por cobrar...');
        
        // CORRECCIÓN PRINCIPAL: Usar el endpoint correcto para cuentas por cobrar
        // El problema era que estábamos usando /dtes?porCobrar=1
        // Pero el endpoint correcto debe ser uno de estos:
        const endpoint = '/dtes/por_cobrar'; // O '/cuentas_por_cobrar' dependiendo de la API
        
        const cuentas = await this.loadPaginatedData(endpoint);
        console.log('✅ Cuentas por cobrar obtenidas:', cuentas.length);
        return cuentas;
      } catch (error) {
        // Si el endpoint anterior falla, intentar con alternativas
        console.warn('⚠️ Endpoint principal falló, intentando alternativas...');
        
        try {
          // Intento 1: Endpoint alternativo
          const cuentas1 = await this.loadPaginatedData('/cuentas_por_cobrar');
          console.log('✅ Cuentas por cobrar obtenidas (alt 1):', cuentas1.length);
          return cuentas1;
        } catch (error1) {
          try {
            // Intento 2: DTEs con filtro específico
            const cuentas2 = await this.loadPaginatedData('/dtes?estado=pendiente&tipo=factura');
            console.log('✅ Cuentas por cobrar obtenidas (alt 2):', cuentas2.length);
            return cuentas2;
          } catch (error2) {
            console.error('❌ Error obteniendo cuentas por cobrar con todos los métodos:', error2);
            throw new Error(`No se pudieron obtener las cuentas por cobrar. Errores: ${error.message}, ${error1.message}, ${error2.message}`);
          }
        }
      }
    },

    /**
     * Obtiene cuentas por pagar (DTEs pendientes de pago)
     */
    getCuentasPorPagar: async () => {
      try {
        console.log('💰 Obteniendo cuentas por pagar...');
        
        // Similar corrección para cuentas por pagar
        const endpoint = '/dtes/por_pagar'; // O '/cuentas_por_pagar'
        
        const cuentas = await this.loadPaginatedData(endpoint);
        console.log('✅ Cuentas por pagar obtenidas:', cuentas.length);
        return cuentas;
      } catch (error) {
        // Intentos alternativos
        console.warn('⚠️ Endpoint principal falló, intentando alternativas...');
        
        try {
          const cuentas1 = await this.loadPaginatedData('/cuentas_por_pagar');
          console.log('✅ Cuentas por pagar obtenidas (alt 1):', cuentas1.length);
          return cuentas1;
        } catch (error1) {
          try {
            const cuentas2 = await this.loadPaginatedData('/dtes?estado=recibido&tipo=factura_compra');
            console.log('✅ Cuentas por pagar obtenidas (alt 2):', cuentas2.length);
            return cuentas2;
          } catch (error2) {
            console.error('❌ Error obteniendo cuentas por pagar:', error2);
            throw error2;
          }
        }
      }
    },

    /**
     * Obtiene facturas pendientes de aprobación
     */
    getFacturasPendientes: async () => {
      try {
        console.log('📋 Obteniendo facturas pendientes...');
        const facturas = await this.loadPaginatedData('/dtes?estado=pendiente_aprobacion');
        console.log('✅ Facturas pendientes obtenidas:', facturas.length);
        return facturas;
      } catch (error) {
        console.error('❌ Error obteniendo facturas pendientes:', error);
        throw error;
      }
    }
  };

  // ==========================================
  // MÉTODOS DE UTILIDAD Y DEBUG
  // ==========================================

  /**
   * Prueba la conexión con la API
   */
  async testConnection() {
    try {
      console.log('🔍 Probando conexión con Chipax API...');
      
      const token = await this.getChipaxToken();
      console.log('✅ Token obtenido correctamente');
      
      // Probar endpoint básico
      const response = await this.makeAuthenticatedRequest('/empresas');
      const data = await response.json();
      
      console.log('✅ Conexión exitosa:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error en prueba de conexión:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene información de debug sobre el estado del servicio
   */
  getDebugInfo() {
    return {
      baseURL: this.baseURL,
      hasAppId: !!this.appId,
      hasAppSecret: !!this.appSecret,
      hasToken: !!this.currentToken,
      tokenValid: this.isTokenValid(),
      tokenExpiry: this.tokenExpiry,
      isRefreshing: this.isRefreshingToken,
      pendingRequests: this.pendingRequests.length
    };
  }
}

// Crear instancia singleton
const chipaxService = new ChipaxService();

export default chipaxService;
