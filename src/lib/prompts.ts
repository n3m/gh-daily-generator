export interface CommitsByRepo {
  repoName: string;
  commits: Array<{
    sha: string;
    message: string;
    filesChanged?: string[];
  }>;
}

export function buildDailyPrompt(commits: CommitsByRepo[]): string {
  if (commits.length === 0) {
    return `No commits found for this day. Generate a brief message indicating no activity.`;
  }

  const commitsSummary = commits
    .map(
      (repo) => `
## ${repo.repoName}
${repo.commits.map((c) => `- ${c.sha.slice(0, 7)}: ${c.message}`).join("\n")}
`
    )
    .join("\n");

  return `Analiza los siguientes commits de GitHub y genera un resumen para un daily standup.

El formato debe ser:
- Agrupado por repositorio/proyecto
- En español
- Bullet points concisos describiendo qué se hizo (no el mensaje del commit literal, sino una interpretación profesional)
- Máximo 2-3 bullets por repo
- Usa verbos en pasado (implementé, corregí, actualicé, etc.)
- Si hay muchos commits del mismo tipo, agrúpalos en un solo bullet

COMMITS:
${commitsSummary}

Genera el daily:`;
}

export function buildWeeklyPrompt(
  dailys: string[],
  commits?: CommitsByRepo[]
): string {
  if (dailys.length > 0) {
    return `Genera un resumen semanal basado en estos dailys:

${dailys.map((d, i) => `### Día ${i + 1}\n${d}`).join("\n\n")}

El resumen debe:
- Agrupar trabajo por proyecto/tema principal
- Destacar los logros más importantes de la semana
- Mencionar áreas de trabajo (features, bugfixes, refactoring, etc.)
- Ser conciso pero completo (máximo 10-15 bullets totales)
- En español
- Usar lenguaje profesional para una presentación hablada`;
  }

  // Fallback to commits if no dailys
  if (!commits || commits.length === 0) {
    return `No hay dailys ni commits disponibles para esta semana. Genera un mensaje indicando que no hubo actividad registrada.`;
  }

  const commitsSummary = commits
    .map(
      (repo) => `
## ${repo.repoName}
${repo.commits.map((c) => `- ${c.sha.slice(0, 7)}: ${c.message}`).join("\n")}
`
    )
    .join("\n");

  return `Analiza los siguientes commits de GitHub y genera un resumen semanal completo.

El formato debe ser:
- Agrupado por proyecto/tema principal
- Destacar los logros más importantes
- Mencionar áreas de trabajo (features, bugfixes, refactoring, etc.)
- Máximo 10-15 bullets totales
- En español
- Usar lenguaje profesional para una presentación hablada

COMMITS DE LA SEMANA:
${commitsSummary}

Genera el weekly:`;
}
