# Messa in sicurezza — cosa è successo e cosa è stato fatto

## Il problema

Il gestionale era accessibile a chiunque, senza password.

Due cose si sommavano:

1. **La password era scritta nel codice**, in un repository pubblico, come
   `const PIN_CORRETTO = '...'` con il valore in chiaro. Il controllo avveniva
   nel browser, quindi bastava leggere il sorgente della pagina per conoscerla.
2. **Il backend non controllava nulla.** Anche senza password, chiamando
   direttamente l'URL dell'Apps Script si ottenevano i dati.

Verificato il 24/08/2026 interrogando l'endpoint senza alcuna autenticazione:

- `getRegistro` restituiva **30 contratti** per **€400.363** complessivi
- `getDettaglio` restituiva la scheda completa del cliente: **codice fiscale,
  data e luogo di nascita, residenza, telefono, email, PEC, P.IVA**, più targa
  e numero di telaio del veicolo
- i **30 PDF su Google Drive** erano scaricabili in anonimo (verificato)
- le azioni `eliminaDoc`, `eliminaFattura` e `inviaEmail` erano ugualmente
  prive di controlli

Dati anagrafici e fiscali di 30 clienti esposti pubblicamente: è una violazione
di dati personali ai sensi del GDPR.

## Cosa è stato corretto

### Frontend (`index.html`)

- Rimossa la password dal codice.
- Il login ora interroga il server: la pagina non decide più da sola.
- Ogni chiamata al backend porta un token di sessione, aggiunto
  automaticamente da un'unica intercettazione delle `fetch()` — così nessuna
  delle ~16 chiamate può restare scoperta per dimenticanza, comprese quelle
  che verranno aggiunte in futuro.
- Se il server risponde "non autorizzato", la sessione si chiude da sola.
- Il campo password accettava al massimo 6 caratteri: ora ne accetta 128.

### Backend (Apps Script "Donolauto – Preventivi Backend")

Aggiunto il file `autenticazione.gs`, che rifiuta ogni richiesta priva di un
token di sessione valido. Il token si ottiene solo con la password, che vive
**esclusivamente** nell'Apps Script e non compare in questo repository.

In `Codice.gs` è stata aggiunta **una riga** all'inizio di `doGet` e di
`doPost`, e nient'altro:

```js
const _bloccato = _verificaAccesso(e); if (_bloccato) return _bloccato;
```

Poiché tutte le azioni passano da quei due punti d'ingresso, la protezione
copre l'intera API — incluse `eliminaDoc`, `eliminaFattura` e `inviaEmail` —
senza toccare nessuna delle altre 19 funzioni.

`BACKEND-autenticazione.gs` in questo repository è la copia di riferimento di
quel file, con la password sostituita da un segnaposto.

### Perché l'URL è rimasto lo stesso

L'URL di una web app Apps Script non è una credenziale: è l'indirizzo di
un'API. Finché l'API non chiedeva niente, conoscerlo bastava per leggere
tutto — ma adesso che chiede password e token, conoscerlo non serve più a
nulla. Rigenerarlo avrebbe solo costretto a riconfigurare il frontend senza
aggiungere sicurezza reale.

Il segreto vero — la password — non è mai passato da GitHub.

## Cosa resta da fare

### Chiudere i PDF su Google Drive

La cartella dei contratti è condivisa come "chiunque abbia il link", e i 30
link erano stati distribuiti da un'API aperta. Vanno portati su
**"Con limitazioni"**: finché restano così, i PDF sono scaricabili da chi si
sia salvato un link, indipendentemente dall'autenticazione appena aggiunta.

### Il codice di accesso è di 4 cifre: valutare 6

Il codice attuale è numerico di 4 cifre, scelto per comodità. Non è quello
vecchio finito nel repository, quindi non è più leggibile da nessuno — ma
resta la categoria di password più facile da indovinare, perché chi attacca
prova per prime le cifre che sembrano un anno: l'intervallo 1900-2030 sono
circa 130 combinazioni.

Per compensare, il freno sui tentativi è stretto: **5 tentativi ogni 30
minuti**, cioè 10 all'ora. Un attacco mirato all'intervallo degli anni
richiederebbe quindi una giornata buona di lavoro continuo, non minuti.

Portarlo a 6 cifre non-data cambia l'ordine di grandezza: lo stesso attacco
passa da ore ad anni. Si modifica solo la riga `PASSWORD_ACCESSO` in
`autenticazione.gs`, poi **Esegui il deployment > Gestisci deployment >
matita > Versione: Nuova versione**.

Il codice non compare in questo repository e non deve mai comparirci.

### Controllare con chi sono condivisi gli Apps Script

Sette progetti risultano condivisi con altre persone. Chi ha accesso in
modifica a uno script ne legge il codice, quindi anche la password. Vale la
pena verificare l'elenco e togliere chi non serve.

### Valutare la notifica al Garante

L'esposizione ha riguardato dati identificativi e fiscali di persone fisiche.
La valutazione non è tecnica: sentire un consulente privacy.

## Gli altri repository

| Repository | Stato |
|---|---|
| `preventivi-contratti` | 🟢 corretto (era aperto) |
| `prenota-tagliando` | 🟢 password verificata dal server |
| `ritiro-auto` | 🟢 stesso schema corretto |
| `tracker-consegne` | 🟡 nessuna autenticazione, ma l'URL non è pubblicato |
| `preparazione-veicoli` | 🟡 come sopra |

I due in giallo non sono esposti oggi, perché l'URL dell'Apps Script non
compare nel codice: lo inserisci tu al primo avvio e resta nel browser. Però
non hanno una seconda linea di difesa — chi ottiene l'URL ha accesso completo,
comprese le cancellazioni. `BACKEND-autenticazione.gs` è riutilizzabile su
entrambi quando vuoi affrontarli.

## Sui repository pubblici

Non c'è più niente di segreto in questo repository, quindi lasciarlo pubblico
non è più un problema di sicurezza. Renderlo privato è possibile, ma su piano
gratuito **GitHub Pages non funziona da repository privati**: le applicazioni
andrebbero offline. E non annullerebbe comunque l'esposizione passata — la
vecchia password è nella cronologia git e va considerata bruciata.
