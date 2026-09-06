# Публикация в npm: аккаунт minkinad

Страница `https://www.npmjs.com/~minkinad` — профиль пользователя. Пакеты
публикуются в `https://registry.npmjs.org/`, после чего отображаются в профиле
владельца. Указывать адрес профиля в `registry` не нужно.

В этом репозитории **два публикуемых пакета**:

| Каталог         | Имя в npm                          | Назначение                          |
| --------------- | ---------------------------------- | ----------------------------------- |
| `packages/core` | `@minkinad/api-sdk-generator-core` | Генератор для использования из кода |
| `packages/cli`  | `api-sdk-generator`                | Команда для `npx` и терминала       |

Корневой `package.json` содержит `private: true`: это служебный workspace.
Не убирай этот флаг и не запускай обычный `npm publish` из корня.
Scope `@minkinad` принадлежит npm-пользователю `minkinad`; создавать отдельную
организацию для личного scope не требуется. Имя CLI без scope глобальное:
публиковать его можно, только если npm разрешает тебе владеть этим именем.
[Правила публичных scoped-пакетов](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/).

## Что мешало в исходной конфигурации

Это найденные проблемы проекта, а не подтверждение причины конкретного отказа npm:

- `publishConfig.provenance: true` включал аттестацию даже при ручной публикации.
  В локальном терминале нет удостоверения CI, необходимого для её создания.
  Теперь `--provenance` включается только в GitHub Actions.
  [Требования provenance](https://docs.npmjs.com/generating-provenance-statements/).
- CLI зависит от core через `workspace:*`. Публикуемый архив должен содержать
  обычную версию. Скрипт сначала вызывает `pnpm pack`, который выполняет замену,
  а затем `npm publish` для готового архива.
  [Публикация workspace-пакетов](https://pnpm.io/workspaces#publishing-workspace-packages).
- В release workflow стоял обязательный `npm whoami`, блокировавший даже создание
  Changesets PR при отсутствии токена. Этот шаг удалён.
- CLI-тесты требовали `core/dist` до сборки. Теперь они используют исходники core;
  установка настоящих архивов проверяется отдельно.
- В пакетах не было полных метаданных, README и локального файла лицензии.
  Они добавлены; `prepack` собирает код перед упаковкой.

## Первая публикация с компьютера

1. Установи **Node.js 24** и pnpm 9.15.4. Если используешь nvm:

   ```bash
   nvm install 24
   nvm use 24
   npm install --global npm@11 pnpm@9.15.4
   node --version
   npm --version
   pnpm --version
   ```

   Для запуска самого генератора достаточно Node.js 20.19+. Node.js 24 рекомендуется
   здесь для актуального инструментария публикации.

2. В настройках аккаунта npm подтверди email и настрой 2FA. Авторизуйся через браузер:

   ```bash
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   ```

   Последняя команда должна вывести `minkinad`. При публикации npm может запросить
   подтверждение 2FA. Выполни его в своём терминале/браузере; токены и коды не нужно
   добавлять в репозиторий. [Требования npm к 2FA](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/).

3. Из корня репозитория проверь проект и публикуемые архивы:

   ```bash
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm release:check
   pnpm release --dry-run
   ```

   `release:check` устанавливает оба архива в отдельный временный проект, проверяет
   ESM/CJS, CLI и состав файлов. Команда требует доступа к registry для установки
   внешних зависимостей, но ничего туда не загружает.
   `--dry-run` проверяет упаковку, но не доказывает наличие права публикации.

4. Примени ожидающие changesets и закоммить итоговую версию. Если они уже применены
   и рабочее дерево чистое, повторять этот шаг не нужно:

   ```bash
   pnpm version:packages
   pnpm verify
   git add .
   git commit -m "chore(release): version packages"
   ```

   Затем опубликуй:

   ```bash
   pnpm release
   ```

   Скрипт публикует core, затем CLI с `--access public`. Версии берутся из
   `packages/*/package.json`; уже существующие версии пропускаются. Публикация требует чистого рабочего дерева
   и применённых changesets. Для новых версий создаются локальные теги. При ошибке
   процесс останавливается. Если core успел опубликоваться, повторный запуск
   пропустит его и попробует CLI. Предварительная сборка сайта для публикации не нужна.

5. Проверь результат:

   ```bash
   npm view @minkinad/api-sdk-generator-core version --registry=https://registry.npmjs.org/
   npm view api-sdk-generator version --registry=https://registry.npmjs.org/
   npx --yes api-sdk-generator --help
   ```

   Оба пакета должны появиться в профиле `minkinad`. Отправь коммиты и созданные
   теги в GitHub; следующая CI-публикация пропустит уже существующие npm-версии
   и создаст недостающие GitHub Releases:

   ```bash
   git push origin main
   git push origin 'refs/tags/@minkinad/api-sdk-generator-core@0.3.0' 'refs/tags/api-sdk-generator@0.3.0'
   ```

   В командах тегов подставь фактически выпущенные версии. Не перемещай существующие теги.

## Последующие релизы через GitHub Actions без NPM_TOKEN

После первой ручной публикации открой настройки **каждого** пакета на npmjs.com
и добавь Trusted Publisher типа GitHub Actions:

| Поле                 | Значение                                           |
| -------------------- | -------------------------------------------------- |
| Organization or user | `minkinad`                                         |
| Repository           | `api-sdk-generator`                                |
| Workflow filename    | `release.yml`                                      |
| Environment          | оставь пустым — workflow не использует environment |

Разреши обычный `npm publish` для этого publisher. Репозиторий должен быть публичным
для provenance. Workflow использует GitHub-hosted runner, Node.js 24, npm 11 и
`id-token: write`. Минимум для npm OIDC — npm 11.5.1 и Node.js 22.14.0.
Долгоживущий `NPM_TOKEN` этому workflow не нужен.
[Настройка trusted publishing](https://docs.npmjs.com/trusted-publishers/).

В GitHub включи `Settings → Actions → General → Workflow permissions → Allow
GitHub Actions to create and approve pull requests`. Затем:

1. Добавляй changeset командой `pnpm changeset` вместе с изменениями.
2. После merge в `main` workflow создаст PR с новыми версиями и changelog.
3. После merge этого PR workflow проверит пакеты, опубликует новые версии и создаст GitHub Releases.

Вручную workflow запускай на ветке `main`. Если публикация из CI вернула `E404`,
проверь настройки publisher у **обоих** пакетов, точное имя workflow и версии Node/npm.
Не используй `npm whoami` как проверку OIDC: удостоверение выдаётся на этапе публикации.

## Частые ошибки

| Ошибка                                              | Что проверить                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ENEEDAUTH`, `E401`                                 | Выполни `npm login` и `npm whoami` с явным npm registry.                                         |
| `EOTP`, сообщение про 2FA                           | Заверши запрошенное npm подтверждение; проверь 2FA аккаунта.                                     |
| `E403`                                              | Прочитай полный текст: возможны чужое/запрещённое имя, недостаточные права или требования 2FA.   |
| `E402`, требование платного плана                   | Scoped-пакет пытались публиковать как private. Нужен `--access public`; скрипт уже передаёт его. |
| `E404` при `npm view` до первого релиза             | Пакет ещё не доступен публично. Это не гарантия, что npm разрешит занять имя.                    |
| `E404` при OIDC-публикации                          | Сверь publisher, owner/repo/workflow, версии Node/npm и наличие первой версии пакета.            |
| `EUNSUPPORTEDPROTOCOL workspace:*`                  | Используй `pnpm install` и `pnpm release`; не публикуй сырой CLI-манифест через npm.             |
| Ошибка provenance / OIDC из терминала               | Проверь, что не задаёшь `--provenance` или `NPM_CONFIG_PROVENANCE=true` локально.                |
| `cannot publish over previously published versions` | Нельзя заменить существующую версию. Добавь changeset и выпусти новую.                           |
| CLI не находит core                                 | Сначала должен быть опубликован core той версии, которая указана в архиве CLI.                   |

Если глобальное имя `api-sdk-generator` занято или npm отклоняет его, можно выбрать
`@minkinad/api-sdk-generator`. Это отдельное переименование: нужно согласованно
обновить зависимости workspace, фильтры scripts, документацию и настройки publisher.
Имя команды `api-sdk-generator` в `bin` можно сохранить.

Для диагностики достаточно полного текста ошибки и команды. Не публикуй содержимое
пользовательского `.npmrc`, если там есть токены.
