# Dungeon Viewer

Mappe D&D con vista Master (mappa completa) e vista Giocatore (nebbia di battaglia).

## Avvio

```bash
docker compose up --build -d
```

Apri **http://localhost:8081**

| Ruolo     | Username | Password |
|-----------|----------|----------|
| Master    | master   | master   |
| Giocatore | player   | player   |

## Storage persistente

Tutti i dati sono salvati nella cartella **`data/`** sul tuo computer e restano anche dopo `docker compose down` o un rebuild:

| Cartella | Contenuto |
|----------|-----------|
| `data/projects/` | Cartelle e mappe caricate |
| `data/fog/` | Stato nebbia di battaglia per mappa |
| `data/tokens/` | Pedine su ogni mappa |
| `data/users.json` | Account (creato al primo avvio) |

Per backup o trasferimento su un altro PC, copia l’intera cartella `data/`.

## Mappe

**Formati supportati:** PNG, JPG, JPEG, WEBP, GIF, SVG (max 50 MB).

Il **Master** può caricare le mappe direttamente dal browser (drag & drop o selezione file), organizzandole in cartelle.

### Generare mappe

Puoi creare mappe procedurali gratuitamente su **[watabou.itch.io](https://watabou.itch.io/)** — alcuni generatori utili per D&D:

- [One Page Dungeon](https://watabou.itch.io/one-page-dungeon) — dungeon su una pagina
- [Medieval Fantasy City Generator](https://watabou.itch.io/medieval-fantasy-city-generator) — città fantasy
- [Cave/Glade Generator](https://watabou.itch.io/cave-glade-generator) — grotte e radure
- [Procgen Mansion](https://watabou.itch.io/procgen-mansion) — palazzi e manieri
- [Perilous Shores](https://watabou.itch.io/perilous-shores) — regioni e mappe overworld

Esporta l'immagine generata (PNG o JPG) e caricala nell'app.
