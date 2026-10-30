import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/database/prisma.service';
import { profileData } from '../prisma/profile.data';

const directory = mkdtempSync(join(tmpdir(), 'digital-card-'));
process.env.DATABASE_URL = `file:${join(directory, 'test.db').replaceAll('\\', '/')}`;
const sql: string[] = [];
const db = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
db.$on('query', (event) => sql.push(event.query));
let app: INestApplication;
let base: string;

function run(script: string, args: string[]) {
  execFileSync(process.execPath, [resolve(script), ...args], { env: process.env, stdio: 'pipe' });
}
function seed() { run('dist/prisma/seed.js', []); }
async function query(document: string) {
  const response = await fetch(`${base}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: document }),
  });
  return { status: response.status, body: await response.json() as any };
}

before(async () => {
  run('scripts/migrate.mjs', []);
  seed();
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService).useValue(db).compile();
  app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});

after(async () => {
  await app?.close();
  await db.$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

test('complete nested profile, nullable end date and stable ordering', async () => {
  const { status, body } = await query(`{ profile {
    name description links { label url } skills { name }
    experience { company position startDate endDate achievements } projects { name url }
  } }`);
  assert.equal(status, 200);
  assert.equal(body.errors, undefined);
  assert.equal(body.data.profile.name, profileData.name);
  assert.equal(body.data.profile.skills[0].name, profileData.skills[0]);
  assert.equal(body.data.profile.skills.length, profileData.skills.length);
  assert.equal(body.data.profile.experience[0].endDate, null);
  assert.equal(body.data.profile.experience[0].startDate, profileData.experience[0].startDate.toISOString());
  assert.equal(body.data.profile.links.length, profileData.links.length);
  assert.equal(body.data.profile.projects.length, profileData.projects.length);
});

test('scalar selection executes only one SQL SELECT', async () => {
  sql.length = 0;
  assert.equal((await query('{ profile { name } }')).body.errors, undefined);
  assert.equal(sql.filter((statement) => statement.startsWith('SELECT')).length, 1);
});

test('aliases share request cache; four relations need only five SQL SELECTs total', async () => {
  sql.length = 0;
  const selection = '{ name links { url } skills { name } experience { company } projects { name } }';
  const { body } = await query(`{ first: profile ${selection} second: profile ${selection} }`);
  assert.equal(body.errors, undefined);
  assert.deepEqual(body.data.first, body.data.second);
  assert.equal(sql.filter((statement) => statement.startsWith('SELECT')).length, 5);
});

test('seed is repeatable and restores the source snapshot; caches do not survive requests', async () => {
  const original = (await query('{ profile { name skills { id name } } }')).body.data;
  await db.profile.update({ where: { id: 'owner' }, data: { name: 'Changed' } });
  assert.equal((await query('{ profile { name } }')).body.data.profile.name, 'Changed');
  seed();
  seed();
  assert.deepEqual((await query('{ profile { name skills { id name } } }')).body.data, original);
  assert.equal(await db.profile.count(), 1);
  assert.equal(await db.skill.count(), profileData.skills.length);
});

test('unknown fields rejected; no public write API', async () => {
  assert.equal((await query('{ profile { password } }')).status, 400);
  assert.ok((await query('mutation { deleteProfile }')).body.errors);
});

test('health probes DB; browser endpoint serves Apollo Sandbox even in production', async () => {
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' });
  const response = await fetch(`${base}/graphql`, { headers: { accept: 'text/html' } });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /embeddable-sandbox/);
});

test('missing profile is explicit null', async () => {
  await db.profile.delete({ where: { id: 'owner' } });
  assert.deepEqual((await query('{ profile { name } }')).body.data, { profile: null });
  assert.equal(await db.skill.count(), 0);
  seed();
});
