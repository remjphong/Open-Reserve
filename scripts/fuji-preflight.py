#!/usr/bin/env python3
"""Run Fuji simulations without signing, broadcasting, or printing RPC data."""

from http.client import HTTPException
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

CHAIN_ID = 43113
ROOT = Path(__file__).resolve().parents[1]
ADDRESS = re.compile(r"0x[0-9a-fA-F]{40}")
LOCAL_DEPLOYER = "0x000000000000000000000000000000000000D001"


class PreflightError(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def verify_rpc(url):
    try:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username is not None or parsed.fragment:
            raise PreflightError("expected an HTTPS RPC URL without userinfo or fragment")
        payload = {"jsonrpc": "2.0", "id": 1, "method": "eth_chainId", "params": []}
        request = Request(url, json.dumps(payload).encode(), {"Content-Type": "application/json"})
        with build_opener(NoRedirect).open(request, timeout=10) as response:
            reply = json.loads(response.read(4096))
        if not isinstance(reply, dict) or reply.get("id") != 1 or reply.get("jsonrpc") != "2.0":
            raise PreflightError("unexpected JSON-RPC response")
        chain = reply.get("result")
        if not isinstance(chain, str) or not re.fullmatch(r"0x[0-9a-fA-F]+", chain) or int(chain, 16) != CHAIN_ID:
            raise PreflightError("RPC did not report Fuji chain ID 43113")
    except (HTTPError, URLError, HTTPException, OSError, UnicodeError, ValueError) as error:
        raise PreflightError("unable to verify Fuji RPC chain ID") from error


def address(name, fallback=""):
    value = os.environ.get(name) or fallback
    if not ADDRESS.fullmatch(value) or int(value, 16) == 0:
        raise PreflightError(f"{name} must be a nonzero public address")
    return value.lower()


def simulate(deployer, roles, supply, network):
    # Fixed arguments. No passthrough for --broadcast, --resume, or signer options.
    forge = os.environ.get("FORGE", "forge")
    config = str(ROOT / "contracts/foundry.toml")
    env = {key: value for key, value in os.environ.items() if not key.startswith(("FOUNDRY_", "ETH_"))}
    if "--fork-url" not in network:
        env.pop("FUJI_RPC_URL", None)
    command = [
        forge, "script", "script/DeployFuji.s.sol:DeployFuji", "--config-path", config,
        "--sig", "run(address,address,address,address,uint256)", deployer, *roles,
        supply, *network,
    ]
    try:
        effective_config = subprocess.run(
            [forge, "config", "--config-path", config, "--json"],
            cwd=ROOT / "contracts", env=env, capture_output=True, timeout=15,
        )
        if effective_config.returncode != 0 or json.loads(effective_config.stdout).get("eth_rpc_url"):
            raise PreflightError("unexpected implicit Foundry RPC configuration")
        result = subprocess.run(
            command, cwd=ROOT / "contracts", env=env, capture_output=True, timeout=90,
        )
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        raise PreflightError("Forge could not finish simulation") from error
    # Forge/RPC errors may contain a provider URL. Emit only a known result.
    if result.returncode != 0 or b"Script ran successfully." not in result.stdout:
        raise PreflightError(f"Forge simulation did not report success (exit {result.returncode})")


def main():
    if len(sys.argv) != 1:
        print("Usage: python3 scripts/fuji-preflight.py", file=sys.stderr)
        return 2
    rpc = os.environ.get("FUJI_RPC_URL", "")
    local = "NOT_RUN"
    live = "NOT_RUN"
    try:
        roles = [address(f"FUJI_{role}_ADDRESS") for role in ("BUYER", "MERCHANT", "RESOLVER")]
        if len(set(roles)) != 3:
            raise PreflightError("buyer, merchant and resolver must be distinct")
        deployer = address("FUJI_DEPLOYER_ADDRESS", LOCAL_DEPLOYER if not rpc else "")
        supply = os.environ.get("FUJI_MOCK_INITIAL_SUPPLY", "")
        if not re.fullmatch(r"[0-9]{1,78}", supply) or not 1903 <= int(supply) < 2**256:
            raise PreflightError("mock supply must be 1903..2^256-1 base units")

        local = "FAIL"
        simulate(deployer, roles, supply, ["--chain", str(CHAIN_ID), "--offline"])
        local = "PASS"
        if rpc:
            live = "FAIL"
            verify_rpc(rpc)
            # Do not override the fork chain ID. The Solidity script checks it again.
            simulate(deployer, roles, supply, ["--fork-url", "fuji"])
            live = "PASS"
    except PreflightError as error:
        print(f"PREFLIGHT_ERROR={error}", file=sys.stderr)
        return 1
    finally:
        print(f"LOCAL_FUJI_PROFILE_SIMULATION={local}")
        print(f"LIVE_RPC_PREFLIGHT={live}")
        print("FUJI_TESTNET=NO-GO_PENDING_DEPLOYMENT_AUTHORIZATION")
    return 0


if __name__ == "__main__":
    sys.exit(main())
