"""Shared pytest fixtures for the abrigo-somnia M1 validation harness.

CONTRACT DECISION N2 (locked, applies to ALL of Plan 01-01 .. 01-05):
the path-providing helpers and the loader helpers are pytest *fixtures* that
RETURN values/callables; downstream tests consume them as TEST PARAMETERS,
not via module-level imports.

Path fixtures return a ``pathlib.Path``:
    - ``scout_dir``    -> .planning/scout/2026-05-29  (the canonical KPD-16 archive)
    - ``schemas_dir``  -> schemas
    - ``research_dir`` -> research

Loader fixtures return a CALLABLE ``fn(path) -> value``:
    - ``load_yaml`` -> yaml.safe_load of the file at ``path``
    - ``load_json`` -> json.load of the file at ``path``
    - ``read_text`` -> Path(path).read_text() of the file at ``path``

A consuming test therefore looks like::

    def test_x(scout_dir, load_yaml):
        data = load_yaml(scout_dir / "f.yaml")
        assert data["k"] == "v"

Paths are repo-root-relative. The harness runs from the repo root
(``testpaths = ["tests"]`` in pyproject.toml, invoked via ``uv run pytest``),
so these relative Paths resolve against the project root.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

import pytest
import yaml


# --- path fixtures (return Path) ------------------------------------------- #


@pytest.fixture
def scout_dir() -> Path:
    """Path to the canonical KPD-16 scout provenance archive."""
    return Path(".planning/scout/2026-05-29")


@pytest.fixture
def schemas_dir() -> Path:
    """Path to the committed schema artifacts (EVENT-01 / SHARED-SCHEMA-01)."""
    return Path("schemas")


@pytest.fixture
def research_dir() -> Path:
    """Path to the DATA-SOURCE-01 research outputs (DATA_SOURCING.md, matrix yaml)."""
    return Path("research")


# --- loader fixtures (return a callable) ----------------------------------- #


@pytest.fixture
def load_yaml() -> Callable[[Path | str], object]:
    """Return a callable that ``yaml.safe_load``s the file at the given path."""

    def _load_yaml(path: Path | str) -> object:
        with open(path, encoding="utf-8") as fh:
            return yaml.safe_load(fh)

    return _load_yaml


@pytest.fixture
def load_json() -> Callable[[Path | str], object]:
    """Return a callable that ``json.load``s the file at the given path."""

    def _load_json(path: Path | str) -> object:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)

    return _load_json


@pytest.fixture
def read_text() -> Callable[[Path | str], str]:
    """Return a callable that reads the file at the given path as text."""

    def _read_text(path: Path | str) -> str:
        return Path(path).read_text(encoding="utf-8")

    return _read_text
