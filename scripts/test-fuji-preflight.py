import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location("fuji_preflight", Path(__file__).with_name("fuji-preflight.py"))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class FujiPreflightTest(unittest.TestCase):
    def test_rpc_chain_validation_uses_only_eth_chain_id(self):
        for chain, passes in (("0xa869", True), ("0xa86a", False), ("0x7a69", False), ("invalid", False)):
            with self.subTest(chain=chain), patch.object(preflight, "build_opener") as opener:
                reply = {"jsonrpc": "2.0", "id": 1, "result": chain}
                opener.return_value.open.return_value = io.BytesIO(json.dumps(reply).encode())
                if passes:
                    preflight.verify_rpc("https://rpc.example.invalid")
                else:
                    with self.assertRaises(preflight.PreflightError):
                        preflight.verify_rpc("https://rpc.example.invalid")
                request = opener.return_value.open.call_args.args[0]
                self.assertEqual(json.loads(request.data)["method"], "eth_chainId")

    def test_wrong_rpc_does_not_start_fork_or_disclose_endpoint(self):
        env = {
            "FUJI_RPC_URL": "https://rpc.example.invalid/redaction-marker",
            "FUJI_BUYER_ADDRESS": "0x" + "1" * 40,
            "FUJI_MERCHANT_ADDRESS": "0x" + "2" * 40,
            "FUJI_RESOLVER_ADDRESS": "0x" + "3" * 40,
            "FUJI_DEPLOYER_ADDRESS": "0x" + "4" * 40,
            "FUJI_MOCK_INITIAL_SUPPLY": "1903",
        }
        out = io.StringIO()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(preflight.sys, "argv", ["fuji-preflight.py"]),
            patch.object(preflight, "simulate") as simulate,
            patch.object(preflight, "verify_rpc", side_effect=preflight.PreflightError("wrong chain")),
            redirect_stdout(out),
            redirect_stderr(out),
        ):
            self.assertEqual(preflight.main(), 1)
        self.assertEqual(simulate.call_count, 1)
        self.assertEqual(simulate.call_args.args[-1], ["--chain", "43113", "--offline"])
        self.assertIn("LIVE_RPC_PREFLIGHT=FAIL", out.getvalue())
        self.assertNotIn("redaction-marker", out.getvalue())

    def test_local_simulation_drops_ambient_rpc_and_never_broadcasts(self):
        env = {"ETH_RPC_URL": "unused", "FUJI_RPC_URL": "unused", "FOUNDRY_ETH_RPC_URL": "unused"}
        run = Mock(side_effect=[
            subprocess.CompletedProcess([], 0, b'{"eth_rpc_url": null}', b""),
            subprocess.CompletedProcess([], 0, b"Script ran successfully.", b""),
        ])
        with patch.dict(os.environ, env, clear=True), patch.object(preflight.subprocess, "run", run):
            preflight.simulate("deployer", ["buyer", "merchant", "resolver"], "1903", ["--chain", "43113", "--offline"])
        command = run.call_args.args[0]
        self.assertNotIn("--broadcast", command)
        for key in env:
            self.assertNotIn(key, run.call_args.kwargs["env"])


if __name__ == "__main__":
    unittest.main()
