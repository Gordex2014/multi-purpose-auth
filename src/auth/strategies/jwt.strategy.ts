import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types';
import { Strategies } from '../enums';

/**
 * Validates the jwt and adds the user to the request object.
 * @param payload is the decoded JWT payload
 * @returns the user and adds it to the request object
 * @throws a 401 error if the user is not found or if the user is not active
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, Strategies.JWT) {
  private readonly _prisma: PrismaService;
  private readonly _logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService, prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('jwt.secret'),
    });
    this._prisma = prisma;
  }

  async validate(payload: JwtPayload) {
    const user = await this._prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    delete user.password;
    delete user.authProvider;
    delete user.isActive;

    this._logger.log(
      `User with id ${user.id} has been authenticated and is accessing the api`,
    );
    return user;
  }
}
