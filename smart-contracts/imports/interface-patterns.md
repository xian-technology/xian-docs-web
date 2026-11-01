# Interface Patterns

`importlib.enforce_interface(...)` lets a contract validate another contract's
shape before using it. The first argument can be either an imported contract
module or a contract name string.

## Example

```python
token = importlib.import_module("con_token")

ok = importlib.enforce_interface(
    token,
    [
        importlib.Func("transfer", args=("amount", "to")),
        importlib.Var("balances", Hash),
    ],
)

assert ok, "Token does not satisfy the expected interface"
```

If you do not need the module object for anything else, you can pass the
contract name directly:

```python
ok = importlib.enforce_interface(
    "con_token",
    [
        importlib.Func("transfer", args=("amount", "to")),
        importlib.Var("balances", Hash),
    ],
)
```

## Variable Markers

Use the storage type name itself as the second argument to `importlib.Var`.
Do not quote it and do not pass a constructed storage object.

Supported storage markers are:

| Marker | Interface requirement |
|--------|-----------------------|
| `Variable` | local `Variable` storage |
| `Hash` | local `Hash` storage |
| `ForeignVariable` | foreign `Variable` storage |
| `ForeignHash` | foreign `Hash` storage |
| `LogEvent` | declared event schema |

The compiler preserves these markers in the Xian VM artifact, and the runtime
resolves them as interface type markers when the contract executes.

## Descriptor values

`importlib.Func` and `importlib.Var` create distinct descriptor objects. They
support constructor aliases and `isinstance` checks against their respective
classes. A dictionary containing similar fields is not a descriptor.

| Descriptor | Public fields | Match operation |
|------------|---------------|-----------------|
| `Func(name, args=(), private=False)` | `name`, `args` | `descriptor.is_of(function)` |
| `Var(name, t)` | `name`, `type` | `descriptor.is_of(storage)` |

A private function descriptor prefixes its name with `__`; a variable
descriptor always adds that prefix. There is no separate `private` field.
Checking a private function does not make it externally callable.

Use a **tuple** for function argument names. The function match compares the
name and positional parameter names exactly. Only compiler-admitted signatures
can be used. Defaults and annotations do not affect the match; keyword-only
parameters, `*args`, and `**kwargs` are excluded. A list is preserved as a
list and does not match the tuple of parameter names.

Fields and additional public attributes on descriptor instances are mutable.
This does not permit assigning or deleting attributes on the shared `Func` or
`Var` classes, modules, functions or other runtime helpers. Constructor arguments
retain their normal identity and aliases observe mutations:

```python
arguments = ["amount"]
descriptor = importlib.Func("transfer", arguments)
arguments.append("to")
assert descriptor.args is arguments

# Use the required tuple when checking the function signature.
descriptor.args = ("amount", "to")
check = descriptor.is_of
```

Descriptors compare by identity. Two independently created descriptors with
the same fields are unequal; they can be separate dictionary keys. They are
not supported as deterministic-set elements.

The standard `is_of` method can be saved and called later. Interface enforcement
uses the descriptor's current fields. You can replace an instance's `is_of`
attribute with a local predicate that checks the metadata described below.

## Custom Metadata Predicates

A custom predicate receives one immutable `InterfaceSubject` describing the
member being checked. It receives no live foreign function or storage object.
For example, the inspecting contract can require a particular transfer shape:

```python
def check_transfer(subject):
    return (
        subject.kind == "function"
        and subject.name == "transfer"
        and subject.args == ("amount", "to")
    )

@export
def check_token(contract: str):
    token = importlib.import_module(contract)
    interface = importlib.Func("transfer")
    interface.is_of = check_transfer
    return importlib.enforce_interface(token, [interface])
```

The subject exposes only these fields:

| Field | Function subject | Storage subject |
|-------|------------------|-----------------|
| `kind` | `"function"` | `"storage"` |
| `name` | Canonical function code name, including a private `__` prefix when present | Inspected storage binding name; for example, `Var("balance", Variable)` inspects `"__balance"` |
| `args` | Tuple of positional parameter names | `None` |
| `storage_type` | `None` | One of `"Variable"`, `"Hash"`, `"ForeignVariable"`, `"ForeignHash"`, `"LogEvent"` |

`args` follows the standard function matcher: defaults and annotations do not
change it, and keyword-only and variadic parameters are excluded. A predicate
can delegate to the standard matcher, for example
`importlib.Func("transfer", ("amount", "to")).is_of(subject)` or
`importlib.Var("balance", Variable).is_of(subject)`. Applying the wrong matcher
family returns `False`.

The predicate uses ordinary callable dispatch with one subject argument. Local
functions, bound methods and admitted builtins can be used when they accept
that argument. The result's truthiness determines the match; it need not be a
boolean. Wrong signatures, non-callable overrides and exceptions propagate as
normal execution errors and roll back the transaction. A falsey result simply
fails the interface check; use `assert` if that should abort the transaction.

A local predicate runs in the inspecting contract's frame, with its normal
caller, owner, storage authority and chi budget. It may perform the inspecting
contract's permitted operations. The subject cannot invoke the inspected
function or access its storage. Any explicit contract calls made by the
predicate follow the usual caller and owner checks. An imported exported
function cannot serve as a remote predicate: transferring the subject to
another contract is rejected before that function runs.

There is no contract-visible subject constructor. Its fields cannot be assigned
or deleted, and it has no call, storage or class capability. Subjects cannot be
stored, returned as public transaction results or transferred between contracts,
including through nested or shared containers. Copy ordinary field values when
you need to store or return metadata.

Callbacks run only for members that require function or storage matching.
Missing or `None` members return `False` without invoking a callback; other
existing non-function, non-storage values satisfy the name check without one.

## Host callable metadata and exclusions

`Func.is_of` supports a bounded catalog of the current contract-visible Python
wrappers. Its function name and positional parameter names describe the wrapper,
which can differ from the public binding or its call signature. For example:

```python
assert importlib.Func("safe_pow", ()).is_of(pow)
assert importlib.Func("get_info", ("cls", "name")).is_of(Contract.get_info)
```

Variadic parameters are excluded from this comparison, while a Python-defined
bound method's metadata includes its `self` or `cls` parameter. Many builtins and
constructor classes have no matching Python function metadata; inspecting them
with `Func.is_of` raises an error. This catalog follows the current guarded
wrappers, so historical host Python implementations can expose different names
or no metadata at all. It does not provide general Python reflection.

Direct `Func.is_of` checks and `enforce_interface` also classify values
differently: enforcement invokes function matching for ordinary Python-defined
function values, while a bound method can satisfy the existing-attribute check
without matching its function signature. Use the exported-function checks below
before calling another contract.

Public [event methods](/smart-contracts/events#call-signatures) and
[unbound storage methods](/smart-contracts/storage#methods-through-storage-types)
retain their declared receiver and storage authority. Retrieving a method from
`Var.type` does not permit constructing writable storage.

The native contract API excludes these helper surfaces:

- Direct low-level deployment from ordinary contracts; call
  `submission.submit_contract(...)`. The [deployment helpers](/reference/submission-internals#low-level-deployment-helpers)
  are restricted to the active `submission` contract.
- Imported-module data globals, raw storage/event handles and private-function
  aliases. [Public callable aliases](/smart-contracts/imports/importing-contracts#public-callable-aliases)
  have their own receiver and context checks; interface metadata does not export
  an arbitrary global value.

These boundaries prevent helper methods and callable values from acquiring
another contract's storage authority or caller context. Supported descriptor
metadata does not enable the excluded helper APIs.

## Execution and storage boundaries

Descriptors can pass between contract functions during the same execution,
including through another contract, while preserving aliases and mutations.
They cannot be persisted, emitted as event data, or returned as public
transaction results, including inside nested containers. Return ordinary
values extracted from their fields instead.

Transferred descriptors must not contain callable or storage-handle
attributes. Keep a transferred `Var` descriptor's `type` as its storage type
marker; replacing it with an arbitrary class value can make transfer fail.

A storage marker is class information, not permission to create storage.
Calling `descriptor.type(...)` or a constructor alias does not create a
storage declaration. See [Storage Overview](/smart-contracts/storage#declarations-and-storage-authority).

## Checking an interface safely

Interface checks do not grant permissions or replace access control. For
compatibility with the Python interface API, an existing non-`None` attribute
that is neither a function nor storage can satisfy a name check. Checks use
initialized module values, including computed values. Circular module
initialization is rejected. If you will call an
exported function dynamically, check `importlib.has_export(contract_name,
function_name)` as well as its interface. A successful interface check does
not validate the function's implementation or authorization rules.
