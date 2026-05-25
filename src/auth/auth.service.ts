import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { Usuario } from '../entities/usuario.entity'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { email } })

    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas')

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash)
    if (!passwordValido) throw new UnauthorizedException('Credenciales incorrectas')

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol }
    const token = this.jwtService.sign(payload)

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    }
  }
}
