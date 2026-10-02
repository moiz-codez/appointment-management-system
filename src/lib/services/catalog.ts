import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { departments, services } from '@/lib/db/schema';

export interface CatalogService {
  id: string;
  name: string;
  code: string;
  averageDurationMin: number;
  isPriority: boolean;
}

export interface CatalogDepartment {
  id: string;
  name: string;
  code: string;
  services: CatalogService[];
}

// §9 search: active departments with their active services. A query matching a
// department name shows all its services; otherwise only matching services are kept.
export async function listCatalog(query?: string): Promise<CatalogDepartment[]> {
  const rows = await db
    .select({
      deptId: departments.id,
      deptName: departments.name,
      deptCode: departments.code,
      id: services.id,
      name: services.name,
      code: services.code,
      averageDurationMin: services.averageDurationMin,
      isPriority: services.isPriority,
    })
    .from(services)
    .innerJoin(departments, eq(services.departmentId, departments.id))
    .where(and(eq(services.active, true), eq(departments.active, true)))
    .orderBy(asc(departments.name), asc(services.code));

  const q = query?.trim().toLowerCase() ?? '';
  const byDept = new Map<string, CatalogDepartment>();
  for (const r of rows) {
    const deptMatches = r.deptName.toLowerCase().includes(q);
    if (q && !deptMatches && !r.name.toLowerCase().includes(q)) continue;
    const dept = byDept.get(r.deptId) ?? { id: r.deptId, name: r.deptName, code: r.deptCode, services: [] };
    dept.services.push({ id: r.id, name: r.name, code: r.code, averageDurationMin: r.averageDurationMin, isPriority: r.isPriority });
    byDept.set(r.deptId, dept);
  }
  return [...byDept.values()];
}
