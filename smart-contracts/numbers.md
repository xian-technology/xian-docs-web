# Numbers, division and rounding

Contracts on a fresh Xian chain use the `xian_vm_v2` numeric profile. Use
`int` for counts, IDs and indivisible units. Use `decimal` for an amount or
rate that can have a fractional part.

## Values and conversions

| Type | Range | Examples |
| --- | --- | --- |
| `int` | From `-(2**512 - 1)` through `2**512 - 1`, inclusive | `42`, `-7`, `10**65` |
| `decimal` | Multiples of `10**-30` with absolute value strictly below `10**61` | `0.1`, `1e-30`, `1.0`, `decimal("1.005")`, `decimal(3)` |

A decimal stores an integer coefficient divided by `10**30`. There is one
zero. The compiler reads fractional and scientific literals directly from the
source digits. It rejects a nonzero 31st fractional digit or an out-of-range
value. Trailing fractional zeros are harmless. Positive exponents can produce
whole decimals, so `3e2` is decimal 300 and `300` is integer 300.

`decimal(text)` accepts ASCII decimal digits, an optional sign, decimal point
and exponent. It enforces the same limits. `int(decimal("-1.9"))` returns
integer −1. Exported `int` parameters require an integer. Exported `decimal`
parameters accept a decimal or an integer that fits exactly. These numeric
rules apply even without `@export(typecheck=True)`, including numeric members
of annotated containers. Plain strings require explicit conversion. Boolean
values are separate from numbers. Binary floats, Python's Decimal class, NaN
and infinity are outside this profile.

## Operators and helpers

| Expression | Result |
| --- | --- |
| `a + b`, `a - b`, `a * b` | Two integers give an exact integer. A decimal operand gives a decimal. Multiplication discards fractional digits beyond 30 toward zero. |
| `a / b` | Always decimal. Compute the exact quotient and truncate toward zero to 30 places. The operands need only fit their own types. |
| `a // b`, `a % b` | Integers only. The quotient rounds toward negative infinity. The remainder is zero or has the sign of the divisor. |
| `a ** n`, `pow(a, n)` | Integer base and nonnegative integer exponent. `0 ** 0` is 1. Three-argument modular power also operates on integers. |
| Numeric comparison | Compare the exact values, including mixed integer/decimal pairs. |
| `mul_div_floor(a, b, d)`, `mul_div_ceil(a, b, d)` | Three integers with `d > 0`. Compute the full product before division. Return the floor or ceiling as an integer. |
| `sqrt(x)` | Nonnegative integer or decimal. Return the greatest representable decimal whose square is at most `x`. |
| `quantize(x, places, mode)` | Round an integer or decimal to `places` fractional places and return a decimal. `places` is an integer from 0 to 30 inclusive. |

Use `"toward_zero"` to discard the remainder, `"floor"` for the lower
multiple, `"ceil"` for the higher multiple and `"half_even"` for the nearest
multiple with ties going to the even coefficient. Spell out the mode in
contract code. There is no `round()` builtin. Decimal display formatting also truncates discarded digits toward zero. To display a price rounded half-even, use `f'{quantize(price, 2, "half_even"):.2f}'`.

`str(x)` of a decimal is plain fixed-point text: no exponent, no trailing
fractional zeros, and `0` for zero. `str(decimal("1000.50"))` is `"1000.5"`
and `str(decimal("1e6"))` is `"1000000"`. Signed messages that embed an amount,
such as [XSC-0002 permits](/smart-contracts/standards/xsc-0002), can use
`str(amount)` directly. Off-chain, `ContractingDecimal` from current
`xian-runtime-types` prints the same text and accepts the same format specs, for
example `f"{amount:.4f}"`.

```python
@export
def fee(units: int, basis_points: int) -> int:
    return mul_div_ceil(units, basis_points, 10_000)

@export
def settle(amount: decimal) -> decimal:
    return quantize(amount, 2, "half_even")
```

| Expression | Value |
| --- | --- |
| `1 / 3` | decimal `0.333333333333333333333333333333` |
| `1 / 10**31` and `10**65 / 10**65` | decimal `0` and decimal `1` |
| `-7 // 3` and `-7 % 3` | integer `-3` and integer `2` |
| `mul_div_floor(-5, 1, 2)` and `mul_div_ceil(-5, 1, 2)` | integer `-3` and integer `-2` |
| `settle(1.005)` and `settle(-1.015)` | decimal `1` and decimal `-1.02` |
| `sqrt(2)` | decimal `1.414213562373095048801688724209` |

Overflow is checked on the result of each operation. Invalid types, division
by zero, a negative square root or an invalid rounding argument fail the call.
A failed transaction rolls back contract writes and events.

## Transactions and SDKs

Signed requests, simulation arguments, ordinary state values, event data and
results share the numeric encoding, recursively through lists and objects.

| Value | Canonical JSON |
| --- | --- |
| Integer within ±9,007,199,254,740,991 | `42` |
| Larger integer | `{"__big_int__":"9007199254740993"}` |
| Decimal, including a whole decimal | `{"__fixed__":"1.25"}` or `{"__fixed__":"1"}` |
| Contract string | `"1.25"` |

Each reserved numeric wrapper contains exactly one field. Its string uses ASCII
digits, no exponent or leading plus sign, no redundant leading or fractional
trailing zeros, and a minus sign only for negative values. Signed V2 requests
reject untagged JSON fractions, exponent tokens and unsafe bare integers. A
tagged decimal zero is `{"__fixed__":"0"}`. The transaction envelope has two
numeric fields, `nonce` and `chi_supplied`. Both require a plain nonnegative
safe JSON integer; a `__big_int__` wrapper is valid for contract arguments,
not for either envelope field.

The compiler, local contract tests, and Python and JavaScript SDKs use `xian_vm_v2` by default.
Pass a Python `int` or `decimal.Decimal("1.25")` from your off-chain application.
In JavaScript, pass a safe integer, a `bigint`, or `fixed("1.25")`.
Use `parseContractJson(text)` to preserve numeric digits in handwritten JSON arguments.
To reproduce V1 signing fixtures, set `vm_profile="xian_vm_v1"` in the Python
client configuration or `vmProfile: "xian_vm_v1"` in JavaScript.

See [Python SDK](/tools/xian-py), [JavaScript SDK](/tools/xian-js) and
[Local contract testing](/smart-contracts/testing/).
