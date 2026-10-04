# PHONK RIDE

A browser-based drift game with a Node.js server, SQLite profiles, and payment verification. No build step or third-party package installation is required.

## Run

```powershell
node server.js
```

Open the printed URL on the computer. To use a phone on the same Wi-Fi, open `http://<computer-LAN-IP>:4173/`. Keep the server running while playing.

Players create an account to receive 200 starting credits. Rider IDs and salted password hashes are stored in `phonk-ride.sqlite`. Configure `SOLANA_RPC_URL` to use a dedicated Solana RPC provider.

Run checks with:

```powershell
node --test
```

## Security limits

Account/profile mutations, payment orders, payment verification, and withdrawals require the active session. Credit withdrawals are debited atomically, and payment signatures are checked for reuse and order timing.

The game currently calculates round outcomes in the browser. Those outcomes are not trusted or written to the server balance, so do not treat game winnings as redeemable credits. Before any public or real-money deployment, move game settlement to server-side validation, use HTTPS, configure secure session storage and backups, and complete a payment-provider and withdrawal review. The included HTTP server is intended for local-network use, not direct public exposure.
