# Random

The runtime exposes a deterministic `random` module.

## Important Caveat

This is not secret randomness. It is seeded from public execution context, so
observers can reproduce it.

## Available Functions

```python
random.seed()
random.seed("round-2")
random.random()
random.getrandbits(k)
random.shuffle(items)
random.randrange(k)
random.randint(a, b)
random.choice(items)
random.choices(items, k=k)
```

## Rule

Call `random.seed()` before using the module in a transaction.

`random.random()` returns a decimal in `[0, 1)` with 30 fractional digits:
`randbelow(10**30) / 10**30`, drawn from the same deterministic stream as
`random.randrange(10**30)`. Python's `random()` returns a 53-bit binary float;
Xian has no floats, so its `random()` is an exact decimal you can store,
compare, multiply or `round()` like any other decimal:

```python
random.seed()
chance = random.random()            # e.g. 0.341585206632285841914278737654
if chance < decimal("0.25"):
    ...
percent = round(chance * 100, 2)    # a decimal with 2 places
```

The base seed is derived from:

- `chain_id`
- `block_num`
- `block_hash`
- `__input_hash`

The node passes the transaction input hash explicitly. Native execution does
not inherit seed fields from earlier host activity. Identical transaction and
block inputs reproduce the same sequence; different transaction input hashes
can produce different sequences within the same block.

If you pass a value to `random.seed(...)`, it is treated as a literal extra
salt and resets the sequence for that execution.

## Good Uses

- lightweight games
- shuffled ordering with accepted predictability

## Bad Uses

- hidden lotteries
- cryptographic secrets
- anything that depends on unpredictability

For escrowed draws, the [catalog lottery entropy contract](https://github.com/xian-technology/xian-contracts/tree/main/contracts/lottery-entropy)
uses two independent commitments before entries open. The contracts verify
reveals after close and provide a deadline for refunds when a reveal is missing.
