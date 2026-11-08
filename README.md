# Carioca Rummy

Seven contracts, two decks, one player against three AI seats.

From `Carioca Rummy Game.docx` on the Desktop, plus the corrections made since.
Where this file and that document disagree, the document is out of date —
every rule here is quoted at the code that implements it.

## State

Built and tested: the rules engine and the round.

    ./tests/run.sh            143 assertions

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

**An end-joker is declared when it is laid.** A joker in a gap names itself —
4♥ 5♥ **J** 7♥ can only be the 6♥. On the end it could cap either side, so the
player says which, and from then on it *is* that card: exchangeable, and fixed
if the run grows. Laying an undeclared end-joker is refused and nothing goes
down, because the contract is all-or-nothing.

**A turn always ends with a card thrown.** So the last card in a hand can never
be laid off — going out means shedding everything down to one card and
discarding it.

**The stock running out.** Not in the document. The discards are turned over and
reshuffled, keeping the face-up card where it is.
