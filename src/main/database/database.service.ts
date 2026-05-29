import { Injectable, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';

export interface FacturaGuardada {
  id?: number;
  // Datos de AFIP
  cae: string;
  caeVencimiento: string;
  fechaProceso: string;
  ptoVta: number;
  cbteTipo: number;
  cbteDesde: number;
  cbteHasta: number;
  docTipo: number;
  docNro: number;
  impTotal: number;
  impNeto: number;
  impIVA: number;
  
  // Datos adicionales del formulario
  tipoFactura: 'A' | 'B';
  concepto: string;
  condicionIVA: string;
  condicionVenta: string;
  razonSocial?: string;
  domicilio?: string;
  
  // Artículos (JSON)
  articulos: string; // JSON.stringify de los artículos
  
  // IVAs agrupados (JSON)
  ivas: string; // JSON.stringify de los IVAs
  
  // Datos del emisor (JSON)
  datosEmisor: string; // JSON.stringify de los datos del emisor
  
  // Path del PDF generado
  pdfPath?: string;
  
  // Flag para diferenciar tickets de facturas B
  esTicket?: boolean;
  
  // Metadata
  createdAt?: string;
}

export interface CaiRemitoGuardado {
  id?: number;
  cai: string;
  puntoVenta: number;
  numeroDesde: number;
  numeroHasta: number;
  proximoNumero: number;
  fechaVencimiento: string;
  activo: boolean | number;
  createdAt?: string;
}

export interface RemitoGuardado {
  id?: number;
  puntoVenta: number;
  numero: number;
  fecha: string;
  cliente: string;
  docTipo: number;
  docNro: number;
  razonSocial: string;
  domicilio: string;
  items: string;
  cai: string;
  caiVencimiento: string;
  estado: 'emitido' | 'anulado';
  createdAt?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: Database.Database;

  onModuleInit() {
    this.initDatabase();
  }

  private initDatabase() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'facturas.db');
    
    console.log('Inicializando base de datos en:', dbPath);
    
    this.db = new Database(dbPath);
    
    // Habilitar foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Crear tabla de facturas si no existe
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS facturas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cae TEXT NOT NULL,
        caeVencimiento TEXT NOT NULL,
        fechaProceso TEXT NOT NULL,
        ptoVta INTEGER NOT NULL,
        cbteTipo INTEGER NOT NULL,
        cbteDesde INTEGER NOT NULL,
        cbteHasta INTEGER NOT NULL,
        docTipo INTEGER NOT NULL,
        docNro INTEGER NOT NULL,
        impTotal REAL NOT NULL,
        impNeto REAL NOT NULL,
        impIVA REAL NOT NULL,
        tipoFactura TEXT NOT NULL,
        concepto TEXT NOT NULL,
        condicionIVA TEXT NOT NULL,
        condicionVenta TEXT NOT NULL,
        razonSocial TEXT,
        domicilio TEXT,
        articulos TEXT NOT NULL,
        ivas TEXT NOT NULL,
        datosEmisor TEXT NOT NULL,
        pdfPath TEXT,
        esTicket INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cai_remitos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cai TEXT NOT NULL,
        puntoVenta INTEGER NOT NULL,
        numeroDesde INTEGER NOT NULL,
        numeroHasta INTEGER NOT NULL,
        proximoNumero INTEGER NOT NULL,
        fechaVencimiento TEXT NOT NULL,
        activo INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS remitos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        puntoVenta INTEGER NOT NULL,
        numero INTEGER NOT NULL,
        fecha TEXT NOT NULL,
        cliente TEXT NOT NULL,
        docTipo INTEGER NOT NULL DEFAULT 80,
        docNro INTEGER NOT NULL DEFAULT 0,
        razonSocial TEXT NOT NULL DEFAULT '',
        domicilio TEXT NOT NULL DEFAULT '',
        items TEXT NOT NULL,
        cai TEXT NOT NULL,
        caiVencimiento TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'emitido',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(puntoVenta, numero)
      )
    `);
    
    // Migración: agregar columna esTicket si no existe
    try {
      this.db.exec(`
        ALTER TABLE facturas ADD COLUMN esTicket INTEGER DEFAULT 0;
      `);
      console.log('✅ Columna esTicket agregada a la tabla facturas');
    } catch (error) {
      // La columna ya existe, ignorar el error
      if (!error.message.includes('duplicate column name')) {
        console.error('Error al agregar columna esTicket:', error);
      }
    }

    // Migración: agregar datos de cliente al remito si no existen
    for (const statement of [
      'ALTER TABLE remitos ADD COLUMN docTipo INTEGER NOT NULL DEFAULT 80;',
      'ALTER TABLE remitos ADD COLUMN docNro INTEGER NOT NULL DEFAULT 0;',
      "ALTER TABLE remitos ADD COLUMN razonSocial TEXT NOT NULL DEFAULT '';",
      "ALTER TABLE remitos ADD COLUMN domicilio TEXT NOT NULL DEFAULT '';",
    ]) {
      try {
        this.db.exec(statement);
      } catch (error: any) {
        if (!error.message.includes('duplicate column name'))
          console.error('Error al migrar remitos:', error);
      }
    }
    
    // Crear índices para búsquedas más rápidas
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_facturas_fechaProceso ON facturas(fechaProceso);
      CREATE INDEX IF NOT EXISTS idx_facturas_docNro ON facturas(docNro);
      CREATE INDEX IF NOT EXISTS idx_facturas_cae ON facturas(cae);
      CREATE INDEX IF NOT EXISTS idx_facturas_ptoVta ON facturas(ptoVta);
      CREATE INDEX IF NOT EXISTS idx_facturas_cbteTipo ON facturas(cbteTipo);
      CREATE INDEX IF NOT EXISTS idx_cai_remitos_ptovta ON cai_remitos(puntoVenta);
      CREATE INDEX IF NOT EXISTS idx_cai_remitos_activo ON cai_remitos(activo);
      CREATE INDEX IF NOT EXISTS idx_remitos_ptovta_numero ON remitos(puntoVenta, numero);
      CREATE INDEX IF NOT EXISTS idx_remitos_fecha ON remitos(fecha);
    `);
    
    console.log('✅ Base de datos inicializada correctamente');
  }

  /**
   * Guardar una factura en la base de datos
   */
  guardarFactura(factura: FacturaGuardada): number {
    const stmt = this.db.prepare(`
      INSERT INTO facturas (
        cae, caeVencimiento, fechaProceso, ptoVta, cbteTipo, cbteDesde, cbteHasta,
        docTipo, docNro, impTotal, impNeto, impIVA, tipoFactura, concepto,
        condicionIVA, condicionVenta, razonSocial, domicilio, articulos, ivas, datosEmisor, pdfPath, esTicket
      ) VALUES (
        @cae, @caeVencimiento, @fechaProceso, @ptoVta, @cbteTipo, @cbteDesde, @cbteHasta,
        @docTipo, @docNro, @impTotal, @impNeto, @impIVA, @tipoFactura, @concepto,
        @condicionIVA, @condicionVenta, @razonSocial, @domicilio, @articulos, @ivas, @datosEmisor, @pdfPath, @esTicket
      )
    `);
    
    // Asegurar que pdfPath y esTicket estén presentes
    const facturaConDefaults = {
      ...factura,
      pdfPath: factura.pdfPath || null,
      esTicket: factura.esTicket ? 1 : 0, // Convertir boolean a INTEGER
    };
    
    const result = stmt.run(facturaConDefaults);
    return result.lastInsertRowid as number;
  }

  /**
   * Obtener todas las facturas con filtros opcionales
   */
  obtenerFacturas(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    docNro?: number;
    docTipo?: number;
    ptoVta?: number;
    cbteTipo?: number;
    limit?: number;
    offset?: number;
  }): FacturaGuardada[] {
    let query = 'SELECT * FROM facturas WHERE 1=1';
    const params: any = {};

    if (filtros?.fechaDesde) {
      query += ' AND DATE(fechaProceso) >= DATE(@fechaDesde)';
      params.fechaDesde = filtros.fechaDesde;
    }

    if (filtros?.fechaHasta) {
      query += ' AND DATE(fechaProceso) <= DATE(@fechaHasta)';
      params.fechaHasta = filtros.fechaHasta;
    }

    if (filtros?.docNro) {
      query += ' AND docNro = @docNro';
      params.docNro = filtros.docNro;
    }

    if (filtros?.docTipo) {
      query += ' AND docTipo = @docTipo';
      params.docTipo = filtros.docTipo;
    }

    if (filtros?.ptoVta) {
      query += ' AND ptoVta = @ptoVta';
      params.ptoVta = filtros.ptoVta;
    }

    if (filtros?.cbteTipo) {
      query += ' AND cbteTipo = @cbteTipo';
      params.cbteTipo = filtros.cbteTipo;
    }

    query += ' ORDER BY fechaProceso DESC, id DESC';

    if (filtros?.limit) {
      query += ' LIMIT @limit';
      params.limit = filtros.limit;
    }

    if (filtros?.offset) {
      query += ' OFFSET @offset';
      params.offset = filtros.offset;
    }

    const stmt = this.db.prepare(query);
    return stmt.all(params) as FacturaGuardada[];
  }

  /**
   * Obtener una factura por ID
   */
  obtenerFacturaPorId(id: number): FacturaGuardada | undefined {
    const stmt = this.db.prepare('SELECT * FROM facturas WHERE id = ?');
    return stmt.get(id) as FacturaGuardada | undefined;
  }

  /**
   * Obtener una factura por CAE
   */
  obtenerFacturaPorCAE(cae: string): FacturaGuardada | undefined {
    const stmt = this.db.prepare('SELECT * FROM facturas WHERE cae = ?');
    return stmt.get(cae) as FacturaGuardada | undefined;
  }

  /**
   * Contar facturas con filtros opcionales
   */
  contarFacturas(filtros?: {
    fechaDesde?: string;
    fechaHasta?: string;
    docNro?: number;
    docTipo?: number;
    ptoVta?: number;
    cbteTipo?: number;
  }): number {
    let query = 'SELECT COUNT(*) as count FROM facturas WHERE 1=1';
    const params: any = {};

    if (filtros?.fechaDesde) {
      query += ' AND DATE(fechaProceso) >= DATE(@fechaDesde)';
      params.fechaDesde = filtros.fechaDesde;
    }

    if (filtros?.fechaHasta) {
      query += ' AND DATE(fechaProceso) <= DATE(@fechaHasta)';
      params.fechaHasta = filtros.fechaHasta;
    }

    if (filtros?.docNro) {
      query += ' AND docNro = @docNro';
      params.docNro = filtros.docNro;
    }

    if (filtros?.docTipo) {
      query += ' AND docTipo = @docTipo';
      params.docTipo = filtros.docTipo;
    }

    if (filtros?.ptoVta) {
      query += ' AND ptoVta = @ptoVta';
      params.ptoVta = filtros.ptoVta;
    }

    if (filtros?.cbteTipo) {
      query += ' AND cbteTipo = @cbteTipo';
      params.cbteTipo = filtros.cbteTipo;
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(params) as { count: number };
    return result.count;
  }

  /**
   * Eliminar una factura por ID
   */
  eliminarFactura(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM facturas WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Actualizar el path del PDF de una factura
   */
  actualizarPdfPath(id: number, pdfPath: string): boolean {
    const stmt = this.db.prepare('UPDATE facturas SET pdfPath = ? WHERE id = ?');
    const result = stmt.run(pdfPath, id);
    return result.changes > 0;
  }

  guardarCaiRemito(cai: CaiRemitoGuardado): number {
    const stmt = this.db.prepare(`
      INSERT INTO cai_remitos (
        cai, puntoVenta, numeroDesde, numeroHasta, proximoNumero, fechaVencimiento, activo
      ) VALUES (
        @cai, @puntoVenta, @numeroDesde, @numeroHasta, @proximoNumero, @fechaVencimiento, @activo
      )
    `)

    const result = stmt.run({
      ...cai,
      proximoNumero: cai.proximoNumero || cai.numeroDesde,
      activo: cai.activo ? 1 : 0,
    })

    return result.lastInsertRowid as number
  }

  actualizarCaiRemito(id: number, cai: CaiRemitoGuardado): boolean {
    const actual = this.db.prepare('SELECT proximoNumero FROM cai_remitos WHERE id = ?').get(id) as { proximoNumero?: number } | undefined

    const stmt = this.db.prepare(`
      UPDATE cai_remitos
      SET cai = @cai,
          puntoVenta = @puntoVenta,
          numeroDesde = @numeroDesde,
          numeroHasta = @numeroHasta,
          proximoNumero = @proximoNumero,
          fechaVencimiento = @fechaVencimiento,
          activo = @activo
      WHERE id = @id
    `)

    const result = stmt.run({
      id,
      ...cai,
      proximoNumero: actual?.proximoNumero ?? cai.proximoNumero ?? cai.numeroDesde,
      activo: cai.activo ? 1 : 0,
    })

    return result.changes > 0
  }

  obtenerCaiRemitos(filtros?: { puntoVenta?: number; activo?: boolean }): CaiRemitoGuardado[] {
    let query = 'SELECT * FROM cai_remitos WHERE 1=1'
    const params: any = {}

    if (typeof filtros?.puntoVenta === 'number') {
      query += ' AND puntoVenta = @puntoVenta'
      params.puntoVenta = filtros.puntoVenta
    }

    if (typeof filtros?.activo === 'boolean') {
      query += ' AND activo = @activo'
      params.activo = filtros.activo ? 1 : 0
    }

    query += ' ORDER BY fechaVencimiento ASC, id DESC'

    const stmt = this.db.prepare(query)
    return stmt.all(params) as CaiRemitoGuardado[]
  }

  obtenerCaiRemitoVigente(puntoVenta: number, fechaActual = new Date()): CaiRemitoGuardado | undefined {
    const fechaISO = fechaActual.toISOString().slice(0, 10)
    const stmt = this.db.prepare(`
      SELECT *
      FROM cai_remitos
      WHERE puntoVenta = ?
        AND activo = 1
        AND DATE(fechaVencimiento) >= DATE(?)
        AND proximoNumero <= numeroHasta
      ORDER BY DATE(fechaVencimiento) ASC, id DESC
      LIMIT 1
    `)

    return stmt.get(puntoVenta, fechaISO) as CaiRemitoGuardado | undefined
  }

  calcularNumerosDisponibles(caiId: number): number {
    const stmt = this.db.prepare('SELECT numeroHasta, proximoNumero FROM cai_remitos WHERE id = ?')
    const cai = stmt.get(caiId) as { numeroHasta: number; proximoNumero: number } | undefined

    if (!cai)
      return 0

    return Math.max(0, cai.numeroHasta - cai.proximoNumero + 1)
  }

  obtenerAlertasCaiRemitos(puntoVenta?: number): Array<{ id: number; tipo: 'vencimiento' | 'agotado'; cai: string; mensaje: string }> {
    let query = 'SELECT * FROM cai_remitos WHERE activo = 1'
    const params: any = {}

    if (typeof puntoVenta === 'number') {
      query += ' AND puntoVenta = @puntoVenta'
      params.puntoVenta = puntoVenta
    }

    const cais = this.db.prepare(query).all(params) as CaiRemitoGuardado[]
    const hoy = new Date()
    const alertas: Array<{ id: number; tipo: 'vencimiento' | 'agotado'; cai: string; mensaje: string }> = []

    for (const cai of cais) {
      const fechaVencimiento = new Date(cai.fechaVencimiento)
      const diasRestantes = Math.ceil((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      const disponibles = this.calcularNumerosDisponibles(cai.id!)

      if (diasRestantes <= 15) {
        alertas.push({
          id: cai.id!,
          tipo: 'vencimiento',
          cai: cai.cai,
          mensaje: `El CAI ${cai.cai} vence en ${Math.max(0, diasRestantes)} días`,
        })
      }

      if (disponibles <= 10) {
        alertas.push({
          id: cai.id!,
          tipo: 'agotado',
          cai: cai.cai,
          mensaje: `El CAI ${cai.cai} tiene solo ${disponibles} números disponibles`,
        })
      }
    }

    return alertas
  }

  emitirRemito(data: {
    puntoVenta: number
    fecha?: string
    docTipo: number
    docNro: number
    razonSocial: string
    domicilio: string
    cliente: string
    items: Array<{
      descripcion: string
      cantidad: number
      unidadMedida: string
    }>
    }): { remito: RemitoGuardado; cai: CaiRemitoGuardado } {
    const fechaActual = (data.fecha || new Date().toISOString()).slice(0, 10)
    const transaction = this.db.transaction(() => {
      const cai = this.obtenerCaiRemitoVigente(data.puntoVenta, new Date(fechaActual))

      if (!cai) {
        throw new Error('No existe un CAI activo válido para ese punto de venta')
      }

      if (new Date(cai.fechaVencimiento).getTime() < new Date(fechaActual).getTime()) {
        throw new Error('El CAI está vencido')
      }

      if (cai.proximoNumero > cai.numeroHasta) {
        throw new Error('El rango de numeración está agotado')
      }

      let numero = cai.proximoNumero
      const existeRemito = this.db.prepare(`
        SELECT 1
        FROM remitos
        WHERE puntoVenta = ? AND numero = ?
        LIMIT 1
      `)

      while (numero <= cai.numeroHasta && existeRemito.get(data.puntoVenta, numero)) {
        numero++
      }

      if (numero > cai.numeroHasta) {
        throw new Error('El rango de numeración está agotado')
      }

      const updated = this.db.prepare(`
        UPDATE cai_remitos
        SET proximoNumero = ?
        WHERE id = ? AND proximoNumero = ? AND activo = 1
      `).run(numero + 1, cai.id!, cai.proximoNumero)

      if (updated.changes !== 1) {
        throw new Error('No se pudo reservar el número de remito')
      }

      const remitoData: RemitoGuardado = {
        puntoVenta: data.puntoVenta,
        numero,
        fecha: fechaActual,
        cliente: data.cliente,
        docTipo: data.docTipo,
        docNro: data.docNro,
        razonSocial: data.razonSocial,
        domicilio: data.domicilio,
        items: JSON.stringify(data.items),
        cai: cai.cai,
        caiVencimiento: cai.fechaVencimiento,
        estado: 'emitido',
      }

      const insert = this.db.prepare(`
        INSERT INTO remitos (
          puntoVenta, numero, fecha, cliente, docTipo, docNro, razonSocial, domicilio, items, cai, caiVencimiento, estado
        ) VALUES (
          @puntoVenta, @numero, @fecha, @cliente, @docTipo, @docNro, @razonSocial, @domicilio, @items, @cai, @caiVencimiento, @estado
        )
      `).run(remitoData)

      return {
        remito: {
          id: insert.lastInsertRowid as number,
          ...remitoData,
        },
        cai: {
          ...cai,
          proximoNumero: numero + 1,
        },
      }
    })

    return transaction()
  }

  obtenerRemitos(): RemitoGuardado[] {
    return this.db.prepare('SELECT * FROM remitos ORDER BY fecha DESC, id DESC').all() as RemitoGuardado[]
  }

  /**
   * Cerrar la base de datos
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
