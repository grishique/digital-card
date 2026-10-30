import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ProfileRepository } from './profile.repository';
import { ProfileService } from './profile.service';

function relationLoader<T extends { profileId: string }>(fetch: (ids: readonly string[]) => Promise<T[]>) {
  return new DataLoader<string, T[]>(async (ids) => {
    const rows = await fetch(ids);
    const groups = new Map<string, T[]>();
    for (const row of rows) {
      const group = groups.get(row.profileId) ?? [];
      group.push(row);
      groups.set(row.profileId, group);
    }
    return ids.map((id) => groups.get(id) ?? []);
  });
}

@Injectable({ scope: Scope.REQUEST })
export class ProfileLoaders {
  readonly owner = new DataLoader<string, Awaited<ReturnType<ProfileRepository['findOwner']>>>(
    async (ids) => { const owner = await this.service.getProfile(); return ids.map(() => owner); },
  );
  readonly links = relationLoader((ids) => this.repository.links(ids));
  readonly skills = relationLoader((ids) => this.repository.skills(ids));
  readonly experience = relationLoader((ids) => this.repository.experience(ids));
  readonly projects = relationLoader((ids) => this.repository.projects(ids));

  constructor(private readonly repository: ProfileRepository, private readonly service: ProfileService) {}
}
