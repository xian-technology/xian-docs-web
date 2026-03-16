# Random

The `random` module provides deterministic pseudo-random numbers. All validators produce the same "random" values for the same block, ensuring consensus.

## Usage

```python
import random

@export
def roll_dice():
    random.seed()  # MUST seed first
    return random.randint(1, 6)
```

**You must call `random.seed()` before using any random function.** Forgetting to seed will raise an error.

## Seeding

```python
random.seed()                          # Default seed from block context
random.seed(aux_salt="my_unique_key")  # Add extra entropy per-call
```

The seed is derived from: `block_height + block_hash + input_hash + auxiliary_salt`. This means:

- Same block, same salt → same random sequence (deterministic)
- Different blocks → different random sequences
- Different `aux_salt` values in the same block → different random sequences

Use `aux_salt` when you need multiple independent random sequences in one transaction.

## Functions

### `random.randint(a, b)`

Random integer from `a` to `b` inclusive.

```python
random.seed()
value = random.randint(1, 100)  # 1 to 100
```

### `random.randrange(k)`

Random integer from `0` to `k-1`.

```python
random.seed()
index = random.randrange(10)  # 0 to 9
```

### `random.choice(sequence)`

Pick one random element from a list.

```python
random.seed()
winner = random.choice(["alice", "bob", "carol"])
```

### `random.choices(sequence, k=n)`

Pick `n` elements with replacement.

```python
random.seed()
picks = random.choices(["red", "blue", "green"], k=3)
```

### `random.shuffle(sequence)`

Shuffle a list in-place.

```python
random.seed()
items = [1, 2, 3, 4, 5]
random.shuffle(items)
```

### `random.getrandbits(k)`

Return an integer with `k` random bits.

```python
random.seed()
big_random = random.getrandbits(256)
```

## Security Considerations

The random values are **not truly random** — they are deterministic based on block data. This means:

- A validator who proposes the block can predict the random values
- Front-running is possible if the seed inputs are known before the block

For high-stakes randomness (lotteries, etc.), consider using commit-reveal schemes or external randomness oracles.
