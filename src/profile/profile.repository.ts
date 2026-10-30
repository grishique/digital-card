import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export const PROFILE_ID = 'owner';

@Injectable()
export class ProfileRepository {
  constructor(private readonly db: PrismaService) {}

  findOwner() { return this.db.profile.findUnique({ where: { id: PROFILE_ID } }); }
  links(ids: readonly string[]) {
    return this.db.link.findMany({ where: { profileId: { in: [...ids] } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  }
  skills(ids: readonly string[]) {
    return this.db.skill.findMany({ where: { profileId: { in: [...ids] } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  }
  experience(ids: readonly string[]) {
    return this.db.experience.findMany({ where: { profileId: { in: [...ids] } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  }
  projects(ids: readonly string[]) {
    return this.db.project.findMany({ where: { profileId: { in: [...ids] } }, orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  }
}
