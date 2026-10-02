import Link from 'next/link';
import { CalendarPlus, Clock, Search, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireRole } from '@/lib/auth/guards';
import { listCatalog } from '@/lib/services/catalog';

export default async function CustomerHome({ searchParams }: PageProps<'/customer'>) {
  await requireRole('customer');
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';
  const catalog = await listCatalog(query);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-muted-foreground">Choose a service to book an appointment or take a walk-in token.</p>
      </div>

      {/* §9: plain GET form, so search works without JavaScript and links can be shared */}
      <form className="flex gap-2" role="search">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search departments or services"
          aria-label="Search departments or services"
          className="h-10"
        />
        <Button type="submit" size="lg" className="h-10">
          <Search />
          <span className="hidden sm:inline">Search</span>
        </Button>
      </form>

      {catalog.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{query ? 'No matches' : 'No services yet'}</CardTitle>
            <CardDescription>
              {query ? (
                <>
                  Nothing matches &ldquo;{query}&rdquo;.{' '}
                  <Link href="/customer" className="font-medium text-primary underline-offset-4 hover:underline">
                    Show all services
                  </Link>
                </>
              ) : (
                'No services are available right now. Please check back later.'
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        catalog.map((dept) => (
          <section key={dept.id} className="space-y-3" aria-labelledby={`dept-${dept.id}`}>
            <h2 id={`dept-${dept.id}`} className="text-lg font-semibold">
              {dept.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {dept.services.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>{service.name}</CardTitle>
                      <Badge variant="secondary" aria-label={`Token prefix ${service.code}`}>
                        {service.code}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden />
                      About {service.averageDurationMin} min per visit
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {/* Wired up in Phase 3 (appointments) and Phase 4 (tokens). */}
                    <Button disabled title="Available soon">
                      <CalendarPlus />
                      Book
                    </Button>
                    <Button variant="outline" disabled title="Available soon">
                      <Ticket />
                      Get token
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
