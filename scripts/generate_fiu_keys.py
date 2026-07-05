"""Generate FIU ECDH P-256 key pair for AA JWE decryption.

Usage:
    python scripts/generate_fiu_keys.py

Output: prints private JWK (save to env var FIU_PRIVATE_KEY_JWK)
        and public JWK (register with your AA sandbox provider).
"""

from jwcrypto import jwk
import json


def main():
    key = jwk.JWK.generate(kty="EC", crv="P-256")
    private_jwk = key.export()
    public_jwk = key.export_public()

    print("=== PRIVATE KEY (save to FIU_PRIVATE_KEY_JWK env var) ===")
    print(private_jwk)
    print()
    print("=== PUBLIC KEY (register with AA sandbox) ===")
    print(public_jwk)
    print()
    print("WARNING: Never commit the private key to version control.")


if __name__ == "__main__":
    main()
