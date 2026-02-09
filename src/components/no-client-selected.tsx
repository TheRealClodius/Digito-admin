import { AlertCircle } from "lucide-react";

export function NoClientSelected() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-700 dark:text-blue-300">
      <AlertCircle className="size-5 shrink-0" />
      <div>
        <p className="font-semibold">Nessun cliente selezionato</p> {/* No client selected */}
        <p className="text-xs mt-1 opacity-90">
          Seleziona un cliente e un evento dalla barra laterale per visualizzare i dati.
          {/* Select a client and event from the sidebar to view data. */}
        </p>
      </div>
    </div>
  );
}
