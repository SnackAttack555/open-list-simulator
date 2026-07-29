# Putting the simulator on mi-sim.representation.vote

## Summary of the request

Move DNS hosting for `representation.vote` from Namecheap to Cloudflare, so we can
serve an app at `mi-sim.representation.vote`.

**Domain registration stays at Namecheap.** Only the nameservers change — that is, who
answers DNS queries. Cloudflare DNS is free at any volume.

## Why a CNAME isn't enough

The obvious ask would be "add one CNAME record for `mi-sim`." That does not work here,
for three separate reasons:

1. Cloudflare Workers custom domains require the domain to be an **active zone on
   Cloudflare**. A record pointing in from an outside DNS provider isn't sufficient —
   Cloudflare has to be authoritative for the zone to issue the certificate and route
   the request.
2. Cloudflare **refuses CNAMEs that cross accounts** (error 1014, "CNAME Cross-User
   Banned"). An external CNAME aimed at the app's current `*.workers.dev` hostname is
   exactly the configuration that error exists to block.
3. Delegating only the `mi-sim` subdomain to Cloudflare via NS records is an
   **Enterprise-plan feature**, not available on Free, Pro, or Business.

## What changes, and what doesn't

| | Before | After |
|---|---|---|
| Registrar (who we buy the domain from) | Namecheap | **Namecheap — unchanged** |
| DNS host (who answers lookups) | Namecheap | Cloudflare |
| Website at `representation.vote` | 103.169.142.0 | **Same server, unchanged** |
| Email (Google Workspace) | `smtp.google.com` | **Same, unchanged** |
| Cost | — | **$0** |

The whole point is that every existing record is recreated identically on Cloudflare
before the switch, so nothing about the website or email changes behavior.

## Records that must be recreated exactly

This is the full public record set as of 2026-07-27. Cloudflare's onboarding scan
imports these automatically, but **the import must be verified against this list before
the nameservers are switched** — a missed MX or SPF record means broken email.

```
A      representation.vote        103.169.142.0
A      www.representation.vote    103.169.142.0
MX     representation.vote        1 smtp.google.com.
TXT    representation.vote        "v=spf1 include:_spf.google.com ~all"
TXT    representation.vote        "google-site-verification=JirkSrNdS3edKyHJXDRebQryhXS61Xyt2S0iMJBICn8"
TXT    representation.vote        "canva-domain-verify=d956c1bd-69c7-44bc-be9e-2f034acef78a"
TXT    _dmarc.representation.vote "v=DMARC1; p=none; rua=mailto:cg7izknf@ag.us.dmarcian.com;"
```

**Caveat:** this list comes from public DNS queries, so it covers everything resolvers
can see, but it cannot show records that exist only in the Namecheap control panel and
aren't published (or any DKIM selector we don't know the name of). **Please export the
full zone from Namecheap and compare.** DKIM in particular is usually at a selector like
`google._domainkey` — it must come over or outbound mail starts failing DMARC
alignment.

## Two settings that matter on the Cloudflare side

1. **Set the apex and `www` A records to "DNS only" (grey cloud), not "Proxied."**
   Cloudflare defaults new imports to proxied, which would route the main website
   through Cloudflare's edge and can break TLS depending on how the current host is
   configured. Grey cloud makes this a pure DNS move with zero change in behavior. It
   can always be turned on deliberately later.
2. **MX and TXT records are never proxied** — Cloudflare handles this correctly on its
   own, but worth confirming visually after import.

## Recommended sequence

Steps 1–3 change nothing for users and are fully reversible. Only step 4 is the cutover.

1. **Add `representation.vote` to Cloudflare** (free plan). Cloudflare scans the existing
   DNS and imports what it finds, then issues two assigned nameservers. *Nothing goes
   live at this point — Namecheap is still authoritative.*
2. **Verify the imported records** against the table above plus the Namecheap zone
   export. Fix anything missing. Set apex and `www` to DNS-only.
3. **IT reviews and signs off** on the record comparison.
4. **Switch the nameservers at Namecheap** to the two Cloudflare assigns.
   Namecheap → Domain List → Manage → Nameservers → Custom DNS.

   Propagation can take up to 48 hours, during which either provider may answer. This
   is exactly why the record sets must match — if they do, mixed answers are harmless.
5. **Add the custom domain to the Worker** once the zone shows Active: Workers &
   Pages → `open-list-simulator` → Settings → Domains & Routes → Add → Custom Domain →
   `mi-sim.representation.vote`. Cloudflare creates the DNS record and issues the
   certificate automatically, usually within a few minutes.

## Rollback

Set the nameservers at Namecheap back to `dns1.registrar-servers.com` and
`dns2.registrar-servers.com`. The Namecheap zone is not deleted by any of this, so
reverting restores the previous state.

## If IT declines

Reasonable — moving DNS for the org's live domain is a real change to support a side
project. Two fallbacks, in order of preference:

- **Use a separate domain we control outright.** Register something on Cloudflare
  directly, put the simulator there, and never touch org DNS. Loses the
  `representation.vote` association, which is most of the credibility benefit.
- **Namecheap URL redirect.** Namecheap can 301 `mi-sim.representation.vote` to the
  `workers.dev` URL. The link we share looks right, but the address bar shows
  `workers.dev` once it lands, so it only half-solves the problem. Avoid the "masked"
  redirect option — it frames the site and breaks sharing and mobile behavior.

## Why bother at all

The app currently lives at `open-list-simulator.adam-368.workers.dev`. `workers.dev` is
shared infrastructure that also hosts phishing, so some corporate networks and security
gateways block the entire domain. Public DNS filters (Quad9, OpenDNS, AdGuard) all pass
it — this is about enterprise proxies, not consumer DNS. For a link we want to send to
legislators, funders, and partner organizations, a `representation.vote` subdomain is
both more deliverable and more obviously ours.
