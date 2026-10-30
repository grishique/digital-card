// Public professional information from the owner's resume, updated 2026-10-29.
// Month-only dates are represented by the first day of the month in UTC.
export const profileData = {
  name: 'Григорий Ходырев',
  description: 'Backend-разработчик в CLIMATE ENGINEERING с марта 2025 года. Разрабатываю API на NestJS, TypeScript, GraphQL и Prisma, работаю с PostgreSQL и автоматизацией внутренних процессов. Изучаю информационные системы и программирование в КПО при ПГНИУ. Английский — B2.',
  links: [
    { label: 'GitHub', url: 'https://github.com/grishique' },
    { label: 'Telegram', url: 'https://t.me/grishique' },
  ],
  skills: ['TypeScript', 'Node.js', 'NestJS', 'Prisma', 'GraphQL', 'PostgreSQL', 'Docker', 'Git', 'SQL', 'Python', 'C#', 'Atlassian Jira', 'Английский B2'],
  experience: [
    {
      company: 'CLIMATE ENGINEERING',
      position: 'Backend-разработчик',
      startDate: new Date('2025-03-01T00:00:00.000Z'),
      endDate: null,
      achievements: 'Автоматизировал внутренние процессы на NestJS + TypeScript, сократив выполнение рутинных операций с 3 дней до нескольких часов и увеличив продуктивную загрузку команды до 90%. Разработал GraphQL API на NestJS + Prisma, сократив количество избыточных запросов к PostgreSQL и ускорив получение данных примерно на 40%.',
    },
  ],
  projects: [
    {
      name: 'VPN bot',
      description: 'Pet-проект: Telegram-бот для VPN-подписок.',
      url: 'https://github.com/grishique/bot-vpn',
    },
    {
      name: 'Digital Card',
      description: 'Цифровая визитка: NestJS, TypeScript, Prisma, GraphQL, Apollo Sandbox, Docker и автоматические проверки.',
      url: 'https://github.com/grishique/digital-card',
    },
  ],
};
