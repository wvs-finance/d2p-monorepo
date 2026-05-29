"""Reusable Somnia chain-probe tooling (KPD-16).

Hardened from the scout's ad-hoc ``/tmp`` probe scripts into committed,
re-runnable modules. These are *tooling*: they hit the network when run as
``__main__`` and are NOT exercised by the CI test suite (network-dependent,
would flake). The committed scout-archive ``.md`` files record the facts these
probes produced this session; the probes exist so any fact can be re-confirmed.
"""
