# Random

The runtime exposes a deterministic `random` module.

## Important Caveat

This is not secret randomness. It is seeded from public execution context, so
observers can reproduce it.

## Available Functions

```python
random.seed()
random.seed("round-2")
random.getrandbits(k)
random.shuffle(items)
random.randrange(k)
random.randint(a, b)
random.choice(items)
random.choices(items, k=k)
```

## Rule

Call `random.seed()` before using the module in a transaction.

The base seed is derived from:

- `chain_id`
- `block_num`
- `block_hash`
- `__input_hash`

If you pass a value to `random.seed(...)`, it is treated as a literal extra
salt and resets the sequence for that execution.

## Good Uses

- lightweight games
- shuffled ordering with accepted predictability

## Bad Uses

- hidden lotteries
- cryptographic secrets
- anything that depends on unpredictability
