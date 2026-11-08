# Carioca Rummy

Seven contracts, two decks, one player against three AI seats.

From `Carioca Rummy Game.docx` on the Desktop, plus the corrections made since.
Where this file and that document disagree, the document is out of date —
every rule here is quoted at the code that implements it.

## State

Built and tested: the rules engine and the round.

    ./tests/run.sh            117 assertions

Not built yet: the AI, the table, anything you can see.

## Corrections to the document

**The first contract is 2 trios, not 3.** Every row of the contract table is
`deal = trios×3 + runs×4 + 1`, the spare being the card discarded to end the
turn. Only the first row broke that, by exactly one trio, and it would also have
made the first contract identical to the fourth.

**Runs are circular.** Q-K-A-2 is a run, so the Ace is no boundary. A run is
4+ consecutive cards of one suit anywhere around the circle, and cannot lap it.

**A steal does not change turn order.** "The person next to the last player is
up next" means next to the last player to take a *turn* — the discarder. The
stealer pays two cards out of turn and the table carries on as it was.

## Things the document does not settle

- **An end-joker is not exchangeable.** A joker in a gap — 4♥ 5♥ **J** 7♥ —
  plainly stands for the 6♥. On the end — 4♥ 5♥ 6♥ **J** — it could be the 3♥ or
  the 7♥, and nobody can say which, so there is no card it was "meant to
  replace". The alternative is to have the owner declare it when they lay it.
- **The stock running out.** Not mentioned. The discards are turned over and
  reshuffled, keeping the face-up card where it is.
- **Going out.** The hand empties, by whatever route the last card left it —
  thrown to the pile or laid onto your own melds.
