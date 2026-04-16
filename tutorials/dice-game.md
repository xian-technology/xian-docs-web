# Building a Dice Game

A dice game is a good teaching example for state, events, payouts, and the
deterministic `random` module.

## The One Rule To Remember

Xian randomness is deterministic and public. It is suitable for teaching
examples and predictable game mechanics. It is not suitable for secret or
adversarial-grade randomness.

## Core Pattern

1. track game balances and rounds in `Variable` or `Hash`
2. call `random.seed()` once per execution before drawing randomness
3. derive the roll with `random.randint(...)`
4. update balances and emit an event describing the result

Example shape:

```python
pot = Variable()
last_roll = Variable()

RollEvent = LogEvent(
    "Roll",
    {"player": indexed(str), "guess": int, "roll": int, "won": bool},
)


@construct
def seed():
    pot.set(0)
    last_roll.set(0)


@export
def play(guess: int, stake: float):
    assert 1 <= guess <= 6, "Guess must be between 1 and 6."
    assert stake > 0, "Stake must be positive."

    pot.set(pot.get() + stake)
    random.seed()
    roll = random.randint(1, 6)
    last_roll.set(roll)

    won = roll == guess
    if won:
        payout = stake * 2
        pot.set(pot.get() - payout)

    RollEvent({"player": ctx.caller, "guess": guess, "roll": roll, "won": won})
    return {"roll": roll, "won": won}
```

## Design Guidance

- keep the payout logic simple and easy to audit
- never describe `random` as secret randomness
- if a game needs stronger unpredictability, design around an oracle,
  commit-reveal, or another explicit mechanism instead of pretending the local
  runtime RNG is enough

## Related Pages

- [Random](/smart-contracts/stdlib/random)
- [Events](/smart-contracts/events)
- [Testing](/smart-contracts/testing/)
