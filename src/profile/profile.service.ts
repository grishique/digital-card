import { Injectable } from '@nestjs/common';
import { ProfileRepository } from './profile.repository';

@Injectable()
export class ProfileService {
  constructor(private readonly repository: ProfileRepository) {}
  // An empty database is represented as null rather than a fabricated profile.
  getProfile() { return this.repository.findOwner(); }
}
