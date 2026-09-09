# Chi Cost Table

These costs describe the native `xian_vm_v1` runtime. Use readonly simulation
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

VM computation and host operations use the fixed `xian_vm_v1` gas schedule.

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
