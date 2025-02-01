const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function decodeBase58(base58: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < base58.length; i++) {
        let carry = BASE58_ALPHABET.indexOf(base58[i]!);
        if (carry === -1) {
            throw new Error("Invalid Base58 character");
        }
        for (let j = 0; j < bytes.length; j++) {
            carry += bytes[j]! * 58;
            bytes[j] = carry & 0xff;
            carry >>= 8;
        }
        while (carry > 0) {
            bytes.push(carry & 0xff);
            carry >>= 8;
        }
    }
    // Reverse bytes and prepend leading zeroes
    for (let i = 0; i < base58.length && base58[i] === "1"; i++) {
        bytes.push(0);
    }
    return new Uint8Array(bytes.reverse());
}
