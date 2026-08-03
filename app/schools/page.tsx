import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Sparkles } from 'lucide-react';

export default function SchoolsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Écoles</h1>
            <p className="text-muted-foreground">
              Supervision des établissements et de leurs paramètres de fonctionnement.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            En préparation
          </Badge>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Centre de gestion des écoles</CardTitle>
                <CardDescription>
                  Cette vue permettra de piloter les établissements, leurs abonnements et leurs administrateurs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            L’expérience sera enrichie progressivement avec les modules de gestion réels.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
