import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ProfileRepository } from './profile.repository';
import { ProfileService } from './profile.service';
import { ProfileLoaders } from './profile.loaders';
import { ProfileResolver } from './profile.resolver';

@Module({ providers: [PrismaService, ProfileRepository, ProfileService, ProfileLoaders, ProfileResolver], exports: [PrismaService] })
export class ProfileModule {}
