import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { ChatModule } from './chat/chat.module'
import { ProyectosModule } from './proyectos/proyectos.module'
import { NormativasModule } from './normativas/normativas.module'
import { MotoresModule } from './motores/motores.module'
import { DocumentosModule } from './documentos/documentos.module'
import { SeedService } from './seed/seed.service'
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module'
import { TareasFaseModule } from './tareas-fase/tareas-fase.module'
import { AnalisisModule } from './analisis/analisis.module'
import { ContratasFaseModule } from './contratas-fase/contratas-fase.module'
import { EquiposFaseModule } from './equipos-fase/equipos-fase.module'
import { ExcavacionRegistrosModule } from './excavacion-registros/excavacion-registros.module'
import { FasesDetalleModule } from './fases-detalle/fases-detalle.module'
import { RegistrosFaseModule } from './registros-fase/registros-fase.module'
import { DocumentosRequeridosModule } from './documentos-requeridos/documentos-requeridos.module'
import { PartidasCatalogoModule } from './partidas-catalogo/partidas-catalogo.module'
import { PresupuestosModule } from './presupuestos/presupuestos.module'
import { AgentAuditModule } from './audit/agent-audit.module'

import { Usuario } from './entities/usuario.entity'
import { Proyecto } from './entities/proyecto.entity'
import { ProyectoUsuario } from './entities/proyecto-usuario.entity'
import { Sesion } from './entities/sesion.entity'
import { Mensaje } from './entities/mensaje.entity'
import { Terreno } from './entities/terreno.entity'
import { Excavacion } from './entities/excavacion.entity'
import { Construccion } from './entities/construccion.entity'
import { Acabados } from './entities/acabados.entity'
import { Administracion } from './entities/administracion.entity'
import { GanttFase } from './entities/gantt-fase.entity'
import { Normativa } from './entities/normativa.entity'
import { NormativaEmbedding } from './entities/normativa-embedding.entity'
import { Documento } from './entities/documento.entity'
import { KnowledgeBaseChunk } from './entities/knowledge-base-chunk.entity'
import { AnalisisProyecto } from './entities/analisis-proyecto.entity'
import { TareaFase } from './entities/tarea-fase.entity'
import { ContrataFase } from './entities/contrata-fase.entity'
import { EquipoFase } from './entities/equipo-fase.entity'
import { ExcavacionRegistro } from './entities/excavacion-registro.entity'
import { FaseDetalle } from './entities/fase-detalle.entity'
import { RegistroFase } from './entities/registro-fase.entity'
import { DocumentoRequerido } from './entities/documento-requerido.entity'
import { PartidaCatalogo } from './entities/partida-catalogo.entity'
// ── Módulo de Presupuestos y Costos (ERP, estilo S10) ──
import { Recurso } from './entities/recurso.entity'
import { RecursoPrecio } from './entities/recurso-precio.entity'
import { Partida } from './entities/partida.entity'
import { ApuLineaEntity } from './entities/apu-linea.entity'
import { Presupuesto } from './entities/presupuesto.entity'
import { PresupuestoItem } from './entities/presupuesto-item.entity'
import { FormulaPolinomica } from './entities/formula-polinomica.entity'
import { IndiceUnificado } from './entities/indice-unificado.entity'
import { AdicionalDeductivo } from './entities/adicional-deductivo.entity'
import { AuditLog } from './entities/audit-log.entity'
import { Valorizacion } from './entities/valorizacion.entity'
import { AgentAuditLog } from './audit/agent-audit-log.entity'

const entities = [
  Usuario, Proyecto, ProyectoUsuario, Sesion, Mensaje,
  Terreno, Excavacion, Construccion, Acabados, Administracion,
  GanttFase, Normativa, NormativaEmbedding, Documento, KnowledgeBaseChunk,
  AnalisisProyecto, TareaFase, ContrataFase, EquipoFase, ExcavacionRegistro,
  FaseDetalle, RegistroFase, DocumentoRequerido, PartidaCatalogo,
  // Presupuestos y Costos
  Recurso, RecursoPrecio, Partida, ApuLineaEntity, Presupuesto, PresupuestoItem,
  FormulaPolinomica, IndiceUnificado, AdicionalDeductivo, AuditLog, Valorizacion,
  // Auditoría transversal de IA
  AgentAuditLog,
]

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '15432')),
        username: config.get<string>('DB_USER', 'c4_user'),
        password: config.get<string>('DB_PASS', 'c4_pass'),
        database: config.get<string>('DB_NAME', 'c4_db'),
        entities,
        // ⚠️ synchronize NUNCA en producción: TypeORM altera/recrea tablas solo y puede borrar
        // columnas con datos reales de un cliente sin avisar. En prod se usan migraciones explícitas
        // (revisadas y corridas a mano). Solo dev/test lo activan con DB_SYNC=true.
        synchronize: config.get<string>('DB_SYNC', 'false') === 'true',
        migrations: ['dist/migrations/*.js'],
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN', 'false') === 'true',
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([Usuario]),
    AuthModule,
    ChatModule,
    ProyectosModule,
    NormativasModule,
    MotoresModule,
    DocumentosModule,
    KnowledgeBaseModule,
    TareasFaseModule,
    AnalisisModule,
    ContratasFaseModule,
    EquiposFaseModule,
    ExcavacionRegistrosModule,
    FasesDetalleModule,
    RegistrosFaseModule,
    DocumentosRequeridosModule,
    PartidasCatalogoModule,
    PresupuestosModule,
    AgentAuditModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
