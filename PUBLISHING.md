# Putting Carioca on a phone

The game is one HTML file, so a phone needs it on an HTTPS host. Everything
below is already in the repository; the two steps that cannot be done from
here are the two that need your accounts.

## What is already done

    ./pwa.sh            builds ./pwa — the game, manifest, service worker, icons
    wrangler.toml       tells Cloudflare to run that build and serve ./pwa
    ./publish.sh        runs the harness, then pushes `release`
    src/icon-1024.png   the home-screen icon

`./pwa.sh` has been run and the result checked over HTTP: every file serves,
the manifest and apple-touch-icon are linked, the service worker registers,
and a fresh deal comes out.

## The two steps that need you

**1. A GitHub repository.** Carioca's git history is local only. Make an empty
repo — `carioca-rummy` under the same account as Canasta — and:

    cd ~/CariocaApp
    git remote add origin https://github.com/<account>/carioca-rummy.git
    git push -u origin main

**2. A Cloudflare project.** In the dashboard, create a Worker from that repo.
Two settings decide whether it works at all, and the failure when they are
wrong says nothing useful:

  * **Build command** — `./pwa.sh carioca.html`
    Without it Cloudflare deploys without building and fails with
    "Could not detect a directory containing static files", because `pwa/` is
    generated and is not in the repository.
  * **Production branch** — `release`, not `main`.
    This is what makes an ordinary commit cost nothing. Canasta learned it the
    expensive way: a provider that rebuilt on every push to main exhausted its
    free tier on documentation commits.

The project NAME must match `name = "carioca-rummy"` in wrangler.toml, or the
deploy goes to a different Worker and the site never changes.

## Then, from here

    ./publish.sh

It refuses unless you are on main with everything committed, runs the suites
and the phone-layout check, and only then fast-forwards `release` and pushes.
That push is the only thing that ever builds the site.

## On the phone

Open the address in Safari, then Share ▸ Add to Home Screen. It launches with
its own icon, no browser chrome, and works with no signal — the service worker
holds the whole game, which is one file.
