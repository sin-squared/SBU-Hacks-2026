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

- Game rules/data live in src/game (pure, tested in src/test/economy.test.ts); UI components only read state and call useGame actions — keeps logic testable and teammates decoupled.
- Strategic city rules live in city.ts with tunable values in city-config.ts; the active dashboard reads useCity and dispatches actions, keeping production and progression testable without UI.
- Browser persistence uses a versioned validated city-save envelope and migrates legacy balances/buildings; save only committed reducer state to prevent stale writes and duplicate expedition collections.
