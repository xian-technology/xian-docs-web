# Random

The runtime exposes a deterministic `random` module.

## Important Caveat

This is not secret randomness. It is seeded from public block and transaction
context, so observers can reproduce it.

## Available Functions

```python
random.seed()
random.getrandbits(k)
random.shuffle(items)
random.randrange(k)
random.randint(a, b)
random.choice(items)
random.choices(items, k=k)
```

## Rule

Call `random.seed()` before using the module in a transaction.

## Good Uses

- lightweight games
- shuffled ordering with accepted predictability

## Bad Uses

- hidden lotteries
- cryptographic secrets
- anything that depends on unpredictability
