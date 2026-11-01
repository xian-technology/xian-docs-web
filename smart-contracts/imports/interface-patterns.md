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

Fields and additional public attributes are mutable. Constructor arguments
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

The `is_of` method can be saved and called later. Interface enforcement uses
the descriptor's current fields and its standard match behavior. Replacing
`is_of` with a custom callable is not supported by `enforce_interface` and
raises an error; calling a stored callable attribute directly is a separate
operation.

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

The native contract API deliberately excludes these Python helper surfaces:

- `Contract.submit`; use the controlled `Contract.deploy` API.
- `LogEvent.write_event`; invoke the declared event object instead.
- Unbound storage methods obtained from ORM classes or `Var.type`; use permitted
  methods on a declared storage object or read-only foreign reference.
- Imported-module global aliases such as `module.alias` where the other contract
  assigned `alias = Contract.get_info`. Imported attribute access exposes exported
  functions; an interface metadata check does not export a global value.
- Custom `is_of` callbacks during interface enforcement, as described above.

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
