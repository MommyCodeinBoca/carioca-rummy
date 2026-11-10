# Carioca Rummy

Seven contracts, two decks, one player against three AI seats.

From `Carioca Rummy Game.docx` on the Desktop, plus the corrections made since.
Where this file and that document disagree, the document is out of date —
every rule here is quoted at the code that implements it.

## State

Built and tested: the rules engine, the round, and an AI that plays all seven
contracts to a finish.

    ./tests/run.sh            277 assertions, a 280-round soak, and 2,800
                              generated hands

The table is built and playable — one file, open `carioca.html` in a browser.

The look follows `carioca card sample.PNG`: a green damask felt, hands fanned in
an arch, red-and-gold card backs with a medallion, gold-rimmed round buttons.
Everything is drawn in CSS and inline SVG, so the game stays one file that works
with no signal.

Three layout bugs worth remembering, all found by measuring the rendered boxes
rather than by looking:

- **Scaled cards leave full-size holes.** `transform: scale()` does not change
  the layout box, so the melds sat inside big empty rectangles. Small cards are
  a smaller `--card-w`, never a transform.
- **Absolute seats collide.** North's melds flowed down over the stock. The
  table is a column of rows now, and rows cannot overlap.
- **A rotated card hangs below its own baseline** by half a width times the
  sine of its angle. The outermost card of the fan was 11px past the bottom of
  the screen with its corners shaved off.

### How it plays, 40 deals a contract

| contract | finished | avg turns | −20 | avg losing hand |
|---|---|---|---|---|
| 2 trios | 40/40 | 31 | 1 | 19 |
| 1 trio + 1 run | 40/40 | 50 | 2 | 24 |
| 2 runs | 40/40 | 66 | 0 | 29 |
| 3 trios | 40/40 | 32 | 0 | 28 |
| 2 trios + 1 run | 40/40 | 36 | 5 | 44 |
| 1 trio + 2 runs | 40/40 | 60 | 1 | 35 |
| 3 runs | 40/40 | 63 | 0 | 47 |

Runs are the hard part, as they should be — the run contracts take twice as
long and leave twice the points in hand.

### Measured AI rules

Each played AGAINST itself at the same table — seats 0 and 2 with the rule, 1
and 3 without, then swapped. A symmetric soak cannot tell "this helps me" from
"this helps everybody": four seats all declining to feed their left makes every
hand lighter, which looks like a gain and may be nothing of the kind.

350 rounds, points a seat a round, **fewest wins**:

| rule | with | without | |
|---|---|---|---|
| buying jokers off the table | **8.3** | 26.5 | wins by 18.3 |
| not feeding the player on your left | **14.5** | 15.3 | wins by 0.8 |

Buying jokers also finishes rounds in 35 turns instead of 53.

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
