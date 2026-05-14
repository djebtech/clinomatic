"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function IntegrationsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intégrations</h1>
          <p className="text-gray-500 text-sm">التكاملات — réseaux sociaux</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Instagram Business</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Connectez votre compte Instagram pour capturer automatiquement les demandes de rendez-vous dans les messages directs.
          </p>
          <div className="bg-orange-50 text-orange-700 text-sm p-3 rounded-lg border border-orange-200">
            Nécessite un compte Instagram Business et une application Meta approuvée.
          </div>
          <Button className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            📸 Connecter Instagram
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Facebook Page</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Connectez votre Page Facebook pour capturer les messages Messenger et les demandes de rendez-vous.
          </p>
          <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg border border-blue-200">
            Configure le webhook META_VERIFY_TOKEN dans vos paramètres d&apos;application Meta.
          </div>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            📘 Connecter Facebook
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Configuration Webhook</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-gray-500">URLs de webhook à configurer dans le tableau de bord Meta :</p>
          <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs space-y-1">
            <p><span className="text-gray-400">Instagram:</span> /api/webhooks/instagram</p>
            <p><span className="text-gray-400">Facebook:</span> /api/webhooks/facebook</p>
            <p><span className="text-gray-400">WhatsApp:</span> /api/webhooks/whatsapp</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
