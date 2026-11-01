# Chi Cost Table

These costs describe the native `xian_vm_v1` runtime with execution revision
`xvm-execution-3` and gas schedule `xvm-gas-2`. Use readonly simulation
against the target node for a complete operation estimate; the local Python
harness has a separate metering implementation.

## Accounting

```text
chi_used = (raw_meter_cost // 1000) + 5
```

The result is capped by the transaction's submitted chi limit.

| Item | Raw cost |
| --- | ---: |
| storage read | 2 per encoded key/value byte |
| storage write | 25 per encoded key/value byte |
| submitted transaction | 1 per byte |
| returned value | 1 per byte |
| cross-contract dispatch | 10,000 per call, plus called work |

VM computation and host operations use deterministic policy constants, not
measured execution time. The current runtime supports `xvm-gas-2`; it does not
offer `xvm-gas-1` as an alternate execution mode. Validators must use matching
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
| default node simulation chi budget | 1,000,000 |

Sequence entry counts and encoded byte counts are different units. A list of
large values can cost much more than a list of the same length containing
small integers. Return bytes are metered; the Python harness's separate
128 KiB return-value limit is not a general native-VM return-size guarantee.

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
