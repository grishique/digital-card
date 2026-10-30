# Григорий Ходырев · Digital Card

Backend-визитка на **TypeScript, Node.js, NestJS, Prisma, GraphQL и Docker**. Git используется для исходников, миграций и CI. Профиль, опыт, навыки, профессиональные ссылки и проекты доступны через Apollo Sandbox.

Исходники: [github.com/grishique/digital-card](https://github.com/grishique/digital-card).

## Быстрый запуск

Нужны Docker Engine / Docker Desktop с Linux-контейнерами и Docker Compose v2:

```sh
git clone https://github.com/grishique/digital-card.git
cd digital-card
docker compose up --build -d --wait
```

Открыть **http://localhost:3000/graphql**. Apollo Sandbox уже содержит пример запроса; аккаунт Apollo не нужен. Корень `/` перенаправляет в Sandbox, `/health` проверяет доступность БД. Для загрузки интерфейса Sandbox нужен доступ к CDN Apollo; само API работает без него.

Сначала применяются сохранённые миграции, затем seed в транзакции, затем запускается HTTP-сервер. Ошибка любого шага останавливает запуск. Ручное создание БД не требуется, файл сохраняется в именованном Docker volume `card-data`.

```sh
docker compose logs -f
docker compose down
# Полностью удалить локальные данные (осторожно):
docker compose down -v
# Повторный запуск восстановит БД из миграций и seed.
```

### Без Docker

Node.js 22 или 24 и pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm build
pnpm start
```

В PowerShell вместо `cp` можно использовать `Copy-Item .env.example .env`. По умолчанию SQLite-файл находится в `prisma/card.db`, так как относительный `DATABASE_URL` Prisma разрешает относительно schema.prisma. Переменные окружения имеют приоритет над `.env`.

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | Обязательный URL SQLite; локально `file:./card.db`, в Docker `file:/app/data/card.db` |
| `PORT` | HTTP-порт, по умолчанию 3000; сервер слушает `0.0.0.0` |
| `NODE_ENV` | В Docker — `production`; Sandbox включён явно и остаётся доступен |

## GraphQL API

```graphql
query DigitalCard {
  profile {
    name
    description
    links { label url }
    skills { name }
    experience {
      company
      position
      startDate
      endDate
      achievements
    }
    projects { name description url }
  }
}
```

`profile` возвращает владельца визитки или `null`, если запись отсутствует. Связи — непустые по типу списки (`[Skill!]!` и аналоги), при отсутствии записей возвращают `[]`. `endDate: null` означает текущее место работы. Даты — ISO 8601 UTC; для указанного в резюме месяца используется первое число. Порядок вложенных записей задаётся полем `order`, затем `id`.

Публичных mutations нет: визитка предназначена для просмотра. Изменение данных — редактирование `prisma/profile.data.ts`, коммит и перезапуск/повторный деплой. Данные основаны на резюме владельца от 29.10.2026.

## Архитектура и решения

```text
src/
  main.ts                       запуск и graceful shutdown
  app.module.ts                 Apollo, Sandbox, HTTP health
  database/prisma.service.ts    lifecycle Prisma Client
  profile/
    profile.models.ts           GraphQL-схема (code first)
    profile.resolver.ts          адаптер GraphQL, без SQL
    profile.loaders.ts           request-scoped batching/cache
    profile.service.ts           сценарий получения визитки
    profile.repository.ts        запросы Prisma и порядок данных
prisma/
  schema.prisma                 модель хранения и ограничения
  migrations/                   версия схемы в Git
  profile.data.ts                единый источник публичных данных
  seed.ts                       транзакционная синхронизация
test/api.test.ts                HTTP + настоящая временная SQLite
```

**NestJS и разделение ответственности.** Resolver занимается GraphQL-контрактом, service задаёт сценарий получения владельца, repository инкапсулирует Prisma. Для такого небольшого приложения сценарий намеренно прост: абстрактные репозитории, CQRS и отдельные пакеты не добавляют полезной функциональности. Prisma Client создаётся один раз на процесс и закрывается вместе с приложением.

**Code-first GraphQL.** Декораторы NestJS строят схему в памяти из типизированных моделей. Не нужно вручную синхронизировать SDL и TypeScript. Модели API отделены от ORM: `profileId` и служебный порядок в публичную схему не попадают. Проект компилируется `tsc`, который сохраняет необходимые NestJS метаданные декораторов.

**SQLite вместо отдельного сервера БД.** Здесь один профиль, небольшие списки и публичное чтение. SQLite обеспечивает настоящие внешние ключи, индексы и транзакции при запуске одним контейнером. Пять таблиц разделяют сущности и позволяют независимо загружать связи. Индексы `(profileId, order)` соответствуют запросам, удаление профиля каскадно удаляет связи. Это осознанный выбор для небольшой визитки с одним экземпляром приложения; при появлении нескольких реплик и конкурентной записи стоит перейти на PostgreSQL и выделить миграции в отдельный deployment job.

**Вложенные данные и N+1.** Поля связей имеют отдельные `ResolveField`. Если клиент просит только имя, приложение делает один SQL SELECT и не читает остальные таблицы. Для каждой запрошенной связи DataLoader собирает profileId в один `findMany WHERE profileId IN (...)`, группирует результаты и возвращает их в порядке ключей загрузчика. Cache живёт только в HTTP-запросе: между запросами нет устаревших персональных данных. Aliases корневого профиля и вложенных полей используют общий кеш этого запроса. Полная визитка требует **5 SELECT**: профиль + 4 связи, независимо от повторных aliases. Для единственного профиля это также было бы возможно простым `include`, но ленивые загрузчики позволяют не читать ненужные связи. Проекции отдельных скалярных колонок не реализованы: при таком объёме данных усложнение парсингом selection set не оправдано.

**Seed как версия контента.** Стабильный ключ `owner`, upsert владельца и замена его связей выполняются одной транзакцией. Повторный запуск не создаёт дубликаты; ошибки откатывают весь снимок. Идентификаторы дочерних записей задаются их позициями в исходных списках и стабильны при неизменном порядке. Эти ID предназначены для текущей визитки, а не как постоянные ссылки на историю контента. При старте данные приводятся к seed: ручные изменения в БД будут заменены. Это соответствует read-only API и позволяет обновлять контент через Git. Синхронизация рассчитана на одного владельца и одну стартующую реплику.

**Версии и воспроизводимость.** `pnpm-lock.yaml` фиксирует зависимости, установка в CI и Docker использует frozen lockfile. Prisma Client и CLI имеют одну закреплённую версию 6.19.0. Выбрана поддерживаемая этим проектом ветка Prisma 6 с классическим клиентом и SQLite; миграция на другую major-версию требует отдельной проверки. В скрипте миграций явно задан `RUST_LOG=info`: это обход [ошибки Prisma 6 SQLite schema engine](https://github.com/prisma/orm/issues/29355), воспроизведённой при унаследованном `RUST_LOG=warn`. В приложении настройки логирования окружения не изменяются. NestJS подтягивает legacy-плагин Playground с peer-зависимостью Apollo 4; он не используется, включён официальный Sandbox Apollo 5. Интеграционные тесты проверяют реальную совместимость используемого пути.

**Docker и эксплуатация.** Отдельный build stage, runtime от пользователя `node`, healthcheck, init-процесс Compose и передача SIGTERM через `exec`. В runtime оставлены Prisma CLI и его зависимости для миграций при старте: образ получается немного больше, зато первый запуск не требует внешних задач. `.env`, БД и локальные зависимости исключены из Git и Docker build context. API публичное, introspection и Sandbox включены специально для просмотра задания; stack traces не выдаются в GraphQL-ошибках. При размещении на сервере TLS предоставляет хостинг/reverse proxy.

## Проверки

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

Тесты используют HTTP NestJS и настоящую SQLite в отдельной временной папке. Проверяются:

- миграция пустой БД и полный вложенный запрос;
- ISO-даты, `endDate: null`, порядок данных;
- один SELECT без связей и пять SELECT для полной визитки с aliases;
- повторный seed без дубликатов и восстановление исходного снимка;
- отсутствие общего кеша между запросами;
- ошибки неизвестных полей и отсутствие write API;
- health endpoint и HTML Apollo Sandbox;
- `profile: null` при отсутствии записи и каскадное удаление связей.

GitHub Actions повторяет сборку и тесты, затем собирает Docker image, запускает Compose с чистым volume, ждёт healthcheck и проверяет GraphQL через HTTP. В конце контейнеры и тестовый volume удаляются.

## Публикация на Railway

В репозитории есть `railway.json`: сборка из Dockerfile, healthcheck `/health`, ограниченный перезапуск при ошибке. В [Railway](https://railway.com/dashboard) создайте проект из GitHub-репозитория `grishique/digital-card`. После успешного deploy в Settings → Networking создайте публичный домен (Generate Domain), указав порт 3000 или предоставленный платформой `PORT`. Открыть `<домен>/graphql`, проверить `<домен>/health`.

База автоматически создаётся и заполняется из seed при старте. Для этой read-only визитки временный диск допустим: состояние полностью восстанавливается. Не подключайте volume без настройки прав записи для пользователя `node`. Для редактируемых данных понадобится постоянное хранилище. [Railway предлагает пробный кредит и тарифы с лимитами](https://railway.com/pricing); бесплатный лимит не гарантирует непрерывную работу приложения. Конфигурация не подключает платный тариф автоматически.

## Альтернатива: Render

В репозитории есть `render.yaml` для Docker Web Service на бесплатном плане. После входа в Render откройте [Deploy to Render](https://render.com/deploy?repo=https://github.com/grishique/digital-card), создайте Blueprint из этого репозитория и дождитесь успешного deploy. Проверить `<адрес-сервиса>/health` и `<адрес-сервиса>/graphql`. Сам факт наличия render.yaml ещё не означает, что сервис опубликован.

На [бесплатном Render](https://render.com/docs/free) локальные файлы удаляются при перезапусках и деплоях, а после простоя сервис засыпает. Здесь это допустимо: API только читает, вся БД автоматически восстанавливается из версионированного seed. Для постоянно доступного сервиса нужен подходящий тариф; для внешних изменений данных — persistent disk или PostgreSQL. В локальном Docker Compose данные сохраняются в volume.

Документация: [NestJS GraphQL](https://docs.nestjs.com/graphql/quick-start), [Apollo Sandbox landing page](https://www.apollographql.com/docs/apollo-server/api/plugin/landing-pages), [Prisma 6 migrations](https://www.prisma.io/docs/orm/v6/reference/prisma-cli-reference), [Render Blueprint](https://render.com/docs/blueprint-spec).
