# Chi Cost Table

These costs describe the native `xian_vm_v2` runtime with execution revision
`xvm-execution-14` and gas schedule `xvm-gas-6`. Use readonly simulation
against the target node for a complete operation estimate. The V2 gas schedule includes the following arithmetic charges.

## Accounting

```text
chi_used = (raw_meter_cost // 1000) + 5
```

The result is capped by the transaction's submitted chi limit. The chain's fee
policy caps that limit at `max_tx_chi` (200,000 chi by default), and the VM
never runs one V2 transaction past 1,000,000 chi; see
[Resource Limits](#resource-limits).

| Item | Raw cost |
| --- | ---: |
| storage read | 2 per encoded key/value byte |
| storage write | 25 per encoded key/value byte |
| submitted transaction | 1 per byte |
| returned value | 1 per byte |
| cross-contract dispatch | 10,000 per call, plus called work |

VM computation and host operations use deterministic policy constants, not
measured execution time. The current runtime supports `xvm-gas-6`; it does not
offer an earlier schedule as an alternate execution mode. Validators must use matching
runtime policies. See the [upgrade procedure](/node/upgrading).

Module initialization also charges for building interface metadata and the
public callable catalog from binding names and function signatures. Interface
inspection and imported callable lookup charge for the metadata they read;
following imported function aliases is bounded. These costs apply
even when a module's interface is inspected before any exported function is
called. Simulation includes this initialization work.

Events charge for validating and copying their declaration schema and for
validating each emitted payload, in addition to emission and encoded-value
costs. Larger schemas and values require more work. An out-of-chi failure
discards the event and tentative writes.

## Element work

V2 charges work that grows with the size of a value inside a single operation,
in addition to the operation's own cost. Each unit of element work costs 24 raw
chi:

| Element work | Units |
| --- | ---: |
| value comparison, including each dictionary key comparison and each comparison made by `in`, `index`, `count`, `==` and `<`; identical members count too | 1 per comparison |
| copying a container (list, tuple, set, dict) | 1 per member copied |
| copying text or binary data | 1 per 64 bytes |
| comparing text or bytes (`==`, `<`, sorting) | 1 per 128 compared bytes |
| allocating a container | 1 per member |
| a value crossing a contract boundary | 1 per traversed node |

String operations count units by size: receiver, arguments and output.

| String operation | Units |
| --- | ---: |
| searching or copying: `find`, `count`, `in`, `replace`, `split(sep)`, `join`, slicing, indexing, `decimal(text)` | 1 per 8 bytes |
| per-character work: `upper`, `lower`, `isalpha`, `isdigit`, `islower`, `isalnum`, `split()`, `int(text)` | 1 per 2 bytes |

Pending units are charged before the next expression or statement. One
operation may accumulate at most 2^20 uncharged units; beyond that the
transaction fails with `operation exceeds the element work limit`.

Copies are therefore not free. `items += [x]` builds and copies a new
list on every call, so growing a list that way in a loop costs chi quadratic in
its length; use `items.append(x)`, which does not copy. Calling string methods
repeatedly on a long text costs chi in proportion to its length each time;
split or slice it once and work on the pieces.

### Dictionaries

V2 dictionaries keep a hash index. A lookup, `in`, `get`, insert, overwrite,
`setdefault`, each `update` entry, `pop` and `popitem` hashes the key (one unit
per key node and per 8 hashed bytes), compares it only with entries that have
the same hash (one unit each) and changes the dictionary in place. Their cost
therefore does not grow with the size of the dictionary. Removing an entry also
costs one unit per 16 later entries it moves up. Dictionary displays,
comprehensions, `dict()`, `fromkeys()` and `|` build through the same index.

Insertion order, iteration and errors are unchanged. Equal keys hash equally:
integers by value (`True` and `1` are different keys in V2), text and bytes by
content, tuples by their items and frozensets by their size. Each indexed
entry also counts 40 more bytes toward the heap limit.

### Whole-hash scans

`Hash.all()`, `Hash.clear()` and `clone_from` charge 2,560 raw chi for each
entry they visit, on top of the storage read bytes. Prefer keyed access and
paginated designs over scanning a whole hash.

## V2 arithmetic

These additional raw units apply on top of ordinary VM evaluation and dispatch. Integer power depends on the bit length of the exponent.

| Operation | Additional raw units |
| --- | ---: |
| Binary numeric operation handled by V2, except power | 96 |
| Integer `**` or two-argument `pow` | 96 × (1 + exponent bit length), capped at 512 bits |
| `sqrt` or `quantize` | 96 |
| `mul_div_floor` or `mul_div_ceil` | 192 |

## Fee Conversion

| Setting | Value |
| --- | ---: |
| base transaction cost | 5 chi |
| initial paid-mode conversion in canonical bundles | 20 chi per XIAN |

The effective conversion rate is on-chain at `chi_cost.S:value` and can be
changed by validator governance. Paid fees use `chi_used / chi_rate`.

In `free_metered` mode the runtime reports the same chi usage but creates no
execution-fee debit or fee-derived reward.

## Resource Limits

| Limit | Value |
| --- | ---: |
| metered storage-write byte budget | less than 128 KiB, including encoded keys and values |
| submitted contract source | 128 KiB |
| `range(...)` and bounded sequence repetition | 131,072 entries |
| bounded binary allocation and string repetition | 128 KiB |
| chain per-transaction chi cap (`max_tx_chi`, default) | 200,000 |
| chain per-block chi cap (`max_block_chi`, default) | 500,000 |
| VM ceiling for one V2 transaction (`max_tx_chi` in `runtime_info()`) | 1,000,000 |
| node simulation chi budget | the chain's `max_tx_chi`, lowered by the optional `simulation_max_chi` |

The chain caps are part of the genesis fee policy; see
[Chi and Metering](/concepts/chi#chain-chi-caps). The block cap counts the chi
each transaction supplies, not the chi it uses.

Sequence entry counts and encoded byte counts are different units. A list of
large values can cost much more than a list of the same length containing
small integers. Return bytes are metered. Operation, heap and boundary traversal
limits apply separately; the table does not promise a general 128 KiB return-size
limit.

## Hashing and Signatures

Every invocation has the ordinary 5,000 raw-unit call-dispatch cost. The table
below lists **additional** work charges. Direct calls, function aliases and
iterator callbacks each charge these once per invocation; surrounding argument,
iteration, storage and transaction work is charged separately.

| Operation | Additional fixed raw cost | Additional byte cost |
| --- | ---: | ---: |
| `hashlib.sha256_text` | 0 | 2 per UTF-8 byte |
| `hashlib.sha3_text` | 0 | 4 per UTF-8 byte |
| `hashlib.sha256_hex` | 0 | 4 per encoded input byte |
| `hashlib.sha3_hex` | 0 | 6 per encoded input byte |
| `hashlib.sha256` | 0 | 4 per raw input byte |
| `hashlib.sha3` | 0 | 6 per raw input byte |
| `crypto.verify` | 95,000 | 4 per message UTF-8 byte, plus 2 per encoded key/signature byte |
| `crypto.key_is_valid` | 0 | 0; wrong-length inputs return `False` without a payload copy |

For verification, the total invocation base is therefore 100,000 raw units
before the byte charge. Hash and crypto work is charged before payload copying,
hex classification, decoding and verification. Inputs rejected by an immediate
length check do not incur a proportional charge for work that was never done.
Admitted malformed inputs pay for their work, and an out-of-chi failure rolls
back tentative writes and events.

Text hashing and verification messages are capped at 1 MiB of UTF-8 bytes.
Explicit hex hashing accepts at most 2 MiB of encoded input (1 MiB decoded).
Historical aliases accept at most 2 MiB of raw input, then either 1 MiB decoded
hex or 1 MiB fallback text. Their charge includes raw whitespace and failed hex
classification. Verification keys and signatures are capped at 64 and 128
encoded bytes. These admission limits also apply when metering is disabled,
and the local Python bridges enforce the same limits. They do not impose a
universal limit on strings created by other operations.

See [Hashlib](/smart-contracts/stdlib/hashlib) and
[Crypto](/smart-contracts/stdlib/crypto) for input rules and examples.

## ZK Verification

| Operation | Raw cost |
| --- | ---: |
| raw Groth16 verification base | 750,000 |
| raw public input | 50,000 each |
| raw payload byte | 50 each |
| registry-backed verification base | 500,000 |
| registry prepared-key setup | 250,000 |
| registry-backed public input | 50,000 each |
| registry-backed payload byte | 25 each |

Shielded protocol helpers also have fixed host-operation costs. Proofs are
limited to 4,096 hex characters, raw verifying keys to 8,192 hex characters,
public inputs to 32, and verifying-key IDs to 128 characters.

## Optimization

- cache repeated state reads in local variables
- keep keys and stored values compact
- avoid unnecessary writes and cross-contract calls
- paginate scans and bound returned collections
- simulate the exact transaction before choosing a chi limit

See [Chi and Metering](/concepts/chi) for the fee modes and
[Estimating Chi](/api/dry-runs) for simulation.
