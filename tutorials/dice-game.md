# Building a Dice Game

This example demonstrates deterministic randomness, state, and events. It does
not handle money.

Contract randomness is derived from public execution context. Anyone can
reproduce it, so do not use this pattern for a value-bearing or adversarial
lottery.

```python
plays = Hash(default_value=0)
wins = Hash(default_value=0)

RollEvent = LogEvent(
    "Roll",
    {
        "player": indexed(str),
        "guess": int,
        "roll": int,
        "won": bool,
    },
)

@export
def play(guess: int):
    assert 1 <= guess <= 6, "Guess must be between 1 and 6"

    random.seed()
    roll = random.randint(1, 6)
    won = roll == guess

    plays[ctx.caller] += 1
    if won:
        wins[ctx.caller] += 1

    RollEvent({
        "player": ctx.caller,
        "guess": guess,
        "roll": roll,
        "won": won,
    })
    return {"roll": roll, "won": won}

@export
def stats(player: str):
    return {"plays": plays[player], "wins": wins[player]}
```

Test the input bounds, event data, and counter updates with
`ContractingClient`. If an application needs unpredictable outcomes, use a
reviewed oracle or commit-reveal design with an explicit threat model.

## Related Pages

- [Random](/smart-contracts/stdlib/random)
- [Events](/smart-contracts/events)
- [Unit Testing](/smart-contracts/testing/unit-testing)
