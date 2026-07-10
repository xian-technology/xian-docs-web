# Chi Cost Table

These are stable runtime constants. Use readonly simulation against the target
node for a complete operation estimate.

## Accounting

```text
chi_used = (raw_meter_cost // 1000) + 5
```

The result is capped by the transaction's submitted chi limit.

| Item | Raw cost |
| --- | ---: |
| storage read | 1 per encoded key/value byte |
| storage write | 25 per encoded key/value byte |
| submitted transaction | 1 per byte |
| returned value | 1 per byte |
| cross-contract dispatch | 10,000 per call, plus called work |

VM computation and host operations use the fixed `xian_vm_v1` gas schedule.

## Fee Conversion

| Setting | Value |
| --- | ---: |
| base transaction cost | 5 chi |
| paid-mode conversion | 20 chi per XIAN |

In `free_metered` mode the runtime reports the same chi usage but creates no
execution-fee debit or fee-derived reward.

## Resource Limits

| Limit | Value |
| --- | ---: |
| raw runtime safety ceiling | 50,000,000,000 units |
| writes per transaction | 128 KiB |
| returned value | 128 KiB |
| submitted contract source | 128 KiB |
| sequence or binary allocation | 128 KiB |
| default local chi budget | 1,000,000 |

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
