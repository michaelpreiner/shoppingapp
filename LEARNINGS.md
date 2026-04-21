# Projekt-Learnings & Tech Stack: Shopping Liste

Dieses Dokument fasst den Tech Stack, die wichtigsten Erkenntnisse (Learnings) aus der Entwicklung und die Best Practices (Was wir vermeiden sollten) zusammen.

## 🛠 Tech Stack

- **Frontend & Backend Framework:** Next.js (App Router)
- **UI & Logik:** React (Hooks: `useState`, `useEffect`, `useRef`), TypeScript
- **Datenbank & ORM:** SQLite (`dev.db`), Prisma ORM
- **Spracherkennung:** Native Browser `SpeechRecognition` API (Web Speech API)
- **Deployment & Infrastruktur:** Docker, Docker Compose, Hostinger VPS, Traefik (SSL/Reverse Proxy)
- **Integration:** Apple Siri Shortcuts (Senden von HTTP Requests an die Next.js API-Routen)

---

## 💡 Learnings (Was wir gelernt haben)

1. **Siri-Integration & Web-App-Synchronisation:**
   Siri (oder Apple Kurzbefehle) sendet Daten im Hintergrund an das Backend. Eine geöffnete Web-App bekommt davon von Haus aus nichts mit. 
   *Lösung:* Ein Mix aus periodischem Polling (z.B. alle 5 Sekunden) und Event-Listenern (`focus`, `visibilitychange`) stellt sicher, dass die App die Daten immer aktuell hält, sobald das Handy entsperrt oder die App wieder angesehen wird.

2. **React Hooks vs. Langlebige Browser-APIs:**
   Die `SpeechRecognition`-API muss idealerweise nur einmal initialisiert werden. Wenn man den `useEffect`-Hook, der diese API startet, an einen React-State (wie z.B. `locations`) bindet, wird die Spracherkennung bei jedem Polling-Refresh hart neugestartet.
   *Lösung:* Die Nutzung von `useRef` (z.B. `locationsRef.current = locations`), um aktuelle State-Werte in asynchronen Callbacks und Closures (wie `onresult`) verfügbar zu machen, ohne den Hook neu auszuführen.

3. **Silent Background Fetching:**
   Ein Lade-Indikator (`Lade Standorte...`) ist beim ersten Laden der Seite sinnvoll. Bei automatischen Hintergrund-Aktualisierungen (Polling) stört er jedoch enorm, da das UI flackert. Das Entkoppeln des Fetching-Status von Background-Requests ist essentiell für eine flüssige User Experience.

---

## 🚫 Was wir auf alle Fälle vermeiden sollten (Anti-Patterns)

1. **State-Variablen in langlebigen `useEffect`-Dependencies:**
   **Vermeiden:** `useEffect(() => { initSpeech(); }, [locations])`
   *Warum:* Weil ein Background-Refresh die `locations` aktualisiert (neue Array-Referenz) und somit die Spracherkennungs-Instanz mitten im Sprechen abstürzen oder neu starten lässt.

2. **Fehlende UI-Updates bei Drittsystem-Integrationen:**
   **Vermeiden:** Darauf vertrauen, dass der User die Seite schon manuell neu lädt, wenn er Siri benutzt hat.
   *Warum:* Es zerstört die Magie. Wenn ein Nutzer Siri bittet, etwas hinzuzufügen, und dann auf sein offenes Display schaut, **muss** das Item automatisch erscheinen.

3. **Blockierende Loading-States beim Polling:**
   **Vermeiden:** `setIsFetching(true)` bei jedem Polling-Intervall aufrufen.
   *Warum:* Das UI flackert alle 5 Sekunden oder versteckt die Liste für den Bruchteil einer Sekunde. Loading-States sollten beim Polling stillschweigend ignoriert werden (`fetchLocations(false)`).

4. **Komplexe State-Management Bibliotheken für simple Probleme:**
   **Vermeiden:** Für einen simplen 5-Sekunden Refresh direkt Redux, SWR oder React Query installieren, wenn es nicht zwingend notwendig ist.
   *Warum:* Ein einfacher `setInterval` kombiniert mit `visibilitychange` im `useEffect` ist für eine simple App oft ressourcenschonender, hat keine Dependencies und ist leichter nachvollziehbar.
