"""INDEX-01 pure-logic validation engine (Plan 03-02, Wave 0).

Network-free completeness / ordering / parity / liveness logic. CI asserts these
functions against synthetic fixtures + recorded constants; the LIVE probes in
Plan 03-04 call the exact same functions to process the real indexed store + RPC +
Blockscout outputs into the ``indexing/*.md`` artifacts (03-VALIDATION CI-vs-LIVE
boundary).
"""
