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
  
  // Metadata
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
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear índices para búsquedas más rápidas
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_facturas_fechaProceso ON facturas(fechaProceso);
      CREATE INDEX IF NOT EXISTS idx_facturas_docNro ON facturas(docNro);
      CREATE INDEX IF NOT EXISTS idx_facturas_cae ON facturas(cae);
      CREATE INDEX IF NOT EXISTS idx_facturas_ptoVta ON facturas(ptoVta);
      CREATE INDEX IF NOT EXISTS idx_facturas_cbteTipo ON facturas(cbteTipo);
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
        condicionIVA, condicionVenta, razonSocial, domicilio, articulos, ivas, datosEmisor, pdfPath
      ) VALUES (
        @cae, @caeVencimiento, @fechaProceso, @ptoVta, @cbteTipo, @cbteDesde, @cbteHasta,
        @docTipo, @docNro, @impTotal, @impNeto, @impIVA, @tipoFactura, @concepto,
        @condicionIVA, @condicionVenta, @razonSocial, @domicilio, @articulos, @ivas, @datosEmisor, @pdfPath
      )
    `);
    
    // Asegurar que pdfPath esté presente (null si no existe)
    const facturaConPdfPath = {
      ...factura,
      pdfPath: factura.pdfPath || null,
    };
    
    const result = stmt.run(facturaConPdfPath);
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

  /**
   * Cerrar la base de datos
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
