import { AppShell } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Sparkles } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Abonnements</h1>
            <p className="text-muted-foreground">
              Suivi des licences, des plans et des renouvellements des établissements.
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
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Gestion des abonnements</CardTitle>
                <CardDescription>
                  Cette vue sera dédiée à la gestion des forfaits, des paiements et des statuts d’accès.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Les fonctions commerciales seront complétées au fil de l’intégration du produit.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
