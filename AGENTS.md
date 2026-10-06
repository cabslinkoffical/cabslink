<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Protected-route navigation reads the persisted browser session to avoid transient remote-check redirect loops; server functions still validate bearer tokens and roles for private operations.
- Booking wizards share a step-change scroll hook; summary disclosure uses responsive visibility so mobile starts collapsed while desktop stays visible.
- Install the query adapter's SSR readiness compatibility through a separate helper after query integration; this preserves streaming and avoids coupling route type inference to the adapter wrapper.
- Destination hubs use the shared navy `PageHero`/`HubPage` language, while area directories and location pages use one navy-led editorial system so navigation remains consistent.
