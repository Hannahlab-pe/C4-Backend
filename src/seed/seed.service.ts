import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { Usuario, Rol } from '../entities/usuario.entity'

const USUARIOS_INICIALES = [
  { nombre: 'Ing. Administrador', email: 'admin@c4.com', password: 'Admin2026!', rol: Rol.ADMIN },
  { nombre: 'Ing. Jair Quispe', email: 'ingeniero@c4.com', password: 'Ingeniero2026!', rol: Rol.INGENIERO },
]

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async onApplicationBootstrap() {
    for (const u of USUARIOS_INICIALES) {
      const existe = await this.usuarioRepo.findOne({ where: { email: u.email } })
      if (!existe) {
        const passwordHash = await bcrypt.hash(u.password, 10)
        await this.usuarioRepo.save({ nombre: u.nombre, email: u.email, passwordHash, rol: u.rol })
        this.logger.log(`Usuario creado: ${u.email}`)
      }
    }
  }
}
