/** "8 SUPPLY & DEMAND 2" -> "8-supply-demand-2", "Santé, Énergie" -> "sante-energie" */
export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
