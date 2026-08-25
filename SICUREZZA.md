# Messa in sicurezza — cosa è successo e cosa fare

## Il problema

Il gestionale era accessibile a chiunque, senza password.

Due cose si sommavano:

1. **La password era scritta nel codice**, in un repository pubblico:
   `const PIN_CORRETTO = '1974'`. Il controllo avveniva nel browser, quindi
   bastava leggere il sorgente della pagina per conoscerla.
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

## Cosa è già stato corretto in questo repository

- Rimossa la password dal codice.
- Il login ora interroga il server: la pagina non decide più da sola.
- Ogni chiamata al backend porta con sé un token di sessione, aggiunto
  automaticamente da un'unica intercettazione delle `fetch()` — così nessuna
  delle ~16 chiamate può restare scoperta per dimenticanza.
- Se il server risponde "non autorizzato", la sessione si chiude da sola.
- Il campo password accettava al massimo 6 caratteri: ora ne accetta 128.
- Aggiunto `BACKEND-autenticazione.gs`, la guardia da installare lato server.

**L'URL dell'Apps Script è stato sostituito da un segnaposto.** Finché non
completi i passaggi qui sotto, il gestionale non funziona. È voluto: meglio
fermo che aperto a chiunque.

## Cosa devi fare tu (io non ho accesso al tuo account Google)

### 1. Chiudi la falla, subito

Apps Script → **Distribuzioni** → quella attuale → **Archivia**.
Da questo momento i dati non sono più raggiungibili.

### 2. Installa la guardia

Segui le istruzioni in testa a `BACKEND-autenticazione.gs`. In sintesi:
rinomina `doGet`/`doPost` in `gestisciGet`/`gestisciPost`, incolla il file,
imposta una password lunga e casuale.

### 3. Ridistribuisci con un URL nuovo

**Nuova distribuzione** (non "gestisci": serve un URL diverso, perché il
vecchio è ormai pubblico e resta per sempre nella cronologia git).
Copia il nuovo URL in `index.html`, al posto di `INCOLLA_QUI_IL_NUOVO_URL_APPS_SCRIPT`.

### 4. Chiudi i PDF su Google Drive

La cartella dei contratti è su "chiunque abbia il link". Portala su
**"Con limitazioni"**. I link già circolati smettono di funzionare.

### 5. Rendi privati i repository

Nessuno di questi cinque deve essere pubblico.
Attenzione: renderli privati **non annulla** l'esposizione già avvenuta.
Password e URL restano nella cronologia e potrebbero essere già stati copiati.
È una misura in più, non un rimedio.

### 6. Valuta la notifica al Garante

L'esposizione ha riguardato dati identificativi e fiscali di persone fisiche.
Vale la pena sentire un consulente privacy: la valutazione non è tecnica e
non posso farla io.

## Gli altri repository

| Repository | Stato |
|---|---|
| `preventivi-contratti` | 🔴 era aperto — corretto qui |
| `prenota-tagliando` | 🟢 password verificata dal server, corretto |
| `ritiro-auto` | 🟢 stesso schema corretto |
| `tracker-consegne` | 🟡 nessuna autenticazione, ma l'URL non è pubblicato |
| `preparazione-veicoli` | 🟡 come sopra |

I due in giallo non sono esposti oggi, perché l'URL dell'Apps Script non
compare nel codice: lo inserisci tu al primo avvio e resta nel browser. Però
non hanno una seconda linea di difesa — chi ottiene l'URL ha accesso completo,
comprese le cancellazioni.

Non li ho modificati di mia iniziativa: non hanno una schermata di login, e
aggiungerne una cambia il funzionamento di due strumenti che oggi girano.
`BACKEND-autenticazione.gs` è riutilizzabile su entrambi quando vuoi
affrontarli — la stessa guardia, con un token per app.
