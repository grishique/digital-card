import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { profileData } from './profile.data';

const db = new PrismaClient();

async function seed() {
  // This application owns one public profile. Synchronize its complete snapshot atomically.
  // Stable child IDs make repeated startup observable as the same API resources.
  await db.$transaction(async (tx) => {
    await tx.profile.upsert({
      where: { id: 'owner' },
      create: { id: 'owner', name: profileData.name, description: profileData.description },
      update: { name: profileData.name, description: profileData.description },
    });
    await tx.link.deleteMany({ where: { profileId: 'owner' } });
    await tx.skill.deleteMany({ where: { profileId: 'owner' } });
    await tx.experience.deleteMany({ where: { profileId: 'owner' } });
    await tx.project.deleteMany({ where: { profileId: 'owner' } });
    await tx.link.createMany({ data: profileData.links.map((item, order) => ({ ...item, id: order + 1, order, profileId: 'owner' })) });
    await tx.skill.createMany({ data: profileData.skills.map((name, order) => ({ name, id: order + 1, order, profileId: 'owner' })) });
    await tx.experience.createMany({ data: profileData.experience.map((item, order) => ({ ...item, id: order + 1, order, profileId: 'owner' })) });
    await tx.project.createMany({ data: profileData.projects.map((item, order) => ({ ...item, id: order + 1, order, profileId: 'owner' })) });
  });
}

seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
