import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Profile, Link, Skill, Experience, Project } from './profile.models';
import { ProfileLoaders } from './profile.loaders';

@Resolver(() => Profile)
export class ProfileResolver {
  constructor(private readonly loaders: ProfileLoaders) {}

  @Query(() => Profile, { nullable: true, description: 'Публичная цифровая визитка владельца.' })
  profile() { return this.loaders.owner.load('owner'); }

  @ResolveField(() => [Link])
  links(@Parent() profile: Profile) { return this.loaders.links.load(profile.id); }
  @ResolveField(() => [Skill])
  skills(@Parent() profile: Profile) { return this.loaders.skills.load(profile.id); }
  @ResolveField(() => [Experience])
  experience(@Parent() profile: Profile) { return this.loaders.experience.load(profile.id); }
  @ResolveField(() => [Project])
  projects(@Parent() profile: Profile) { return this.loaders.projects.load(profile.id); }
}
