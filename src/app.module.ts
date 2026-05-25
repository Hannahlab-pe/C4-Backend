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

const entities = [
  Usuario, Proyecto, ProyectoUsuario, Sesion, Mensaje,
  Terreno, Excavacion, Construccion, Acabados, Administracion,
  GanttFase, Normativa, NormativaEmbedding, Documento, KnowledgeBaseChunk,
  AnalisisProyecto, TareaFase,
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
        synchronize: true,
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
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
