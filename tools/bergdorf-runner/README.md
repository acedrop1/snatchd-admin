# Bergdorf runner

Reads Bergdorf Goodman's own per-store stock and sends it to Snatchd. Runs on a
Mac with Google Chrome installed, because bergdorfgoodman.com is behind DataDome:
servers and automation fingerprints are blocked, a real Chrome profile is not.

## Setup (once)

    cd tools/bergdorf-runner
    npm install
    npx playwright install chrome      # uses the installed Google Chrome
    cp .env.example .env               # fill RUNNER_TOKEN (functions/.env) and STORE_ID

## Try it

    npm run check                      # per-store stock for 3 shown products
    node runner.mjs refresh --handle redvalentino-small-hobo-emil-prod201800161
    node runner.mjs catalog --limit 50 # first 50 "Get It Fast" items → hidden in the portal until shown

## Run it for real

`serve` stays up: answers live checks the app asks for (a product being opened),
refreshes shown products at 10:30 and 15:00, and walks the whole catalog at 03:00.

    sed "s#__RUNNER_DIR__#$PWD#g" com.snatchd.bergdorf-runner.plist > ~/Library/LaunchAgents/com.snatchd.bergdorf-runner.plist
    launchctl load ~/Library/LaunchAgents/com.snatchd.bergdorf-runner.plist
    tail -f runner.log

The Mac must stay awake (System Settings → Energy → prevent sleep, or a Mac mini).
Keep `chrome-profile/` — it's the identity DataDome trusts.

## What it writes

`products/bergdorf_<id>_<storeId>` with per-size `availability` taken from
Bergdorf's Find-In-Store answer for both Fifth Ave buildings (63/NY Women's at 754,
64/NY Goodman's Men's at 745 — a Snatcher can walk into either), and
`availabilitySource: "bergdorf"`. New catalog items land `isActive: false`;
show them from the store's Inventory tab in the portal.
